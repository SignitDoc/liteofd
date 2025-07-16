import defaultConfig from '../config.json'

export interface DebugConfig {
  drawTextBoundaryBox: boolean
  drawPathBoundaryBox: boolean
  drawImageBoundaryBox: boolean
  logCTMTransform: boolean
  logTextRendering: boolean
  logFontLoading: boolean
  showFPS: boolean
}

export interface RenderingConfig {
  enableAntialiasing: boolean
  textRenderingOptimization: boolean
  fontCacheSize: number
  maxCanvasSize: number
}

export interface PerformanceConfig {
  enableLazyLoading: boolean
  enablePageCaching: boolean
  maxCachedPages: number
}

export interface FeaturesConfig {
  enableZoom: boolean
  enablePan: boolean
  enableTextSelection: boolean
  enableAnnotation: boolean
}

export interface GlobalConfig {
  debug: DebugConfig
  rendering: RenderingConfig
  performance: PerformanceConfig
  features: FeaturesConfig
  renderPages?: number[]
}

export class ConfigManager {
  private static instance: ConfigManager
  private config: GlobalConfig

  private constructor() {
    this.config = this.loadConfig()
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  private loadConfig(): GlobalConfig {
    try {
      // 尝试从localStorage加载用户自定义配置
      const savedConfig = localStorage.getItem('liteofd-config')
      if (savedConfig) {
        const userConfig = JSON.parse(savedConfig)
        return this.mergeConfig(defaultConfig, userConfig)
      }
    } catch (error) {
      console.warn('Failed to load saved config, using default:', error)
    }
    
    return defaultConfig as GlobalConfig
  }

  private mergeConfig(defaultConfig: any, userConfig: any): GlobalConfig {
    const merged = { ...defaultConfig }
    
    // 深度合并配置
    for (const key in userConfig) {
      if (userConfig.hasOwnProperty(key) && typeof userConfig[key] === 'object') {
        merged[key] = { ...merged[key], ...userConfig[key] }
      } else {
        merged[key] = userConfig[key]
      }
    }
    
    return merged as GlobalConfig
  }

  public getConfig(): GlobalConfig {
    return this.config
  }

  public getDebugConfig(): DebugConfig {
    return this.config.debug
  }

  public getRenderingConfig(): RenderingConfig {
    return this.config.rendering
  }

  public getPerformanceConfig(): PerformanceConfig {
    return this.config.performance
  }

  public getFeaturesConfig(): FeaturesConfig {
    return this.config.features
  }

  public getRenderPagesConfig(): number[] | undefined {
    return this.config.renderPages;
  }

  public updateRenderPagesConfig(renderPages: number[] | undefined): void {
    this.config.renderPages = renderPages;
    this.saveConfig();
  }

  public updateConfig(newConfig: Partial<GlobalConfig>): void {
    this.config = this.mergeConfig(this.config, newConfig)
    this.saveConfig()
  }

  public updateDebugConfig(debugConfig: Partial<DebugConfig>): void {
    this.config.debug = { ...this.config.debug, ...debugConfig }
    this.saveConfig()
  }

  public updateRenderingConfig(renderingConfig: Partial<RenderingConfig>): void {
    this.config.rendering = { ...this.config.rendering, ...renderingConfig }
    this.saveConfig()
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('liteofd-config', JSON.stringify(this.config))
    } catch (error) {
      console.warn('Failed to save config:', error)
    }
  }

  public resetToDefault(): void {
    this.config = defaultConfig as GlobalConfig
    localStorage.removeItem('liteofd-config')
  }

  // 便捷方法
  public shouldDrawTextBoundaryBox(): boolean {
    return this.config.debug.drawTextBoundaryBox
  }

  public shouldDrawPathBoundaryBox(): boolean {
    return this.config.debug.drawPathBoundaryBox
  }

  public shouldDrawImageBoundaryBox(): boolean {
    return this.config.debug.drawImageBoundaryBox
  }

  public shouldLogCTMTransform(): boolean {
    return this.config.debug.logCTMTransform
  }

  public shouldLogTextRendering(): boolean {
    return this.config.debug.logTextRendering
  }

  public shouldLogFontLoading(): boolean {
    return this.config.debug.logFontLoading
  }
} 