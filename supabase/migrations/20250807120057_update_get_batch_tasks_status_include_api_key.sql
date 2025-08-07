-- Update get_batch_tasks_status function to include api_key field
CREATE OR REPLACE FUNCTION public.get_batch_tasks_status(
    p_batch_id text
) RETURNS jsonb AS $$
DECLARE
    tasks_result jsonb;
    total_count integer;
    completed_count integer;
    failed_count integer;
BEGIN
    -- Count task statuses
    SELECT COUNT(*) INTO total_count
    FROM public.anonymous_tasks
    WHERE batch_id = p_batch_id;
    
    SELECT COUNT(*) INTO completed_count
    FROM public.anonymous_tasks
    WHERE batch_id = p_batch_id AND status = 'completed';
    
    SELECT COUNT(*) INTO failed_count
    FROM public.anonymous_tasks
    WHERE batch_id = p_batch_id AND status = 'failed';
    
    -- Get task details including api_key
    SELECT jsonb_agg(
        jsonb_build_object(
            'task_id', freepik_task_id,
            'scale_factor', scale_factor,
            'status', status,
            'result_data', result_data,
            'created_at', created_at,
            'api_key', api_key
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
            'message', 'No batch found'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'found', true,
        'batch_id', p_batch_id,
        'total_count', total_count,
        'completed_count', completed_count,
        'failed_count', failed_count,
        'tasks', tasks_result
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;