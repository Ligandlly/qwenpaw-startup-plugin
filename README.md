# QwenPaw Startup Page

把聊天首页变成一张"启动页"：从卡片里挑一个智能体，点「启动对话」，直接进入一条全新的空白对话。

| 亮色 | 暗色 |
| --- | --- |
| ![亮色启动页](docs/images/startup-light.png) | ![暗色启动页](docs/images/startup-dark.png) |

## 它做了什么

- 用 `chat.welcome.render` 接管聊天欢迎区，渲染两列智能体卡片（头像 + 名称 + 一句话描述）。
- 选中卡片后点「启动对话」→ 写入宿主的智能体/待新建对话标记 → 跳到 `/chat` 进入空白会话。
- 每个标签页只拦一次：启动过之后，插件在本次标签页内不再注册，宿主原生欢迎区照常。
- 输入框不被接管：用户想直接打字就打字，用的是宿主当前智能体。
- 只有一个可用智能体（或接口没返回任何智能体）时不显示启动页，直接回到原生欢迎区。
- 已停用的智能体显示但不可选；当前智能体预选并标「当前」。
- 暗色/亮色、中/英、控制台字号设置全部跟随宿主：用 `--app-*` token、宿主 `antd` 与 `host.useLocale/useTheme`。

## 安装

**离线安装包**（推荐）：从 [Releases](https://github.com/Ligandlly/qwenpaw-startup-plugin/releases) 下载 `qwenpaw-startup-page-<version>.zip`。
插件是纯前端，包里已内置 `dist/index.js`，安装时不需要联网、不需要 npm。

```bash
# QwenPaw 正在运行：直接给 zip，会走 API 热安装
qwenpaw plugin install ./qwenpaw-startup-page-0.1.0.zip

# QwenPaw 未运行（完全离线）：先解压再指向目录
unzip qwenpaw-startup-page-0.1.0.zip
qwenpaw plugin install ./qwenpaw-startup-page
```

**从源码安装**：

```bash
npm ci
npm run build                      # 产出 dist/index.js（插件入口，已提交）
qwenpaw plugin install . --force   # QwenPaw 运行时支持热加载
```

装好后打开（或刷新）控制台：新标签页第一次进入聊天页就会看到启动页。

## 已知取舍

- **切换智能体那一下会整页重载一次。** 这是刻意选择：不重载就没法在同一个标签页里"退回"宿主原生欢迎区，而且换智能体在宿主里本来就要重新拉取会话。启动标记写在 `sessionStorage`，重载后不会再出现。
- **不展示模型/工具信息。** 卡片只有身份（头像、名称、描述）与状态，避免把启动决策变成模型参数决策。
- **依赖宿主的 UI 契约。** 复用了 `qwenpaw-agent-storage`、`qwenpaw-last-used-agent`、`qwenpaw_pending_new_chat` 三个持久化键与 `chat.welcome.render` 槽位；宿主改这些键时要跟着改（见 `docs/architecture.md` 的契约表）。

## 开发

```bash
npm run check      # build + typecheck + test
npm run test       # vitest（jsdom）
npm run package    # 打离线安装包 → release/qwenpaw-startup-page-<version>.zip + .sha256
npm run preview    # 生成 .preview/index.html：不启动后端也能看真实组件
```

预览页复用了 `../QwenPaw/console/src/styles/tokens.css`（可用 `QWENPAW_CONSOLE=/path/to/console` 指定），
`?theme=dark`、`?lang=en` 可切暗色与英文。

## 发布新版本

```bash
npm version 0.2.0 --no-git-tag-version   # 只改 version
git commit -am "chore: release v0.2.0"
git push origin main
git push origin v0.2.0                   # 单独推 tag，CI 才会打 Release
```

`plugin.json` 的 `version` 与 tag 必须一致（CI 会校验），Release 里会自动附上 zip 与 `.sha256`。
注意：`git push --follow-tags` 把分支和 tag 一次性推时 GitHub 只跑分支那一次，tag 要单独推。

## 结构

| 路径 | 作用 |
| --- | --- |
| `plugin.json` | 插件清单（`type: frontend`，入口 `dist/index.js`） |
| `src/index.tsx` | 注册/回收 `chat.welcome.render`，每个标签页只注册一次 |
| `src/StartupWelcome.tsx` | 启动页主体：加载/失败/就绪三态、选中、键盘、启动 |
| `src/AgentCard.tsx` | 智能体卡片（radiogroup 语义、停用态、当前标记） |
| `src/agents.ts` | `/api/agents` 读取、排序、默认选中 |
| `src/launch.ts` | 启动链路：storage 合并写入 → 待新建对话标记 → 跳转 |
| `src/styles.ts` | 注入样式，全部用 `--app-*` token |
| `docs/` | 需求、架构、模块设计三份规格 |
