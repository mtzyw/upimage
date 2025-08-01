-- =============================================
-- 修改用户注册流程，新用户注册送5积分
-- =============================================

-- 更新 handle_new_user 函数，添加注册送积分功能
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- 1. 创建用户记录
  INSERT INTO public.users (id, email, updated_at)
  VALUES (NEW.id, NEW.email, now());
  
  -- 2. 给新用户赠送5积分作为欢迎奖励
  -- 使用现有的 grant_one_time_credits_and_log 函数
  PERFORM public.grant_one_time_credits_and_log(
    NEW.id,          -- 用户ID
    5,               -- 赠送5积分
    NULL             -- 没有关联订单
  );
  
  -- 3. 更新 credit_logs 记录的类型和备注为更合适的描述
  UPDATE public.credit_logs 
  SET 
    type = 'welcome_bonus',
    notes = '新用户注册欢迎奖励'
  WHERE user_id = NEW.id 
    AND type = 'one_time_purchase' 
    AND amount = 5
    AND created_at >= now() - INTERVAL '5 seconds';
  
  RETURN NEW;
END;
$$;

-- 确保函数权限正确
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- 添加注释说明
COMMENT ON FUNCTION public.handle_new_user() IS '处理新用户注册：创建用户记录并赠送5积分欢迎奖励';