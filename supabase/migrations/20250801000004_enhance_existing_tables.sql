-- =============================================
-- Enhance Existing Tables with Missing Indexes and Constraints
-- =============================================

-- Add indexes for freepik_api_keys if they don't exist
DO $$ 
BEGIN
    -- Check and create index for active keys
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_freepik_api_keys_active') THEN
        CREATE INDEX idx_freepik_api_keys_active ON public.freepik_api_keys(is_active, used_today, daily_limit);
    END IF;
    
    -- Check and create index for reset date
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_freepik_api_keys_reset_date') THEN
        CREATE INDEX idx_freepik_api_keys_reset_date ON public.freepik_api_keys(last_reset_date);
    END IF;
END $$;

-- Add indexes for image_enhancement_tasks if they don't exist
DO $$ 
BEGIN
    -- Check and create index for user status
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_image_tasks_user_status') THEN
        CREATE INDEX idx_image_tasks_user_status ON public.image_enhancement_tasks(user_id, status);
    END IF;
    
    -- Check and create index for created date
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_image_tasks_created') THEN
        CREATE INDEX idx_image_tasks_created ON public.image_enhancement_tasks(created_at DESC);
    END IF;
    
    -- Check and create index for api key
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_image_tasks_api_key') THEN
        CREATE INDEX idx_image_tasks_api_key ON public.image_enhancement_tasks(api_key_id);
    END IF;
    
    -- Check and create index for user created
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_image_tasks_user_created') THEN
        CREATE INDEX idx_image_tasks_user_created ON public.image_enhancement_tasks(user_id, created_at DESC);
    END IF;
END $$;

-- Add constraints for image_enhancement_tasks if they don't exist
DO $$ 
BEGIN
    -- Add task status constraint
    BEGIN
        ALTER TABLE public.image_enhancement_tasks 
        ADD CONSTRAINT chk_task_status 
        CHECK (status IN ('processing', 'completed', 'failed'));
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    -- Add scale factor constraint
    BEGIN
        ALTER TABLE public.image_enhancement_tasks 
        ADD CONSTRAINT chk_scale_factor 
        CHECK (scale_factor IN ('2x', '4x', '8x', '16x'));
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    -- Add creativity constraint
    BEGIN
        ALTER TABLE public.image_enhancement_tasks 
        ADD CONSTRAINT chk_creativity 
        CHECK (creativity >= -10 AND creativity <= 10);
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    -- Add hdr constraint
    BEGIN
        ALTER TABLE public.image_enhancement_tasks 
        ADD CONSTRAINT chk_hdr 
        CHECK (hdr >= -10 AND hdr <= 10);
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    -- Add resemblance constraint
    BEGIN
        ALTER TABLE public.image_enhancement_tasks 
        ADD CONSTRAINT chk_resemblance 
        CHECK (resemblance >= -10 AND resemblance <= 10);
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    -- Add fractality constraint
    BEGIN
        ALTER TABLE public.image_enhancement_tasks 
        ADD CONSTRAINT chk_fractality 
        CHECK (fractality >= -10 AND fractality <= 10);
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
    
    -- Add credits positive constraint
    BEGIN
        ALTER TABLE public.image_enhancement_tasks 
        ADD CONSTRAINT chk_credits_positive 
        CHECK (credits_consumed > 0);
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- Create or replace trigger function for updating updated_at
CREATE OR REPLACE FUNCTION public.update_freepik_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_freepik_api_keys_updated_at') THEN
        CREATE TRIGGER trigger_update_freepik_api_keys_updated_at
            BEFORE UPDATE ON public.freepik_api_keys
            FOR EACH ROW EXECUTE FUNCTION public.update_freepik_api_keys_updated_at();
    END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE public.freepik_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_enhancement_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
    -- freepik_api_keys policies
    DROP POLICY IF EXISTS "Only admins can manage api keys" ON public.freepik_api_keys;
    CREATE POLICY "Only admins can manage api keys" ON public.freepik_api_keys
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE users.id = auth.uid() 
                AND users.role = 'admin'
            )
        );
    
    -- image_enhancement_tasks policies
    DROP POLICY IF EXISTS "Users can view own tasks" ON public.image_enhancement_tasks;
    CREATE POLICY "Users can view own tasks" ON public.image_enhancement_tasks
        FOR SELECT USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can insert own tasks" ON public.image_enhancement_tasks;
    CREATE POLICY "Users can insert own tasks" ON public.image_enhancement_tasks
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Service role can update tasks" ON public.image_enhancement_tasks;
    CREATE POLICY "Service role can update tasks" ON public.image_enhancement_tasks
        FOR UPDATE USING (true);
    
    DROP POLICY IF EXISTS "Admins can view all tasks" ON public.image_enhancement_tasks;
    CREATE POLICY "Admins can view all tasks" ON public.image_enhancement_tasks
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE users.id = auth.uid() 
                AND users.role = 'admin'
            )
        );
END $$;

-- Grant permissions
GRANT ALL ON public.freepik_api_keys TO authenticated;
GRANT ALL ON public.freepik_api_keys TO service_role;
GRANT ALL ON public.image_enhancement_tasks TO authenticated;
GRANT ALL ON public.image_enhancement_tasks TO service_role;