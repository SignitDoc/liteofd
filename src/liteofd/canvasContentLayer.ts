import Layer from "./layer"
import { XmlData } from "./ofdData"
import { OfdDocument } from "./ofdDocument"
import * as parser from "./parser"
import { AttributeKey, OFD_KEY } from "./attrType"
import { fontIdWithName, opentypeFonts } from "./ofdFont"
import { findAttributeValueByKey } from "./parser"
import { getFontSize, getCTM, parseColor } from "./utils/elementUtils"
import { convertToBox, convertToDpi } from "./utils/utils"
import opentype from "../opentype"

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

		if (boundaryBox) {
			let text = textCode?.value || ""

			// 设置字体
			let opentypeFont = this.#setCanvasFont(this.pageCanvasCtx, nodeData, fontId)
			// 设置文本颜色
			this.#setCanvasTextColor(this.pageCanvasCtx, nodeData)
			// 应用CTM变换
			this.#applyCTMTransform(this.pageCanvasCtx, nodeData)
			if (opentypeFont) {
				let options = {
					kerning: true,
					hinting: false,
					features: {
						liga: true,
						rlig: true
					}
				}
				console.log("Canvas opentype 绘制文本", text, "位置:", boundaryBox.x, boundaryBox.y, "字体ID:", fontId, textCode, options)
				const fontSize = getFontSize(nodeData)
				opentypeFont.draw(this.pageCanvasCtx, text + "", boundaryBox.x, boundaryBox.y, fontSize)
			} else {
				console.log("Canvas 普通 绘制文本", text, "位置:", boundaryBox.x, boundaryBox.y, "字体ID:", fontId, textCode)
				// 绘制文本
				this.pageCanvasCtx.fillText(text, boundaryBox.x, boundaryBox.y, boundaryBox.width)
			}
		}
	}

	// 设置canvas字体
	#setCanvasFont(ctx: CanvasRenderingContext2D, nodeData: XmlData, fontId: string) {
		// 获取字体大小
		const fontSize = getFontSize(nodeData)
		let fontStyle = fontSize ? `${fontSize}px` : '12px'
		console.log("canvas draw text fontsize", fontSize)
		// 获取字体名称
		if (fontId) {
			let fontName = fontIdWithName.get(fontId)
			let opentypeFont = opentypeFonts.get(fontName)
			if (opentypeFont) {
				// 有opentype加载成功的字体数据，需要通过opentype的字体数据进行绘制
				return opentypeFont
			} else {
				// 使用默认的进行绘制
				// 根据fontName来将opentype中保存的字体进行绘制
				const allFontList = parser.findAllNodesByTagName(this.ofdDocument.publicRes, OFD_KEY.Font)
				const foundFont = parser.findNodeByAttributeKeyValueInList(fontId, AttributeKey.ID, allFontList)

				if (foundFont) {
					const fontName = parser.findAttributeValueByKey(foundFont, AttributeKey.FontName)
					const fontFamily = parser.findAttributeValueByKey(foundFont, AttributeKey.FamilyName)

					if (fontName) {
						fontStyle = `${fontSize || 12}px "${fontName}"`
					} else if (fontFamily) {
						fontStyle = `${fontSize || 12}px "${fontFamily}"`
					}

					// 设置字体粗细
					const fontWeight = parser.findAttributeValueByKey(foundFont, AttributeKey.Weight)
					if (fontWeight) {
						fontStyle = `${fontWeight} ${fontStyle}`
					}

					// 设置字体样式
					const fontItalic = parser.findAttributeValueByKey(foundFont, AttributeKey.Italic)
					if (fontItalic) {
						fontStyle = `italic ${fontStyle}`
					}
				}
			}
			ctx.font = fontStyle
		}
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
