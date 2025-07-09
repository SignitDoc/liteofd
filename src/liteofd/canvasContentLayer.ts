import Layer from "./layer"
import { XmlData } from "./ofdData"
import { OfdDocument } from "./ofdDocument"
import * as parser from "./parser"
import { AttributeKey, OFD_KEY } from "./attrType"
import { fontIdWithName, opentypeFonts } from "./ofdFont"
import { findAttributeValueByKey } from "./parser"
import { getFontSize, getCTM, parseColor } from "./utils/elementUtils"
import { convertToBox, convertToDpi, calPathPoint, convertPathAbbreviatedDatatoPoint } from "./utils/utils"
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
			const ctx = this.pageCanvas.getContext('2d')
			if (!ctx) {
				console.error("无法获取canvas上下文")
				return
			}
			this.pageCanvasCtx = ctx
		}
		// 获取文本位置
		let boundaryStr = parser.findAttributeValueByKey(nodeData, AttributeKey.Boundary)
		let boundaryBox: { x: number; y: number; width: number; height: number; } | null = null
		if (boundaryStr) {
			 boundaryBox = convertToBox(boundaryStr)
		}

		if (boundaryBox) {
			// 绘制文本的boundaryBox边框，用于调试
			let text = textCode?.value || ""
			// if (text == 3) {
			// 	this.#drawTextBoundaryBox(boundaryBox)
			// }

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
				opentypeFont.draw(this.pageCanvasCtx, text + "", boundaryBox.x, boundaryBox.y + boundaryBox.height, fontSize)
			} else {
				console.log("Canvas 普通 绘制文本", text, "位置:", boundaryBox.x, boundaryBox.y, "字体ID:", fontId, textCode)
				// 绘制文本
				this.pageCanvasCtx.fillText(text, boundaryBox.x, boundaryBox.y + boundaryBox.height, boundaryBox.width)
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

	/**
	 * 渲染路径path
	 * @param nodeObjs
	 * @param pageContainer
	 * @private
	 */
	#renderPathObject(nodeObjs: XmlData, pageContainer: Element) {
		// 多个path
		for (let i = 0; i < nodeObjs.children.length; i++) {
			let nodeData = nodeObjs.children[i]
			this.#renderSingplePathObject(nodeData, pageContainer)
		}
	}

	#renderSingplePathObject(nodeData: XmlData, pageContainer: Element) {
		// 获取canvas上下文
		if (!this.pageCanvasCtx) {
			const ctx = this.pageCanvas.getContext('2d')
			if (!ctx) {
				console.error("无法获取canvas上下文")
				return
			}
			this.pageCanvasCtx = ctx
		}

		let boundaryStr = parser.findAttributeValueByKey(nodeData, AttributeKey.Boundary)
		let boundaryBox: { x: number; y: number; width: number; height: number; } | null = null
		if (boundaryStr) {
			boundaryBox = convertToBox(boundaryStr)
		}

		// 绘制路径的boundaryBox边框，用于调试
		// if (boundaryBox) {
		// 	this.#drawPathBoundaryBox(boundaryBox)
		// }

		// 获取路径数据
		let abbreviatedData = parser.findValueByTagNameOfFirstNode(nodeData, OFD_KEY.AbbreviatedData)
		if (!abbreviatedData) {
			return
		}
		// 计算路径点
		const points = calPathPoint(convertPathAbbreviatedDatatoPoint(abbreviatedData.value))
		// 设置路径样式
		this.#setCanvasPathStyle(nodeData)
		// 应用CTM变换
		this.#applyCTMTransform(this.pageCanvasCtx, nodeData)
		// 绘制路径 - 在boundaryBox位置绘制
		this.#drawCanvasPath(points, boundaryBox)
		console.log("Canvas绘制路径:", nodeData, "点数:", points.length, "boundaryBox:", boundaryBox)
	}

	// 设置canvas路径样式
	#setCanvasPathStyle(nodeData: XmlData) {
		const ctx = this.pageCanvasCtx

		// 设置线宽
		let lineWidthStr = parser.findAttributeValueByKey(nodeData, AttributeKey.LineWidth)
		if (lineWidthStr) {
			let lineWidth = convertToDpi(parseFloat(lineWidthStr))
			ctx.lineWidth = lineWidth
		} else {
			ctx.lineWidth = 1
		}

		// 设置虚线模式
		const dashPattern = parser.findAttributeValueByKey(nodeData, AttributeKey.DashPattern)
		if (dashPattern) {
			const dashArray = dashPattern.split(' ').map(value => convertToDpi(parseFloat(value)))
			ctx.setLineDash(dashArray)
		} else {
			ctx.setLineDash([])
		}

		// 设置描边颜色
		let strokeColorObj = parser.findValueByTagName(nodeData, OFD_KEY.StrokeColor)
		let strokeColorBoolean = parser.findAttributeValueByKey(nodeData, AttributeKey.Stroke)
		let strokeColorStr = strokeColorObj && parser.findAttributeValueByKey(strokeColorObj, AttributeKey.Value)

		if (strokeColorBoolean && JSON.parse(strokeColorBoolean)) {
			if (strokeColorStr) {
				ctx.strokeStyle = parseColor(strokeColorStr)
			}
		} else if (strokeColorStr) {
			ctx.strokeStyle = parseColor(strokeColorStr)
		} else {
			ctx.strokeStyle = 'rgb(0, 0, 0)' // 默认黑色
		}

		// 设置填充颜色
		let fillColorObj = parser.findValueByTagName(nodeData, OFD_KEY.FillColor)
		let fillColorBoolean = parser.findAttributeValueByKey(nodeData, AttributeKey.Fill)
		let fillColorStr = fillColorObj && parser.findAttributeValueByKey(fillColorObj, AttributeKey.Value)

		if (fillColorBoolean) {
			if (fillColorObj && fillColorStr) {
				ctx.fillStyle = parseColor(fillColorStr)
			} else {
				ctx.fillStyle = 'none'
			}
		} else {
			if (fillColorStr) {
				ctx.fillStyle = parseColor(fillColorStr)
			} else {
				ctx.fillStyle = 'none'
			}
		}
	}

		// 绘制canvas路径
	#drawCanvasPath(points: any[], boundaryBox: { x: number; y: number; width: number; height: number; } | null = null) {
		const ctx = this.pageCanvasCtx
		ctx.beginPath()

		// 如果有boundaryBox，设置起始位置
		let currentX = boundaryBox ? boundaryBox.x : 0
		let currentY = boundaryBox ? boundaryBox.y : 0
		let firstPoint = true

		for (let i = 0; i < points.length; i++) {
			const point = points[i]

			switch (point.type) {
				case 'M': // 移动到
					// 如果有boundaryBox，将第一个M命令的位置调整为boundaryBox位置
					if (firstPoint && boundaryBox) {
						ctx.moveTo(boundaryBox.x + point.x, boundaryBox.y + point.y)
						currentX = boundaryBox.x + point.x
						currentY = boundaryBox.y + point.y
					} else {
						ctx.moveTo(point.x, point.y)
						currentX = point.x
						currentY = point.y
					}
					firstPoint = false
					break
				case 'L': // 画线到
					if (boundaryBox) {
						ctx.lineTo(boundaryBox.x + point.x, boundaryBox.y + point.y)
						currentX = boundaryBox.x + point.x
						currentY = boundaryBox.y + point.y
					} else {
						ctx.lineTo(point.x, point.y)
						currentX = point.x
						currentY = point.y
					}
					break
				case 'H': // 水平线到
					if (boundaryBox) {
						ctx.lineTo(boundaryBox.x + point.x, currentY)
						currentX = boundaryBox.x + point.x
					} else {
						ctx.lineTo(point.x, currentY)
						currentX = point.x
					}
					break
				case 'V': // 垂直线到
					if (boundaryBox) {
						ctx.lineTo(currentX, boundaryBox.y + point.y)
						currentY = boundaryBox.y + point.y
					} else {
						ctx.lineTo(currentX, point.y)
						currentY = point.y
					}
					break
				case 'C': // 三次贝塞尔曲线
					if (boundaryBox) {
						ctx.bezierCurveTo(
							boundaryBox.x + point.x1, boundaryBox.y + point.y1,
							boundaryBox.x + point.x2, boundaryBox.y + point.y2,
							boundaryBox.x + point.x, boundaryBox.y + point.y
						)
						currentX = boundaryBox.x + point.x
						currentY = boundaryBox.y + point.y
					} else {
						ctx.bezierCurveTo(point.x1, point.y1, point.x2, point.y2, point.x, point.y)
						currentX = point.x
						currentY = point.y
					}
					break
				case 'S': // 平滑三次贝塞尔曲线
					if (boundaryBox) {
						if ('x2' in point && 'y2' in point) {
							ctx.bezierCurveTo(
								boundaryBox.x + point.x2, boundaryBox.y + point.y2,
								boundaryBox.x + point.x2, boundaryBox.y + point.y2,
								boundaryBox.x + point.x, boundaryBox.y + point.y
							)
						} else {
							ctx.bezierCurveTo(
								boundaryBox.x + point.x, boundaryBox.y + point.y,
								boundaryBox.x + point.x, boundaryBox.y + point.y,
								boundaryBox.x + point.x, boundaryBox.y + point.y
							)
						}
						currentX = boundaryBox.x + point.x
						currentY = boundaryBox.y + point.y
					} else {
						if ('x2' in point && 'y2' in point) {
							ctx.bezierCurveTo(point.x2, point.y2, point.x2, point.y2, point.x, point.y)
						} else {
							ctx.bezierCurveTo(point.x, point.y, point.x, point.y, point.x, point.y)
						}
						currentX = point.x
						currentY = point.y
					}
					break
				case 'Q': // 二次贝塞尔曲线
					if (boundaryBox) {
						ctx.quadraticCurveTo(
							boundaryBox.x + point.x1, boundaryBox.y + point.y1,
							boundaryBox.x + point.x, boundaryBox.y + point.y
						)
						currentX = boundaryBox.x + point.x
						currentY = boundaryBox.y + point.y
					} else {
						ctx.quadraticCurveTo(point.x1, point.y1, point.x, point.y)
						currentX = point.x
						currentY = point.y
					}
					break
				case 'T': // 平滑二次贝塞尔曲线
					if (boundaryBox) {
						ctx.quadraticCurveTo(
							boundaryBox.x + point.x, boundaryBox.y + point.y,
							boundaryBox.x + point.x, boundaryBox.y + point.y
						)
						currentX = boundaryBox.x + point.x
						currentY = boundaryBox.y + point.y
					} else {
						ctx.quadraticCurveTo(point.x, point.y, point.x, point.y)
						currentX = point.x
						currentY = point.y
					}
					break
				case 'A': // 椭圆弧
					// 简化处理：将椭圆弧转换为直线
					if (boundaryBox) {
						ctx.lineTo(boundaryBox.x + point.x, boundaryBox.y + point.y)
						currentX = boundaryBox.x + point.x
						currentY = boundaryBox.y + point.y
					} else {
						ctx.lineTo(point.x, point.y)
						currentX = point.x
						currentY = point.y
					}
					break
				case 'Z': // 闭合路径
				case 'z':
					if (!firstPoint) {
						ctx.closePath()
					}
					break
				case 'B': // 自定义贝塞尔曲线
					if (boundaryBox) {
						ctx.bezierCurveTo(
							boundaryBox.x + point.x1, boundaryBox.y + point.y1,
							boundaryBox.x + point.x2, boundaryBox.y + point.y2,
							boundaryBox.x + point.x3, boundaryBox.y + point.y3
						)
						currentX = boundaryBox.x + point.x3
						currentY = boundaryBox.y + point.y3
					} else {
						ctx.bezierCurveTo(point.x1, point.y1, point.x2, point.y2, point.x3, point.y3)
						currentX = point.x3
						currentY = point.y3
					}
					break
			}
		}

		// 填充和描边
		if (ctx.fillStyle !== 'none') {
			ctx.fill()
		}
		ctx.stroke()
	}

	#renderLayerDataObject(dataObj: XmlData, pageContainer: Element) {
		switch (dataObj.tagName) {
			case OFD_KEY.TextObject:
				this.#renderTextObject(dataObj, pageContainer)
				break
			case OFD_KEY.PathObject:
				this.#renderPathObject(dataObj, pageContainer)
				break
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
				const ctx = this.pageCanvas.getContext('2d')
				if (!ctx) {
					console.error("无法获取canvas上下文")
					return null
				}
				this.pageCanvasCtx = ctx
				// 渲染内容层
				this.#initPageContainer()
				this.#renderPageContent(contentData, pageContainer)
			}
		} catch (e) {
			console.log("render page content error", e, pageData)
			return null
		}
	}

	// 绘制文本的boundaryBox边框，用于调试
	#drawTextBoundaryBox(boundaryBox: { x: number; y: number; width: number; height: number; }) {
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

	// 绘制路径的boundaryBox边框，用于调试
	#drawPathBoundaryBox(boundaryBox: { x: number; y: number; width: number; height: number; }) {
		const ctx = this.pageCanvasCtx

		// 保存当前的绘制状态
		ctx.save()

		// 设置边框样式
		ctx.strokeStyle = 'orange' // 橙色边框
		ctx.lineWidth = 1
		ctx.setLineDash([3, 3]) // 虚线边框

		// 绘制矩形边框
		ctx.strokeRect(boundaryBox.x, boundaryBox.y, boundaryBox.width, boundaryBox.height)

		// 绘制四个角点
		ctx.fillStyle = 'purple'
		ctx.beginPath()
		ctx.arc(boundaryBox.x, boundaryBox.y, 3, 0, 2 * Math.PI) // 左上角
		ctx.arc(boundaryBox.x + boundaryBox.width, boundaryBox.y, 3, 0, 2 * Math.PI) // 右上角
		ctx.arc(boundaryBox.x, boundaryBox.y + boundaryBox.height, 3, 0, 2 * Math.PI) // 左下角
		ctx.arc(boundaryBox.x + boundaryBox.width, boundaryBox.y + boundaryBox.height, 3, 0, 2 * Math.PI) // 右下角
		ctx.fill()

		// 恢复绘制状态
		ctx.restore()

		console.log("绘制路径边界框:", boundaryBox)
	}

}
