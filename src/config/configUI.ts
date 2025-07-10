import { ConfigManager } from './configManager'

export class ConfigUI {
	private configManager: ConfigManager
	private container: HTMLDivElement | null = null

	constructor() {
		this.configManager = ConfigManager.getInstance()
	}

	/**
	 * 创建配置UI界面
	 * @param parentElement 父容器元素
	 */
	public createConfigUI(parentElement: HTMLElement): void {
		// 创建配置容器
		this.container = document.createElement('div')
		this.container.className = 'liteofd-config-ui'
		this.container.style.cssText = `
			position: fixed;
			top: 10px;
			right: 10px;
			background: white;
			border: 1px solid #ccc;
			border-radius: 5px;
			padding: 15px;
			box-shadow: 0 2px 10px rgba(0,0,0,0.1);
			z-index: 1000;
			max-width: 300px;
			font-family: Arial, sans-serif;
			font-size: 12px;
		`

		// 创建标题
		const title = document.createElement('h3')
		title.textContent = 'LiteOFD 配置'
		title.style.margin = '0 0 10px 0'
		title.style.fontSize = '14px'
		this.container.appendChild(title)

		// 创建调试配置区域
		this.createDebugSection()
		
		// 创建渲染配置区域
		this.createRenderingSection()
		
		// 创建功能配置区域
		this.createFeaturesSection()

		// 创建按钮区域
		this.createButtons()

		parentElement.appendChild(this.container)
	}

	private createDebugSection(): void {
		const section = document.createElement('div')
		section.style.marginBottom = '15px'

		const title = document.createElement('h4')
		title.textContent = '调试选项'
		title.style.margin = '0 0 8px 0'
		title.style.fontSize = '12px'
		section.appendChild(title)

		const debugConfig = this.configManager.getDebugConfig()
		
		// 文本边界框
		this.createCheckbox(section, '绘制文本边界框', debugConfig.drawTextBoundaryBox, (checked) => {
			this.configManager.updateDebugConfig({ drawTextBoundaryBox: checked })
		})

		// 路径边界框
		this.createCheckbox(section, '绘制路径边界框', debugConfig.drawPathBoundaryBox, (checked) => {
			this.configManager.updateDebugConfig({ drawPathBoundaryBox: checked })
		})

		// 图像边界框
		this.createCheckbox(section, '绘制图像边界框', debugConfig.drawImageBoundaryBox, (checked) => {
			this.configManager.updateDebugConfig({ drawImageBoundaryBox: checked })
		})

		// CTM变换日志
		this.createCheckbox(section, 'CTM变换日志', debugConfig.logCTMTransform, (checked) => {
			this.configManager.updateDebugConfig({ logCTMTransform: checked })
		})

		// 文本渲染日志
		this.createCheckbox(section, '文本渲染日志', debugConfig.logTextRendering, (checked) => {
			this.configManager.updateDebugConfig({ logTextRendering: checked })
		})

		// 字体加载日志
		this.createCheckbox(section, '字体加载日志', debugConfig.logFontLoading, (checked) => {
			this.configManager.updateDebugConfig({ logFontLoading: checked })
		})

		this.container!.appendChild(section)
	}

	private createRenderingSection(): void {
		const section = document.createElement('div')
		section.style.marginBottom = '15px'

		const title = document.createElement('h4')
		title.textContent = '渲染选项'
		title.style.margin = '0 0 8px 0'
		title.style.fontSize = '12px'
		section.appendChild(title)

		const renderingConfig = this.configManager.getRenderingConfig()

		// 抗锯齿
		this.createCheckbox(section, '启用抗锯齿', renderingConfig.enableAntialiasing, (checked) => {
			this.configManager.updateRenderingConfig({ enableAntialiasing: checked })
		})

		// 文本渲染优化
		this.createCheckbox(section, '文本渲染优化', renderingConfig.textRenderingOptimization, (checked) => {
			this.configManager.updateRenderingConfig({ textRenderingOptimization: checked })
		})

		this.container!.appendChild(section)
	}

	private createFeaturesSection(): void {
		const section = document.createElement('div')
		section.style.marginBottom = '15px'

		const title = document.createElement('h4')
		title.textContent = '功能选项'
		title.style.margin = '0 0 8px 0'
		title.style.fontSize = '12px'
		section.appendChild(title)

		const featuresConfig = this.configManager.getFeaturesConfig()

		// 缩放功能
		this.createCheckbox(section, '启用缩放', featuresConfig.enableZoom, (checked) => {
			this.configManager.updateConfig({ features: { ...featuresConfig, enableZoom: checked } })
		})

		// 平移功能
		this.createCheckbox(section, '启用平移', featuresConfig.enablePan, (checked) => {
			this.configManager.updateConfig({ features: { ...featuresConfig, enablePan: checked } })
		})

		// 文本选择
		this.createCheckbox(section, '启用文本选择', featuresConfig.enableTextSelection, (checked) => {
			this.configManager.updateConfig({ features: { ...featuresConfig, enableTextSelection: checked } })
		})

		this.container!.appendChild(section)
	}

	private createCheckbox(parent: HTMLElement, label: string, checked: boolean, onChange: (checked: boolean) => void): void {
		const container = document.createElement('div')
		container.style.marginBottom = '5px'
		container.style.display = 'flex'
		container.style.alignItems = 'center'

		const checkbox = document.createElement('input')
		checkbox.type = 'checkbox'
		checkbox.checked = checked
		checkbox.style.marginRight = '5px'
		checkbox.addEventListener('change', (e) => {
			onChange((e.target as HTMLInputElement).checked)
		})

		const labelElement = document.createElement('label')
		labelElement.textContent = label
		labelElement.style.fontSize = '11px'

		container.appendChild(checkbox)
		container.appendChild(labelElement)
		parent.appendChild(container)
	}

	private createButtons(): void {
		const buttonContainer = document.createElement('div')
		buttonContainer.style.display = 'flex'
		buttonContainer.style.gap = '5px'
		buttonContainer.style.marginTop = '10px'

		// 重置按钮
		const resetButton = document.createElement('button')
		resetButton.textContent = '重置'
		resetButton.style.cssText = `
			padding: 5px 10px;
			font-size: 11px;
			border: 1px solid #ccc;
			border-radius: 3px;
			background: #f5f5f5;
			cursor: pointer;
		`
		resetButton.addEventListener('click', () => {
			this.configManager.resetToDefault()
			location.reload() // 重新加载页面以应用默认配置
		})

		// 关闭按钮
		const closeButton = document.createElement('button')
		closeButton.textContent = '关闭'
		closeButton.style.cssText = `
			padding: 5px 10px;
			font-size: 11px;
			border: 1px solid #ccc;
			border-radius: 3px;
			background: #f5f5f5;
			cursor: pointer;
		`
		closeButton.addEventListener('click', () => {
			this.hide()
		})

		buttonContainer.appendChild(resetButton)
		buttonContainer.appendChild(closeButton)
		this.container!.appendChild(buttonContainer)
	}

	/**
	 * 显示配置UI
	 */
	public show(): void {
		if (this.container) {
			this.container.style.display = 'block'
		}
	}

	/**
	 * 隐藏配置UI
	 */
	public hide(): void {
		if (this.container) {
			this.container.style.display = 'none'
		}
	}

	/**
	 * 切换配置UI显示状态
	 */
	public toggle(): void {
		if (this.container) {
			this.container.style.display = this.container.style.display === 'none' ? 'block' : 'none'
		}
	}

	/**
	 * 销毁配置UI
	 */
	public destroy(): void {
		if (this.container && this.container.parentNode) {
			this.container.parentNode.removeChild(this.container)
			this.container = null
		}
	}
} 