-- Update CHECK constraint on anonymous_tasks table to allow 'uploading' status
-- This fixes the dead loop issue in fallback mechanism

-- Drop existing constraint
ALTER TABLE public.anonymous_tasks 
DROP CONSTRAINT IF EXISTS anonymous_tasks_status_check;

-- Add updated constraint with 'uploading' status
ALTER TABLE public.anonymous_tasks 
ADD CONSTRAINT anonymous_tasks_status_check 
CHECK (status IN ('processing', 'completed', 'failed', 'uploading'));