-- 调试 Auth 触发器问题

-- 1. 检查 auth.users 表中的用户
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'avatar_url' as avatar_url
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. 检查 public.users 表中的用户
SELECT 
    id,
    email,
    created_at,
    full_name,
    avatar_url,
    role
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- 3. 查找在 auth.users 但不在 public.users 的用户（这些是有问题的）
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created_at,
    au.last_sign_in_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- 4. 检查触发器状态
SELECT 
    trigger_name,
    event_manipulation,
    event_object_schema,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth' 
    AND event_object_table = 'users'
    AND trigger_name = 'on_auth_user_created';

-- 5. 检查 handle_new_user 函数是否存在
SELECT 
    routine_name,
    routine_type,
    routine_schema
FROM information_schema.routines
WHERE routine_name = 'handle_new_user' 
    AND routine_schema = 'public';

-- 6. 手动为缺失的用户创建记录
DO $$
DECLARE
    auth_user RECORD;
BEGIN
    -- 查找所有在 auth.users 但不在 public.users 的用户
    FOR auth_user IN 
        SELECT 
            au.id,
            au.email,
            au.created_at,
            au.raw_user_meta_data->>'full_name' as full_name,
            au.raw_user_meta_data->>'avatar_url' as avatar_url
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL
    LOOP
        -- 创建 public.users 记录
        INSERT INTO public.users (id, email, full_name, avatar_url, updated_at)
        VALUES (
            auth_user.id, 
            auth_user.email,
            auth_user.full_name,
            auth_user.avatar_url,
            now()
        );
        
        -- 创建 usage 记录并赠送5积分
        INSERT INTO public.usage (user_id, one_time_credits_balance, subscription_credits_balance)
        VALUES (auth_user.id, 5, 0);
        
        -- 记录积分日志
        INSERT INTO public.credit_logs(
            user_id, 
            amount, 
            one_time_balance_after, 
            subscription_balance_after, 
            type, 
            notes
        )
        VALUES (
            auth_user.id,
            5,
            5,
            0,
            'welcome_bonus',
            '新用户注册欢迎奖励（修复补发）'
        );
        
        RAISE NOTICE 'Fixed user: % (%)', auth_user.email, auth_user.id;
    END LOOP;
END $$;

-- 7. 重新创建触发器（确保它存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- 8. 验证修复结果
SELECT 
    'Auth Users' as table_name,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Public Users' as table_name,
    COUNT(*) as count
FROM public.users
UNION ALL
SELECT 
    'Users with Usage' as table_name,
    COUNT(*) as count
FROM public.usage
UNION ALL
SELECT 
    'Users with Welcome Bonus' as table_name,
    COUNT(DISTINCT user_id) as count
FROM public.credit_logs
WHERE type = 'welcome_bonus';