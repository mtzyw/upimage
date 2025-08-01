-- =============================================
-- Create Image Enhancement Related Tables
-- =============================================

-- Create freepik_api_keys table
CREATE TABLE IF NOT EXISTS public.freepik_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name VARCHAR(100), -- 便于识别，如 "key-001"
  daily_limit INTEGER DEFAULT 100, -- 每日限制次数
  used_today INTEGER DEFAULT 0, -- 今日已用次数
  last_reset_date DATE DEFAULT CURRENT_DATE, -- 最后重置日期
  is_active BOOLEAN DEFAULT TRUE, -- 是否启用
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for freepik_api_keys
CREATE INDEX IF NOT EXISTS idx_freepik_api_keys_active ON public.freepik_api_keys(is_active, used_today, daily_limit);
CREATE INDEX IF NOT EXISTS idx_freepik_api_keys_reset_date ON public.freepik_api_keys(last_reset_date);

-- Create image_enhancement_tasks table
CREATE TABLE IF NOT EXISTS public.image_enhancement_tasks (
  id TEXT PRIMARY KEY, -- Freepik task_id
  user_id UUID REFERENCES public.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing', -- processing, completed, failed
  r2_original_key TEXT NOT NULL,
  r2_optimized_key TEXT,
  cdn_url TEXT,
  scale_factor TEXT NOT NULL, -- 2x, 4x, 8x, 16x
  optimized_for TEXT DEFAULT 'standard',
  prompt TEXT,
  creativity INTEGER DEFAULT 0,
  hdr INTEGER DEFAULT 0,
  resemblance INTEGER DEFAULT 0,
  fractality INTEGER DEFAULT 0,
  engine TEXT DEFAULT 'automatic',
  api_key_id UUID REFERENCES public.freepik_api_keys(id),
  credits_consumed INTEGER NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes for image_enhancement_tasks
CREATE INDEX IF NOT EXISTS idx_image_tasks_user_status ON public.image_enhancement_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_image_tasks_created ON public.image_enhancement_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_tasks_api_key ON public.image_enhancement_tasks(api_key_id);
CREATE INDEX IF NOT EXISTS idx_image_tasks_user_created ON public.image_enhancement_tasks(user_id, created_at DESC);

-- Add constraints for image_enhancement_tasks
ALTER TABLE public.image_enhancement_tasks 
  ADD CONSTRAINT chk_task_status CHECK (status IN ('processing', 'completed', 'failed'));

ALTER TABLE public.image_enhancement_tasks 
  ADD CONSTRAINT chk_scale_factor CHECK (scale_factor IN ('2x', '4x', '8x', '16x'));

ALTER TABLE public.image_enhancement_tasks 
  ADD CONSTRAINT chk_creativity CHECK (creativity >= -10 AND creativity <= 10);

ALTER TABLE public.image_enhancement_tasks 
  ADD CONSTRAINT chk_hdr CHECK (hdr >= -10 AND hdr <= 10);

ALTER TABLE public.image_enhancement_tasks 
  ADD CONSTRAINT chk_resemblance CHECK (resemblance >= -10 AND resemblance <= 10);

ALTER TABLE public.image_enhancement_tasks 
  ADD CONSTRAINT chk_fractality CHECK (fractality >= -10 AND fractality <= 10);

ALTER TABLE public.image_enhancement_tasks 
  ADD CONSTRAINT chk_credits_positive CHECK (credits_consumed > 0);

-- Create or replace trigger function for updating updated_at
CREATE OR REPLACE FUNCTION public.update_freepik_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for freepik_api_keys
CREATE TRIGGER trigger_update_freepik_api_keys_updated_at
    BEFORE UPDATE ON public.freepik_api_keys
    FOR EACH ROW EXECUTE FUNCTION public.update_freepik_api_keys_updated_at();

-- Enable RLS
ALTER TABLE public.freepik_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_enhancement_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for freepik_api_keys
CREATE POLICY "Only admins can manage api keys" ON public.freepik_api_keys
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Create RLS policies for image_enhancement_tasks
CREATE POLICY "Users can view own tasks" ON public.image_enhancement_tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON public.image_enhancement_tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update tasks" ON public.image_enhancement_tasks
    FOR UPDATE USING (true);

CREATE POLICY "Admins can view all tasks" ON public.image_enhancement_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Grant permissions
GRANT ALL ON public.freepik_api_keys TO authenticated;
GRANT ALL ON public.freepik_api_keys TO service_role;
GRANT ALL ON public.image_enhancement_tasks TO authenticated;
GRANT ALL ON public.image_enhancement_tasks TO service_role;

-- Create function to get available API key
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
        WHERE id = selected_key.id;
        
        RETURN QUERY SELECT selected_key.id, selected_key.key;
    END IF;
    
    -- 如果没找到，返回空
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_available_freepik_api_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_freepik_api_key() TO service_role;