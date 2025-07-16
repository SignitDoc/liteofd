import { ConfigManager } from './configManager'

export class ConfigUI {
	private configManager: ConfigManager
	private container: HTMLDivElement | null = null
	private saveSuccessTimer: number | null = null

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

		// 创建渲染页面配置区域
		this.createRenderPagesSection()

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
			this.showSaveSuccess()
		})

		// 路径边界框
		this.createCheckbox(section, '绘制路径边界框', debugConfig.drawPathBoundaryBox, (checked) => {
			this.configManager.updateDebugConfig({ drawPathBoundaryBox: checked })
			this.showSaveSuccess()
		})

		// 图像边界框
		this.createCheckbox(section, '绘制图像边界框', debugConfig.drawImageBoundaryBox, (checked) => {
			this.configManager.updateDebugConfig({ drawImageBoundaryBox: checked })
			this.showSaveSuccess()
		})

		// CTM变换日志
		this.createCheckbox(section, 'CTM变换日志', debugConfig.logCTMTransform, (checked) => {
			this.configManager.updateDebugConfig({ logCTMTransform: checked })
			this.showSaveSuccess()
		})

		// 文本渲染日志
		this.createCheckbox(section, '文本渲染日志', debugConfig.logTextRendering, (checked) => {
			this.configManager.updateDebugConfig({ logTextRendering: checked })
			this.showSaveSuccess()
		})

		// 字体加载日志
		this.createCheckbox(section, '字体加载日志', debugConfig.logFontLoading, (checked) => {
			this.configManager.updateDebugConfig({ logFontLoading: checked })
			this.showSaveSuccess()
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
			this.showSaveSuccess()
		})

		// 文本渲染优化
		this.createCheckbox(section, '文本渲染优化', renderingConfig.textRenderingOptimization, (checked) => {
			this.configManager.updateRenderingConfig({ textRenderingOptimization: checked })
			this.showSaveSuccess()
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
			this.configManager.updateFeaturesConfig({ enableZoom: checked })
			this.showSaveSuccess()
		})

		// 平移功能
		this.createCheckbox(section, '启用平移', featuresConfig.enablePan, (checked) => {
			this.configManager.updateFeaturesConfig({ enablePan: checked })
			this.showSaveSuccess()
		})

		// 文本选择
		this.createCheckbox(section, '启用文本选择', featuresConfig.enableTextSelection, (checked) => {
			this.configManager.updateFeaturesConfig({ enableTextSelection: checked })
			this.showSaveSuccess()
		})

		this.container!.appendChild(section)
	}

	private createRenderPagesSection(): void {
		const section = document.createElement('div')
		section.style.marginBottom = '15px'

		const title = document.createElement('h4')
		title.textContent = '渲染页面配置'
		title.style.margin = '0 0 8px 0'
		title.style.fontSize = '12px'
		section.appendChild(title)

		// 创建说明文字
		const description = document.createElement('div')
		description.textContent = '指定要渲染的页面索引（如：0,2 表示渲染第1和第3页），留空则渲染全部页面'
		description.style.cssText = `
			font-size: 10px;
			color: #666;
			margin-bottom: 8px;
			line-height: 1.3;
		`
		section.appendChild(description)

		// 创建输入框容器
		const inputContainer = document.createElement('div')
		inputContainer.style.display = 'flex'
		inputContainer.style.alignItems = 'center'
		inputContainer.style.marginBottom = '5px'

		// 创建标签
		const label = document.createElement('label')
		label.textContent = '页面索引：'
		label.style.cssText = `
			font-size: 11px;
			margin-right: 5px;
			min-width: 60px;
		`
		inputContainer.appendChild(label)

		// 创建输入框
		const input = document.createElement('input')
		input.type = 'text'
		input.placeholder = '如：0,2'
		input.style.cssText = `
			flex: 1;
			padding: 3px 5px;
			font-size: 11px;
			border: 1px solid #ccc;
			border-radius: 3px;
			width: 100px;
		`

		// 获取当前配置并设置输入框的值
		const renderPages = this.configManager.getRenderPagesConfig()
		if (renderPages && renderPages.length > 0) {
			input.value = renderPages.join(',')
		}

		// 添加输入事件监听
		input.addEventListener('input', (e) => {
			const value = (e.target as HTMLInputElement).value.trim()
			if (value === '') {
				// 清空时删除配置
				this.configManager.updateRenderPagesConfig(undefined)
				this.showSaveSuccess()
			} else {
				// 解析输入的页面索引
				const pageIndexes = value.split(',')
					.map(s => s.trim())
					.filter(s => s !== '')
					.map(s => parseInt(s))
					.filter(n => !isNaN(n))
				
				if (pageIndexes.length > 0) {
					this.configManager.updateRenderPagesConfig(pageIndexes)
					this.showSaveSuccess()
				}
			}
		})

		inputContainer.appendChild(input)
		section.appendChild(inputContainer)

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

	/**
	 * 显示保存成功提示
	 */
	private showSaveSuccess(): void {
		// 清除之前的定时器
		if (this.saveSuccessTimer) {
			clearTimeout(this.saveSuccessTimer)
		}

		// 移除已存在的提示
		const existingToast = document.querySelector('.liteofd-save-toast')
		if (existingToast) {
			existingToast.remove()
		}

		// 创建临时提示元素
		const toast = document.createElement('div')
		toast.className = 'liteofd-save-toast'
		toast.textContent = '配置已保存到本地'
		toast.style.cssText = `
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background: #4CAF50;
			color: white;
			padding: 10px 15px;
			border-radius: 5px;
			font-size: 12px;
			z-index: 1001;
			opacity: 0;
			transition: opacity 0.3s;
		`
		
		document.body.appendChild(toast)
		
		// 显示提示
		setTimeout(() => {
			toast.style.opacity = '1'
		}, 10)
		
		// 2秒后自动移除
		this.saveSuccessTimer = window.setTimeout(() => {
			toast.style.opacity = '0'
			setTimeout(() => {
				if (toast.parentNode) {
					toast.parentNode.removeChild(toast)
				}
			}, 300)
		}, 2000)
	}
} 