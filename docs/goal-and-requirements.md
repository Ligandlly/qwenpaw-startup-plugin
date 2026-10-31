---
id: goal-and-requirements
type: goal-and-requirements
title: QwenPaw 启动页插件 — 目标与需求
status: active
tags: [qwenpaw, frontend-plugin, startup]
---

# QwenPaw 启动页插件

一个 QwenPaw 前端插件：把聊天首页的欢迎区换成「启动页」——列出现有智能体，选一个、点启动，直接进入这个智能体的全新对话。

## 现状

QwenPaw 的多智能体入口藏在左上角的智能体选择器里。新建对话默认落在「上次使用的智能体」，想换人得先离开对话、去选择器里挑、再回来。对刚装好一堆智能体的人，第一屏看不出这台机器上有哪些智能体、各自能干什么；对团队共享的部署，新人第一次打开更是没有任何引导。

## 目标 {#goals}

- 打开聊天首页，一眼看到所有可用的智能体，知道每个是干什么的。
- 选中一个智能体、点「启动对话」，立刻落在它的空白新对话里，不用再去左上角切换。
- 看起来就是 QwenPaw 自己的首页：原生设计 token、原生主题（明/暗）、原生圆角与排版，不引入新视觉语言。

## 能力 {#capabilities}

- **启动页替换欢迎区**：插件注册 `chat.welcome.render`，接管原生聊天首页欢迎区；没有注册时宿主显示原生欢迎语。
- **智能体卡片列表**：每个智能体一张卡片 —— 名称、描述、头像（无头像字段，由名称首字 + 确定性配色生成）。停用的智能体置灰且不可启动。
- **双列网格**：卡片两列铺开，超过容器高度在区域内滚动，不做搜索框。
- **选择 + 启动**：单击卡片只做选中（高亮 + 勾选），再点「启动对话」才切换当前智能体并进入它的一条全新空白对话。
- **每个标签页只拦一次**：启动过一次后，本标签页再点「新建对话」不再出现启动页；新标签页重新开始。
- **不接管输入框**：启动页只替换上方欢迎区，下方 composer 照常可用 —— 直接输入就是「不选，用当前智能体开始」，与原生一致。
- **中英双语**：跟随宿主语言，文案 zh / en 各一套。
- **明暗主题**：跟随宿主当前主题，颜色全部取自原生 token。

## 非目标 {#non-goals}

- 不改宿主代码：只走公开的插件扩展点（`window.QwenPaw`），宿主仓库一行不动。
- 不做智能体管理：不新增、不编辑、不启停、不排序智能体 —— 这些留在原生 `/agents` 页。
- 不做会话管理：不列历史会话、不删会话，历史仍走原生侧边栏。
- 不展示模型信息：卡片上不出现模型名、后端类型、工具数量。

## 技术要点 {#tech-notes}

- **形态**：纯前端插件（`type: frontend`，`entry.frontend: "dist/index.js"`），TypeScript + Vite lib 构建，`react` / `react-dom` 走 external，React、antd 从 `window.QwenPaw.host` 取，不打包。
- **挂载点**：`window.QwenPaw.chat.welcome.render(pluginId, fn)`。宿主会用插件返回的组件整体替换 `<ChatWelcome>`，props 只有 `{ greeting, description, avatar, prompts, onSubmit }` —— 不含智能体信息，也没有切换智能体的能力。
- **智能体数据**：`GET /api/agents` → `AgentListResponse.agents: AgentSummary[]`（`id` / `name` / `description` / `enabled` / `backend` / …）。
- **跨智能体启动**：宿主没给插件 `setSelectedAgent` 或 `navigate`。做法是写宿主自己的持久化键（`qwenpaw-last-used-agent`、`qwenpaw-agent-storage` 里的 `state.selectedAgent`）后跳转 `/chat`，让宿主 store 重新水合 —— 这会带来一次整页重载（约 1 秒），用户已确认接受。
- **会话新建**：复用宿主的既有约定（`qwenpaw_pending_new_chat` 标志 / `qwenpaw:sidebar-new-chat` 事件），插件不自己造会话。
- **「只拦一次」的实现**：启动时在标签页级的 `sessionStorage` 打标；页面重载后插件读到标记就不再注册 `welcome.render`，由宿主显示自己的原生欢迎区 —— 和手工切换智能体的结果像素级一致，插件也不用再维护一套欢迎语。

_(inferred: 样式用注入 `<style>` + `.qpst-*` 类名，参考 qwenpaw-preview-plugin 的 styles.ts 做法；不引入 CSS-in-JS 依赖)_
