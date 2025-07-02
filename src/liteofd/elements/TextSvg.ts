import { BaseSvg } from "./BaseSvg"
import { XmlData } from "../ofdData"
import * as parser from "../parser"
import { AttributeKey, OFD_KEY } from "../attrType"
import { convertToBox, convertToDpi } from "../utils/utils"
import { createTextSpan, getCTM, getFontSize, parseColor } from "../utils/elementUtils"
import { OfdDocument } from "../ofdDocument"
import { CommonFont } from "../utils/commonFont"
import { convertNonStandardFont, normalizeFontName } from "../utils/ofdUtils"

/**
 * 文本组件
 */
export class TextSvg extends BaseSvg {

	private nodeData: XmlData // 最外层的svg的数据
	private svgContainer: SVGElement // svg的包裹的，每个组件都有一个svg包裹，比如path带有一个，而text则是svg包裹text，然后text包裹tspan这样子
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
		super()
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
	#addFont(node: XmlData, eleSvg: SVGTextElement){
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
	#addCTM(nodeData: XmlData, eleSvg: SVGTextElement) {
		let tempCtm = getCTM(nodeData)
		tempCtm && eleSvg.setAttribute("transform", tempCtm)
	}


	// 给pathsvg添加ctm矩阵
	#addTextStyle(nodeData: XmlData) {
		// 设置字体大小
		let fontSize = getFontSize(nodeData)
		this.textStyle = `font-size: ${fontSize}px;`
		// 设置font-weight
		let fontWeight = parser.findAttributeValueByKey(nodeData, AttributeKey.Weight)
		if (fontWeight) {
			this.textStyle += `font-weight: ${fontWeight};`
		}
		// 添加字体颜色
		this.#addFillColor(nodeData)
		// 添加stroke颜色
		this.#addStrokeColor(nodeData)

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
		if (strokeColorStr) {
			let strokeColor = parseColor(strokeColorStr)
			this.textStyle += `stroke: ${strokeColor};`
		}
	}

	#addFillColor(nodeData: XmlData) {
		let fillColorObj = parser.findValueByTagName(nodeData, OFD_KEY.FillColor)
		let fillColorStr = fillColorObj && parser.findAttributeValueByKey(fillColorObj, AttributeKey.Value)
		if (fillColorStr) {
			let fillColor = parseColor(fillColorStr)
			this.textStyle += `fill: ${fillColor};`
		}
	}

	// 给pathsvg添加ctm矩阵
	#addTextTSpan(nodeData: XmlData, eleSvg: SVGTextElement) {
		let textCode = parser.findValueByTagName(nodeData, OFD_KEY.TextCode)
		createTextSpan(nodeData, textCode, eleSvg)
	}

	#addTextSvg(nodeData: XmlData) {
		let eleSvg = document.createElementNS('http://www.w3.org/2000/svg', 'text')
		// 添加矩阵变换
		this.#addCTM(nodeData, eleSvg)
		// 添加字体颜色和大小
		this.#addTextStyle(nodeData)
		// 添加drawparam
		this.#addDrawParam(nodeData)
		// 给字体添加字体
		this.#addFont(nodeData, eleSvg)
		// 添加字体内容
		this.#addTextTSpan(nodeData, eleSvg)
		eleSvg.setAttribute("style", this.textStyle)
		return eleSvg
	}

	createContainerSvg(): SVGElement {
		let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		svg.setAttribute('version', '1.1')

		this.#addSvgIDAndZIndex(this.nodeData, svg)
		// 添加外层的boundary
		this.#addBoundary(this.nodeData)
		// svg下面添加path
		let eleSvg = this.#addTextSvg(this.nodeData)
		svg.appendChild(eleSvg)

		return svg
	}

	getContainerSvg(): SVGElement {
		return this.svgContainer
	}

	#initSvgElement() {
		this.svgContainer = this.createContainerSvg()
		this.svgContainer.setAttribute("style", this.svgContainerStyle)
	}

	#addSvgIDAndZIndex(nodeData: XmlData, svg: SVGSVGElement) {
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
