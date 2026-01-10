import { XmlData } from "./ofdData"
import { OfdDocument } from "./ofdDocument"
import * as parser from "./parser"
import { AttributeKey, OFD_KEY } from "./attrType"
import { parseColor } from "./utils/elementUtils"
import { calPathPoint, convertPathAbbreviatedDatatoPoint } from "./utils/utils"
import { ConfigManager } from "../config/configManager"

// 路径渲染器类
export class PathRenderer {
	private ofdDocument: OfdDocument
	private pageCanvasCtx: CanvasRenderingContext2D
	private configManager: ConfigManager
	private needFillColor = false
	private needStrokeColor = false
	private currentFillRule: CanvasFillRule = 'nonzero' // 当前填充规则

	constructor(ofdDocument: OfdDocument, pageCanvasCtx: CanvasRenderingContext2D) {
		this.ofdDocument = ofdDocument
		this.pageCanvasCtx = pageCanvasCtx
		this.configManager = ConfigManager.getInstance()
	}

	/**
	 * 渲染路径对象
	 * @param nodeObjs 路径对象数据
	 * @param pageContainer 页面容器
	 */
	renderPathObject(nodeObjs: XmlData, pageContainer: Element) {
		// 多个path
		for (let i = 0; i < nodeObjs.children.length; i++) {
			let nodeData = nodeObjs.children[i]
			this.renderSinglePathObject(nodeData, pageContainer)
		}
	}

	/**
	 * 渲染单个路径对象
	 * @param nodeData 单个路径节点数据
	 * @param pageContainer 页面容器
	 */
	renderSinglePathObject(nodeData: XmlData, pageContainer: Element) {
		try {
			this.needStrokeColor = false
			this.needFillColor = false
			let id = parser.findAttributeValueByKey(nodeData, AttributeKey.ID)
			let idValue = parseInt(id)
			let boundaryStr = parser.findAttributeValueByKey(nodeData, AttributeKey.Boundary)
			let boundaryBox: { x: number; y: number; width: number; height: number; } | null = null
			if (boundaryStr) {
				boundaryBox = this.ofdDocument.convertToBox(boundaryStr)
			}
			// 获取路径数据
			let abbreviatedData = parser.findValueByTagNameOfFirstNode(nodeData, OFD_KEY.AbbreviatedData)
			if (!abbreviatedData) {
				return
			}
			// 计算路径点
			const points = calPathPoint(this.ofdDocument, convertPathAbbreviatedDatatoPoint(abbreviatedData.value))

			if (idValue == 81) {
				console.log("ID=81 路径调试信息:")
				console.log("- 原始路径数据:", abbreviatedData.value)
				console.log("- 解析后的点数:", points.length)
				console.log("- 边界框:", boundaryBox)
				console.log("- CTM:", parser.findAttributeValueByKey(nodeData, AttributeKey.CTM))
				console.log("- LineWidth:", parser.findAttributeValueByKey(nodeData, AttributeKey.LineWidth))
				console.log("- 前5个路径点:", points)
			}

			this.pageCanvasCtx.save()
			// 应用CTM变换
			this.applyCTMTransform(nodeData, boundaryBox)
			// 设置路径样式
			this.setCanvasPathStyle(nodeData)
			// 添加绘制param
			this.#addDrawParam(nodeData)
			// 绘制路径 - 在boundaryBox位置绘制
			this.drawCanvasPath(points, boundaryBox)
			this.pageCanvasCtx.restore()
		} catch (e) {
			console.error("draw path error", e)
			this.pageCanvasCtx.restore()
		}
	}

	/**
	 * 应用CTM变换（直接设置当前变换矩阵）
	 * @param nodeData 节点数据
	 * @param boundaryBox 节点数据
	 */
	private applyCTMTransform(nodeData: XmlData, boundaryBox: { x: number; y: number; width: number; height: number; }) {
		const ctmStr = parser.findAttributeValueByKey(nodeData, AttributeKey.CTM)
		if (ctmStr) {
			const ctms = ctmStr.split(' ')
			if (ctms.length >= 6) {
				// const a = convertToDpi(parseFloat(ctms[0])) / boundaryBox.width
				// const b = convertToDpi(parseFloat(ctms[1])) / boundaryBox.width
				// const c = convertToDpi(parseFloat(ctms[2])) / boundaryBox.height
				// const d = convertToDpi(parseFloat(ctms[3])) / boundaryBox.height

				const a = parseFloat(ctms[0])
				const b = parseFloat(ctms[1])
				const c = parseFloat(ctms[2])
				const d = parseFloat(ctms[3])
				const e = this.ofdDocument.convertToDpi(parseFloat(ctms[4]))
				const f = this.ofdDocument.convertToDpi(parseFloat(ctms[5]))
				this.pageCanvasCtx.translate(boundaryBox?.x, boundaryBox?.y)
				this.pageCanvasCtx.transform(a, b, c, d, e, f)
				this.pageCanvasCtx.translate(-boundaryBox?.x, -(boundaryBox?.y))
			}
		}
	}

	/**
	 * 添加绘制参数
	 * @param nodeData 节点数据
	 */
	#addDrawParam(nodeData: XmlData) {
		let drawParamID = parser.findAttributeValueByKey(nodeData, AttributeKey.DrawParam)
		// 直接根据节点的填充来进行绘制设置颜色
		let fillColor = parser.findAttributeValueByKey(nodeData, AttributeKey.Fill)
		let fillColorObj = parser.findValueByTagName(nodeData, OFD_KEY.FillColor)
		if (fillColor && JSON.parse(fillColor) || fillColorObj) {
			this.#addFillColor(nodeData, fillColorObj)
		}
		let strokeColor = parser.findAttributeValueByKey(nodeData, AttributeKey.Stroke)
		let strokeColorObj = parser.findValueByTagName(nodeData, OFD_KEY.StrokeColor)
		if (strokeColor && JSON.parse(strokeColor) || strokeColorObj) {
			this.#addStrokeColor(nodeData, strokeColorObj)
		}
		if (drawParamID) {
			let drawParamNode = parser.findNodeByAttributeKeyValue(drawParamID, AttributeKey.ID, this.ofdDocument.publicRes)
			if (drawParamNode) {
				let drawParamFillColorObj = parser.findValueByTagName(drawParamNode, OFD_KEY.FillColor)
				if (drawParamFillColorObj) {
					// 填充颜色
					this.#addFillColor(drawParamNode, drawParamFillColorObj)
				}
				let drawParamStrokeColorObj = parser.findValueByTagName(drawParamNode, OFD_KEY.StrokeColor)
				if (drawParamStrokeColorObj) {
					// 添加线宽度和线条颜色
					this.#addStrokeColor(drawParamNode, drawParamStrokeColorObj)
				}
				// 添加线宽度
				this.#addLineWidth(drawParamNode)
				// 添加虚线模式
				this.#addDashPattern(drawParamNode)
			}
		}
	}

	/**
	 * 添加描边颜色
	 * @param nodeData 节点数据
	 */
	#addStrokeColor(nodeData: XmlData, strokeColorObj: XmlData | undefined) {
		let strokeColorStr = strokeColorObj && parser.findAttributeValueByKey(strokeColorObj, AttributeKey.Value)
		if (strokeColorStr) {
			let strokeColor = this.parseColorWithColorSpace(strokeColorStr, nodeData)
			this.pageCanvasCtx.strokeStyle = strokeColor
			this.needStrokeColor = true
			// this.pageCanvasCtx.stroke()
		}
	}

	/**
	 * 添加填充颜色
	 * @param nodeData 节点数据
	 */
	#addFillColor(nodeData: XmlData, fillColorObj: XmlData | undefined) {
		let fillColorStr = fillColorObj && parser.findAttributeValueByKey(fillColorObj, AttributeKey.Value)
		if (fillColorStr) {
			let fillColor = this.parseColorWithColorSpace(fillColorStr, nodeData)
			this.pageCanvasCtx.fillStyle = fillColor
			this.needFillColor = true
			// this.pageCanvasCtx.fill()
		}
	}

	/**
	 * 添加线宽度
	 * @param nodeData 节点数据
	 */
	#addLineWidth(nodeData: XmlData) {
		let lineWidthStr = parser.findAttributeValueByKey(nodeData, AttributeKey.LineWidth)
		if (lineWidthStr) {
			let lineWidth = this.ofdDocument.convertToDpi(parseFloat(lineWidthStr))
			this.pageCanvasCtx.lineWidth = lineWidth
		}
	}

	/**
	 * 添加虚线模式
	 * @param nodeData 节点数据
	 */
	#addDashPattern(nodeData: XmlData) {
		const dashPattern = parser.findAttributeValueByKey(nodeData, AttributeKey.DashPattern)
		if (dashPattern) {
			const dashArray = dashPattern.split(' ').map(value => this.ofdDocument.convertToDpi(parseFloat(value)))
			this.pageCanvasCtx.setLineDash(dashArray)
		} else {
			this.pageCanvasCtx.setLineDash([])
		}
	}

	/**
	 * 设置canvas路径样式
	 * @param nodeData 节点数据
	 */
	private setCanvasPathStyle(nodeData: XmlData) {
		const ctx = this.pageCanvasCtx

		// 设置线宽
		let lineWidthStr = parser.findAttributeValueByKey(nodeData, AttributeKey.LineWidth)
		if (lineWidthStr) {
			let lineWidth = this.ofdDocument.convertToDpi(parseFloat(lineWidthStr))
			ctx.lineWidth = lineWidth
		}

		// 设置虚线模式
		const dashPattern = parser.findAttributeValueByKey(nodeData, AttributeKey.DashPattern)
		if (dashPattern) {
			const dashArray = dashPattern.split(' ').map(value => this.ofdDocument.convertToDpi(parseFloat(value)))
			ctx.setLineDash(dashArray)
		}

		// 设置线条端点样式 (Cap)
		const capStyle = parser.findAttributeValueByKey(nodeData, AttributeKey.Cap)
		if (capStyle) {
			switch (capStyle) {
				case 'Square':
					ctx.lineCap = 'square'
					break
				case 'Round':
					ctx.lineCap = 'round'
					break
				case 'Butt':
				default:
					ctx.lineCap = 'butt'
					break
			}
		}

		// 设置路径填充规则 (Rule)
		const fillRule = parser.findAttributeValueByKey(nodeData, AttributeKey.Rule)
		if (fillRule) {
			switch (fillRule) {
				case 'Even-Odd':
					this.currentFillRule = 'evenodd'
					break
				case 'Non-Zero':
				default:
					this.currentFillRule = 'nonzero'
					break
			}
		}

		// // 设置描边颜色
		// let strokeColorObj = parser.findValueByTagName(nodeData, OFD_KEY.StrokeColor)
		// let strokeColorBoolean = parser.findAttributeValueByKey(nodeData, AttributeKey.Stroke)
		// let strokeColorStr = strokeColorObj && parser.findAttributeValueByKey(strokeColorObj, AttributeKey.Value)
		//
		// if (strokeColorBoolean && JSON.parse(strokeColorBoolean)) {
		// 	if (strokeColorStr) {
		// 		ctx.strokeStyle = parseColor(strokeColorStr)
		// 	}
		// } else if (strokeColorStr) {
		// 	ctx.strokeStyle = parseColor(strokeColorStr)
		// }
		//
		// // 设置填充颜色
		// let fillColorObj = parser.findValueByTagName(nodeData, OFD_KEY.FillColor)
		// let fillColorBoolean = parser.findAttributeValueByKey(nodeData, AttributeKey.Fill)
		// let fillColorStr = fillColorObj && parser.findAttributeValueByKey(fillColorObj, AttributeKey.Value)
		//
		// if (fillColorBoolean) {
		// 	if (fillColorObj && fillColorStr) {
		// 		ctx.fillStyle = parseColor(fillColorStr)
		// 	} else {
		// 		ctx.fillStyle = 'none'
		// 	}
		// } else {
		// 	if (fillColorStr) {
		// 		ctx.fillStyle = parseColor(fillColorStr)
		// 	} else {
		// 		ctx.fillStyle = 'none'
		// 	}
		// }
	}

	/**
	 * 绘制canvas路径
	 * @param points 路径点数组
	 * @param boundaryBox 边界框
	 */
	private drawCanvasPath(points: any[], boundaryBox: { x: number; y: number; width: number; height: number; } | null = null) {
		const ctx = this.pageCanvasCtx
		ctx.beginPath()

		// 简化边界框处理逻辑，与 demo 保持一致
		let currentX = boundaryBox ? boundaryBox.x : 0
		let currentY = boundaryBox ? boundaryBox.y : 0

		for (let i = 0; i < points.length; i++) {
			const point = points[i]

			switch (point.type) {
				case 'M': // 移动到
					if (boundaryBox) {
						ctx.moveTo(boundaryBox.x + point.x, boundaryBox.y + point.y)
						currentX = boundaryBox.x + point.x
						currentY = boundaryBox.y + point.y
					} else {
						ctx.moveTo(point.x, point.y)
						currentX = point.x
						currentY = point.y
					}
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
					ctx.closePath()
					break
				case 'B': // 自定义贝塞尔曲线
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
			}
		}

		// 只进行描边，不进行填充
		// ctx.stroke()
		if (this.needFillColor) {
			this.pageCanvasCtx.fill(this.currentFillRule)
		}
		if (this.needStrokeColor) {
			this.pageCanvasCtx.stroke()
		} else {
			// 如果没有设置描边颜色，使用默认黑色进行描边
			this.pageCanvasCtx.strokeStyle = 'black'
			this.pageCanvasCtx.stroke()
		}
	}

	/**
	 * 分解CTM矩阵为缩放、旋转和平移
	 * @param a b c d e f CTM矩阵参数
	 * @returns 分解后的变换参数
	 */
	private decomposeCTM(a: number, b: number, c: number, d: number, e: number, f: number) {
		// 计算缩放因子
		const scaleX = Math.sqrt(a * a + b * b)
		const scaleY = Math.sqrt(c * c + d * d)

		// 计算旋转角度（弧度）
		const rotation = Math.atan2(b, a)

		// 平移量
		const translateX = e
		const translateY = f

		return {
			scaleX,
			scaleY,
			rotation,
			translateX,
			translateY
		}
	}

	/**
	 * 绘制路径的boundaryBox边框，用于调试
	 * @param boundaryBox 边界框
	 */
	private drawPathBoundaryBox(boundaryBox: { x: number; y: number; width: number; height: number; }) {
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

	/**
	 * 根据 ColorSpace 解析颜色值
	 * @param colorStr 颜色字符串
	 * @param nodeData 节点数据
	 * @returns 解析后的颜色值
	 */
	private parseColorWithColorSpace(colorStr: string, nodeData: XmlData): string {
		// 获取 ColorSpace ID
		let colorSpaceID = parser.findAttributeValueByKey(nodeData, AttributeKey.ColorSpace)
		if (!colorSpaceID) {
			// 如果没有指定 ColorSpace，使用默认的 parseColor
			return parseColor(colorStr)
		}

		// 从 PublicRes 中查找对应的 ColorSpace
		let colorSpacesNode = parser.findValueByTagName(this.ofdDocument.publicRes, OFD_KEY.ColorSpaces)
		if (!colorSpacesNode) {
			console.warn(`未找到 ColorSpaces 节点`)
			return parseColor(colorStr)
		}

		let colorSpaceNode = parser.findNodeByAttributeKeyValue(colorSpaceID, AttributeKey.ID, colorSpacesNode)
		if (!colorSpaceNode) {
			console.warn(`未找到 ColorSpace ID: ${colorSpaceID}`)
			return parseColor(colorStr)
		}

		// 获取 ColorSpace 类型
		let colorSpaceType = parser.findAttributeValueByKey(colorSpaceNode, AttributeKey.Type)
		let bitsPerComponent = parser.findAttributeValueByKey(colorSpaceNode, AttributeKey.BitsPerComponent)

		// 判断颜色格式：16进制还是RGB数值
		if (this.isHexColorFormat(colorStr)) {
			return this.parseHexColor(colorStr)
		} else {
			// 根据 ColorSpace 类型解析颜色
			switch (colorSpaceType) {
				case 'RGB':
					return this.parseRGBColor(colorStr, bitsPerComponent)
				case 'GRAY':
					return this.parseGrayColor(colorStr, bitsPerComponent)
				case 'CMYK':
					return this.parseCMYKColor(colorStr, bitsPerComponent)
				default:
					console.warn(`不支持的 ColorSpace 类型: ${colorSpaceType}`)
					return parseColor(colorStr)
			}
		}
	}

	/**
	 * 判断是否为16进制颜色格式
	 * @param colorStr 颜色字符串
	 * @returns 是否为16进制格式
	 */
	private isHexColorFormat(colorStr: string): boolean {
		// 检查是否包含 # 符号
		return colorStr.includes('#')
	}

	/**
	 * 解析16进制颜色格式
	 * @param colorStr 16进制颜色字符串，如 "#ee #20 #25"
	 * @returns RGB颜色字符串
	 */
	private parseHexColor(colorStr: string): string {
		// 移除所有空格并提取16进制值
		let hexValues = colorStr.split(' ').map(part => {
			// 移除 # 符号并转换为16进制数值
			let hex = part.replace('#', '').trim()
			if (hex) {
				return parseInt(hex, 16)
			}
			return 0
		}).filter(val => !isNaN(val))

		if (hexValues.length >= 3) {
			// RGB格式
			return `rgb(${hexValues[0]}, ${hexValues[1]}, ${hexValues[2]})`
		} else if (hexValues.length === 1) {
			// 灰度格式
			let gray = hexValues[0]
			return `rgb(${gray}, ${gray}, ${gray})`
		} else {
			console.warn(`无法解析16进制颜色格式: ${colorStr}`)
			return `rgb(0, 0, 0)`
		}
	}

	/**
	 * 解析 RGB 颜色
	 * @param colorStr 颜色字符串
	 * @param bitsPerComponent 每个分量的位数
	 * @returns RGB 颜色字符串
	 */
	private parseRGBColor(colorStr: string, bitsPerComponent: string): string {
		let array = colorStr.split(' ')
		if (array.length >= 3) {
			let r = parseInt(array[0])
			let g = parseInt(array[1])
			let b = parseInt(array[2])

			// 如果指定了位数，进行相应的转换
			if (bitsPerComponent) {
				let maxValue = Math.pow(2, parseInt(bitsPerComponent)) - 1
				r = Math.round((r / maxValue) * 255)
				g = Math.round((g / maxValue) * 255)
				b = Math.round((b / maxValue) * 255)
			}

			return `rgb(${r}, ${g}, ${b})`
		}
		return `rgb(0, 0, 0)`
	}

	/**
	 * 解析灰度颜色
	 * @param colorStr 颜色字符串
	 * @param bitsPerComponent 每个分量的位数
	 * @returns RGB 颜色字符串
	 */
	private parseGrayColor(colorStr: string, bitsPerComponent: string): string {
		let array = colorStr.split(' ')
		if (array.length >= 1) {
			let gray = parseInt(array[0])

			// 如果指定了位数，进行相应的转换
			if (bitsPerComponent) {
				let maxValue = Math.pow(2, parseInt(bitsPerComponent)) - 1
				gray = Math.round((gray / maxValue) * 255)
			}

			return `rgb(${gray}, ${gray}, ${gray})`
		}
		return `rgb(0, 0, 0)`
	}

	/**
	 * 解析 CMYK 颜色
	 * @param colorStr 颜色字符串
	 * @param bitsPerComponent 每个分量的位数
	 * @returns RGB 颜色字符串
	 */
	private parseCMYKColor(colorStr: string, bitsPerComponent: string): string {
		let array = colorStr.split(' ')
		if (array.length >= 4) {
			let c = parseFloat(array[0])
			let m = parseFloat(array[1])
			let y = parseFloat(array[2])
			let k = parseFloat(array[3])

			// 如果指定了位数，进行相应的转换
			if (bitsPerComponent) {
				let maxValue = Math.pow(2, parseInt(bitsPerComponent)) - 1
				c = c / maxValue
				m = m / maxValue
				y = y / maxValue
				k = k / maxValue
			}

			// CMYK 转 RGB
			let r = Math.round(255 * (1 - c) * (1 - k))
			let g = Math.round(255 * (1 - m) * (1 - k))
			let b = Math.round(255 * (1 - y) * (1 - k))

			return `rgb(${r}, ${g}, ${b})`
		}
		return `rgb(0, 0, 0)`
	}
}
