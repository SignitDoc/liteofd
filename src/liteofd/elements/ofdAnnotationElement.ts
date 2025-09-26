import { XmlData } from "../ofdData"
import * as parser from "../parser"
import { ANNOT_TYPE, AttributeKey, OFD_KEY } from "../attrType"
import { OfdDocument } from "../ofdDocument"
import { AnnotationPathSvg } from "./AnnotationPathSvg"
import { ImageSvg } from "./ImageSvg"

/**
 * 注释组件
 */
export class OfdAnnotationElement {


	private annotData: XmlData // 注释的数据
	private ofdPage: XmlData // 当前签名所对应的页面数据
	private ofdDocument: OfdDocument // 能拿到图片资源的公共资源数据节点
	private viewContainer: HTMLDivElement | SVGSVGElement // svg的包裹的，每个组件都有一个svg包裹，比如path带有一个，而text则是svg包裹text，然后text包裹tspan这样子
	private viewContainerStyle = "position: absolute;overflow: visible; cursor: pointer;" // 外层的style
	private viewZIndex = 9999 // 最高的
	private annotNodeList: XmlData[] = [] // 注释的列表


	/**
	 * 初始化注释组件
	 * @param ofdDocument
	 * @param ofdPage 当前页面数据
	 * @param viewContainer 页面容器
	 */
	constructor(ofdDocument: OfdDocument, ofdPage: XmlData, viewContainer: HTMLDivElement) {
		this.ofdPage = ofdPage
		this.ofdDocument = ofdDocument
		this.annotData = ofdPage.annots!!
		this.viewContainer = viewContainer

		if (this.annotData) {
			this.initViewContainer()
			this.addClickListener()
		}
	}

	private initViewContainer() {
		let annotNode = parser.findValueByTagName(this.annotData, OFD_KEY.Annot)
		if(annotNode?.children && annotNode.children.length > 0){
			this.annotNodeList = annotNode.children
		}
	}


	private addClickListener() {

	}

	render() {
		if(this.annotNodeList.length > 0){
			// 开始渲染注释
			this.annotNodeList.forEach((annotNode, index) => {
				console.log(`正在渲染第 ${index + 1} 个注释`, annotNode);
				this.renderSingleAnnotation(annotNode);
			});
		}
	}

	/**
	 * 渲染单个注释
	 * @param annotNode 注释节点
	 */
	renderSingleAnnotation(annotNode: XmlData) {
		let annotType = parser.findAttributeValueByKey(annotNode, AttributeKey.Type)
		switch (annotType) {
			case ANNOT_TYPE.Path.value:
				this.renderPathAnnot(annotNode);
				break;
				case ANNOT_TYPE.Highlight.value:
					this.renderHightLightAnnot(annotNode);
					break;
			case ANNOT_TYPE.Stamp.value:
				this.renderStampAnnot(annotNode);
				break;
			default:
				console.log(`未知的注释类型: ${annotType}`);
		}
	}

	/**
	 * 渲染印章注释
	 * @param annotNode 注释节点
	 */
	renderStampAnnot(annotNode: XmlData) {
		let stampType = parser.findAttributeValueByKey(annotNode, AttributeKey.Subtype)
		console.log("stamp subtype", stampType)
		switch (stampType) {
			case ANNOT_TYPE.Stamp.subType.Stamp:
				this.renderStamp(annotNode);
				break;
			case ANNOT_TYPE.Stamp.subType.SignatureInFile:
				this.renderSignatureInFile(annotNode);
				break;
		}
	}

	renderSignatureInFile(annotNode: XmlData) {

	}


	renderStamp(annotNode: XmlData) {
		console.log("render stamp", annotNode)
		let imgAppearance = parser.findValueByTagName(annotNode, OFD_KEY.Appearance)
		let imageObj = parser.findValueByTagName(annotNode, OFD_KEY.ImageObject)
		if(imageObj && imgAppearance){
			let boundary = parser.findAttributeValueByKey(imgAppearance, AttributeKey.Boundary)
			if(boundary){
				parser.setAttributeToNode(imageObj, AttributeKey.Boundary, boundary)
			}

			let imgSvg = new ImageSvg(this.ofdDocument, imageObj)
			this.viewContainer.appendChild(imgSvg.getContainerSvg())
		}
	}

	private renderPathAnnot(annotNode: XmlData) {
		// 实现路径注释的渲染逻辑
		let pathSvg = new AnnotationPathSvg(this.ofdDocument, annotNode)
		this.viewContainer.appendChild(pathSvg.getContainerSvg())
	}

	private renderHightLightAnnot(annotNode: XmlData) {
		// 实现高亮注释的渲染逻辑
		let pathSvg = new AnnotationPathSvg(this.ofdDocument, annotNode)
		this.viewContainer.appendChild(pathSvg.getContainerSvg())
	}
}
