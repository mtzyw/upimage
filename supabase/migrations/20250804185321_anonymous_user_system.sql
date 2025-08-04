-- =============================================
-- 创建匿名用户试用系统
-- =============================================

-- 表一：试用记录表
-- 记录哪些浏览器指纹已经使用过免费试用（永久记录，防重复使用）
CREATE TABLE public.trial_usage_records (
    browser_fingerprint text PRIMARY KEY,
    used_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.trial_usage_records IS '记录已使用免费试用的浏览器指纹，防止重复使用';
COMMENT ON COLUMN public.trial_usage_records.browser_fingerprint IS '浏览器指纹，作为唯一标识';
COMMENT ON COLUMN public.trial_usage_records.used_at IS '首次使用试用的时间';

-- 创建索引
CREATE INDEX idx_trial_usage_records_used_at ON public.trial_usage_records(used_at);

-- 表二：匿名任务表  
-- 管理匿名用户的任务状态和结果
CREATE TABLE public.anonymous_tasks (
    freepik_task_id text PRIMARY KEY,
    browser_fingerprint text NOT NULL,
    status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    result_data jsonb DEFAULT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.anonymous_tasks IS '管理匿名用户的任务执行状态和结果';
COMMENT ON COLUMN public.anonymous_tasks.freepik_task_id IS 'Freepik API 返回的任务ID，作为主键';
COMMENT ON COLUMN public.anonymous_tasks.browser_fingerprint IS '提交任务的浏览器指纹';
COMMENT ON COLUMN public.anonymous_tasks.status IS '任务状态：processing(处理中), completed(已完成), failed(失败)';
COMMENT ON COLUMN public.anonymous_tasks.result_data IS '任务结果数据，完成时存储结果';
COMMENT ON COLUMN public.anonymous_tasks.created_at IS '任务创建时间';

-- 创建索引
CREATE INDEX idx_anonymous_tasks_fingerprint ON public.anonymous_tasks(browser_fingerprint);
CREATE INDEX idx_anonymous_tasks_status ON public.anonymous_tasks(status);
CREATE INDEX idx_anonymous_tasks_created_at ON public.anonymous_tasks(created_at);

-- 启用行级安全
ALTER TABLE public.trial_usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_tasks ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
-- 试用记录表策略：只能通过函数访问
CREATE POLICY "Trial records managed by functions only" 
ON public.trial_usage_records FOR ALL USING (false);

-- 匿名任务表策略：只能通过函数访问
CREATE POLICY "Anonymous tasks managed by functions only" 
ON public.anonymous_tasks FOR ALL USING (false);

-- 授权给服务角色
GRANT ALL ON public.trial_usage_records TO service_role;
GRANT ALL ON public.anonymous_tasks TO service_role;

-- =============================================
-- 创建业务函数
-- =============================================

-- 函数1：检查试用资格
CREATE OR REPLACE FUNCTION public.check_anonymous_trial_eligibility(
    p_browser_fingerprint text
) RETURNS jsonb AS $$
DECLARE
    already_used boolean;
BEGIN
    -- 检查该指纹是否已使用过试用
    SELECT EXISTS(
        SELECT 1 FROM public.trial_usage_records 
        WHERE browser_fingerprint = p_browser_fingerprint
    ) INTO already_used;
    
    IF already_used THEN
        RETURN jsonb_build_object(
            'eligible', false,
            'reason', 'already_used',
            'message', '该设备已使用过免费试用'
        );
    ELSE
        RETURN jsonb_build_object(
            'eligible', true,
            'reason', 'new_user',
            'message', '可以使用免费试用'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数2：使用试用并创建任务
CREATE OR REPLACE FUNCTION public.use_trial_and_create_task(
    p_browser_fingerprint text,
    p_freepik_task_id text
) RETURNS jsonb AS $$
DECLARE
    eligibility_result jsonb;
BEGIN
    -- 检查试用资格
    SELECT public.check_anonymous_trial_eligibility(p_browser_fingerprint) INTO eligibility_result;
    
    -- 如果不符合条件，直接返回
    IF NOT (eligibility_result->>'eligible')::boolean THEN
        RETURN eligibility_result;
    END IF;
    
    -- 记录试用使用
    INSERT INTO public.trial_usage_records (browser_fingerprint)
    VALUES (p_browser_fingerprint);
    
    -- 创建任务记录
    INSERT INTO public.anonymous_tasks (freepik_task_id, browser_fingerprint)
    VALUES (p_freepik_task_id, p_browser_fingerprint);
    
    RETURN jsonb_build_object(
        'success', true,
        'task_id', p_freepik_task_id,
        'message', '试用已开始，任务已创建'
    );
    
EXCEPTION
    WHEN unique_violation THEN
        -- 处理并发情况下的重复插入
        IF SQLERRM LIKE '%trial_usage_records_pkey%' THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'already_used',
                'message', '该设备已使用过免费试用'
            );
        ELSIF SQLERRM LIKE '%anonymous_tasks_pkey%' THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'task_exists',
                'message', '任务ID已存在'
            );
        ELSE
            RAISE;
        END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数3：更新任务状态
CREATE OR REPLACE FUNCTION public.update_anonymous_task_status(
    p_freepik_task_id text,
    p_status text,
    p_result_data jsonb DEFAULT NULL
) RETURNS boolean AS $$
BEGIN
    -- 验证状态值
    IF p_status NOT IN ('processing', 'completed', 'failed') THEN
        RAISE EXCEPTION 'Invalid status: %', p_status;
    END IF;
    
    -- 更新任务状态
    UPDATE public.anonymous_tasks
    SET status = p_status,
        result_data = COALESCE(p_result_data, result_data)
    WHERE freepik_task_id = p_freepik_task_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数4：查询任务状态
CREATE OR REPLACE FUNCTION public.get_anonymous_task_status(
    p_freepik_task_id text
) RETURNS jsonb AS $$
DECLARE
    task_record public.anonymous_tasks%ROWTYPE;
BEGIN
    -- 查询任务记录
    SELECT * INTO task_record
    FROM public.anonymous_tasks
    WHERE freepik_task_id = p_freepik_task_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'found', false,
            'message', '任务不存在'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'found', true,
        'task_id', task_record.freepik_task_id,
        'browser_fingerprint', task_record.browser_fingerprint,
        'status', task_record.status,
        'result_data', task_record.result_data,
        'created_at', task_record.created_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数5：清理过期任务（可选）
CREATE OR REPLACE FUNCTION public.cleanup_expired_anonymous_tasks(
    p_hours_old integer DEFAULT 48
) RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- 删除指定小时数之前创建的已完成任务
    DELETE FROM public.anonymous_tasks 
    WHERE status IN ('completed', 'failed')
    AND created_at < (now() - (p_hours_old || ' hours')::interval);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 删除超过24小时的处理中任务（可能是僵尸任务）
    DELETE FROM public.anonymous_tasks 
    WHERE status = 'processing'
    AND created_at < (now() - interval '24 hours');
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权函数执行权限
GRANT EXECUTE ON FUNCTION public.check_anonymous_trial_eligibility(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.use_trial_and_create_task(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_anonymous_task_status(text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_anonymous_task_status(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_anonymous_tasks(integer) TO service_role;

-- 也可以授权给 authenticated 角色（如果需要前端直接调用）
-- GRANT EXECUTE ON FUNCTION public.check_anonymous_trial_eligibility(text) TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_anonymous_task_status(text) TO authenticated;