-- 扩展 scale_factor 字段约束以支持 Qwen Image Edit (1x 表示不缩放，仅编辑)
-- 原约束：scale_factor IN ('2x', '4x', '8x', '16x')  
-- 新约束：scale_factor IN ('1x', '2x', '4x', '8x', '16x')

ALTER TABLE public.image_enhancement_tasks 
  DROP CONSTRAINT IF EXISTS chk_scale_factor;

ALTER TABLE public.image_enhancement_tasks 
  ADD CONSTRAINT chk_scale_factor CHECK (scale_factor IN ('1x', '2x', '4x', '8x', '16x'));