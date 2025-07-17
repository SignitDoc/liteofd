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
		// 获取绘制的参数，textrender和pathrender等
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
		this.#initPageContainer()
	}

	// 初始化页面数据
	#initPageContainer() {
		// 目前的页面是pages的第一个开始

	}

	#renderLayerDataObject(dataObj: XmlData, pageContainer: Element) {
		let idValue = parser.findAttributeValueByKey(dataObj, AttributeKey.ID)
		if (idValue == 159) {
			debugger
		}
		switch (dataObj.tagName) {
			case OFD_KEY.TextObject:
				this.textRenderer.renderSingleTextObject(dataObj, pageContainer)
				break
			case OFD_KEY.PathObject:
				this.pathRenderer.renderSinglePathObject(dataObj, pageContainer)
				break
			case OFD_KEY.ImageObject:
				this.imageRenderer.renderSingleImageObject(dataObj, pageContainer)
				break
			// case OFD_KEY.PageBlock:
			// 	this.#renderPageBlock(dataObj, pageContainer)
			// 	break
		}
	}

	#renderSingleLayer(layerData: XmlData, pageContainer: Element) {
		// 这里的layerData就是每一个内容层的内容，但是初始里面是分了pathObject和textObject
		// 为了根据id的值来进行pathObject和textObject绘制，那么需要将里面的children进行合并，合并成同一个数组然后绘制
		// 1. 合并pathObject和textObject等
		let allNodeChildren = [] // 包含了textObject和pathObject的数组，并且按照id进行排序
		for (let i = 0; i < layerData.children.length; i++) {
			let dataObj = layerData.children[i]
			let tagName = dataObj.tagName
			dataObj.children.forEach(value => {
				value.tagName = tagName
				// 将所有node放入一个数组中
				allNodeChildren.push(value)
			})
		}
		// 2. 将所有node值按照id进行排序
		allNodeChildren.sort((a, b) => {
			// 取出id，转为数字
			const idA = parseInt(parser.findAttributeValueByKey(a, AttributeKey.ID) || "0");
			const idB = parseInt(parser.findAttributeValueByKey(b, AttributeKey.ID) || "0");
			return idA - idB;
		});
		allNodeChildren.forEach(value => {
			this.#renderLayerDataObject(value, pageContainer)
		})
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
