import { XmlData } from "../ofdData"
import * as parser from "../parser"
import { ANNOT_TYPE, AttributeKey, OFD_KEY } from "../attrType"
import { OfdDocument } from "../ofdDocument"
import { PathSvg } from "./PathSvg"

/**
 * 注释的路径
 */
export class AnnotationPathSvg {

	private nodeData: XmlData // 最外层的svg的数据
	private pathContainer: HTMLDivElement // svg的包裹的，每个组件都有一个svg包裹，比如path带有一个，而text则是svg包裹text，然后text包裹tspan这样子
	private pathContainerStyle = "position: absolute;overflow: visible;" // 外层svg的style
	private pathId = "" // 路径的id
	private ofdDocument: OfdDocument
	private appearanceData: XmlData | undefined // 渲染的内容的节点数据
	private parameterData: XmlData | undefined // 路径的参数
	private boundaryBox: {
		x: number,
		y: number,
		width: number,
		height: number,
	} =  { x: 0, y: 0, width: 0, height: 0 }
	private zIndex = 1 // 根据不同的子类型需要设置不同的zIndex

	// 初始化传入xmldata构建一个path的数据
	constructor(ofdDocument: OfdDocument, nodeData: XmlData) {
		this.ofdDocument = ofdDocument
		this.nodeData = nodeData
		this.pathId = parser.findAttributeValueByKey(nodeData, AttributeKey.ID)
		this.appearanceData = parser.findValueByTagName(nodeData, OFD_KEY.Appearance)
		this.parameterData = parser.findValueByTagName(nodeData, OFD_KEY.Parameters)

		this.pathContainer = this.createContainerSvg()
		this.pathContainer.setAttribute("style", this.pathContainerStyle)
	}


	#setZIndexBySubtype(){
		let subType = parser.findAttributeValueByKey(this.nodeData, AttributeKey.Subtype)
		  switch (subType) {
			case ANNOT_TYPE.Path.subType.Watercolor:
			case ANNOT_TYPE.Path.subType.Fluorescent:
			case ANNOT_TYPE.Path.subType.Pen:
			this.zIndex = 9999; // 在文本层上面
			break;
			case ANNOT_TYPE.Path.subType.Strikeout:
			this.zIndex = 1; // 在文本层的index上面
			break;
			case ANNOT_TYPE.Path.subType.Squiggly:
			this.zIndex = 1; // 在文本下面
			break;
			default:
			this.zIndex = 1; // 默认值
		}
	}

	/**
	 * 创建包含路径的SVG容器元素
	 *
	 * 该方法执行以下操作:
	 * 1. 创建一个新的SVG元素
	 * 2. 设置SVG版本
	 * 3. 添加SVG的ID和z-index
	 * 4. 添加外层边界
	 * 5. 创建并添加路径元素
	 * 6. 将定义(如渐变)添加到路径元素中
	 *
	 * @returns 创建并配置好的SVG容器元素
	 */
	createContainerSvg(): HTMLDivElement {
		let pathContainer = document.createElement("div")

		// 根据subtype设置zindex类型
		this.#setZIndexBySubtype()

		this.#addSvgIDAndZIndex(this.nodeData, pathContainer)
		this.appearanceData && this.#addBoundary(this.appearanceData)
		// 添加外层的boundary
		if(this.appearanceData){
			let pathObjectData = parser.findValueByTagName(this.appearanceData, OFD_KEY.PathObject)
			console.log("pathObjectData list render", pathObjectData)
			if(pathObjectData && pathObjectData.children.length > 0){
				pathObjectData.children.forEach(child => {
					let childPath = new PathSvg(this.ofdDocument, child, false)
					let childSvg = childPath.getContainerSvg()
					pathContainer.appendChild(childSvg)
				})
			}
		}

		return pathContainer
	}

	getContainerSvg(): HTMLDivElement {
		return this.pathContainer
	}


	#addSvgIDAndZIndex(nodeData: XmlData, container: HTMLDivElement) {
		let svgID = parser.findAttributeValueByKey(nodeData, AttributeKey.ID)
		if (svgID) {
			container.setAttribute("SVG_ID", svgID)
			this.pathContainerStyle += `z-index: ${this.zIndex};`
		}

	}

	// 添加boundary范围
	#addBoundary(node: XmlData) {
		let boundaryStr = parser.findAttributeValueByKey(node, AttributeKey.Boundary)
		if (boundaryStr) {
			this.boundaryBox = this.ofdDocument.convertToBox(boundaryStr)

		let svgStyle = `left: ${this.boundaryBox.x}px;top: ${this.boundaryBox.y}px;
		width: ${this.boundaryBox.width}px;height: ${this.boundaryBox.height}px;`
				this.pathContainerStyle += svgStyle
			}
		}
}
