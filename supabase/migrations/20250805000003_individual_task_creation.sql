-- =============================================
-- 单个任务创建函数（用于解决时序问题）
-- =============================================

-- 函数：创建单个匿名任务记录
CREATE OR REPLACE FUNCTION public.create_individual_anonymous_task(
    p_freepik_task_id text,
    p_browser_fingerprint text,
    p_batch_id text,
    p_scale_factor text
) RETURNS boolean AS $$
BEGIN
    -- 创建单个任务记录
    INSERT INTO public.anonymous_tasks (
        freepik_task_id, 
        browser_fingerprint, 
        batch_id, 
        scale_factor
    )
    VALUES (
        p_freepik_task_id,
        p_browser_fingerprint,
        p_batch_id,
        p_scale_factor
    );
    
    RETURN true;
    
EXCEPTION
    WHEN unique_violation THEN
        -- 任务ID已存在，忽略错误
        RETURN false;
    WHEN OTHERS THEN
        -- 其他错误，重新抛出
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 修改批量创建函数，只处理试用资格检查
CREATE OR REPLACE FUNCTION public.use_trial_for_batch(
    p_browser_fingerprint text
) RETURNS jsonb AS $$
DECLARE
    eligibility_result jsonb;
BEGIN
    -- 检查试用资格
    SELECT public.check_anonymous_trial_eligibility(p_browser_fingerprint) INTO eligibility_result;
    
    IF NOT (eligibility_result->>'eligible')::boolean THEN
        RETURN eligibility_result;
    END IF;
    
    -- 记录试用使用
    INSERT INTO public.trial_usage_records (browser_fingerprint)
    VALUES (p_browser_fingerprint);
    
    RETURN jsonb_build_object(
        'success', true,
        'message', '试用资格验证通过'
    );
    
EXCEPTION
    WHEN unique_violation THEN
        IF SQLERRM LIKE '%trial_usage_records_pkey%' THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'already_used',
                'message', '该设备已使用过免费试用'
            );
        ELSE
            RAISE;
        END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权函数执行权限
GRANT EXECUTE ON FUNCTION public.create_individual_anonymous_task(text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.use_trial_for_batch(text) TO service_role;