# BD 达人资源采集插件 MVP

Chrome 与 Edge 通用的 Manifest V3 插件。第一阶段仅对用户主动打开的抖音公开达人主页进行一次性读取，不自动浏览、不模拟操作，也不直接连接 Supabase。

## 本地安装

1. 打开 Chrome 的 `chrome://extensions`，或 Edge 的 `edge://extensions`。
2. 开启“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本项目的 `browser-extension` 目录。

## 使用流程

1. 在浏览器中打开一个抖音公开达人主页。
2. 点击工具栏中的“BD 达人资源采集”。
3. 检查并按需修改昵称、账号、粉丝数和简介。
4. 保持已登录的 BD 系统标签页打开。
5. 点击“采集到资源池”，由已登录页面在后台完成保存。

插件固定连接 `https://bd-daren-management-system.vercel.app`，不保存登录 Token。微信账号为可选手动输入项，不会从达人公开主页自动识别。

## 权限说明

- `activeTab`：仅在用户点击插件后访问当前标签页。
- `host_permissions`：仅用于识别已打开的 BD 系统标签页，并将采集数据交给该已登录页面保存；不读取登录 Token。
- `content script`：只在抖音 `/user/` 达人主页加载；收到 Popup 的主动采集消息后才读取公开页面信息。
插件不会后台持续采集页面，也不会读取或保存登录 Token。

## Agent 任务面板

扩展版本 0.2.0 增加了 Side Panel 任务面板。点击 Popup 底部的“今日任务”即可打开。

任务面板通过已登录的 BD 系统标签页访问 Agent API：

1. 拉取今日待执行任务。
2. 人工点击领取任务。
3. 用户在浏览器外或目标页面完成人工操作。
4. 用户选择执行结果并确认回传。

扩展不会保存 Supabase Token 或 Cookie，不会直接连接数据库，也不会自动点击页面或操作微信。`agent_id` 是保存在 `chrome.storage.local` 的本地随机标识，仅用于区分执行器，不是安全身份。
