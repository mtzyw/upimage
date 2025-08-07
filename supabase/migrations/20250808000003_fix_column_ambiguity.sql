-- Fix column ambiguity in get_available_freepik_api_key_without_count function

DROP FUNCTION IF EXISTS public.get_available_freepik_api_key_without_count();

CREATE OR REPLACE FUNCTION public.get_available_freepik_api_key_without_count()
RETURNS TABLE(
    id UUID, 
    key TEXT, 
    name TEXT, 
    daily_limit INTEGER, 
    used_today INTEGER,
    last_reset_date DATE,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
DECLARE
    current_date_var DATE := CURRENT_DATE;
    reset_count INTEGER := 0;
    debug_key RECORD;
BEGIN
    UPDATE public.freepik_api_keys 
    SET used_today = 0, last_reset_date = current_date_var
    WHERE last_reset_date < current_date_var AND is_active = true;
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    RAISE LOG '[DB_FUNC_NO_COUNT] Reset % keys counters for date %', reset_count, current_date_var;
    
    FOR debug_key IN 
        SELECT k.id, k.name, k.used_today, k.daily_limit
        FROM public.freepik_api_keys k
        WHERE k.is_active = true
        ORDER BY k.used_today ASC
    LOOP
        RAISE LOG '[DB_FUNC_NO_COUNT] Key % (%) - used_today: %, daily_limit: %', 
            debug_key.id, debug_key.name, debug_key.used_today, debug_key.daily_limit;
    END LOOP;
    
    RETURN QUERY
    SELECT k.id::UUID, 
           k.key::TEXT, 
           k.name::TEXT, 
           k.daily_limit::INTEGER, 
           k.used_today::INTEGER,
           k.last_reset_date::DATE,
           k.is_active::BOOLEAN, 
           k.created_at::TIMESTAMPTZ, 
           k.updated_at::TIMESTAMPTZ
    FROM public.freepik_api_keys k
    WHERE k.is_active = true 
    AND k.used_today < k.daily_limit
    ORDER BY k.used_today ASC
    LIMIT 1;
    
    RAISE LOG '[DB_FUNC_NO_COUNT] Returned available key without incrementing count';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;