-- 调试新用户积分问题的 SQL 查询

-- 1. 检查最近注册的用户及其积分情况
SELECT 
    u.id as user_id,
    u.email,
    u.created_at as user_created_at,
    u.role,
    usage.id as usage_id,
    usage.one_time_credits_balance,
    usage.subscription_credits_balance,
    usage.created_at as usage_created_at
FROM public.users u
LEFT JOIN public.usage usage ON u.id = usage.user_id
WHERE u.email = 'jfujdkakedx@gmail.com'
ORDER BY u.created_at DESC;

-- 2. 检查该用户的积分日志
SELECT 
    cl.id,
    cl.user_id,
    cl.amount,
    cl.type,
    cl.notes,
    cl.one_time_balance_after,
    cl.subscription_balance_after,
    cl.created_at
FROM public.credit_logs cl
WHERE cl.user_id = '3c7ccfb7-c49d-45ce-b47d-a6162e4f3e69'
ORDER BY cl.created_at DESC;

-- 3. 检查所有 welcome_bonus 类型的记录
SELECT 
    cl.user_id,
    u.email,
    cl.amount,
    cl.type,
    cl.notes,
    cl.created_at
FROM public.credit_logs cl
JOIN public.users u ON cl.user_id = u.id
WHERE cl.type = 'welcome_bonus'
ORDER BY cl.created_at DESC
LIMIT 10;

-- 4. 检查 handle_new_user 函数的当前定义
\df+ public.handle_new_user

-- 5. 检查触发器是否正确绑定
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 6. 手动为该用户创建积分记录（如果没有的话）
-- 注意：这只是临时解决方案，需要找出根本原因
/*
-- 如果需要手动修复，执行以下命令：
SELECT public.grant_one_time_credits_and_log(
    '3c7ccfb7-c49d-45ce-b47d-a6162e4f3e69'::uuid,
    5,
    NULL
);

-- 然后更新日志类型
UPDATE public.credit_logs 
SET 
    type = 'welcome_bonus',
    notes = '新用户注册欢迎奖励（手动补发）'
WHERE user_id = '3c7ccfb7-c49d-45ce-b47d-a6162e4f3e69'
    AND type = 'one_time_purchase' 
    AND amount = 5
    AND created_at >= now() - INTERVAL '1 minute';
*/