-- 简化版本的不计数API密钥获取函数
-- 基于数据库实际结构，只返回必要字段避免类型冲突

DROP FUNCTION IF EXISTS public.get_available_freepik_api_key_without_count();

CREATE OR REPLACE FUNCTION public.get_available_freepik_api_key_without_count()
RETURNS TABLE(
    id UUID,
    key TEXT,
    name VARCHAR(100),
    daily_limit INTEGER,
    used_today INTEGER
) AS $$
DECLARE
    current_date_var DATE := CURRENT_DATE;
    reset_count INTEGER := 0;
    debug_key RECORD;
BEGIN
    -- 重置过期的计数器
    UPDATE public.freepik_api_keys 
    SET used_today = 0, last_reset_date = current_date_var
    WHERE last_reset_date < current_date_var AND is_active = true;
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    RAISE LOG '[DB_FUNC_NO_COUNT] Reset % keys counters for date %', reset_count, current_date_var;
    
    -- 调试：显示所有可用keys
    FOR debug_key IN 
        SELECT t.id, t.name, t.used_today, t.daily_limit
        FROM public.freepik_api_keys t
        WHERE t.is_active = true
        ORDER BY t.used_today ASC
    LOOP
        RAISE LOG '[DB_FUNC_NO_COUNT] Key % (%) - used_today: %, daily_limit: %', 
            debug_key.id, debug_key.name, debug_key.used_today, debug_key.daily_limit;
    END LOOP;
    
    -- 返回可用的API密钥（不增加计数）
    RETURN QUERY
    SELECT t.id, 
           t.key, 
           t.name,
           t.daily_limit,
           t.used_today
    FROM public.freepik_api_keys t
    WHERE t.is_active = true 
    AND t.used_today < t.daily_limit
    ORDER BY t.used_today ASC
    LIMIT 1;
    
    RAISE LOG '[DB_FUNC_NO_COUNT] Returned available key without incrementing count';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;