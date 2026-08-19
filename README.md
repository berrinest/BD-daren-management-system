# 星络 · BD达人管理系统

面向个人商务 BD 的达人拓展与跟进工作台。项目正在从 Phase 1 静态原型升级到 Phase 2 Web MVP。

## 当前阶段

Phase 2.1 工程基础：

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase SSR 客户端
- Supabase Auth 单账号登录骨架
- `profiles` 数据库 migration
- 受保护的应用 Layout
- 基础模块占位路由

达人库、任务、跟进记录和数据导入均未在本阶段实现。

## 本地运行

1. 安装依赖：

```powershell
pnpm install
```

2. 复制环境变量模板：

```powershell
Copy-Item .env.example .env.local
```

3. 在 `.env.local` 中填写 Supabase 项目地址和 Publishable Key。

4. 启动开发环境：

```powershell
pnpm dev
```

访问 `http://localhost:3000`。

## 验证命令

```powershell
pnpm lint
pnpm typecheck
pnpm build
```

## 数据库 migration

Migration 文件位于 `supabase/migrations/`。Phase 2.1 只创建与 `auth.users` 一对一关联的 `profiles` 表，不创建任何业务表。

## Phase 1 Demo

现有 `index.html`、`app.js`、`styles.css` 和 `v2.css` 暂时保留在仓库根目录。只有在 Next.js Preview 部署验证完成后，才会归档到 `legacy-demo/`。
