import { getUserBenefits, UserBenefits } from '@/actions/usage/benefits';
import { deductCredits } from '@/actions/usage/deduct';
import { ActionResult } from '@/lib/action-response';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

/**
 * 根据放大倍数计算所需积分
 * @param scaleFactor 放大倍数
 * @returns 所需积分数量
 */
export function calculateRequiredCredits(scaleFactor: string): number {
  const scaleMap: Record<string, number> = {
    '2x': 1,   // 2倍放大消耗1积分
    '4x': 2,   // 4倍放大消耗2积分  
    '8x': 4,   // 8倍放大消耗4积分
    '16x': 8   // 16倍放大消耗8积分
  };
  
  return scaleMap[scaleFactor] || 1;
}

/**
 * 验证用户是否有足够积分进行图像增强
 * @param userId 用户ID
 * @param scaleFactor 放大倍数
 * @returns 验证结果
 */
export async function validateUserCredits(
  userId: string, 
  scaleFactor: string
): Promise<{
  hasEnoughCredits: boolean;
  requiredCredits: number;
  availableCredits: number;
  userBenefits: UserBenefits | null;
}> {
  try {
    const requiredCredits = calculateRequiredCredits(scaleFactor);
    const userBenefits = await getUserBenefits(userId);

    if (!userBenefits) {
      return {
        hasEnoughCredits: false,
        requiredCredits,
        availableCredits: 0,
        userBenefits: null
      };
    }

    const hasEnoughCredits = userBenefits.totalAvailableCredits >= requiredCredits;

    return {
      hasEnoughCredits,
      requiredCredits,
      availableCredits: userBenefits.totalAvailableCredits,
      userBenefits
    };
  } catch (error) {
    console.error('Error validating user credits:', error);
    return {
      hasEnoughCredits: false,
      requiredCredits: calculateRequiredCredits(scaleFactor),
      availableCredits: 0,
      userBenefits: null
    };
  }
}

/**
 * 扣减用户积分
 * @param userId 用户ID
 * @param scaleFactor 放大倍数
 * @param taskId 任务ID（用于记录）
 * @returns 扣减结果
 */
export async function deductUserCredits(
  scaleFactor: string,
  taskId: string
): Promise<ActionResult<any>> {
  try {
    const requiredCredits = calculateRequiredCredits(scaleFactor);
    const notes = `图像增强 ${scaleFactor} 处理 - 任务ID: ${taskId}`;

    console.log(`Deducting ${requiredCredits} credits for task ${taskId} (${scaleFactor} scaling)`);

    const result = await deductCredits(requiredCredits, notes);
    
    if (result.success) {
      console.log(`Successfully deducted ${requiredCredits} credits for task ${taskId}`);
    } else {
      console.error(`Failed to deduct credits for task ${taskId}:`, result.error);
    }

    return result;
  } catch (error) {
    console.error('Error deducting user credits:', error);
    return {
      success: false,
      error: `积分扣减失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 退回用户积分（任务失败时使用）
 * @param userId 用户ID
 * @param scaleFactor 放大倍数
 * @param taskId 任务ID
 * @returns 退回结果
 */
export async function refundUserCredits(
  userId: string,
  scaleFactor: string, 
  taskId: string
): Promise<boolean> {
  try {
    const refundCredits = calculateRequiredCredits(scaleFactor);
    const notes = `任务失败退回积分 ${scaleFactor} - 任务ID: ${taskId}`;

    console.log(`Refunding ${refundCredits} credits for failed task ${taskId}`);

    // 使用现有的积分授予函数
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: rpcError } = await supabaseAdmin.rpc('grant_one_time_credits_and_log', {
      p_user_id: userId,
      p_credits_to_add: refundCredits,
      p_related_order_id: null // 没有关联订单，这是退款
    });

    if (rpcError) {
      console.error(`Error refunding credits for task ${taskId}:`, rpcError);
      return false;
    }

    console.log(`Successfully refunded ${refundCredits} credits for task ${taskId}`);
    return true;
  } catch (error) {
    console.error('Error refunding user credits:', error);
    return false;
  }
}

/**
 * 获取放大倍数的详细信息
 * @param scaleFactor 放大倍数
 * @returns 放大倍数信息
 */
export function getScaleFactorInfo(scaleFactor: string) {
  const infoMap: Record<string, {
    credits: number;
    estimatedTime: string;
    description: string;
    quality: string;
  }> = {
    '2x': {
      credits: 1,
      estimatedTime: '30-60秒',
      description: '将图像分辨率提升至原来的2倍',
      quality: '标准质量提升'
    },
    '4x': {
      credits: 2,
      estimatedTime: '1-2分钟',
      description: '将图像分辨率提升至原来的4倍',
      quality: '高质量提升'
    },
    '8x': {
      credits: 4,
      estimatedTime: '2-5分钟',
      description: '将图像分辨率提升至原来的8倍',
      quality: '超高质量提升'
    },
    '16x': {
      credits: 8,
      estimatedTime: '5-10分钟',
      description: '将图像分辨率提升至原来的16倍',
      quality: '极致质量提升'
    }
  };

  return infoMap[scaleFactor] || {
    credits: 1,
    estimatedTime: '未知',
    description: '图像质量提升',
    quality: '标准质量'
  };
}

/**
 * 验证放大倍数是否有效
 * @param scaleFactor 放大倍数
 * @returns 是否有效
 */
export function isValidScaleFactor(scaleFactor: string): boolean {
  return ['2x', '4x', '8x', '16x'].includes(scaleFactor);
}

/**
 * 获取用户当前积分状态的摘要
 * @param userId 用户ID
 * @returns 积分状态摘要
 */
export async function getUserCreditsSummary(userId: string) {
  try {
    const userBenefits = await getUserBenefits(userId);
    
    if (!userBenefits) {
      return {
        totalCredits: 0,
        oneTimeCredits: 0,
        subscriptionCredits: 0,
        activePlan: null,
        canProcess: {
          '2x': false,
          '4x': false, 
          '8x': false,
          '16x': false
        }
      };
    }

    const totalCredits = userBenefits.totalAvailableCredits;

    return {
      totalCredits,
      oneTimeCredits: userBenefits.oneTimeCreditsBalance,
      subscriptionCredits: userBenefits.subscriptionCreditsBalance,
      activePlan: userBenefits.activePlanId,
      canProcess: {
        '2x': totalCredits >= 1,
        '4x': totalCredits >= 2,
        '8x': totalCredits >= 4,
        '16x': totalCredits >= 8
      }
    };
  } catch (error) {
    console.error('Error getting user credits summary:', error);
    return {
      totalCredits: 0,
      oneTimeCredits: 0,
      subscriptionCredits: 0,
      activePlan: null,
      canProcess: {
        '2x': false,
        '4x': false,
        '8x': false,
        '16x': false
      }
    };
  }
}