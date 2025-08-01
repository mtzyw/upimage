-- =============================================
-- Fix ambiguous id reference in get_available_freepik_api_key function
-- =============================================

CREATE OR REPLACE FUNCTION public.get_available_freepik_api_key()
RETURNS TABLE(id UUID, key TEXT) AS $$
DECLARE
    selected_key RECORD;
    today_date DATE := CURRENT_DATE;
BEGIN
    -- 首先重置过期的计数器
    UPDATE public.freepik_api_keys 
    SET used_today = 0, last_reset_date = today_date
    WHERE last_reset_date < today_date AND is_active = true;
    
    -- 选择一个可用的 key（使用量最少的）
    SELECT fak.id, fak.key INTO selected_key
    FROM public.freepik_api_keys fak
    WHERE fak.is_active = true 
    AND fak.used_today < fak.daily_limit
    ORDER BY fak.used_today ASC
    LIMIT 1;
    
    -- 如果找到了，更新使用次数
    IF FOUND THEN
        UPDATE public.freepik_api_keys 
        SET used_today = used_today + 1
        WHERE public.freepik_api_keys.id = selected_key.id;
        
        RETURN QUERY SELECT selected_key.id, selected_key.key;
    END IF;
    
    -- 如果没找到，返回空
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;