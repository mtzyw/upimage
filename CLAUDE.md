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

### 开发注意事项
- 该项目使用 TypeScript 严格模式
- 路径别名：`@/*` 指向项目根目录
- 所有新功能应遵循现有的文件组织结构
- 数据库更改需要创建迁移文件
- 国际化：新的 UI 文本需要添加到所有语言的消息文件中