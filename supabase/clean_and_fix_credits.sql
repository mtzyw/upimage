-- 清理并修复积分系统的脚本
-- 这个脚本会保留用户数据，只修复积分相关的问题

-- 1. 先备份现有用户（以防万一）
CREATE TEMP TABLE temp_users_backup AS 
SELECT * FROM public.users;

-- 2. 删除现有的 handle_new_user 函数和触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. 创建正确的 handle_new_user 函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- 创建用户记录
    INSERT INTO public.users (id, email, updated_at)
    VALUES (NEW.id, NEW.email, now())
    ON CONFLICT (id) DO NOTHING;
    
    -- 直接创建 usage 记录并赠送5积分
    INSERT INTO public.usage (user_id, one_time_credits_balance, subscription_credits_balance)
    VALUES (NEW.id, 5, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
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
        NEW.id,
        5,
        5,
        0,
        'welcome_bonus',
        '新用户注册欢迎奖励'
    );
    
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        RAISE LOG 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$;

-- 4. 重新创建触发器
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. 修复所有现有用户的积分
DO $$
DECLARE
    user_record RECORD;
    v_has_usage BOOLEAN;
    v_has_welcome_bonus BOOLEAN;
BEGIN
    -- 遍历所有用户
    FOR user_record IN 
        SELECT id, email FROM public.users
    LOOP
        -- 检查是否有 usage 记录
        SELECT EXISTS(SELECT 1 FROM public.usage WHERE user_id = user_record.id) INTO v_has_usage;
        
        -- 检查是否有欢迎奖励
        SELECT EXISTS(
            SELECT 1 FROM public.credit_logs 
            WHERE user_id = user_record.id AND type = 'welcome_bonus'
        ) INTO v_has_welcome_bonus;
        
        -- 如果没有 usage 记录，创建一个
        IF NOT v_has_usage THEN
            INSERT INTO public.usage (user_id, one_time_credits_balance, subscription_credits_balance)
            VALUES (user_record.id, 5, 0);
            
            RAISE NOTICE 'Created usage record for user: %', user_record.email;
        END IF;
        
        -- 如果没有欢迎奖励记录，创建一个
        IF NOT v_has_welcome_bonus THEN
            -- 确保用户有5积分
            UPDATE public.usage 
            SET one_time_credits_balance = GREATEST(one_time_credits_balance, 5)
            WHERE user_id = user_record.id;
            
            -- 添加积分日志
            INSERT INTO public.credit_logs(
                user_id, 
                amount, 
                one_time_balance_after, 
                subscription_balance_after, 
                type, 
                notes
            )
            SELECT 
                user_record.id,
                5,
                one_time_credits_balance,
                subscription_credits_balance,
                'welcome_bonus',
                '新用户注册欢迎奖励（系统补发）'
            FROM public.usage
            WHERE user_id = user_record.id;
            
            RAISE NOTICE 'Added welcome bonus for user: %', user_record.email;
        END IF;
    END LOOP;
END $$;

-- 6. 验证修复结果
SELECT 
    u.email,
    u.created_at as user_created,
    usage.one_time_credits_balance,
    usage.subscription_credits_balance,
    (SELECT COUNT(*) FROM credit_logs cl WHERE cl.user_id = u.id AND cl.type = 'welcome_bonus') as welcome_bonus_count
FROM public.users u
LEFT JOIN public.usage usage ON u.id = usage.user_id
ORDER BY u.created_at DESC;