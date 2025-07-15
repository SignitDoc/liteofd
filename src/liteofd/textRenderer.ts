import { XmlData } from "./ofdData"
import { OfdDocument } from "./ofdDocument"
import * as parser from "./parser"
import { AttributeKey, OFD_KEY } from "./attrType"
import { fontIdWithName, opentypeFonts } from "./ofdFont"
import { getFontSize, parseColor, getDeltaList, extractTextToCharArray } from "./utils/elementUtils"
import { convertToBox, convertToDpi } from "./utils/utils"
import opentype from "../opentype"
import { ConfigManager } from "../config/configManager"

// 文本渲染器类
export class TextRenderer {
	private ofdDocument: OfdDocument
	private pageCanvasCtx: CanvasRenderingContext2D
	private configManager: ConfigManager

	constructor(ofdDocument: OfdDocument, pageCanvasCtx: CanvasRenderingContext2D) {
		this.ofdDocument = ofdDocument
		this.pageCanvasCtx = pageCanvasCtx
		this.configManager = ConfigManager.getInstance()
	}

	/**
	 * 渲染文本对象
	 * @param nodeObjs 文本对象数据
	 * @param pageContainer 页面容器
	 */
	renderTextObject(nodeObjs: XmlData, pageContainer: Element) {
		console.log("textrender draw text", this.pageCanvasCtx, this.pageCanvasCtx.canvas)

		// 获取canvas的缩放信息
		const canvas = this.pageCanvasCtx.canvas
		const devicePixelRatio = window.devicePixelRatio || 1
		const rect = canvas.getBoundingClientRect()
		const scaleX = rect.width / canvas.width
		const scaleY = rect.height / canvas.height

		console.log("Canvas缩放信息:", {
			canvasWidth: canvas.width,
			canvasHeight: canvas.height,
			rectWidth: rect.width,
			rectHeight: rect.height,
			scaleX: scaleX,
			scaleY: scaleY,
			devicePixelRatio: devicePixelRatio,
			canvasId: canvas.id,
			canvasClass: canvas.className
		})

		// 多个文本子节点
		for (let i = 0; i < nodeObjs.children.length; i++) {
			let nodeData = nodeObjs.children[i]
			this.renderSingleTextObject(nodeData, pageContainer)
		}

		// 测试位置
		// 148.5 18.5 16 3.6
		// 69 7 72 7.6749
		// let testBoundary = {x: convertToDpi(1), y: convertToDpi(1), width: convertToDpi(210), height: convertToDpi(260)}
		// this.drawTextBoundaryBox(
		// 	testBoundary,
		// 	true)
	}

	/**
	 * 渲染单个文本对象
	 * @param nodeData 单个文本节点数据
	 * @param pageContainer 页面容器
	 */
	private renderSingleTextObject(nodeData: XmlData, pageContainer: Element) {
		try {
			// 保存当前canvas状态
			this.pageCanvasCtx.save()

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
				let text = textCode?.value || ""

				// 根据配置决定是否绘制文本边界框
				if (this.configManager.shouldDrawTextBoundaryBox()) {
					this.drawTextBoundaryBox(boundaryBox)
				}
				// 设置字体
				let opentypeFont = this.setCanvasFont(nodeData, fontId)
				// 设置文本颜色
				this.setCanvasTextColor(nodeData)
				// 应用CTM变换
				this.applyCTMTransform(nodeData, boundaryBox)
				// 添加绘制param
				this.#addDrawParam(nodeData)
				// 获取HScale和VScale属性
				const hScale = parser.findAttributeValueByKey(nodeData, AttributeKey.HScale) || 1
				const vScale = parser.findAttributeValueByKey(nodeData, AttributeKey.VScale) || 1
				const hScaleValue = parseFloat(hScale + "")
				const vScaleValue = parseFloat(vScale + "")

				// 获取DeltaX和DeltaY属性
				const deltaX = getDeltaList(text, textCode, AttributeKey.DeltaX)
				const deltaY = getDeltaList(text, textCode, AttributeKey.DeltaY)

				// 获取文本的起始位置（相对于boundaryBox）
				const originX = parser.findAttributeValueByKey(textCode, AttributeKey.X) || "0"
				const originY = parser.findAttributeValueByKey(textCode, AttributeKey.Y) || "0"
				// 如果存在缩放属性，应用matrix变换
				if (hScale || vScale) {
					// const hScaleValue = hScale ? parseFloat(hScale+"") : 1
					// const vScaleValue = vScale ? parseFloat(vScale+"") : 1

					// 在文本绘制位置应用缩放变换
					this.pageCanvasCtx.translate(boundaryBox.x, boundaryBox.y + boundaryBox.height)
					this.pageCanvasCtx.scale(hScaleValue, vScaleValue)
					this.pageCanvasCtx.translate(-boundaryBox.x, -(boundaryBox.y + boundaryBox.height))
				}
				if (opentypeFont) {
					let options: any = {
						kerning: true,
						hinting: false,
						features: {
							liga: true,
							rlig: true
						}
					}
					// 计算每个字符的位置（基于boundaryBox的坐标系统）
					const charList = extractTextToCharArray(text, deltaX, deltaY, originX, originY)
					const fontSize = getFontSize(nodeData)
					// 获取当前canvas的fillStyle
					const currentFillStyle = this.pageCanvasCtx.fillStyle
					// 逐个绘制每个字符，DeltaX和DeltaY表示每个字符的位置偏移
					let currentX = boundaryBox.x + parseFloat(originX)
					// Y位置从boundaryBox顶部开始，到字符串的基线位置
					let currentY = boundaryBox.y + convertToDpi(parseFloat(originY))

					for (let i = 0; i < text.length; i++) {
						const charText = text[i]

						// 绘制当前字符
						const path = opentypeFont.getPath(charText, currentX, currentY, fontSize, options)
						path.fill = currentFillStyle
						path.draw(this.pageCanvasCtx)

						// 计算下一个字符的位置
						if (i < text.length - 1) {
							// 获取DeltaX值（如果存在）
							let deltaXValue = 0
							if (deltaX.length > i) {
								deltaXValue = deltaX[i]
							}

							// 获取DeltaY值（如果存在）
							let deltaYValue = 0
							if (deltaY.length > i) {
								deltaYValue = deltaY[i]
							}

							// 下一个字符位置 = 当前字符位置 + DeltaX和DeltaY值
							currentX += convertToDpi(deltaXValue / hScaleValue)
							currentY += convertToDpi(deltaYValue / vScaleValue)
						}
					}
					if (this.configManager.shouldLogTextRendering()) {
						console.log("Canvas opentype 绘制文本", text, "位置:", boundaryBox.x, boundaryBox.y, "textobject:", nodeData, boundaryBox)
					}
				} else {
					// 普通字体也需要使用DeltaX来设置字符位置
					// 获取DeltaX和DeltaY属性
					// const deltaX = getDeltaList(text, textCode, AttributeKey.DeltaX)
					// const deltaY = getDeltaList(text, textCode, AttributeKey.DeltaY)
					//
					// // 获取文本的起始位置（相对于boundaryBox）
					// const originX = parser.findAttributeValueByKey(textCode, AttributeKey.X) || "0"
					// const originY = parser.findAttributeValueByKey(textCode, AttributeKey.Y) || "0"

					// 逐个绘制每个字符，DeltaX和DeltaY表示每个字符的位置偏移
					let currentX = boundaryBox.x + parseFloat(originX)
					// Y位置从boundaryBox顶部开始，到字符串的基线位置
					let currentY = boundaryBox.y + convertToDpi(parseFloat(originY))

					for (let i = 0; i < text.length; i++) {
						const charText = text[i]
						// 绘制当前字符
						this.pageCanvasCtx.fillText(charText, currentX, currentY)

						// 计算下一个字符的位置
						if (i < text.length - 1) {
							// 获取DeltaX值（如果存在）
							let deltaXValue = 0
							if (deltaX.length > i) {
								deltaXValue = deltaX[i]
							}

							// 获取DeltaY值（如果存在）
							let deltaYValue = 0
							if (deltaY.length > i) {
								deltaYValue = deltaY[i]
							}

							// 下一个字符位置 = 当前字符位置 + DeltaX和DeltaY值
							currentX += convertToDpi(deltaXValue / hScaleValue)
							currentY += convertToDpi(deltaYValue / vScaleValue)
						}
					}

					if (this.configManager.shouldLogTextRendering()) {
						console.log("Canvas 普通 绘制文本", text, "位置:", boundaryBox.x, boundaryBox.y, "字体ID:", fontId, textCode)
					}
				}
			}
			// 恢复canvas状态
			this.pageCanvasCtx.restore()
		} catch (e) {
			console.error("render text error", e)
			// 恢复canvas状态
			this.pageCanvasCtx.restore()
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
	 * @param boundaryBox 文本位置
	 */
	private applyCTMTransform(nodeData: XmlData, boundaryBox: { x: number; y: number; width: number; height: number; }) {
		const ctmStr = parser.findAttributeValueByKey(nodeData, AttributeKey.CTM)
		if (ctmStr) {
			if (this.configManager.shouldLogCTMTransform()) {
				console.log("text ctm text", ctmStr)
			}
			const ctms = ctmStr.split(' ')
			if (ctms.length >= 6) {
				const a = parseFloat(ctms[0])
				const b = parseFloat(ctms[1])
				const c = parseFloat(ctms[2])
				const d = parseFloat(ctms[3])
				const e = convertToDpi(parseFloat(ctms[4]))
				const f = convertToDpi(parseFloat(ctms[5]))

								if (this.configManager.shouldLogCTMTransform()) {
					console.log("CTM矩阵:", { a, b, c, d, e, f })
				}

				// 检查CTM矩阵是否为单位矩阵（无变换）
				const isIdentity = Math.abs(a - 1) < 0.001 && Math.abs(b) < 0.001 &&
								 Math.abs(c) < 0.001 && Math.abs(d - 1) < 0.001 &&
								 Math.abs(e) < 0.001 && Math.abs(f) < 0.001

				if (!isIdentity) {
					if (this.configManager.shouldLogCTMTransform()) {
						console.log("应用CTM变换")
					}

					// 检查是否为纯缩放矩阵（b和c为0）
					const isPureScale = Math.abs(b) < 0.001 && Math.abs(c) < 0.001

					if (isPureScale) {
						// 纯缩放矩阵，可以分解为缩放和平移
						const scaleX = a
						const scaleY = d
						const translateX = e
						const translateY = f

						if (this.configManager.shouldLogCTMTransform()) {
							console.log("纯缩放矩阵 - 缩放:", scaleX, scaleY, "平移:", translateX, translateY)
						}

						// 先应用平移，再应用缩放
						this.pageCanvasCtx.translate(translateX, translateY)
						this.pageCanvasCtx.translate(boundaryBox.x, boundaryBox.y + boundaryBox.height)
						this.pageCanvasCtx.scale(scaleX, scaleY)
						this.pageCanvasCtx.translate(-boundaryBox.x, -(boundaryBox.y + boundaryBox.height))
					} else {
						// 复杂变换矩阵，包含旋转或倾斜
						if (this.configManager.shouldLogCTMTransform()) {
							console.log("复杂变换矩阵，包含旋转或倾斜")
						}

						// 分解CTM矩阵
						const decomposed = this.decomposeCTM(a, b, c, d, e, f)
						if (this.configManager.shouldLogCTMTransform()) {
							console.log("分解后的变换:", decomposed)
						}

						// 保存当前状态
						this.pageCanvasCtx.save()

						try {
							// 按顺序应用变换：平移 -> 旋转 -> 缩放
							this.pageCanvasCtx.translate(decomposed.translateX, decomposed.translateY)
							this.pageCanvasCtx.rotate(decomposed.rotation)
							this.pageCanvasCtx.translate(boundaryBox.x, boundaryBox.y + boundaryBox.height)
							this.pageCanvasCtx.scale(decomposed.scaleX, decomposed.scaleY)
							this.pageCanvasCtx.translate(-boundaryBox.x, -(boundaryBox.y + boundaryBox.height))
							this.pageCanvasCtx.restore()
						} catch (error) {
							console.error("CTM变换应用失败:", error)
							// 恢复状态
							this.pageCanvasCtx.restore()
							// 尝试只应用平移
							this.pageCanvasCtx.translate(e, f)
						}
					}
				} else {
					if (this.configManager.shouldLogCTMTransform()) {
						console.log("CTM为单位矩阵，跳过变换")
					}
				}
			}
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
	 * 绘制文本的boundaryBox边框，用于调试
	 * @param boundaryBox 边界框
	 */
	private drawTextBoundaryBox(boundaryBox: { x: number; y: number; width: number; height: number; }, forceDraw: boolean = false) {
		// 检查配置是否启用边界框绘制
		if (!forceDraw) {
			if (!this.configManager.shouldDrawTextBoundaryBox()) {
				return
			}
		}


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

		if (this.configManager.shouldLogTextRendering()) {
			console.log("绘制文本边界框:", boundaryBox)
		}
	}
}
