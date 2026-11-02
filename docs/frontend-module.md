---
id: frontend-module
type: module-design
title: 前端模块设计 — 启动页
status: draft
parent: architecture
---

# 前端模块设计 — 启动页

插件没有后端、没有路由、没有菜单。唯一的对外副作用是三个：注册 / 释放 `welcome.render`、写几个宿主的 storage 键、跳转一次 `/chat`。

## 契约常量

| 常量 | 值 | 用途 |
|---|---|---|
| `PLUGIN_ID` | `"qwenpaw-startup-page"` | 所有 `window.QwenPaw` 调用的第一个参数 |
| `AGENT_STORAGE_KEY` | `"qwenpaw-agent-storage"` | 宿主持久化的智能体状态（session 优先、local 共享） |
| `LAST_USED_AGENT_KEY` | `"qwenpaw-last-used-agent"` | 宿主记住的「上次使用」 |
| `PENDING_NEW_CHAT_KEY` | `"qwenpaw_pending_new_chat"` | 宿主 `ChatSessionInitializer` 消费的新建对话标志 |
| `LAUNCHED_FLAG_KEY` | `"qwenpaw-startup-page:launched"` | 本次页面加载来自启动页 → 这条对话不再拦（下一次新建对话时清掉） |
| `CHAT_PATH` | `"/chat"` | 启动后的落点；也是「回到聊天页 = 新对话」的判据 |
| `NEW_CHAT_EVENT` | `"qwenpaw:sidebar-new-chat"` | 宿主侧边栏在 `/chat` 页点「新建对话」时 dispatch 的事件（`ChatSessionInitializer` 也听它） |

## 数据层 `agents.ts`

```ts
export interface AgentSummary {
  id: string;
  name: string;
  description?: string;
  enabled?: boolean;
}

export async function fetchAgents(signal?: AbortSignal): Promise<AgentSummary[]>; // 走 apiFetch，复用宿主鉴权
export function sortAgents(list: AgentSummary[]): AgentSummary[];      // 纯函数：启用的在前，同组按名称 localeCompare
export function launchableAgents(list: AgentSummary[]): AgentSummary[]; // 纯函数：enabled !== false
export function pickDefaultAgent(list: AgentSummary[], currentId: string): string; // 纯函数：current 可用则它，否则第一个可启动
```

- `enabled` 缺省视为启用（老后端可能不返回该字段）。
- 请求：`host.fetch("/agents")`（**API 相对路径，不带 `/api`**：`host.fetch` / `host.getApiUrl` 会加 `/api` 前缀，写成 `/api/agents` 会变成 `/api/api/agents` → 404），没有 `host.fetch` 时回退 `globalThis.fetch(host.getApiUrl(...))`，再没有宿主时用 `apiBaseUrl + "/api" + path`；都带 `Authorization: Bearer` + `X-Agent-Id`。非 2xx 抛 `AgentsError(status)`。

## 启动链路 `launch.ts`

```ts
export function isLaunched(storage: Storage): boolean;   // 读 LAUNCHED_FLAG_KEY，读失败视为未启动
export function markLaunched(storage: Storage): void;    // 写 LAUNCHED_FLAG_KEY
export function clearLaunched(storage: Storage): void;   // 删 LAUNCHED_FLAG_KEY（下一次新建对话时调用）
export function withSelectedAgent(raw: string | null, agentId: string): string;
   // 纯函数：把 state.selectedAgent 换成 agentId，其余字段原样保留；
   // raw 为空或解析失败 → 返回 {"state":{"selectedAgent":id},"version":0}
export interface LaunchTarget { sessionStorage: Storage; localStorage: Storage; navigate: (path: string) => void; }
export function launchAgent(agentId: string, target?: LaunchTarget): { ok: true } | { ok: false; error: "storage" };
   // target 缺省 = window.sessionStorage / window.localStorage / location.assign
```

`launchAgent` 的顺序（**store 合并写入必须在打标记之前**，否则半途失败会留下「已启动但没切过去」的坏状态）：

1. `sessionStorage[AGENT_STORAGE_KEY] = withSelectedAgent(现有值, agentId)`
2. `localStorage[LAST_USED_AGENT_KEY] = agentId`
3. `localStorage[AGENT_STORAGE_KEY]` 若已存在，同样合并写入；不存在就不凭空造
4. `sessionStorage[PENDING_NEW_CHAT_KEY] = "1"`
5. `markLaunched()`
6. `t.navigate(CHAT_PATH)`

任一步 6 之前的写操作抛错 → 返回 `{ok: false, error: "storage"}`，界面原地报错、不跳转。

## 原生集成 `ui.tsx` / `useMessages.ts` / `useThemeMode.ts`

宿主 `window.QwenPaw.host` 实际提供了 `antd`、`useLocale`、`useTheme`、`useSelectedAgent`（`console/src/plugins/hostExternals.ts`、`hostSdk/hooks.ts`）。三个薄壳把这些变成"可用则用、缺失则退回"的能力，插件因此不像外来页面：

```ts
// ui.tsx —— antd 可用时渲染真 antd 组件（高度 36px、圆角、loading 转圈、暗色算法全部来自宿主 ConfigProvider）
export function Button(props: ButtonProps): ReactElement;   // type="primary" | "default" + loading/disabled
export function Avatar(props: AvatarProps): ReactElement;   // imageUrl → antd.Avatar src；否则底色 + 首字
// useMessages.ts —— 语言优先 host.useLocale()（语言切换自动重渲染），否则退回 localStorage "language" 订阅
export function useMessages(): { locale: "zh" | "en"; t: (key: MessageKey) => string };
// useThemeMode.ts —— 优先 host.useTheme()，否则 html.dark-mode + MutationObserver
export function useThemeMode(): "light" | "dark";
```

头像色板在 `avatar.ts` 的 `LIGHT` / `DARK` 两套（`toneStyle(tone, mode)` 返回 inline `{backgroundColor, color}`），刻意不用 CSS 类：antd `Avatar` 自带背景色，inline style 才能稳定覆盖。

## 入口 `index.tsx`

```ts
export function mount(): { dispose: () => void };  // 幂等：先 dispose，再按标记决定注册或等待
export function dispose(): void;                   // 清监听 + 定时器 + 注册（宿主卸载 / 测试用）
```

```
mount
  ├─ 没有 window.QwenPaw.chat.welcome.render → 什么都不做（返回空 dispose）
  ├─ sessionStorage[LAUNCHED_FLAG_KEY] 无值 → injectStyles + welcome.render(PLUGIN_ID, 启动页)
  └─ 有值 → 不注册，watchForNewChat()：
       · window.addEventListener("qwenpaw:sidebar-new-chat")   // 在 /chat 页点新建对话
       · setInterval(500ms) 观测 location.pathname             // 从别的页面点新建对话 → navigate("/chat")
     任一信号命中 → onNewChat()：停监听 → clearLaunched() → register()（启动页回来，且本加载内不再等）
```

- 为什么不是「什么都不注册」到永久：标记原本表示「本标签页已启动过」，现在只表示「本次页面加载是启动页带来的」——`clearLaunched` 让下一次新对话重新拦。
- 为什么需要两条信号：宿主的「新建对话」在 `/chat` 页走事件、在别的页面只写 `qwenpaw_pending_new_chat` + `navigate("/chat")`，后者没有事件可听（SPA 导航不发 `popstate`）。轮询只在「被压过的那次加载」里跑，命中即停。
- `handBackToHost()`（组件 `onSkip` 或注册抛错时）：`dispose()` 掉注册 + `removeStyles()`，宿主 `useSyncExternalStore` 立刻重渲染原生 `ChatWelcome`。
- 注册是幂等的（有 `registration` 就直接返回），避免事件与轮询同时命中时注册两份。

## 视图 `StartupWelcome.tsx`

```
mount → status = "loading"（3 张骨架卡）
      ├─ fetch 成功 & 可启动数 ≤ 1 → onSkip()       // 退回原生欢迎区
      ├─ fetch 失败                → status = "error"（错误行 + 重试）
      └─ fetch 成功 & 可启动数 ≥ 2 → status = "ready"
ready → 选中态 selectedId（默认 = 当前智能体，否则第一个可启动）
      ├─ selectedId === currentId → 按钮 disabled + 文案「当前智能体」+ 提示「直接在下面输入即可」
      │     └─ 点击 / Enter / Space 都不启动（launch() 里对 currentRef 早退）
      └─ selectedId ≠ currentId  → 点「启动对话」→ launching = true → launchAgent()
          ├─ ok      → 页面即将重载（按钮转 loading，不再接受点击）
          └─ !ok     → launching = false + 错误提示
```

- `hostProps` 是宿主 `welcome.render(props)` 透传的 `WelcomeRenderProps`，只复用 `avatar`（有就用，保持欢迎区还是那个头像）；标题与描述是插件自己的文案。
- `onSkip` 由入口传入：`dispose()` 掉自己的 `welcome.render` 注册 —— 宿主 `useSyncExternalStore` 立刻收到变更并重新渲染原生 `ChatWelcome`。这就是「只有一个启用智能体」时不做多余挡板的统一手段（「已经启动过」不让位组件判断，改由入口的 `LAUNCHED_FLAG_KEY` 决定注册与否）。
- 停用智能体：渲染但 `aria-disabled`、不可选中、排在最后。
- 「当前智能体」判定：`selectedId === currentId`（`host.useSelectedAgent()` 优先，缺失退回 storage 快照的 `readSelectedAgentId()`）；按钮 `disabled`、文案 `currentAgent`、提示 `currentHint`。启动按钮的可用条件因此是 `ready && selectedId && selectedId !== currentId`。
- 键盘：卡片 `role="radio"` + 容器 `role="radiogroup"`，方向键循环移动选中并同步焦点、Enter / Space 启动。
- 数字与文案全部走 `i18n.ts`，不出现中文字面量散在组件里。
- 「当前」标记读 `host.useSelectedAgent()`（缺失时退回 storage 快照）。

## 样式 `styles.ts`

注入一个 `<style id="qpst-styles">`，只用 `var(--app-*)` token（宿主 `tokens.css` 已定义），因此明暗主题自动跟随，不做第二套配色。字号走 `--app-font-secondary` / `--app-font-caption`（都乘了 `--app-font-scale`），所以控制台的字号设置对插件同样生效。

原生对齐基线（逐条对齐 `console/src/pages/Chat/components/ChatWelcome.module.less`）：容器 `max-width: 560px` 居中 + `padding: 24px`（≤600px 时 16px）、头像 64px 圆形、标题 `clamp(20px, 2vw, 26px)/600/-.025em`、描述 `--app-font-secondary` + `--app-text-secondary` + `text-wrap: pretty`、卡片 `border: 1px solid var(--app-border-subtle)` + `--app-surface-subtle` + 圆角 14px（原生 prompt 按钮值）、hover / 选中用 `--app-accent-faint` + `--app-accent-border`、启动按钮交给宿主 antd（`controlHeight` 36px）、`≤520px` 单列、`prefers-reduced-motion` 关动画。

## 单测清单（`test/`）

- `withSelectedAgent`：保留 `agents` / `lastChatIdByAgent`；坏 JSON 重建；id 覆盖旧值。
- `launchAgent`：写入顺序与四个键的最终值；storage 抛错时返回 `{ok:false}` 且不调用 `navigate`。
- `isLaunched` / `markLaunched` / `clearLaunched`：标记读写删。
- `sortAgents` / `launchableAgents` / `pickDefaultAgent`：停用排后、缺省 enabled、当前智能体不可用时回落。
- `initialOf` / `toneOf` / `toneStyle`：中文取首字、emoji 不截断、同名字稳定同色、明暗两套调色板。
- `resolveLocale`：`host.useLocale` → `localStorage "language"` → `navigator.language` → 默认 zh。
- 组件（`welcome*.test.tsx`）：骨架→卡片、停用不可选、单智能体/空列表 onSkip、选中后启动正确 id、存储失败 alert、错误态重试、方向键、复用宿主头像、语言跟随 `host.useLocale`、「当前」标记、选中即当前智能体时按钮 disabled + 文案「当前智能体」且点击/Enter 都不启动。
- `ui.test.tsx`：有 antd 时用真 antd `Button`/`Avatar`（`type=primary`、`loading` 透传、src 透传），无 antd 时退回原生元素。
- `index.test.tsx`：注册一次、启动带来的加载不注册、无槽位不炸、收到 `qwenpaw:sidebar-new-chat` 后重新注册且清标记、离开 `/chat` 再回到 `/chat` 后重新注册（fake timers 推进 500ms 轮询）、`onSkip` 时 dispose + 移除样式。
- `bundle.test.ts`：把 `dist/index.js` 当普通脚本执行仍能注册；产物里没有 `require(` / `import` / `export{`。
