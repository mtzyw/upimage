-- =============================================
-- 修复新用户注册送积分问题
-- =============================================

-- 1. 首先检查并修复现有新用户没有获得积分的问题
DO $$
DECLARE
    user_record RECORD;
BEGIN
    -- 查找所有没有 usage 记录的用户（可能是新注册但没获得积分的）
    FOR user_record IN 
        SELECT u.id, u.email, u.created_at
        FROM public.users u
        LEFT JOIN public.usage usage ON u.id = usage.user_id
        WHERE usage.id IS NULL
    LOOP
        -- 为这些用户创建积分记录
        PERFORM public.grant_one_time_credits_and_log(
            user_record.id,
            5,
            NULL
        );
        
        -- 更新积分日志类型
        UPDATE public.credit_logs 
        SET 
            type = 'welcome_bonus',
            notes = '新用户注册欢迎奖励（系统补发）'
        WHERE user_id = user_record.id 
            AND type = 'one_time_purchase' 
            AND amount = 5
            AND created_at >= now() - INTERVAL '1 minute';
            
        RAISE NOTICE 'Fixed credits for user: % (%)', user_record.email, user_record.id;
    END LOOP;
END $$;

-- 2. 更新 handle_new_user 函数，增加错误处理和日志
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_usage_id uuid;
    v_credit_log_id uuid;
BEGIN
    -- 1. 创建用户记录
    BEGIN
        INSERT INTO public.users (id, email, updated_at)
        VALUES (NEW.id, NEW.email, now());
        RAISE LOG 'Created user record for: %', NEW.email;
    EXCEPTION
        WHEN unique_violation THEN
            RAISE LOG 'User record already exists for: %', NEW.email;
    END;
    
    -- 2. 确保创建 usage 记录并赠送5积分
    BEGIN
        -- 使用 INSERT ... ON CONFLICT 确保总是有 usage 记录
        INSERT INTO public.usage (user_id, one_time_credits_balance, subscription_credits_balance)
        VALUES (NEW.id, 5, 0)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            one_time_credits_balance = public.usage.one_time_credits_balance + 5
        RETURNING id INTO v_usage_id;
        
        RAISE LOG 'Created/Updated usage record for user: %, usage_id: %', NEW.email, v_usage_id;
        
        -- 3. 记录积分日志
        INSERT INTO public.credit_logs(
            user_id, 
            amount, 
            one_time_balance_after, 
            subscription_balance_after, 
            type, 
            notes
        )
        SELECT 
            NEW.id,
            5,
            one_time_credits_balance,
            subscription_credits_balance,
            'welcome_bonus',
            '新用户注册欢迎奖励'
        FROM public.usage
        WHERE user_id = NEW.id
        RETURNING id INTO v_credit_log_id;
        
        RAISE LOG 'Created credit log for user: %, log_id: %', NEW.email, v_credit_log_id;
        
    EXCEPTION
        WHEN others THEN
            RAISE WARNING 'Failed to grant welcome credits to user % (%): %', NEW.email, NEW.id, SQLERRM;
            -- 不要让积分发放失败影响用户注册
    END;
    
    RETURN NEW;
END;
$$;

-- 3. 确保函数有正确的权限
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;

-- 4. 验证触发器存在且正确配置
DO $$
BEGIN
    -- 如果触发器不存在，重新创建
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
        RAISE NOTICE 'Recreated trigger on_auth_user_created';
    END IF;
END $$;

-- 5. 创建一个辅助函数用于手动补发积分（管理员使用）
CREATE OR REPLACE FUNCTION public.grant_welcome_bonus_manually(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_bonus integer;
BEGIN
    -- 检查是否已经有欢迎奖励
    SELECT COUNT(*) INTO v_existing_bonus
    FROM public.credit_logs
    WHERE user_id = p_user_id AND type = 'welcome_bonus';
    
    IF v_existing_bonus > 0 THEN
        RAISE NOTICE 'User % already has welcome bonus', p_user_id;
        RETURN false;
    END IF;
    
    -- 发放积分
    PERFORM public.grant_one_time_credits_and_log(p_user_id, 5, NULL);
    
    -- 更新日志类型
    UPDATE public.credit_logs 
    SET 
        type = 'welcome_bonus',
        notes = '新用户注册欢迎奖励（手动补发）'
    WHERE user_id = p_user_id 
        AND type = 'one_time_purchase' 
        AND amount = 5
        AND created_at >= now() - INTERVAL '1 minute';
    
    RETURN true;
END;
$$;

-- 6. 添加注释
COMMENT ON FUNCTION public.handle_new_user() IS '处理新用户注册：创建用户记录并赠送5积分欢迎奖励（增强版）';
COMMENT ON FUNCTION public.grant_welcome_bonus_manually(uuid) IS '手动为指定用户补发新用户欢迎奖励积分';