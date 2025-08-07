-- Add 'uploading' status to the status validation in update_batch_task_status function
CREATE OR REPLACE FUNCTION public.update_batch_task_status(
    p_freepik_task_id text,
    p_status text,
    p_result_data jsonb DEFAULT NULL
) RETURNS boolean AS $$
BEGIN
    -- Validate status values (added 'uploading' to prevent dead loops)
    IF p_status NOT IN ('processing', 'completed', 'failed', 'uploading') THEN
        RAISE EXCEPTION 'Invalid status: %', p_status;
    END IF;
    
    -- Update task status
    UPDATE public.anonymous_tasks
    SET status = p_status,
        result_data = COALESCE(p_result_data, result_data)
    WHERE freepik_task_id = p_freepik_task_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.update_batch_task_status(text, text, jsonb) TO service_role;