# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用开发命令

### 基本命令
- `npm run dev` - 启动开发服务器 
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行 ESLint 代码检查

### 数据库命令 (Supabase)
- `npm run db:push` - 推送数据库迁移
- `npm run db:reset` - 重置数据库
- `npm run db:gen-types` - 生成 TypeScript 类型定义
- `npm run db:update` - 推送迁移并重新生成类型 (组合命令)
- `npm run db:new-migration` - 创建新的数据库迁移

### 分析工具
- `npm run analyze` - 分析构建产物大小

### 数据库登录和链接
- `npm run db:login` - 登录 Supabase CLI
- `npm run db:link` - 链接本地项目到 Supabase 项目

## 项目架构

### 核心技术栈
- **Next.js 15** + **React 19** - 前端框架，使用 App Router
- **Supabase** - 后端服务（数据库、认证、存储）
- **Stripe** - 支付系统
- **Tailwind CSS** - 样式框架
- **TypeScript** - 类型安全
- **next-intl** - 国际化（支持英文、中文、日文）

### 目录结构说明

#### 核心应用目录
- `app/` - Next.js 15 App Router 应用目录
  - `[locale]/` - 国际化路由
  - `api/` - API 路由
  - `auth/` - 认证相关页面和 API
- `actions/` - Server Actions，包含业务逻辑
- `components/` - React 组件库
  - `ui/` - shadcn/ui 基础组件
  - 其他目录按功能模块组织

#### 配置和工具
- `lib/` - 工具函数和第三方服务集成
  - `supabase/` - Supabase 客户端和类型
  - `stripe/` - Stripe 支付集成
  - `email.ts` - 邮件服务
- `config/` - 配置文件
  - `models.ts` - AI 模型配置
  - `site.ts` - 站点配置
- `types/` - TypeScript 类型定义

#### 内容和资源
- `blogs/` - MDX 博客文章（按语言分类）
- `content/` - 静态页面内容（隐私政策、服务条款）
- `i18n/` - 国际化消息文件
- `public/` - 静态资源

### 关键架构特点

#### 国际化 (i18n)
- 使用 `next-intl` 实现多语言支持
- 路径格式：`/[locale]/page`，支持 `en`、`zh`、`ja`
- 消息文件位于 `i18n/messages/[locale]/`

#### 认证和授权
- Supabase Auth 处理用户认证
- 管理员权限通过 `lib/supabase/isAdmin.ts` 检查
- 受保护路由使用 `middleware.ts` 进行权限控制

#### 数据库架构
- 使用 Supabase PostgreSQL 数据库
- 类型定义自动生成到 `lib/supabase/types.ts`
- 主要表：`users`、`pricing_plans`、`orders`、`subscriptions`、`credit_logs`、`posts`

#### AI 集成
- 支持多个 AI 提供商：OpenAI、Anthropic、DeepSeek、Google、XAI、Replicate
- 模型配置在 `config/models.ts` 中定义
- AI 功能演示页面：`app/[locale]/ai-demo/`

#### 支付系统
- 完整的 Stripe 集成，支持订阅和一次性付款
- Webhook 处理在 `app/api/stripe/webhook/route.ts`
- 价格计划管理在管理员面板中

#### 内容管理
- 支持 MDX 博客系统，具有多语言支持
- 图片上传到 Cloudflare R2 存储
- 管理员可以通过仪表板管理内容

#### 图片增强功能
- 集成 Freepik API 进行图片增强处理
- 支持异步任务状态跟踪（`app/api/enhance/` 相关 API）
- R2 存储用于处理后的图片文件管理

### 开发注意事项

#### TypeScript 规范
- 使用 TypeScript 严格模式，尽量使用 `unknown` 而非 `any`
- 对象形状用 `interface`，联合/交集/工具类型用 `type`
- 函数需要显式返回类型，特别是公共 API
- 导入顺序：React/Next.js → 外部库 → 内部绝对路径 → 相对路径
- 使用 `import type { ... }` 进行类型导入
- 避免类型断言，优先使用类型守卫

#### Next.js 最佳实践
- 优先使用 React Server Components，仅在需要交互性时使用 Client Components
- 在 Server Components 中获取数据，使用 `async/await`
- 使用 `next/link` 进行内部导航，`next/image` 进行图像优化
- 利用 Server Actions 处理表单提交和数据变更
- 使用内置的错误处理（`error.tsx`）和加载状态（`loading.tsx`）

#### 国际化要求
- 所有用户可见字符串必须国际化，包括错误消息和验证提示
- Server 组件使用 `getTranslations`，Client 组件使用 `useTranslations`
- 翻译文件位于 `i18n/messages/[locale]/`
- 动态值使用插值：`t('greeting', { name })`
- 新增文本需在所有支持语言（en、zh、ja）中提供翻译

#### 认证和授权
- 使用 `useAuth()` hook 访问认证功能
- Server 组件中使用 `createClient()` 获取 Supabase 客户端
- 用户角色存储在 Supabase `users` 表中
- 受保护路由通过 `middleware.ts` 处理

#### 其他规范
- 路径别名：`@/*` 指向项目根目录
- 所有新功能应遵循现有的文件组织结构
- 数据库更改需要创建迁移文件
- 项目目前没有配置测试框架

#### 中间件和路由
- 使用 `middleware.ts` 处理国际化路由和 Supabase 认证
- 支持路径：`/`、`/(en|zh|ja)/:path*`
- 自动重定向到合适的语言版本
- 排除 API 路由、静态资源等不需要处理的路径

## 环境配置

### 必需的环境变量
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥

### 可选服务配置
- **AI 提供商**：OpenAI、DeepSeek、Anthropic、XAI、Google、Replicate、OpenRouter
- **支付系统**：Stripe 配置（密钥、Webhook 密钥）
- **邮件服务**：Resend API 配置
- **存储服务**：Cloudflare R2 配置
- **下载代理**：Cloudflare Worker 配置（用于图片下载中转，提升性能和避免CORS）
- **分析工具**：Google Analytics、Baidu Tongji、Plausible
- **限流服务**：Upstash Redis 配置

参考 `.env.example` 文件了解完整的环境变量配置。