-- =============================================
-- 添加批量任务支持 - 2x/4x/8x/16x多倍数生成
-- =============================================

-- 为匿名任务表添加批量支持字段
ALTER TABLE public.anonymous_tasks 
ADD COLUMN batch_id TEXT DEFAULT NULL,
ADD COLUMN scale_factor TEXT NOT NULL DEFAULT '4x';

-- 添加约束检查倍数值
ALTER TABLE public.anonymous_tasks 
ADD CONSTRAINT chk_anonymous_scale_factor CHECK (scale_factor IN ('2x', '4x', '8x', '16x'));

-- 创建批量任务索引
CREATE INDEX idx_anonymous_tasks_batch_id ON public.anonymous_tasks(batch_id);
CREATE INDEX idx_anonymous_tasks_batch_scale ON public.anonymous_tasks(batch_id, scale_factor);

-- 为现有记录更新scale_factor（如果有的话）
UPDATE public.anonymous_tasks SET scale_factor = '4x' WHERE scale_factor IS NULL;

-- 添加注释说明
COMMENT ON COLUMN public.anonymous_tasks.batch_id IS '批量任务ID，同一次试用生成的多个倍数任务共享此ID';
COMMENT ON COLUMN public.anonymous_tasks.scale_factor IS '图片放大倍数：2x, 4x, 8x, 16x';