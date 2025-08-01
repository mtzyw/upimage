-- ⚠️ 警告：这将删除所有数据！请确保已备份重要数据 ⚠️
-- 
-- 完全重置数据库的 SQL 脚本
-- 请在 Supabase SQL Editor 中执行

-- 1. 禁用所有触发器
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- 2. 删除所有相关表的数据（按依赖顺序）
TRUNCATE TABLE public.credit_logs CASCADE;
TRUNCATE TABLE public.image_enhancement_tasks CASCADE;
TRUNCATE TABLE public.posts CASCADE;
TRUNCATE TABLE public.usage CASCADE;
TRUNCATE TABLE public.subscriptions CASCADE;
TRUNCATE TABLE public.orders CASCADE;
TRUNCATE TABLE public.pricing_plans CASCADE;
TRUNCATE TABLE public.users CASCADE;
TRUNCATE TABLE public.freepik_api_keys CASCADE;

-- 3. 删除所有自定义函数
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.grant_welcome_bonus_manually(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.deduct_credits_and_log(uuid, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.grant_one_time_credits_and_log(uuid, integer, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.grant_subscription_credits_and_log(uuid, integer, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.initialize_or_reset_yearly_allocation(uuid, integer, integer, timestamptz, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.allocate_specific_monthly_credit_for_year_plan(uuid, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.revoke_credits_and_log(uuid, integer, integer, text, text, uuid, boolean, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.get_available_freepik_api_key() CASCADE;
DROP FUNCTION IF EXISTS public.update_my_profile(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- 4. 重新启用触发器（会在迁移中重新创建）
-- ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- 5. 清理 auth.users 表（可选，如果你想删除所有用户）
-- ⚠️ 注意：这会删除所有用户账号！
-- DELETE FROM auth.users;

-- 完成！现在可以重新运行 npm run db:push 来应用所有迁移