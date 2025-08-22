-- 扩展 hdr 字段约束以支持 fal.ai Qwen Image Edit API 的 num_inference_steps 参数
-- 原约束：hdr >= -10 AND hdr <= 10
-- 新约束：hdr >= -10 AND hdr <= 50 (支持 fal.ai 的推理步数范围)

ALTER TABLE public.image_enhancement_tasks 
  DROP CONSTRAINT IF EXISTS chk_hdr;

ALTER TABLE public.image_enhancement_tasks 
  ADD CONSTRAINT chk_hdr CHECK (hdr >= -10 AND hdr <= 50);