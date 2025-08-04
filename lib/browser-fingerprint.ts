/**
 * 浏览器指纹生成工具
 * 用于匿名用户身份识别
 */

export interface BrowserFingerprint {
  fingerprint: string;
  components: Record<string, any>;
}

/**
 * 生成浏览器指纹
 * @returns Promise<BrowserFingerprint>
 */
export async function generateBrowserFingerprint(): Promise<BrowserFingerprint> {
  const components: Record<string, any> = {};

  try {
    // 1. 屏幕信息
    components.screen = {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight
    };

    // 2. 浏览器信息
    components.navigator = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints || 0
    };

    // 3. 时区信息
    try {
      components.timezone = {
        offset: new Date().getTimezoneOffset(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    } catch (e) {
      components.timezone = { offset: new Date().getTimezoneOffset() };
    }

    // 4. Canvas 指纹
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 200;
        canvas.height = 50;
        
        // 绘制文本
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('Nexty fingerprint 🚀', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Browser fingerprint test', 4, 35);
        
        // 绘制几何图形
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgb(255,0,255)';
        ctx.beginPath();
        ctx.arc(50, 25, 20, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
        
        components.canvas = canvas.toDataURL();
      }
    } catch (e) {
      components.canvas = 'canvas_error';
    }

    // 5. WebGL 指纹
    try {
      const gl = document.createElement('canvas').getContext('webgl') || 
                  document.createElement('canvas').getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        components.webgl = {
          vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown',
          renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown',
          version: gl.getParameter(gl.VERSION),
          shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
        };
      }
    } catch (e) {
      components.webgl = 'webgl_error';
    }

    // 6. 音频指纹（AudioContext）
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(0);
      
      // 获取音频数据
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(freqData);
      
      components.audio = {
        sampleRate: audioContext.sampleRate,
        state: audioContext.state,
        fingerprint: Array.from(freqData.slice(0, 10)).join(',')
      };
      
      oscillator.stop();
      audioContext.close();
    } catch (e) {
      components.audio = 'audio_error';
    }

    // 7. 字体检测（简化版）
    try {
      const testString = 'mmmmmmmmmmlli';
      const testSize = '72px';
      const baseFonts = ['monospace', 'sans-serif', 'serif'];
      const fontList = [
        'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia',
        'Comic Sans MS', 'Trebuchet MS', 'Arial Black', 'Impact'
      ];
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      
      // 获取基础字体宽度
      const baseWidths: Record<string, number> = {};
      for (const baseFont of baseFonts) {
        context.font = `${testSize} ${baseFont}`;
        baseWidths[baseFont] = context.measureText(testString).width;
      }
      
      // 检测可用字体
      const availableFonts: string[] = [];
      for (const font of fontList) {
        for (const baseFont of baseFonts) {
          context.font = `${testSize} ${font}, ${baseFont}`;
          const width = context.measureText(testString).width;
          if (width !== baseWidths[baseFont]) {
            availableFonts.push(font);
            break;
          }
        }
      }
      
      components.fonts = availableFonts.sort();
    } catch (e) {
      components.fonts = 'fonts_error';
    }

    // 8. 插件信息
    try {
      const plugins = Array.from(navigator.plugins).map(plugin => ({
        name: plugin.name,
        filename: plugin.filename,
        description: plugin.description
      }));
      components.plugins = plugins;
    } catch (e) {
      components.plugins = 'plugins_error';
    }

    // 9. 存储配额信息
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        components.storage = {
          quota: estimate.quota,
          usage: estimate.usage
        };
      }
    } catch (e) {
      components.storage = 'storage_error';
    }

    // 10. 设备内存信息
    try {
      components.memory = (navigator as any).deviceMemory || 'unknown';
    } catch (e) {
      components.memory = 'memory_error';
    }

    // 生成最终指纹
    const fingerprintString = JSON.stringify(components);
    const fingerprint = await hashString(fingerprintString);

    return {
      fingerprint,
      components
    };
  } catch (error) {
    console.error('生成浏览器指纹时出错:', error);
    
    // 降级方案：使用基础信息生成指纹
    const fallbackData = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
      timezone: new Date().getTimezoneOffset(),
      timestamp: Date.now()
    };
    
    const fallbackString = JSON.stringify(fallbackData);
    const fallbackFingerprint = await hashString(fallbackString);
    
    return {
      fingerprint: fallbackFingerprint,
      components: fallbackData
    };
  }
}

/**
 * 使用 Web Crypto API 生成 SHA-256 哈希
 * @param data 要哈希的字符串
 * @returns Promise<string> 十六进制哈希值
 */
async function hashString(data: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    // 降级方案：使用简单的哈希算法
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * 验证指纹有效性
 * @param fingerprint 指纹字符串
 * @returns boolean
 */
export function isValidFingerprint(fingerprint: string): boolean {
  return typeof fingerprint === 'string' && 
         fingerprint.length >= 8 && 
         /^[a-f0-9]+$/i.test(fingerprint);
}

/**
 * 获取指纹摘要信息（用于调试）
 * @param components 指纹组件
 * @returns 摘要信息
 */
export function getFingerprintSummary(components: Record<string, any>): Record<string, any> {
  return {
    screen: `${components.screen?.width}x${components.screen?.height}`,
    platform: components.navigator?.platform,
    language: components.navigator?.language,
    timezone: components.timezone?.timezone,
    fonts: Array.isArray(components.fonts) ? components.fonts.length : 'error',
    plugins: Array.isArray(components.plugins) ? components.plugins.length : 'error',
    canvas: components.canvas ? 'available' : 'error',
    webgl: components.webgl?.renderer || 'error'
  };
}