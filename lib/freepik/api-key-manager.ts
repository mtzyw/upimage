import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

const supabaseAdmin = createAdminClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface FreepikApiKey {
  id: string;
  key: string;
  name: string | null;
  daily_limit: number;
  used_today: number;
  remaining: number;
}

export interface ApiKeyStats {
  totalKeys: number;
  activeKeys: number;
  totalDailyLimit: number;
  totalUsedToday: number;
  availableKeys: number;
}

/**
 * 获取可用的 Freepik API Key（轮换策略）
 * @returns 可用的 API Key 或 null
 */
export async function getAvailableFreepikApiKey(): Promise<FreepikApiKey | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('[getAvailableFreepikApiKey] Today date:', today);
    
    // 重置昨天的计数器
    const { error: resetError } = await supabaseAdmin
      .from('freepik_api_keys')
      .update({ 
        used_today: 0, 
        last_reset_date: today 
      })
      .neq('last_reset_date', today);

    if (resetError) {
      console.error('Error resetting API key counters:', resetError);
    }
    
    // 先获取所有激活的 keys 来调试
    const { data: allKeys, error: allKeysError } = await supabaseAdmin
      .from('freepik_api_keys')
      .select('*')
      .eq('is_active', true);
    
    console.log('[getAvailableFreepikApiKey] All active keys:', allKeys);
    
    if (allKeysError) {
      console.error('Error fetching all active keys:', allKeysError);
    }
    
    // 获取可用的 API Key（今日使用次数未达上限）
    // 使用 rpc 调用数据库函数来获取可用的 API key
    const { data: availableKey, error: queryError } = await supabaseAdmin
      .rpc('get_available_freepik_api_key');
    
    console.log('[getAvailableFreepikApiKey] RPC result:', availableKey);
    
    if (queryError) {
      console.error('Error querying available API keys:', queryError);
      return null;
    }

    if (!availableKey || availableKey.length === 0) {
      console.warn('No available Freepik API keys found. RPC returned:', availableKey);
      return null;
    }
    
    // RPC 返回的是数组，取第一个元素
    const keyInfo = availableKey[0];
    
    if (!keyInfo || !keyInfo.id) {
      console.warn('Invalid key info from RPC:', keyInfo);
      return null;
    }
    
    // 数据库函数已经更新了使用计数，我们需要获取完整的 key 信息
    const { data: selectedKey, error: fetchError } = await supabaseAdmin
      .from('freepik_api_keys')
      .select('*')
      .eq('id', keyInfo.id)
      .single();

    if (fetchError || !selectedKey) {
      console.error('Error fetching selected API key:', fetchError);
      return null;
    }
    
    return {
      id: selectedKey.id,
      key: selectedKey.key,
      name: selectedKey.name,
      daily_limit: selectedKey.daily_limit || 100,
      used_today: selectedKey.used_today || 0,
      remaining: (selectedKey.daily_limit || 100) - (selectedKey.used_today || 0)
    };
  } catch (error) {
    console.error('Error in getAvailableFreepikApiKey:', error);
    return null;
  }
}

/**
 * 释放 API Key（任务失败时减少使用计数）
 * @param keyId API Key ID
 */
export async function releaseApiKey(keyId: string): Promise<void> {
  try {
    // 获取当前使用计数
    const { data: keyData, error: queryError } = await supabaseAdmin
      .from('freepik_api_keys')
      .select('used_today')
      .eq('id', keyId)
      .single();

    if (queryError || !keyData) {
      console.error('Error querying API key for release:', queryError);
      return;
    }

    // 减少使用计数（但不能小于0）
    const newUsedCount = Math.max(0, keyData.used_today - 1);

    const { error: updateError } = await supabaseAdmin
      .from('freepik_api_keys')
      .update({ 
        used_today: newUsedCount,
        updated_at: new Date().toISOString() 
      })
      .eq('id', keyId);

    if (updateError) {
      console.error('Error releasing API key:', updateError);
    } else {
      console.log(`API key ${keyId} released, usage count reduced to ${newUsedCount}`);
    }
  } catch (error) {
    console.error('Error in releaseApiKey:', error);
  }
}

/**
 * 获取所有 API Key 的统计信息
 * @returns API Key 使用统计
 */
export async function getApiKeyStats(): Promise<ApiKeyStats | null> {
  try {
    const { data: keys, error } = await supabaseAdmin
      .from('freepik_api_keys')
      .select('*');

    if (error || !keys) {
      console.error('Error fetching API key stats:', error);
      return null;
    }

    const stats: ApiKeyStats = {
      totalKeys: keys.length,
      activeKeys: keys.filter(key => key.is_active).length,
      totalDailyLimit: keys.reduce((sum, key) => sum + (key.daily_limit || 0), 0),
      totalUsedToday: keys.reduce((sum, key) => sum + (key.used_today || 0), 0),
      availableKeys: keys.filter(key => 
        key.is_active && (key.used_today || 0) < (key.daily_limit || 0)
      ).length
    };

    return stats;
  } catch (error) {
    console.error('Error in getApiKeyStats:', error);
    return null;
  }
}

/**
 * 检查是否有可用的 API Key
 * @returns 是否有可用的 API Key
 */
export async function hasAvailableApiKey(): Promise<boolean> {
  try {
    const { count, error } = await supabaseAdmin
      .from('freepik_api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    if (error) {
      console.error('Error checking available API keys:', error);
      return false;
    }

    // 如果有激活的 key，我们再检查是否有可用的（未达到每日限制的）
    if (count && count > 0) {
      // 获取所有激活的 keys 并在客户端检查
      const { data: keys, error: keysError } = await supabaseAdmin
        .from('freepik_api_keys')
        .select('used_today, daily_limit')
        .eq('is_active', true);

      if (keysError) {
        console.error('Error fetching API keys:', keysError);
        return false;
      }

      // 检查是否有任何 key 还有剩余使用次数
      return keys?.some(key => (key.used_today || 0) < (key.daily_limit || 100)) || false;
    }

    return false;
  } catch (error) {
    console.error('Error in hasAvailableApiKey:', error);
    return false;
  }
}

/**
 * 获取指定 API Key 的详细信息
 * @param keyId API Key ID
 * @returns API Key 详细信息
 */
export async function getApiKeyDetails(keyId: string): Promise<FreepikApiKey | null> {
  try {
    const { data: keyData, error } = await supabaseAdmin
      .from('freepik_api_keys')
      .select('*')
      .eq('id', keyId)
      .single();

    if (error || !keyData) {
      console.error('Error fetching API key details:', error);
      return null;
    }

    return {
      id: keyData.id,
      key: keyData.key,
      name: keyData.name,
      daily_limit: keyData.daily_limit || 100,
      used_today: keyData.used_today || 0,
      remaining: (keyData.daily_limit || 100) - (keyData.used_today || 0)
    };
  } catch (error) {
    console.error('Error in getApiKeyDetails:', error);
    return null;
  }
}