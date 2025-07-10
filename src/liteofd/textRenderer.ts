import { XmlData } from "./ofdData"
import { OfdDocument } from "./ofdDocument"
import * as parser from "./parser"
import { AttributeKey, OFD_KEY } from "./attrType"
import { fontIdWithName, opentypeFonts } from "./ofdFont"
import { getFontSize, parseColor } from "./utils/elementUtils"
import { convertToBox, convertToDpi } from "./utils/utils"
import opentype from "../opentype"

// 文本渲染器类
export class TextRenderer {
	private ofdDocument: OfdDocument
	private pageCanvasCtx: CanvasRenderingContext2D

	constructor(ofdDocument: OfdDocument, pageCanvasCtx: CanvasRenderingContext2D) {
		this.ofdDocument = ofdDocument
		this.pageCanvasCtx = pageCanvasCtx
	}

	/**
	 * 渲染文本对象
	 * @param nodeObjs 文本对象数据
	 * @param pageContainer 页面容器
	 */
	renderTextObject(nodeObjs: XmlData, pageContainer: Element) {
		// 多个文本子节点
		for (let i = 0; i < nodeObjs.children.length; i++) {
			let nodeData = nodeObjs.children[i]
			this.renderSingleTextObject(nodeData, pageContainer)
		}
	}

	/**
	 * 渲染单个文本对象
	 * @param nodeData 单个文本节点数据
	 * @param pageContainer 页面容器
	 */
	private renderSingleTextObject(nodeData: XmlData, pageContainer: Element) {
		let fontId = parser.findAttributeValueByKey(nodeData, AttributeKey.FONT)
		let textCode = parser.findValueByTagName(nodeData, OFD_KEY.TextCode)
		// 检查textCode是否存在
		if (!textCode) {
			console.error("textCode不存在")
			return
		}

		// 获取文本位置
		let boundaryStr = parser.findAttributeValueByKey(nodeData, AttributeKey.Boundary)
		let boundaryBox: { x: number; y: number; width: number; height: number; } | null = null
		if (boundaryStr) {
			boundaryBox = convertToBox(boundaryStr)
		}

		if (boundaryBox) {
			// 绘制文本的boundaryBox边框，用于调试
			// this.drawTextBoundaryBox(boundaryBox)
			let text = textCode?.value || ""
			// if (text == 3) {
			// 	this.drawTextBoundaryBox(boundaryBox)
			// }

			// 设置字体
			let opentypeFont = this.setCanvasFont(nodeData, fontId)
			// 设置文本颜色
			this.setCanvasTextColor(nodeData)
			// 应用CTM变换
			this.applyCTMTransform(nodeData)
			// 添加绘制param
			this.#addDrawParam(nodeData)
			if (opentypeFont) {
				let options = {
					kerning: true,
					hinting: false,
					features: {
						liga: true,
						rlig: true
					}
				}
				// console.log("Canvas opentype 绘制文本", text, "位置:", boundaryBox.x, boundaryBox.y, "字体ID:", fontId, textCode, options)
				const fontSize = getFontSize(nodeData)
				opentypeFont.draw(this.pageCanvasCtx, text + "", boundaryBox.x, boundaryBox.y + boundaryBox.height, fontSize)
			} else {
				console.log("Canvas 普通 绘制文本", text, "位置:", boundaryBox.x, boundaryBox.y, "字体ID:", fontId, textCode)
				// 绘制文本
				this.pageCanvasCtx.fillText(text, boundaryBox.x, boundaryBox.y + boundaryBox.height, boundaryBox.width)
			}
		}
	}

	#addStrokeColor(nodeData: XmlData) {
		let strokeColorObj = parser.findValueByTagName(nodeData, OFD_KEY.StrokeColor)
		let strokeColorStr = strokeColorObj && parser.findAttributeValueByKey(strokeColorObj, AttributeKey.Value)
		if (strokeColorStr) {
			let strokeColor = parseColor(strokeColorStr)
			this.pageCanvasCtx.strokeStyle = strokeColor
		}
	}

	#addFillColor(nodeData: XmlData) {
		let fillColorObj = parser.findValueByTagName(nodeData, OFD_KEY.FillColor)
		let fillColorStr = fillColorObj && parser.findAttributeValueByKey(fillColorObj, AttributeKey.Value)
		if (fillColorStr) {
			let fillColor = parseColor(fillColorStr)
			this.pageCanvasCtx.fillStyle = fillColor
		}
	}

	// 字体文件中暂时去掉drawParam的渲染
	#addDrawParam(nodeData: XmlData) {
		let drawParamID = parser.findAttributeValueByKey(nodeData, AttributeKey.DrawParam)
		console.log("add text draw params", drawParamID)
		if (drawParamID) {
			let drawParamNode = parser.findNodeByAttributeKeyValue(drawParamID, AttributeKey.ID, this.ofdDocument.publicRes)
			if (drawParamNode) {
				// 填充颜色
				this.#addFillColor(drawParamNode)
				// 添加线宽度和线条颜色
				this.#addStrokeColor(drawParamNode)
				console.log("textsvg drawParamNode", drawParamNode)
				// 添加字体粗细
				let fontWeight = parser.findAttributeValueByKey(drawParamNode, AttributeKey.Weight)
				if (fontWeight) {
					this.pageCanvasCtx.font += ` ${fontWeight} `
				}
				let fontBold = parser.findAttributeValueByKey(drawParamNode, AttributeKey.Bold)
				if (fontBold) {
					this.pageCanvasCtx.font += ` bold `
				}
				// 添加字体斜体
				let fontItalic = parser.findAttributeValueByKey(drawParamNode, AttributeKey.Italic)
				if (fontItalic) {
					this.pageCanvasCtx.font += ` italic `
				}
			}
		}
	}

	/**
	 * 设置canvas字体
	 * @param nodeData 节点数据
	 * @param fontId 字体ID
	 * @returns opentype字体对象或null
	 */
	private setCanvasFont(nodeData: XmlData, fontId: string) {
		// 获取字体大小
		const fontSize = getFontSize(nodeData)
		let fontStyle = fontSize ? `${fontSize}px` : '12px'
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
					// 将不寻常的字体放入到本地里面，比如宋体，楷体之类一些不同名字的字体名称
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
			this.pageCanvasCtx.font = fontStyle
		}
		return null
	}

	/**
	 * 设置canvas文本颜色
	 * @param nodeData 节点数据
	 */
	private setCanvasTextColor(nodeData: XmlData) {
		// 获取填充颜色
		const fillColorObj = parser.findValueByTagName(nodeData, OFD_KEY.FillColor)
		const fillColorStr = fillColorObj && parser.findAttributeValueByKey(fillColorObj, AttributeKey.Value)

		if (fillColorStr) {
			const fillColor = parseColor(fillColorStr)
			this.pageCanvasCtx.fillStyle = fillColor
		} else {
			this.pageCanvasCtx.fillStyle = '#000000' // 默认黑色
		}
	}

	/**
	 * 应用CTM变换
	 * @param nodeData 节点数据
	 */
	private applyCTMTransform(nodeData: XmlData) {
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

				this.pageCanvasCtx.setTransform(a, b, c, d, e, f)
			}
		}
	}

	/**
	 * 绘制文本的boundaryBox边框，用于调试
	 * @param boundaryBox 边界框
	 */
	private drawTextBoundaryBox(boundaryBox: { x: number; y: number; width: number; height: number; }) {
		const ctx = this.pageCanvasCtx

		// 保存当前的绘制状态
		ctx.save()

		// 设置边框样式
		ctx.strokeStyle = 'red' // 红色边框
		ctx.lineWidth = 1
		ctx.setLineDash([2, 2]) // 虚线边框

		// 绘制矩形边框
		ctx.strokeRect(boundaryBox.x, boundaryBox.y, boundaryBox.width, boundaryBox.height)

		// 绘制对角线，帮助定位
		ctx.strokeStyle = 'blue' // 蓝色对角线
		ctx.setLineDash([]) // 实线
		ctx.beginPath()
		ctx.moveTo(boundaryBox.x, boundaryBox.y)
		ctx.lineTo(boundaryBox.x + boundaryBox.width, boundaryBox.y + boundaryBox.height)
		ctx.moveTo(boundaryBox.x + boundaryBox.width, boundaryBox.y)
		ctx.lineTo(boundaryBox.x, boundaryBox.y + boundaryBox.height)
		ctx.stroke()

		// 绘制中心点
		ctx.fillStyle = 'green'
		ctx.beginPath()
		ctx.arc(boundaryBox.x + boundaryBox.width / 2, boundaryBox.y + boundaryBox.height / 2, 2, 0, 2 * Math.PI)
		ctx.fill()

		// 恢复绘制状态
		ctx.restore()

		console.log("绘制文本边界框:", boundaryBox)
	}
}
