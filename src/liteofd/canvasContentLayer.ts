import Layer from "./layer"
import { XmlData } from "./ofdData"
import { OfdDocument } from "./ofdDocument"
import * as parser from "./parser"
import { AttributeKey, OFD_KEY } from "./attrType"
import { findAttributeValueByKey } from "./parser"
import { getCTM, parseColor } from "./utils/elementUtils"
import { TextRenderer } from "./textRenderer"
import { PathRenderer } from "./pathRenderer"
import { ImageRenderer } from "./imageRenderer"

// 使用canvas进行绘制界面
export class CanvasContentLayer extends Layer {

	private ofdDocument: OfdDocument
	private setDefaultZOrder = false // 是否使用默认的zorder的值设置zindex
	private defaultZorderValue = -1 // 默认的zindex的值
	private pageCanvas!: HTMLCanvasElement // 绘制的界面canvas
	private pageContainer!: HTMLDivElement // 包裹canvas的div组件
	private pageCanvasCtx!: CanvasRenderingContext2D // 绘制的界面canvas的上下文
	private textRenderer!: TextRenderer // 文本渲染器
	private pathRenderer!: PathRenderer // 路径渲染器
	private imageRenderer!: ImageRenderer // 图片渲染器

	constructor(ofdDocument: OfdDocument, pageContainer: HTMLDivElement, pageCanvas: HTMLCanvasElement) {
		super()
		this.ofdDocument = ofdDocument
		this.pageCanvas = pageCanvas
		this.pageContainer = pageContainer
		this.#initPageContainer()
	}

	// 初始化页面数据
	#initPageContainer() {
		// 目前的页面是pages的第一个开始

	}

	#renderLayerDataObject(dataObj: XmlData, pageContainer: Element) {
		switch (dataObj.tagName) {
			case OFD_KEY.TextObject:
				this.textRenderer.renderTextObject(dataObj, pageContainer)
				break
			case OFD_KEY.PathObject:
				this.pathRenderer.renderPathObject(dataObj, pageContainer)
				break
			case OFD_KEY.ImageObject:
				this.imageRenderer.renderImageObject(dataObj, pageContainer)
				break
			// case OFD_KEY.PageBlock:
			// 	this.#renderPageBlock(dataObj, pageContainer)
			// 	break
		}
	}

	#renderSingleLayer(layerData: XmlData, pageContainer: Element) {
		for (let i = 0; i < layerData.children.length; i++) {
			let dataObj = layerData.children[i]
			this.#renderLayerDataObject(dataObj, pageContainer)
		}
	}

	#renderLayer(layerData: XmlData, pageContainer: Element) {
		let layers = layerData.children
		for (let i = 0; i < layers.length; i++) {
			this.#renderSingleLayer(layers[i], pageContainer)
		}

	}

	#renderPageContent(contentData: XmlData, pageContainer: Element) {
		console.log("canvas render data", contentData, pageContainer)
		let layers = contentData.children
		for (let i = 0; i < layers.length; i++) {
			let layer = layers[i]
			this.#renderLayer(layer, pageContainer)
		}
	}

	render(pageData: XmlData, pageContainer: Element) {
		try {
			let contentData = parser.findValueByTagName(pageData, OFD_KEY.Content)
			if(contentData) {
				const ctx = this.pageCanvas.getContext('2d')
				if (!ctx) {
					console.error("无法获取canvas上下文")
					return null
				}
				this.pageCanvasCtx = ctx
				// 初始化文本渲染器
				this.textRenderer = new TextRenderer(this.ofdDocument, this.pageCanvasCtx)
				// 初始化路径渲染器
				this.pathRenderer = new PathRenderer(this.ofdDocument, this.pageCanvasCtx)
				// 初始化图片渲染器
				this.imageRenderer = new ImageRenderer(this.ofdDocument, this.pageCanvasCtx)
				// 渲染内容层
				this.#initPageContainer()
				this.#renderPageContent(contentData, pageContainer)
			}
		} catch (e) {
			console.log("render page content error", e, pageData)
			return null
		}
	}





}
