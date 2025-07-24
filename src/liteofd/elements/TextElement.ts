import { BaseSvg } from "./BaseSvg"
import { XmlData } from "../ofdData"
import * as parser from "../parser"
import { AttributeKey, OFD_KEY } from "../attrType"
import { convertToBox, convertToDpi } from "../utils/utils"
import { createDivTextSpan, decodeHtmlEntities, extractTextToCharArray, getCTM, getDeltaList, getFontSize, parseColor } from "../utils/elementUtils"
import { OfdDocument } from "../ofdDocument"
import { CommonFont } from "../utils/commonFont"
import { convertNonStandardFont, normalizeFontName } from "../utils/ofdUtils"
import { rendererConfig } from "../rendererConfig"

/**
 * 文本组件，这个是使用div和span进行定位的文本，选择文本能够透明化文字
 */
export class TextElement {

	private nodeData: XmlData // 最外层的svg的数据
	private svgContainer: HTMLDivElement // svg的包裹的，每个组件都有一个svg包裹，比如path带有一个，而text则是svg包裹text，然后text包裹tspan这样子
	private svgContainerStyle = "position: absolute;overflow: visible;" // 外层svg的style
	private boundaryBox: {
		x: number,
		y: number,
		width: number,
		height: number,
	}
	private textId = "" // 路径的id
	private ofdDocument: OfdDocument
	private textStyle: string = ""

	// 初始化传入xmldata构建一个path的数据
	constructor(ofdDocument: OfdDocument, nodeData: XmlData) {
		this.ofdDocument = ofdDocument
		this.nodeData = nodeData
		this.textId = parser.findAttributeValueByKey(nodeData, AttributeKey.ID)
		this.#initSvgElement()
	}

	// 添加boundary范围
	#addBoundary(node: XmlData) {
		let boundaryStr = parser.findAttributeValueByKey(node, AttributeKey.Boundary)
		if (boundaryStr) {
			this.boundaryBox = convertToBox(boundaryStr)

			let svgStyle = `left: ${this.boundaryBox.x}px;top: ${this.boundaryBox.y}px;
	width: ${this.boundaryBox.width}px;height: ${this.boundaryBox.height}px;`
			this.svgContainerStyle += svgStyle
		}
	}

	// 添加字体
	#addFont(node: XmlData, eleSvg: HTMLSpanElement){
		// 查找textobject的字体的id
		let fontID = parser.findAttributeValueByKey(node, AttributeKey.FONT)
		if (fontID) {
			// let ofdFontList = parser.findValueByTagName(this.ofdDocument.publicRes, OFD_KEY.Font)
			let allFontList = parser.findAllNodesByTagName(this.ofdDocument.publicRes, OFD_KEY.Font)
			// console.log("find public res ofd list", ofdFontList)
			console.log("find public res allFontList", allFontList)
			// 根据字体id查找对应publicres的font数据
			// let findedFont = parser.findNodeByAttributeKeyValue(fontID, AttributeKey.ID, ofdFontList!!)
			// 从字体列表中查找字体
			let findedFont = parser.findNodeByAttributeKeyValueInList(fontID, AttributeKey.ID, allFontList!!)
			parser.findNodeByAttributeKeyValueWithTagName(fontID, AttributeKey.ID, this.ofdDocument.publicRes, OFD_KEY.Font)
			console.log("find text font ", findedFont)
			if (findedFont) {
				// 添加字体内容
				let fontName = parser.findAttributeValueByKey(findedFont, AttributeKey.FontName)
				let fontFamily = parser.findAttributeValueByKey(findedFont, AttributeKey.FamilyName)
				if (fontName) {
					let standardFont = CommonFont[fontName]
					if (standardFont) {
						this.textStyle += `font-family: ${standardFont};`
					} else {
						fontName = normalizeFontName(fontName)
						fontName = convertNonStandardFont(fontName)
						this.textStyle += `font-family: ${fontName};`
					}
				} else if (fontFamily) {
					fontFamily = normalizeFontName(fontFamily)
					fontFamily = convertNonStandardFont(fontFamily)
					this.textStyle += `font-family: ${fontFamily};`
				}

				// 去掉publicres中关于字体的粗细的值的显示，只使用字体文件中的字体渲染
				// 添加字体粗细
				let fontWeight = parser.findAttributeValueByKey(findedFont, AttributeKey.Weight)
				if (fontWeight) {
					this.textStyle += `font-weight: ${fontWeight};`
				}
				let fontBold = parser.findAttributeValueByKey(findedFont, AttributeKey.Bold)
				if (fontBold) {
					this.textStyle += `font-weight: bold;`
				}
				// 添加字体斜体
				let fontItalic = parser.findAttributeValueByKey(findedFont, AttributeKey.Italic)
				console.log("font italic:", fontID, findedFont, fontItalic, node)
				if (fontItalic) {
					this.textStyle += `font-style: italic;`
				}
			}
		}
	}

	// 给pathsvg添加ctm矩阵
	#addCTM(nodeData: XmlData, eleSvg: HTMLSpanElement) {
		let tempCtm = this.#getTextCTM(nodeData)
		if (tempCtm) {
			this.textStyle += `transform: ${tempCtm};`
			console.log("text ele style", this.textStyle)
		}
	}

	#getTextCTM(obj: XmlData) {
		let ctmStr = parser.findAttributeValueByKey(obj, AttributeKey.CTM)
		if (ctmStr) {
			let ctms = ctmStr.split(' ');
			return `matrix(${ ctms[0] }, ${ ctms[1] }, ${ ctms[2] }, ${ ctms[3] }, ${ convertToDpi(parseFloat(ctms[4])) }, ${ convertToDpi(parseFloat(ctms[5])) })`
		}

		return null
	}


	// 给pathsvg添加ctm矩阵
	#addTextStyle(nodeData: XmlData) {
		// 设置字体大小
		let fontSize = getFontSize(nodeData)
		this.textStyle += `font-size: ${fontSize}px;`
		// 设置font-weight
		let fontWeight = parser.findAttributeValueByKey(nodeData, AttributeKey.Weight)
		if (fontWeight) {
			this.textStyle += `font-weight: ${fontWeight};`
		}
		// 添加字体颜色
		this.#addFillColor(nodeData)
		// 添加stroke颜色
		this.#addStrokeColor(nodeData)
		// 添加斜体等
		let fontItalic = parser.findAttributeValueByKey(nodeData, AttributeKey.Italic)
		if (fontItalic && JSON.parse(fontItalic)) {
			this.textStyle += `font-style: italic;`
		}

		// stroke宽度
		let lineWidth = parser.findAttributeValueByKey(nodeData, AttributeKey.LineWidth)
		if (lineWidth) {
			let lineWidthValue = parseFloat(lineWidth)
			this.textStyle += `stroke-width: ${convertToDpi(lineWidthValue)}px;`
		} else {
			this.textStyle += `stroke-width: 0;`
		}
	}

	#addStrokeColor(nodeData: XmlData) {
		let strokeColorObj = parser.findValueByTagName(nodeData, OFD_KEY.StrokeColor)
		let strokeColorStr = strokeColorObj && parser.findAttributeValueByKey(strokeColorObj, AttributeKey.Value)

		if (rendererConfig.isCanvasRender()) {
			this.textStyle += `stroke: transparent;`
		} else {
			if (strokeColorStr) {
				let strokeColor = parseColor(strokeColorStr)
				this.textStyle += `stroke: ${strokeColor};`
			}
		}
	}

	#addFillColor(nodeData: XmlData) {
		let fillColorObj = parser.findValueByTagName(nodeData, OFD_KEY.FillColor)
		let fillColorStr = fillColorObj && parser.findAttributeValueByKey(fillColorObj, AttributeKey.Value)
		if (rendererConfig.isCanvasRender()) {
			this.textStyle += `fill: transparent;`
		} else {
			if (fillColorStr) {
				let fillColor = parseColor(fillColorStr)
				this.textStyle += `fill: ${fillColor};`
			}
		}
	}

	// 给pathsvg添加ctm矩阵
	#addTextTSpan(nodeData: XmlData, eleSvg: HTMLSpanElement) {
		let textCode = parser.findValueByTagName(nodeData, OFD_KEY.TextCode)
		this.#createDivTextSpan(nodeData, textCode, eleSvg)
	}


	#createDivTextSpan(nodeData: XmlData, textCodeData: XmlData, textNode: Element) {
		console.log("test converttodpi : ", convertToDpi(9.22 - 5.6))
		let scaleStyle = ""
		// 根据scale计算tspan的位置
		let hScale = parser.findAttributeValueByKey(nodeData, AttributeKey.HScale)
		let vScale = parser.findAttributeValueByKey(nodeData, AttributeKey.VScale)
		// TODO 对已经存在CTM的情况需要对CTM基础上进行缩放计算，现在是简单对这两种情况进行了区分也就是hscale和ctm进行了一个分解处理
		if(vScale || hScale) {
			scaleStyle += `transform: scale(${hScale ? hScale : 1}, ${vScale ? vScale : 1});`
		}
		let x = parser.findAttributeValueByKey(textCodeData, AttributeKey.X)
		let y = parser.findAttributeValueByKey(textCodeData, AttributeKey.Y)

		let textCode = parser.findValueByTagName(textCodeData, OFD_KEY.TextCode)
		let textStr = textCode.value.toString()
		textStr = decodeHtmlEntities(textStr)
		// 根据node的deltax和deltay进行创建字符位置
		let deltaX = getDeltaList(textStr, textCode, AttributeKey.DeltaX)
		let deltaY = getDeltaList(textStr, textCode, AttributeKey.DeltaY)

		// 将char分割，并且添加上x和y的值
		let charList = extractTextToCharArray(textStr, deltaX, deltaY, x, y)
		for (let i = 0; i < charList.length; i++) {
			let charObj = charList[i]
			let charSpanStyle = ""
			charSpanStyle += scaleStyle
			charSpanStyle += "position: absolute;"
			let nodeEle = document.createElement('span');
			let x = charObj.x
			let y = charObj.y

			charSpanStyle += `left: ${x}px; bottom: ${this.boundaryBox.height - y}px;`
			nodeEle.innerHTML = charObj.text

			nodeEle.setAttribute("style", charSpanStyle)
			textNode.appendChild(nodeEle)
		}
	}


	#addTextSvg(nodeData: XmlData) {
		let eleSvg = document.createElement("div")
		this.textStyle += `width: ${this.boundaryBox.width}px; height: ${this.boundaryBox.height}px;`
		// 添加矩阵变换
		this.#addCTM(nodeData, eleSvg)
		// 添加字体颜色和大小
		this.#addTextStyle(nodeData)
		console.log("text ele style", this.textStyle)
		// 添加drawparam
		this.#addDrawParam(nodeData)
		console.log("text ele style", this.textStyle)
		// 给字体添加字体
		this.#addFont(nodeData, eleSvg)
		// 添加字体内容
		this.#addTextTSpan(nodeData, eleSvg)
		eleSvg.setAttribute("style", this.textStyle)
		return eleSvg
	}

	// 创建外层的文本包裹的div
	createContainerSvg(): HTMLDivElement {
		let textContainerDiv = document.createElement('div')
		this.#addSvgIDAndZIndex(this.nodeData, textContainerDiv)
		// 添加外层的boundary
		this.#addBoundary(this.nodeData)
		// svg下面添加path
		let eleSvg = this.#addTextSvg(this.nodeData)
		textContainerDiv.appendChild(eleSvg)

		return textContainerDiv
	}

	getContainerSvg(): HTMLDivElement {
		return this.svgContainer
	}

	#initSvgElement() {
		this.svgContainer = this.createContainerSvg()
		this.svgContainer.setAttribute("style", this.svgContainerStyle)
	}

	#addSvgIDAndZIndex(nodeData: XmlData, svg: HTMLDivElement) {
		let svgID = parser.findAttributeValueByKey(nodeData, AttributeKey.ID)
		if (svgID) {
			svg.setAttribute("SVG_ID", svgID)
			this.svgContainerStyle += `z-index: ${svgID};`
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
					this.textStyle += `font-weight: ${fontWeight};`
				}
				let fontBold = parser.findAttributeValueByKey(drawParamNode, AttributeKey.Bold)
				if (fontBold) {
					this.textStyle += `font-weight: bold;`
				}
				// 添加字体斜体
				let fontItalic = parser.findAttributeValueByKey(drawParamNode, AttributeKey.Italic)
				if (fontItalic) {
					this.textStyle += `font-style: italic;`
				}
			}
		}
	}
}
