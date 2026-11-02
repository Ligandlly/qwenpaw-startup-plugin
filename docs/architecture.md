---
id: architecture
type: architecture-design
title: 启动页插件 — 架构
status: draft
parent: goal-and-requirements
---

# 启动页插件 — 架构

一个纯前端 QwenPaw 插件：接管聊天首页欢迎区，渲染智能体网格，点「启动对话」后把宿主的智能体选择状态改掉、重载进空白对话。

## 环境与约束

- **宿主** `/home/lly/projects/QwenPaw` 一行不改。插件只走 `window.QwenPaw` 公开 API 与宿主已存在的 localStorage / sessionStorage / 自定义事件约定。
- **不打包 React / ReactDOM / antd**：宿主通过 `window.QwenPaw.host` 提供，构建时 external。
- **无 `navigate`、无 `setSelectedAgent`**：跨智能体切换只能「写宿主持久化键 + 让页面重载后重新水合」。
- **欢迎区的 props 只有 `{ greeting, description, avatar, prompts, onSubmit }`**：智能体列表得插件自己拉；启动动作也得插件自己完成。

## 决策

### 1. 用「重载」当唯一的切换路径

启动按钮做四件事：写宿主智能体键 → 打「本次加载已启动」标记 → 置 `qwenpaw_pending_new_chat` → `location.assign("/chat")`。重载后插件读到标记，**不注册** `welcome.render`，宿主显示自己的原生欢迎区 —— 这条对话就是用户刚选好的，不该再被挡一次。

- 代价：一次整页重载（~1s）。用户已确认接受。
- 收益：切换结果与手工在左上角切换完全一致；启动后的首页像素级原生，插件不用维护第二套欢迎语；只有一条代码路径，没有「同智能体免刷新 / 跨智能体刷新」的分叉。
- 放弃的方案：同智能体时只 dispatch `qwenpaw:sidebar-new-chat` 不重载 —— 不重载就无法退回宿主原生欢迎区（我们的 render 已经把 `ChatWelcome` 换掉了），只能自己画一套等价欢迎语，违反「启动后用原生欢迎语」的决策。

### 2. 「每条新对话都拦一次」由注册时机实现

标记 `sessionStorage["qwenpaw-startup-page:launched"]` 只管**发起它的那一次页面加载**：启动 → 重载 → 落下空白对话，这条对话用原生欢迎区。之后每一次「新建对话」都清标记并重新注册，重新拦。

```
插件加载 → 读 sessionStorage["qwenpaw-startup-page:launched"]
  ├─ 无标记 → chat.welcome.render(...) 注册智能体网格
  └─ 有标记 → 不注册（本次加载的那条对话用原生欢迎区），开始等下一次新建对话
       ├─ window 收到 qwenpaw:sidebar-new-chat（在 /chat 页点新建）→ 清标记 + 重新注册
       └─ location.pathname 从非 /chat 回到 /chat（在别的页面点新建）→ 清标记 + 重新注册
```

不注册就自动退回原生，比「注册之后在组件里判断再渲染原生样式」可靠得多。

- 为什么需要「等信号」两个通道：宿主的「新建对话」有两条路径（`console/src/layouts/Sidebar.tsx` 里分叉）——在 `/chat` 页只 dispatch `qwenpaw:sidebar-new-chat`，在别的页面只写 `qwenpaw_pending_new_chat` 再 `navigate("/chat")`，后者没有任何事件可听（SPA 导航不发 `popstate`，宿主也没暴露 navigate）。所以监听事件 + 500ms 轮询 pathname，两者都只在「被启动页压过的那次加载」里挂着，重新注册后立刻停掉。
- 为什么不在插件里画原生欢迎语：宿主的 `ChatWelcome` 组件没有挂在 `window.QwenPaw` 上，插件拿不到，只能归还槽位。
- `NEW_CHAT_EVENT` 直接复用宿主事件名（`qwenpaw:sidebar-new-chat`），和 `ChatSessionInitializer` 是同一个信号。

### 3. 写宿主持久化键，而不是碰宿主 store

宿主 `agentStore`（zustand persist）读的顺序是：`sessionStorage["qwenpaw-agent-storage"].state.selectedAgent` → `localStorage["qwenpaw-last-used-agent"]` → `localStorage["qwenpaw-agent-storage"].state.selectedAgent` → `"default"`。插件两个都写，且**只改 `selectedAgent` 一个字段**，其余 `state` 原样保留（写之前先 parse，失败就整块重建，绝不覆盖成 `{}`）。

- 为什么两个都写：sessionStorage 那份生效最快（重载后首读），localStorage 那份是「上次使用」的长期记录，漏写会造成下次开新标签页又回到旧智能体。
- 失败处理：任何一次 `setItem` 抛错（隐私模式 / 配额满）就中止启动、原地显示错误，不导航 —— 宁可不跳，也不要跳到一个智能体没换成功的页面。

### 4. 新建会话复用宿主标志，不自造会话

`sessionStorage["qwenpaw_pending_new_chat"] = "1"` 后 `location.assign("/chat")`，正是宿主侧边栏「新建对话」在非 `/chat` 页时的做法；`ChatSessionInitializer` 会消费这个标志并落在空白对话上。插件不调任何创建会话的接口。

### 5. 数据只读一次，失败不阻断宿主

`GET /api/agents`（Bearer token + `X-Agent-Id` 头，走 `host.fetch("/agents")` —— 路径不带 `/api`，宿主会自己加前缀）在组件挂载时拉一次。三态：

- 加载中：3 张骨架卡片，尺寸与真卡片一致，不跳动。
- 失败：一行错误 + 「重试」按钮；用户仍可在下方 composer 直接输入（composer 不归插件管）。
- 只有一个启用智能体：不显示网格，直接用当下唯一的智能体启动（没有选择可做，展示网格只是增加一次点击）。_(inferred)_

## 结构

```
plugin.json                  id: qwenpaw-startup-page, type: frontend, entry.frontend: dist/index.js
src/index.tsx                入口：读标记 → 决定是否注册 welcome.render；被压过的那次加载等下一个新建对话信号再注册
src/host.ts                  window.QwenPaw 访问器：React / antd / useLocale / useTheme / useSelectedAgent / apiFetch
src/agents.ts                fetchAgents / pickDefaultAgent / sortAgents（启用在前，停用置底）
src/launch.ts                isLaunched / markLaunched / clearLaunched / withSelectedAgent / launchAgent
src/avatar.ts                名称首字 + 稳定哈希 → 软色背景 / 强色文字（明暗各一套调色板，inline style）
src/i18n.ts                  zh / en 文案表 + resolveLocale + 语言切换订阅
src/useMessages.ts           useMessages：优先宿主 useLocale，回退语言订阅
src/useThemeMode.ts          useThemeMode：优先宿主 useTheme，回退 html.dark-mode 观察
src/ui.tsx                   Button / Avatar：有宿主 antd 就用 antd，没有回退原生元素
src/styles.ts                注入 <style>，.qpst-* 类名，颜色与字号全用 var(--app-*)
src/StartupWelcome.tsx       容器：三态 + 选中态 + 启动动作（选中即当前智能体时禁用）+ 键盘导航
src/AgentCard.tsx            单张卡片（头像 / 名称 / 描述 / 停用态 / 当前标记）
scripts/build.mjs            esbuild → dist/index.js（iife，零 bare import，16.8kb）
scripts/preview.mjs          dev 预览页：注入宿主 tokens.css，不需要后端
test/*.test.ts(x)            vitest（jsdom）：纯逻辑 + 组件 + 注册 + 等待信号 + 产物冒烟，共 69 例
```

React 从 `window.QwenPaw.host.React` 取（`src/react.ts` 的 `react()` 懒取 + 测试注入），不打包、不 import，保证全应用只有一个 React 实例。UI 同理：宿主 `antd` 在就渲染真 antd（高度、圆角、暗色算法、loading 全部继承宿主 ConfigProvider），不在才退回带 `qpst-` 类名的原生元素。

**构建格式选 `iife` 而不是 `esm`**：产物是纯副作用脚本，iife 同时能被宿主的 blob-URL 动态 import 和普通 `<script>` 执行；`test/bundle.test.ts` 把产物当普通脚本跑一遍，并断言没有 `require(` / `import` / `export{`。

## 契约与脆弱点

插件的正确性挂在宿主的四个内部约定上。每个都有兜底，且兜底方向统一是「退回原生 / 不破坏宿主」：

| 约定 | 位置 | 兜底 |
|---|---|---|
| `chat.welcome.render` 完全替换 `ChatWelcome`、props 不含智能体 | `console/src/pages/Chat/index.tsx` | 插件自己拉 `/api/agents`、自己拿当前智能体（`host.getSelectedAgentId()` / `useSelectedAgent()`），不依赖 props |
| `qwenpaw-agent-storage` / `qwenpaw-last-used-agent` 键名与形状 | `console/src/stores/agentStore.ts` | 键名集中为常量；parse 失败就重建对象；写失败中止启动并报错 |
| `qwenpaw_pending_new_chat` | `console/src/layouts/.../Sidebar.tsx` + `ChatSessionInitializer` | 消费不到也只是落在 `/chat` 空白页，不产生错误会话 |
| `qwenpaw:sidebar-new-chat` 事件名与「新建对话」的两条路径 | `console/src/layouts/Sidebar.tsx` + `ChatSessionInitializer` | 事件不再派发时，pathname 轮询仍能发现「离开 /chat 又回到 /chat」；两条都失效时最坏情况是启动页在本标签页不再出现（退化为旧行为），不会误拦 |
| `host.useTheme` / `useLocale` / `useSelectedAgent` / `antd` 可能存在也可能不存在 | `console/src/plugins/hostExternals.ts`、`hostSdk/hooks.ts` | 主题退回 `html.dark-mode` 观察；语言退回 `localStorage "language"` 订阅 + `navigator.language`；当前智能体退回 storage 快照；antd 缺失退回原生元素 |

## 阶段

1. **骨架**：plugin.json + 构建 + 入口注册 + 一个能证明注册生效的最小欢迎区组件。
2. **启动页**：智能体拉取、双列网格、选中态、停用置灰、三态。
3. **启动链路**：写 storage → 打标记 → 跳转 → 重载后不注册。
4. **贴合原生**：主题 token、明暗、中英文案、hover / focus 可见焦点环、骨架尺寸对齐原生欢迎区。
5. **测试与自检**：纯逻辑单测 + 构建产物冒烟。

每个阶段结束都能在宿主里看到变化，不攒大爆炸。
