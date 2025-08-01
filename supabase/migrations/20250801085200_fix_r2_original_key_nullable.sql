-- =============================================
-- 修复 r2_original_key 字段为可空
-- 因为在优化流程中，原图是异步上传的
-- =============================================

-- 将 r2_original_key 字段改为可空
ALTER TABLE public.image_enhancement_tasks 
ALTER COLUMN r2_original_key DROP NOT NULL;