-- =============================================
-- 添加调试日志到 get_available_freepik_api_key 函数
-- =============================================

CREATE OR REPLACE FUNCTION public.get_available_freepik_api_key()
RETURNS TABLE(id UUID, key TEXT) AS $$
DECLARE
    selected_key RECORD;
    today_date DATE := CURRENT_DATE;
    reset_count INTEGER := 0;
BEGIN
    -- 首先重置过期的计数器
    UPDATE public.freepik_api_keys 
    SET used_today = 0, last_reset_date = today_date
    WHERE last_reset_date < today_date AND is_active = true;
    
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    RAISE LOG '🔄 [DB_FUNC] Reset % keys counters for date %', reset_count, today_date;
    
    -- 查看所有可用的 keys
    FOR selected_key IN 
        SELECT fak.id, fak.name, fak.used_today, fak.daily_limit
        FROM public.freepik_api_keys fak
        WHERE fak.is_active = true
        ORDER BY fak.used_today ASC
    LOOP
        RAISE LOG '🔍 [DB_FUNC] Key % (%) - used_today: %, daily_limit: %', 
            selected_key.id, selected_key.name, selected_key.used_today, selected_key.daily_limit;
    END LOOP;
    
    -- 选择一个可用的 key（使用量最少的）
    SELECT fak.id, fak.key INTO selected_key
    FROM public.freepik_api_keys fak
    WHERE fak.is_active = true 
    AND fak.used_today < fak.daily_limit
    ORDER BY fak.used_today ASC
    LIMIT 1;
    
    -- 如果找到了，更新使用次数
    IF FOUND THEN
        RAISE LOG '🔑 [DB_FUNC] Selected key %, updating used_today from % to %', 
            selected_key.id, 
            (SELECT used_today FROM public.freepik_api_keys WHERE public.freepik_api_keys.id = selected_key.id),
            (SELECT used_today FROM public.freepik_api_keys WHERE public.freepik_api_keys.id = selected_key.id) + 1;
            
        UPDATE public.freepik_api_keys 
        SET used_today = used_today + 1
        WHERE public.freepik_api_keys.id = selected_key.id;
        
        RAISE LOG '✅ [DB_FUNC] Updated key %, new used_today: %', 
            selected_key.id,
            (SELECT used_today FROM public.freepik_api_keys WHERE public.freepik_api_keys.id = selected_key.id);
        
        RETURN QUERY SELECT selected_key.id, selected_key.key;
    ELSE
        RAISE LOG '❌ [DB_FUNC] No available keys found';
    END IF;
    
    -- 如果没找到，返回空
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;