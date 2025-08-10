/**
 * 智能用户行为检测器
 * 用于分析用户行为模式，决定是否需要 Turnstile 验证
 */

export interface UserBehavior {
  pageLoadTime: number;
  mouseMovements: number;
  keyboardInputs: number;
  scrollEvents: number;
  focusEvents: number;
  hasUploadedFile: boolean;
  hasChangedSettings: boolean;
  hasTypedPrompt: boolean;
  timeOnPage: number;
  clickCount: number;
}

export interface SuspiciousAnalysis {
  needsVerification: boolean;
  suspiciousScore: number;
  reasons: string[];
  confidence: number;
}

export class BehaviorDetector {
  private static readonly THRESHOLDS = {
    MIN_TIME_ON_PAGE: 8000, // 8秒
    MIN_MOUSE_MOVEMENTS: 10,
    MIN_INTERACTIONS: 2,
    MAX_SUSPICIOUS_SCORE: 60, // 100分制，60分以上需要验证
  };

  /**
   * 分析用户行为，判断是否需要验证
   */
  static analyzeBehavior(behavior: UserBehavior): SuspiciousAnalysis {
    const reasons: string[] = [];
    let suspiciousScore = 0;

    // 检测1: 页面停留时间过短 (权重: 25分)
    if (behavior.timeOnPage < this.THRESHOLDS.MIN_TIME_ON_PAGE) {
      reasons.push(`页面停留时间过短 (${Math.round(behavior.timeOnPage/1000)}秒)`);
      suspiciousScore += 25;
    }

    // 检测2: 缺乏鼠标交互 (权重: 20分)
    if (behavior.mouseMovements < this.THRESHOLDS.MIN_MOUSE_MOVEMENTS) {
      reasons.push(`鼠标活动不足 (${behavior.mouseMovements}次移动)`);
      suspiciousScore += 20;
    }

    // 检测3: 缺乏真实用户交互 (权重: 25分)
    const interactionCount = 
      (behavior.hasUploadedFile ? 1 : 0) +
      (behavior.hasChangedSettings ? 1 : 0) +
      (behavior.hasTypedPrompt ? 1 : 0) +
      (behavior.keyboardInputs > 0 ? 1 : 0) +
      (behavior.scrollEvents > 3 ? 1 : 0);

    if (interactionCount < this.THRESHOLDS.MIN_INTERACTIONS) {
      reasons.push(`用户交互不足 (${interactionCount}种交互)`);
      suspiciousScore += 25;
    }

    // 检测4: 异常的点击模式 (权重: 15分)
    if (behavior.clickCount === 1 && behavior.timeOnPage < 5000) {
      reasons.push('直接点击无其他操作');
      suspiciousScore += 15;
    }

    // 检测5: 缺乏焦点事件 (权重: 10分)
    if (behavior.focusEvents === 0 && behavior.timeOnPage > 3000) {
      reasons.push('页面焦点事件异常');
      suspiciousScore += 10;
    }

    // 检测6: 过于机械化的行为 (权重: 5分)
    if (behavior.mouseMovements > 0 && behavior.scrollEvents === 0 && behavior.timeOnPage < 10000) {
      reasons.push('行为模式过于规律');
      suspiciousScore += 5;
    }

    const needsVerification = suspiciousScore >= this.THRESHOLDS.MAX_SUSPICIOUS_SCORE;
    const confidence = Math.min(suspiciousScore / 100, 1);

    return {
      needsVerification,
      suspiciousScore,
      reasons,
      confidence
    };
  }

  /**
   * 获取用户行为描述（用于调试）
   */
  static getBehaviorSummary(behavior: UserBehavior): string {
    return `
页面停留: ${Math.round(behavior.timeOnPage/1000)}秒
鼠标移动: ${behavior.mouseMovements}次
键盘输入: ${behavior.keyboardInputs}次
滚动事件: ${behavior.scrollEvents}次
点击次数: ${behavior.clickCount}次
上传文件: ${behavior.hasUploadedFile ? '是' : '否'}
修改设置: ${behavior.hasChangedSettings ? '是' : '否'}
输入提示词: ${behavior.hasTypedPrompt ? '是' : '否'}
    `.trim();
  }
}

/**
 * 用户行为跟踪器
 * 在组件中使用，实时收集用户行为数据
 */
export class BehaviorTracker {
  private behavior: UserBehavior;
  private listeners: (() => void)[] = [];

  constructor() {
    this.behavior = {
      pageLoadTime: Date.now(),
      mouseMovements: 0,
      keyboardInputs: 0,
      scrollEvents: 0,
      focusEvents: 0,
      hasUploadedFile: false,
      hasChangedSettings: false,
      hasTypedPrompt: false,
      timeOnPage: 0,
      clickCount: 0,
    };

    this.startTracking();
  }

  private startTracking() {
    // 鼠标移动跟踪
    const mouseHandler = () => {
      this.behavior.mouseMovements++;
    };

    // 键盘输入跟踪
    const keyHandler = () => {
      this.behavior.keyboardInputs++;
    };

    // 滚动跟踪
    const scrollHandler = () => {
      this.behavior.scrollEvents++;
    };

    // 焦点跟踪
    const focusHandler = () => {
      this.behavior.focusEvents++;
    };

    // 点击跟踪
    const clickHandler = () => {
      this.behavior.clickCount++;
    };

    // 添加事件监听器
    document.addEventListener('mousemove', mouseHandler, { passive: true });
    document.addEventListener('keydown', keyHandler, { passive: true });
    document.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('focus', focusHandler, { passive: true });
    document.addEventListener('click', clickHandler, { passive: true });

    // 保存清理函数
    this.listeners = [
      () => document.removeEventListener('mousemove', mouseHandler),
      () => document.removeEventListener('keydown', keyHandler),
      () => document.removeEventListener('scroll', scrollHandler),
      () => window.removeEventListener('focus', focusHandler),
      () => document.removeEventListener('click', clickHandler),
    ];
  }

  /**
   * 标记用户执行了特定操作
   */
  markFileUploaded() {
    this.behavior.hasUploadedFile = true;
  }

  markSettingsChanged() {
    this.behavior.hasChangedSettings = true;
  }

  markPromptTyped() {
    this.behavior.hasTypedPrompt = true;
  }

  /**
   * 获取当前用户行为数据
   */
  getBehavior(): UserBehavior {
    this.behavior.timeOnPage = Date.now() - this.behavior.pageLoadTime;
    return { ...this.behavior };
  }

  /**
   * 分析当前行为是否可疑
   */
  analyzeCurrent(): SuspiciousAnalysis {
    return BehaviorDetector.analyzeBehavior(this.getBehavior());
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.listeners.forEach(cleanup => cleanup());
    this.listeners = [];
  }
}