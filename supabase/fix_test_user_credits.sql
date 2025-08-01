-- 为测试用户手动补发积分
SELECT public.grant_welcome_bonus_manually('3c7ccfb7-c49d-45ce-b47d-a6162e4f3e69'::uuid);

-- 验证积分是否到账
SELECT 
    u.email,
    usage.one_time_credits_balance,
    usage.subscription_credits_balance,
    usage.one_time_credits_balance + usage.subscription_credits_balance as total_credits
FROM public.users u
JOIN public.usage usage ON u.id = usage.user_id
WHERE u.id = '3c7ccfb7-c49d-45ce-b47d-a6162e4f3e69';

-- 查看积分日志
SELECT 
    type,
    amount,
    notes,
    one_time_balance_after,
    created_at
FROM public.credit_logs
WHERE user_id = '3c7ccfb7-c49d-45ce-b47d-a6162e4f3e69'
ORDER BY created_at DESC;