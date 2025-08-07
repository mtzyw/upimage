-- Update create_individual_anonymous_task function to include api_key parameter
CREATE OR REPLACE FUNCTION public.create_individual_anonymous_task(
    p_freepik_task_id text,
    p_browser_fingerprint text,
    p_batch_id text,
    p_scale_factor text,
    p_api_key text DEFAULT NULL
) RETURNS boolean AS $$
BEGIN
    -- Create individual task record with api_key
    INSERT INTO public.anonymous_tasks (
        freepik_task_id, 
        browser_fingerprint, 
        batch_id, 
        scale_factor,
        api_key
    )
    VALUES (
        p_freepik_task_id,
        p_browser_fingerprint,
        p_batch_id,
        p_scale_factor,
        p_api_key
    );
    
    RETURN true;
    
EXCEPTION
    WHEN unique_violation THEN
        -- Task ID already exists, ignore error
        RETURN false;
    WHEN OTHERS THEN
        -- Other errors, re-raise
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission for the updated function signature
GRANT EXECUTE ON FUNCTION public.create_individual_anonymous_task(text, text, text, text, text) TO service_role;