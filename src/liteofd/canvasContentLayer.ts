import Layer from "./layer"
import { XmlData } from "./ofdData"
import { OfdDocument } from "./ofdDocument"
import * as parser from "./parser"
import { AttributeKey, OFD_KEY } from "./attrType"
import { fontIdWithName, opentypeFonts } from "./ofdFont"
import { findAttributeValueByKey } from "./parser"
import { getFontSize, getCTM, parseColor } from "./utils/elementUtils"
import { convertToBox, convertToDpi } from "./utils/utils"

// 使用canvas进行绘制界面
export class CanvasContentLayer extends Layer {

	private ofdDocument: OfdDocument
	private setDefaultZOrder = false // 是否使用默认的zorder的值设置zindex
	private defaultZorderValue = -1 // 默认的zindex的值
	private pageCanvas!: HTMLCanvasElement // 绘制的界面canvas
	private pageCanvasCtx!: CanvasRenderingContext2D // 绘制的界面canvas的上下文

	constructor(ofdDocument: OfdDocument) {
		super()
		this.ofdDocument = ofdDocument
		this.#initPageContainer()
	}

	// 初始化页面数据
	#initPageContainer() {
		// 目前的页面是pages的第一个开始

	}

	// 使用canvas进行绘制文本，每个页面层包含了一个canvas对象，用来绘制文本等内容
	#renderSingleTextObject(nodeData: XmlData, pageContainer: Element) {
		let fontId = parser.findAttributeValueByKey(nodeData, AttributeKey.FONT)
		let textCode = parser.findValueByTagName(nodeData, OFD_KEY.TextCode)
		// 检查textCode是否存在
		if (!textCode) {
			console.error("textCode不存在")
			return
		}
		// 获取canvas上下文
		if (!this.pageCanvasCtx) {
			this.pageCanvasCtx = this.pageCanvas.getContext('2d')
			console.error("无法获取canvas上下文")
			return
		}
		// 获取文本位置
		let boundaryStr = parser.findAttributeValueByKey(nodeData, AttributeKey.Boundary)
		let boundaryBox = null
		if (boundaryStr) {
			 boundaryBox = convertToBox(boundaryStr)
		}

		// if (boundaryBox) {
		// 	let text = textCode?.value || ""
		// 	// 设置字体
		// 	// this.#setCanvasFont(this.pageCanvasCtx, nodeData, fontId)
		// 	// 设置文本颜色
		// 	// this.#setCanvasTextColor(this.pageCanvasCtx, nodeData)
		// 	// 应用CTM变换
		// 	// this.#applyCTMTransform(this.pageCanvasCtx, nodeData)
		// 	if (text == 3) {
		// 		console.log("Canvas绘制文本 1：", text, "位置:", boundaryBox.x, boundaryBox.y, "字体ID:", fontId, textCode)
		// 		this.pageCanvasCtx.fillText(text, 0, 0 + boundaryBox.height, boundaryBox.width)
		// 	} else {
		// 		console.log("Canvas绘制文本 2：", text, "位置:", boundaryBox.x, boundaryBox.y, "字体ID:", fontId, textCode)
		// 		// 绘制文本
		// 		this.pageCanvasCtx.fillText(text, boundaryBox.x, boundaryBox.y, boundaryBox.width)
		// 	}
		//
		// }
	}

	#testCanvasDraw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement){
		//绘制中心线
		ctx.moveTo(0,canvas.height/2)
		ctx.lineTo(canvas.width,canvas.height/2)
		//绘制虚线
		ctx.setLineDash([5,10])
		//描边
		ctx.stroke()
		//开启路径
		ctx.beginPath()
		ctx.moveTo(canvas.width/2,0)
		ctx.lineTo(canvas.width/2,canvas.height)
		//绘制虚线
		ctx.setLineDash([5,10])
		//描边
		ctx.stroke()

		//以正中央为基点绘制文本)
		//文本颜色就是描边的颜色
		ctx.strokeStyle = "black"
		//设置字体大小和字体类型
		ctx.font = "1px"
		//取消虚线绘制
		ctx.setLineDash([1,0])
		ctx.fillText("hello world", 0, 1)
		//绘制文本
		// ctx.strokeText("你好世界",canvas.width/2,canvas.height/2)
	}

	// 设置canvas字体
	#setCanvasFont(ctx: CanvasRenderingContext2D, nodeData: XmlData, fontId: string) {
		// 获取字体大小
		const fontSize = getFontSize(nodeData)
		// let fontStyle = fontSize ? `${fontSize}px` : '12px'
		let fontStyle = '12px simsun'
		console.log("canvas draw text fontsize", fontSize)
		// 获取字体名称
		if (fontId) {
			let fontName = fontIdWithName.get(fontId)
			// 根据fontName来将opentype中保存的字体进行绘制

			// const allFontList = parser.findAllNodesByTagName(this.ofdDocument.publicRes, OFD_KEY.Font)
			// const foundFont = parser.findNodeByAttributeKeyValueInList(fontId, AttributeKey.ID, allFontList)
			//
			// if (foundFont) {
			// 	const fontName = parser.findAttributeValueByKey(foundFont, AttributeKey.FontName)
			// 	const fontFamily = parser.findAttributeValueByKey(foundFont, AttributeKey.FamilyName)
			//
			// 	if (fontName) {
			// 		fontStyle = `${fontSize || 12}px "${fontName}"`
			// 	} else if (fontFamily) {
			// 		fontStyle = `${fontSize || 12}px "${fontFamily}"`
			// 	}
			//
			// 	// 设置字体粗细
			// 	const fontWeight = parser.findAttributeValueByKey(foundFont, AttributeKey.Weight)
			// 	if (fontWeight) {
			// 		fontStyle = `${fontWeight} ${fontStyle}`
			// 	}
			//
			// 	// 设置字体样式
			// 	const fontItalic = parser.findAttributeValueByKey(foundFont, AttributeKey.Italic)
			// 	if (fontItalic) {
			// 		fontStyle = `italic ${fontStyle}`
			// 	}
			// }
		}

		ctx.font = fontStyle
	}

	// 设置canvas文本颜色
	#setCanvasTextColor(ctx: CanvasRenderingContext2D, nodeData: XmlData) {
		// 获取填充颜色
		const fillColorObj = parser.findValueByTagName(nodeData, OFD_KEY.FillColor)
		const fillColorStr = fillColorObj && parser.findAttributeValueByKey(fillColorObj, AttributeKey.Value)

		if (fillColorStr) {
			const fillColor = parseColor(fillColorStr)
			ctx.fillStyle = fillColor
		} else {
			ctx.fillStyle = '#000000' // 默认黑色
		}
	}

	// 应用CTM变换
	#applyCTMTransform(ctx: CanvasRenderingContext2D, nodeData: XmlData) {
		const ctmStr = parser.findAttributeValueByKey(nodeData, AttributeKey.CTM)
		if (ctmStr) {
			const ctms = ctmStr.split(' ')
			if (ctms.length >= 6) {
				const a = parseFloat(ctms[0])
				const b = parseFloat(ctms[1])
				const c = parseFloat(ctms[2])
				const d = parseFloat(ctms[3])
				const e = convertToDpi(parseFloat(ctms[4]))
				const f = convertToDpi(parseFloat(ctms[5]))

				ctx.setTransform(a, b, c, d, e, f)
			}
		}
	}

	/**
	 * 渲染文本
	 * @param nodeObjs
	 * @param pageContainer
	 * @private
	 */
	#renderTextObject(nodeObjs: XmlData, pageContainer: Element) {
		// 多个文本子节点
		for (let i = 0; i < nodeObjs.children.length; i++) {
			let nodeData = nodeObjs.children[i]
			this.#renderSingleTextObject(nodeData, pageContainer)
		}

		this.#testCanvasDraw(this.pageCanvasCtx, this.pageCanvas)
	}

	#renderLayerDataObject(dataObj: XmlData, pageContainer: Element) {
		switch (dataObj.tagName) {
			case OFD_KEY.TextObject:
				this.#renderTextObject(dataObj, pageContainer)
				break
			// case OFD_KEY.PathObject:
			// 	this.#renderPathObject(dataObj, pageContainer)
			// 	break
			// case OFD_KEY.ImageObject:
			// 	this.#renderImageObject(dataObj, pageContainer)
			// 	break
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
				this.pageCanvas = pageContainer.firstChild as HTMLCanvasElement
				this.pageCanvasCtx = this.pageCanvas.getContext('2d')
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
