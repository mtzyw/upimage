-- RPC functions for image_enhancement_tasks fallback mechanism
-- Similar to anonymous_tasks but for authenticated users

-- Function 1: Update image enhancement task status
CREATE OR REPLACE FUNCTION public.update_image_enhancement_task_status(
    p_task_id text,
    p_status text,
    p_result_data jsonb DEFAULT NULL,
    p_cdn_url text DEFAULT NULL,
    p_completed_at timestamptz DEFAULT NULL,
    p_error_message text DEFAULT NULL
) RETURNS boolean AS $$
BEGIN
    -- Validate status values (includes 'uploading' for fallback mechanism)
    IF p_status NOT IN ('processing', 'completed', 'failed', 'uploading') THEN
        RAISE EXCEPTION 'Invalid status: %', p_status;
    END IF;
    
    -- Update task status with all possible fields
    UPDATE public.image_enhancement_tasks
    SET 
        status = p_status,
        cdn_url = COALESCE(p_cdn_url, cdn_url),
        completed_at = COALESCE(p_completed_at, completed_at),
        error_message = COALESCE(p_error_message, error_message)
    WHERE id = p_task_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Get timed-out image enhancement tasks for fallback processing
CREATE OR REPLACE FUNCTION public.get_timed_out_image_enhancement_tasks(
    p_timeout_minutes integer DEFAULT 2
) RETURNS TABLE(
    task_id text,
    user_id uuid,
    api_key text,
    scale_factor text,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        iet.id as task_id,
        iet.user_id,
        iet.api_key,
        iet.scale_factor,
        iet.created_at
    FROM public.image_enhancement_tasks iet
    WHERE iet.status = 'processing'
    AND iet.created_at < NOW() - INTERVAL '1 minute' * p_timeout_minutes
    AND iet.api_key IS NOT NULL -- Only process tasks with stored API keys
    ORDER BY iet.created_at ASC
    LIMIT 50; -- Process max 50 tasks per batch
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_image_enhancement_task_status(text, text, jsonb, text, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_timed_out_image_enhancement_tasks(integer) TO service_role;