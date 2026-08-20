# BD 达人管理系统开发规则

## 1. 产品定位

本项目是面向个人商务 BD 的达人拓展与跟进工作台，不是通讯录、通用 CRM 或微信自动化工具。

所有功能应优先服务以下每日工作闭环：

1. 快速录入新发现的达人资源。
2. 知道今天需要联系谁。
3. 记录联系或完成任务的结果。
4. 安排下一次处理时间。
5. 将已通过的资源转入正式达人库并保留完整历史。

不要为未来商业 SaaS 提前增加团队权限、收费、合同、财务或复杂 CRM 能力。

## 2. 技术栈

- Next.js 16 App Router
- React 19
- TypeScript（严格类型）
- Tailwind CSS 4
- Supabase PostgreSQL
- Supabase Auth 与 `@supabase/ssr`
- Zod 表单与输入校验
- pnpm
- Vercel 部署

不要引入 Redux、Zustand、React Query 或其他状态管理库，除非用户明确批准且现有架构无法合理解决问题。

## 3. 目录与职责

- `src/app/`：App Router 页面、Layout 和 Server Actions。
- `src/components/`：按业务域拆分的 UI 组件。
- `src/lib/constants/`：状态、类型、平台和中文标签等统一常量。
- `src/lib/validations/`：Zod schema，所有写操作必须在服务端重新校验。
- `src/lib/data/`：可复用的只读查询。
- `src/lib/supabase/`：Supabase 客户端工厂，不要重复实现连接逻辑。
- `src/types/database.ts`：远程 Supabase Schema 生成的数据库类型。
- `supabase/migrations/`：数据库结构、约束、RLS、索引和 RPC 的唯一变更入口。

新文件应放在对应业务域，不要创建笼统的 `utils.ts` 或巨型通用组件。

## 4. Next.js 开发规则

- 页面和数据读取默认使用 Server Component。
- 只有交互状态、浏览器 API 或即时表单反馈需要 Client Component。
- 写操作默认使用 Server Action，不要为内部表单额外新建 API Route。
- Server Action 成功后应对所有受影响页面调用 `revalidatePath`。
- URL 查询参数必须先校验；无效或过期参数应显示友好提示，不应暴露数据库错误。
- 表单必须有 pending/禁用状态，避免重复提交。
- 优先使用现有设计语言和 Tailwind 类，不要随意引入新 UI 框架。

## 5. 认证与数据安全

- 服务端通过现有 Supabase server client 访问数据。
- Server Action 必须通过 `supabase.auth.getClaims()` 获取当前用户。
- 绝不接受或信任客户端传入的 `user_id`。
- 所有业务查询和更新都应显式限定当前 `user_id`，并依赖 RLS 作为最终保护。
- 关联数据应使用带 `user_id` 的组合外键，防止跨用户关联。
- 错误信息不得暴露 SQL、内部 ID 关系或敏感环境变量。

## 6. 数据库与 Migration

- 所有业务表统一包含 `id`、`user_id`、`created_at`、`updated_at`。
- 不得通过 Table Editor 手动修改结构；所有结构变更必须使用新 migration。
- 不得改写已同步到远程的 migration；修正必须新建后续 migration。
- 时间戳式 migration 文件名应与现有顺序保持一致。
- 新表必须显式启用 RLS，先 `revoke all`，再只授予 MVP 需要的权限。
- MVP 中默认不开放物理删除；需要删除时必须明确评估数据恢复和关联影响。
- 跨多张表的工作闭环必须由 PostgreSQL RPC 保证事务一致。
- RPC 默认使用 `security invoker` 和 `set search_path = ''`；禁止使用 `security definer` 绕过 RLS。
- RPC 不接收 `user_id`，必须在函数内使用 `auth.uid()`。
- 新增 RPC 后要撤销 `public` 和 `anon` 权限，仅在需要时授予 `authenticated` 执行权。
- 正式 `db push` 前必须先运行 `pnpm exec supabase db push --linked --dry-run`，审核 SQL、冲突、RLS、外键、索引和回填影响。
- 除非任务明确要求同步远程，创建 migration 后不要自动执行正式 `db push`。
- 远程 Schema 变化后应重新生成 `src/types/database.ts`，并单独检查类型 diff。

## 7. 业务数据规则

- `talent_resources`：正式跟进前的资源池。
- `resource_contact_records`：资源转达人前的联系历史。
- `talents`：正式达人主档。
- `tasks`：待执行的 BD 行动，使用 `pending` / `completed` / `cancelled` 管理生命周期。
- `follow_up_records`：达人的只追加历史时间轴。

资源转达人、完成任务并记录时间轴等流程不得拆成多个互不保证原子性的客户端请求。历史数据回填必须幂等，不得生成重复时间轴记录。

## 8. 产品与交互原则

- Dashboard 是今日行动入口，不是数据大屏。
- 优先减少每日重复点击、重复填写和页面跳转。
- 表单默认值应符合高频 BD 场景，同时允许用户修改。
- 成功、失败、跳过、自动转换和自动建任务都必须有明确反馈。
- 详情页优先展示当前需要执行的操作，历史信息作为只读时间轴。
- 不要重复创建可以由已有状态、任务或时间轴推导的字段。

## 9. 明确禁止范围

未经用户明确要求，不开发：

- 微信自动添加、自动发送消息或微信 Hook。
- 自动抓取达人数据或浏览器插件。
- AI 自动聊天或未经确认的自动执行。
- 团队权限、企业组织和多租户管理界面。
- SaaS 收费、合同、财务和复杂报表系统。

## 10. 修改流程

开始修改前：

1. 检查 `git status`，不覆盖用户未提交的修改。
2. 先阅读相关路由、组件、Server Action、Zod schema 和 migration。
3. 向用户说明修改计划、涉及文件、数据结构变化和验证方式。
4. 不重复实现已有常量、校验、数据查询或 RPC。

完成修改后必须运行：

```bash
pnpm typecheck
pnpm lint
pnpm build
```

涉及 migration 时还必须先运行：

```bash
pnpm exec supabase db push --linked --dry-run
```

交付时说明：

- 修改文件。
- 修改原因和实现结果。
- 数据库是否已实际同步。
- 风险和未验证项。
- typecheck、lint 和 build 结果。

## 11. Git 规则

- 每一个完整阶段或独立修改创建一个本地 commit。
- commit message 使用简洁的 Conventional Commit 格式，例如 `feat:`、`fix:`、`chore:`、`test:`。
- commit 前运行 `git status`、`git diff --check` 并审阅变更范围。
- 数据库自动生成类型若是唯一变化，应单独提交。
- 除非用户明确要求，不要执行 `git push`。
- 不要使用 `git reset --hard`、`git checkout --` 或其他可能覆盖用户工作的命令。
