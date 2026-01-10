/**
 * 渲染器配置管理器
 * 统一管理渲染器类型和相关配置
 */
export class RendererConfig {
	private static instance: RendererConfig
	private isCanvasRenderer: boolean = true // 默认使用canvas渲染
	private rendererType: 'canvas' | 'svg' = 'canvas'

	private constructor() {}

	/**
	 * 获取单例实例
	 */
	public static getInstance(): RendererConfig {
		if (!RendererConfig.instance) {
			RendererConfig.instance = new RendererConfig()
		}
		return RendererConfig.instance
	}

	/**
	 * 设置渲染器类型
	 * @param type 渲染器类型：'canvas' 或 'svg'
	 */
	public setRendererType(type: 'canvas' | 'svg'): void {
		this.rendererType = type
		this.isCanvasRenderer = type === 'canvas'
	}

	/**
	 * 获取渲染器类型
	 */
	public getRendererType(): 'canvas' | 'svg' {
		return this.rendererType
	}

	/**
	 * 检查是否使用Canvas渲染器
	 */
	public isCanvasRender(): boolean {
		return this.isCanvasRenderer
	}

	/**
	 * 检查是否使用SVG渲染器
	 */
	public isSvgRender(): boolean {
		return !this.isCanvasRenderer
	}

	/**
	 * 设置是否使用Canvas渲染器
	 * @param useCanvas 是否使用Canvas渲染器
	 */
	public setCanvasRenderer(useCanvas: boolean): void {
		this.isCanvasRenderer = useCanvas
		this.rendererType = useCanvas ? 'canvas' : 'svg'
	}

	/**
	 * 重置为默认配置
	 */
	public resetToDefault(): void {
		this.isCanvasRenderer = true
		this.rendererType = 'canvas'
	}
}

// 导出全局实例，方便直接使用
export const rendererConfig = RendererConfig.getInstance()
