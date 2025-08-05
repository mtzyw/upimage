-- =============================================
-- 批量任务相关数据库函数
-- =============================================

-- 函数1：批量创建试用任务
CREATE OR REPLACE FUNCTION public.use_trial_and_create_batch_tasks(
    p_browser_fingerprint text,
    p_batch_id text,
    p_freepik_task_ids jsonb -- [{"task_id": "xxx", "scale_factor": "2x"}, ...]
) RETURNS jsonb AS $$
DECLARE
    eligibility_result jsonb;
    task_item jsonb;
    task_count integer;
BEGIN
    -- 检查试用资格
    SELECT public.check_anonymous_trial_eligibility(p_browser_fingerprint) INTO eligibility_result;
    
    IF NOT (eligibility_result->>'eligible')::boolean THEN
        RETURN eligibility_result;
    END IF;
    
    -- 获取任务数量
    SELECT jsonb_array_length(p_freepik_task_ids) INTO task_count;
    
    -- 记录试用使用
    INSERT INTO public.trial_usage_records (browser_fingerprint)
    VALUES (p_browser_fingerprint);
    
    -- 批量创建任务记录
    FOR task_item IN SELECT * FROM jsonb_array_elements(p_freepik_task_ids)
    LOOP
        INSERT INTO public.anonymous_tasks (
            freepik_task_id, 
            browser_fingerprint, 
            batch_id, 
            scale_factor
        )
        VALUES (
            task_item->>'task_id',
            p_browser_fingerprint,
            p_batch_id,
            task_item->>'scale_factor'
        );
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'batch_id', p_batch_id,
        'task_count', task_count,
        'message', '批量试用任务已创建'
    );
    
EXCEPTION
    WHEN unique_violation THEN
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

-- 函数2：批量查询任务状态
CREATE OR REPLACE FUNCTION public.get_batch_tasks_status(
    p_batch_id text
) RETURNS jsonb AS $$
DECLARE
    tasks_result jsonb;
    total_count integer;
    completed_count integer;
    failed_count integer;
BEGIN
    -- 统计任务状态
    SELECT COUNT(*) INTO total_count
    FROM public.anonymous_tasks
    WHERE batch_id = p_batch_id;
    
    SELECT COUNT(*) INTO completed_count
    FROM public.anonymous_tasks
    WHERE batch_id = p_batch_id AND status = 'completed';
    
    SELECT COUNT(*) INTO failed_count
    FROM public.anonymous_tasks
    WHERE batch_id = p_batch_id AND status = 'failed';
    
    -- 获取任务详情
    SELECT jsonb_agg(
        jsonb_build_object(
            'task_id', freepik_task_id,
            'scale_factor', scale_factor,
            'status', status,
            'result_data', result_data,
            'created_at', created_at
        )
        ORDER BY 
            CASE scale_factor 
                WHEN '2x' THEN 1 
                WHEN '4x' THEN 2 
                WHEN '8x' THEN 3 
                WHEN '16x' THEN 4 
                ELSE 5 
            END
    ) INTO tasks_result
    FROM public.anonymous_tasks
    WHERE batch_id = p_batch_id;
    
    IF tasks_result IS NULL THEN
        RETURN jsonb_build_object(
            'found', false,
            'message', '批量任务不存在'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'found', true,
        'batch_id', p_batch_id,
        'tasks', tasks_result,
        'total_count', total_count,
        'completed_count', completed_count,
        'failed_count', failed_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数3：更新批量任务中的单个任务状态
CREATE OR REPLACE FUNCTION public.update_batch_task_status(
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

-- 授权函数执行权限
GRANT EXECUTE ON FUNCTION public.use_trial_and_create_batch_tasks(text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_batch_tasks_status(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_batch_task_status(text, text, jsonb) TO service_role;