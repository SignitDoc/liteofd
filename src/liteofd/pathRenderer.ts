import { XmlData } from "./ofdData"
import { OfdDocument } from "./ofdDocument"
import * as parser from "./parser"
import { AttributeKey, OFD_KEY } from "./attrType"
import { parseColor } from "./utils/elementUtils"
import { convertToBox, convertToDpi, calPathPoint, convertPathAbbreviatedDatatoPoint } from "./utils/utils"
import { ConfigManager } from "../config/configManager"

// 路径渲染器类
export class PathRenderer {
	private ofdDocument: OfdDocument
	private pageCanvasCtx: CanvasRenderingContext2D
	private configManager: ConfigManager

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
		let id = parser.findAttributeValueByKey(nodeData, AttributeKey.ID)
		let boundaryStr = parser.findAttributeValueByKey(nodeData, AttributeKey.Boundary)
		let boundaryBox: { x: number; y: number; width: number; height: number; }
		if (boundaryStr) {
			boundaryBox = convertToBox(boundaryStr)
		}
		let idValue = parseInt(id)


		// 获取路径数据
		let abbreviatedData = parser.findValueByTagNameOfFirstNode(nodeData, OFD_KEY.AbbreviatedData)
		if (!abbreviatedData) {
			return
		}
		// 计算路径点
		const points = calPathPoint(convertPathAbbreviatedDatatoPoint(abbreviatedData.value))

		this.pageCanvasCtx.save()
		// 应用CTM变换
		this.applyCTMTransform(nodeData, boundaryBox)
		// 添加绘制param
		this.#addDrawParam(nodeData)
		// 设置路径样式
		this.setCanvasPathStyle(nodeData)
		// 绘制路径 - 在boundaryBox位置绘制
		this.drawCanvasPath(points, boundaryBox)
		this.pageCanvasCtx.restore()
		// 根据id判断是否绘制边界框
		// if (id === "81" && boundaryBox) {
		// 	this.drawPathBoundaryBox(boundaryBox)
		// }
		// console.log("Canvas绘制路径:", nodeData, "点数:", points.length, "boundaryBox:", boundaryBox)
	}

	/**
	 * 应用CTM变换（直接设置当前变换矩阵）
	 * @param nodeData 节点数据
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
				const e = convertToDpi(parseFloat(ctms[4]))
				const f = convertToDpi(parseFloat(ctms[5]))
				// this.pageCanvasCtx.translate(boundaryBox.x, boundaryBox.y)
				this.pageCanvasCtx.setTransform(a, b, c, d, e, f)
				// this.pageCanvasCtx.translate(-boundaryBox.x, -(boundaryBox.y))
			}
		}
	}

	/**
	 * 添加绘制参数
	 * @param nodeData 节点数据
	 */
	#addDrawParam(nodeData: XmlData) {
		let drawParamID = parser.findAttributeValueByKey(nodeData, AttributeKey.DrawParam)
		console.log("add path draw params", drawParamID)
		if (drawParamID) {
			let drawParamNode = parser.findNodeByAttributeKeyValue(drawParamID, AttributeKey.ID, this.ofdDocument.publicRes)
			if (drawParamNode) {
				// 填充颜色
				this.#addFillColor(drawParamNode)
				// 添加线宽度和线条颜色
				this.#addStrokeColor(drawParamNode)
				// 添加线宽度
				this.#addLineWidth(drawParamNode)
				// 添加虚线模式
				this.#addDashPattern(drawParamNode)
				console.log("path drawParamNode", drawParamNode)
			}
		} else {
			// 直接根据节点的填充来进行绘制设置颜色
			let fillColor = parser.findAttributeValueByKey(nodeData, AttributeKey.Fill)
			if (fillColor && JSON.parse(fillColor)) {
				this.#addFillColor(nodeData)
			}
			let strokeColor = parser.findAttributeValueByKey(nodeData, AttributeKey.Stroke)
			if (strokeColor && JSON.parse(strokeColor)) {
				this.#addStrokeColor(nodeData)
			}
		}
	}

	/**
	 * 添加描边颜色
	 * @param nodeData 节点数据
	 */
	#addStrokeColor(nodeData: XmlData) {
		let strokeColorObj = parser.findValueByTagName(nodeData, OFD_KEY.StrokeColor)
		let strokeColorStr = strokeColorObj && parser.findAttributeValueByKey(strokeColorObj, AttributeKey.Value)
		if (strokeColorStr) {
			let strokeColor = parseColor(strokeColorStr)
			this.pageCanvasCtx.strokeStyle = strokeColor
			this.pageCanvasCtx.stroke()
		}
	}

	/**
	 * 添加填充颜色
	 * @param nodeData 节点数据
	 */
	#addFillColor(nodeData: XmlData) {
		let fillColorObj = parser.findValueByTagName(nodeData, OFD_KEY.FillColor)
		let fillColorStr = fillColorObj && parser.findAttributeValueByKey(fillColorObj, AttributeKey.Value)
		if (fillColorStr) {
			let fillColor = parseColor(fillColorStr)
			this.pageCanvasCtx.fillStyle = fillColor
			this.pageCanvasCtx.fill()
		}
	}

	/**
	 * 添加线宽度
	 * @param nodeData 节点数据
	 */
	#addLineWidth(nodeData: XmlData) {
		let lineWidthStr = parser.findAttributeValueByKey(nodeData, AttributeKey.LineWidth)
		if (lineWidthStr) {
			let lineWidth = convertToDpi(parseFloat(lineWidthStr))
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
			const dashArray = dashPattern.split(' ').map(value => convertToDpi(parseFloat(value)))
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
			let lineWidth = convertToDpi(parseFloat(lineWidthStr))
			ctx.lineWidth = lineWidth
		}

		// 设置虚线模式
		const dashPattern = parser.findAttributeValueByKey(nodeData, AttributeKey.DashPattern)
		if (dashPattern) {
			const dashArray = dashPattern.split(' ').map(value => convertToDpi(parseFloat(value)))
			ctx.setLineDash(dashArray)
		} else {
			ctx.setLineDash([])
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

		// 如果有boundaryBox，设置起始位置
		let currentX = boundaryBox ? boundaryBox.x : 0
		let currentY = boundaryBox ? boundaryBox.y : 0
		let firstPoint = true

		for (let i = 0; i < points.length; i++) {
			const point = points[i]

			switch (point.type) {
				case 'M': // 移动到
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

		// 只进行描边，不进行填充
		ctx.stroke()
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
}
