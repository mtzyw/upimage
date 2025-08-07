-- Final fix for column ambiguity in get_available_freepik_api_key_without_count function

DROP FUNCTION IF EXISTS public.get_available_freepik_api_key_without_count();

CREATE OR REPLACE FUNCTION public.get_available_freepik_api_key_without_count()
RETURNS TABLE(
    key_id UUID, 
    api_key TEXT, 
    key_name TEXT, 
    key_daily_limit INTEGER, 
    key_used_today INTEGER,
    key_last_reset_date DATE,
    key_is_active BOOLEAN,
    key_created_at TIMESTAMPTZ,
    key_updated_at TIMESTAMPTZ
) AS $$
DECLARE
    current_date_var DATE := CURRENT_DATE;
    reset_count INTEGER := 0;
    debug_key RECORD;
BEGIN
    -- 使用表别名明确指定列名
    UPDATE public.freepik_api_keys t
    SET used_today = 0, last_reset_date = current_date_var
    WHERE t.last_reset_date < current_date_var AND t.is_active = true;
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    RAISE LOG '[DB_FUNC_NO_COUNT] Reset % keys counters for date %', reset_count, current_date_var;
    
    FOR debug_key IN 
        SELECT t.id, t.name, t.used_today, t.daily_limit
        FROM public.freepik_api_keys t
        WHERE t.is_active = true
        ORDER BY t.used_today ASC
    LOOP
        RAISE LOG '[DB_FUNC_NO_COUNT] Key % (%) - used_today: %, daily_limit: %', 
            debug_key.id, debug_key.name, debug_key.used_today, debug_key.daily_limit;
    END LOOP;
    
    -- 返回数据，使用不同的列名避免歧义
    RETURN QUERY
    SELECT t.id, 
           t.key, 
           t.name, 
           t.daily_limit, 
           t.used_today,
           t.last_reset_date,
           t.is_active, 
           t.created_at, 
           t.updated_at
    FROM public.freepik_api_keys t
    WHERE t.is_active = true 
    AND t.used_today < t.daily_limit
    ORDER BY t.used_today ASC
    LIMIT 1;
    
    RAISE LOG '[DB_FUNC_NO_COUNT] Returned available key without incrementing count';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;