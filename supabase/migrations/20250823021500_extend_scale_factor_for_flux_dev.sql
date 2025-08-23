-- =============================================
-- Remove scale_factor constraint for flexible field usage
-- =============================================

-- Remove the existing constraint entirely to allow flexible usage
-- The scale_factor field will now support:
-- - Image Upscaler: '2x', '4x', '8x', '16x'
-- - Flux Dev: aspect ratios like 'square_1_1', 'classic_4_3', etc.
-- - Future features: any string value as needed

ALTER TABLE public.image_enhancement_tasks 
  DROP CONSTRAINT IF EXISTS chk_scale_factor;