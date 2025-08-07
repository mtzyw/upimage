-- Phase 1: Enhance image_enhancement_tasks table for fallback mechanism
-- 1. Add api_key field to store actual API key (reduce JOIN queries)
-- 2. Update status CHECK constraint to include 'uploading' status

-- Add api_key field to store the actual Freepik API key
ALTER TABLE public.image_enhancement_tasks 
ADD COLUMN api_key TEXT;

-- Create index for api_key field
CREATE INDEX IF NOT EXISTS idx_image_tasks_api_key_text ON public.image_enhancement_tasks(api_key);

-- Update CHECK constraint to allow 'uploading' status (prevents dead loops in fallback)
ALTER TABLE public.image_enhancement_tasks 
DROP CONSTRAINT IF EXISTS chk_task_status;

ALTER TABLE public.image_enhancement_tasks 
ADD CONSTRAINT chk_task_status 
CHECK (status IN ('processing', 'completed', 'failed', 'uploading'));