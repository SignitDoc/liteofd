/**
 * 渲染单个页面的
 */
import { OfdDocument } from "../ofdDocument"
import { XmlData } from "../ofdData"
import { AttributeKey, OFD_KEY } from "../attrType"
import { OfdPageRender } from "./ofdPageRender"
import * as parser from "../parser"
import { convertToBox } from "../utils/utils"
import { ContentLayer } from "../contentLayer"
import { getNodeAttributeMaxAndMinID } from "../utils/elementUtils"
import { RootDocPath } from "../parser"
import { SignatureElement } from "../elements/SignatureElement"
import { OfdAnnotationElement } from "./ofdAnnotationElement"
import { CanvasContentLayer } from "../canvasContentLayer"
import { createOFDCanvas } from "../ofdCanvas"

/**
 * OFD的页面渲染容器，里面有一个pageRender用来调用页面的渲染功能进行 内容的渲染
 * 签名的渲染是再这里和内容一样的同级别渲染
 */
export class OfdPageContainer {
	private ofdDocument: OfdDocument // ofd的文档数据
	private pageData: XmlData // 当前页面的数据
	private contentLayer: ContentLayer // 渲染的内容层，包含textcode和模板等
	private canvasContentLayer: CanvasContentLayer // 使用canvas渲染的渲染的内容层，包含textcode和模板等
	private isCanvasRender: Boolean = true // 默认使用canvas渲染

	/**
	 * 初始化页面
	 * @param ofdDocument ofd的文档
	 * @param pageData 页面数据
	 * @param rootContainer 包裹页面的外层根容器
	 */
	constructor(ofdDocument: OfdDocument, pageData: XmlData, rootContainer: any) {
		this.ofdDocument = ofdDocument
		this.pageData = pageData
	}

	// 渲染内容层
	#renderContentLayer(pageData: XmlData, pageContainer: Element, zOrder: number = 0) {
		this.contentLayer = new ContentLayer(this.ofdDocument)
		if (zOrder) {
			this.contentLayer.renderWithZOrder(pageData, pageContainer, zOrder)
		} else {
			this.contentLayer.render(pageData, pageContainer)
		}
	}

	// 渲染内容层
	#renderCanvasContentLayer(pageData: XmlData, pageContainer: Element, zOrder: number = 0) {
		console.log("create canvas content layer 2")
		this.canvasContentLayer = new CanvasContentLayer(this.ofdDocument)
		this.canvasContentLayer.render(pageData, pageContainer)
	}

	// 渲染模板层，模板层也是内容层，所以拿去到模板数据之后直接用内容层去渲染
	async #renderTemplateLayer(pageData: XmlData, pageContainer: Element) {
		// 这里是页面page获取到的模板的页面的id，然后根据模板的id去document中查找对应的模板数据

		let templateLayer = parser.findValueByTagName(pageData, OFD_KEY.Template)
		if (templateLayer){
			let templateId = parser.findAttributeValueByKey(pageData, AttributeKey.TemplateID)
			let zOrder = parser.findAttributeValueByKey(pageData, AttributeKey.ZOrder)
			if (templateId) {
				// 获取模板的zOrder得到默认的层
				let idObj = {
					min: 9,
					max: 9999
				}
				getNodeAttributeMaxAndMinID(pageData, idObj)
				let zOrderValue = -1
				if (zOrder === "Background") {
					zOrderValue = idObj.min - 1
				} else {
					zOrderValue = idObj.max + 1
				}
				// 根据模板id来设置页面
				let templateObj = parser.findValueByTagName(this.ofdDocument.documentData, OFD_KEY.TemplatePage)
				console.log("render templateObj 2", templateObj)
				if (templateObj && templateObj.children.length > 0) {
					for (let i = 0; i < templateObj.children.length; i++) {
						let currentTemplateObj = templateObj.children[i]
						let templateObjId = parser.findAttributeValueByKey(currentTemplateObj, AttributeKey.ID)
						console.log("render templateObj with id", templateObjId, templateId)
						if (templateId === templateObjId) {
							let templatePath = parser.findAttributeValueByKey(currentTemplateObj, AttributeKey.BaseLoc)
							// 模板页面的路径
							templatePath = `${RootDocPath}/${templatePath}`
							let templateFileData = await parser.parseXmlByFileName(this.ofdDocument.files, templatePath)
							if (templateFileData && templateFileData instanceof XmlData) {
								// 根据模板页面的数据拿到Page，其他就跟普通的页面一样的渲染了
								let pageData = parser.findValueByTagName(templateFileData, OFD_KEY.Page)
								if (this.isCanvasRender) {
									pageData && this.#renderCanvasContentLayer(pageData, pageContainer, zOrderValue)
								} else {
									pageData && this.#renderContentLayer(pageData, pageContainer, zOrderValue)
								}
								console.log("template file data", templateFileData, templatePath, this.ofdDocument.files)
							}
						}
					}
				}
			}
		}
	}

	#getPageBox(pageData: XmlData){
		let physicsBoxObj = parser.findValueByTagName(pageData, OFD_KEY.PhysicalBox)
		// 如果页面的宽度为空，那么使用整体的页面布局
		if (!physicsBoxObj) {
			physicsBoxObj = parser.findValueByTagName(this.ofdDocument.documentData, OFD_KEY.PhysicalBox)
		}

		let physicBox = convertToBox(physicsBoxObj!!.value)
		let pageStyle = `width: ${physicBox.width}px; height: ${physicBox.height}px; position: relative;`
		return pageStyle
	}

	#createPageContainer(pageData: XmlData): HTMLDivElement{
		let pageContainer = document.createElement("div")
		pageContainer.setAttribute("class", "page-container")
		let pageStyle = this.#getPageBox(pageData)
		pageContainer.setAttribute("style", pageStyle)

		return pageContainer
	}

	// 创建绘制文本的canvas
	#createPageCanvas(pageData: XmlData): HTMLCanvasElement{
		let pageCanvas = document.createElement("canvas")

		pageCanvas.setAttribute("class", "page-canvas")
		let physicsBoxObj = parser.findValueByTagName(pageData, OFD_KEY.PhysicalBox)
		// 如果页面的宽度为空，那么使用整体的页面布局
		if (!physicsBoxObj) {
			physicsBoxObj = parser.findValueByTagName(this.ofdDocument.documentData, OFD_KEY.PhysicalBox)
		}

		let physicBox = convertToBox(physicsBoxObj!!.value)
		pageCanvas.width = physicBox.width
		pageCanvas.height = physicBox.height

		return pageCanvas
	}

	/**
	 * 异步渲染页面内容
	 * @param pageData
	 * @param pageContainer
	 * @private
	 */
	async #renderPageAsync(pageData: XmlData, pageContainer: HTMLDivElement){
		let pageRender = new OfdPageRender(this.ofdDocument, pageData)
		// 开启异步渲染页面内容，内容层
		let renderPromise = pageRender.render(pageContainer)
		renderPromise.promise
			.then(res => {
				// console.log("render page finis", res)
			})
			.catch(err => {
				console.log("render page err", err)
			})
		// 模板层
		this.#renderTemplateLayer(pageData, pageContainer)
		// 需要用page外层的signlist数据
		this.#renderSignatures(pageData, pageContainer)
		// 渲染注释层
		this.#renderAnnotLayer(pageData, pageContainer)
	}

	/**
	 * 首先创建页面的框架，然后再异步渲染内容
	 */
	getPageElement(): HTMLDivElement {
		// 首先添加div，然后页面的内容使用也不进行渲染
		let pageContainer = this.#createPageContainer(this.pageData)
		let pageCanvas = this.#createPageCanvas(this.pageData)
		pageContainer.appendChild(pageCanvas)
		this.#renderPageAsync(this.pageData, pageContainer)

		return pageContainer
	}


	/**
	 * 渲染单个签名的图片数据
	 * @private
	 */
	#renderSingleStampAnot(sign: XmlData, pageContainer: Element) {
		console.log("render single stamp anot", sign)
		if (sign.sealObject) {
			let signSvg = new SignatureElement(this.ofdDocument, this.pageData, sign)
			let signView = signSvg.getContainerSvg()
			signView.setAttribute("ID", "SIGN_VIEW")
			pageContainer.appendChild(signView)
		}
	}

	// 渲染数字签名层
	#renderSignatures(pageData: XmlData, pageContainer: Element) {
		let signList = pageData.signList
		if (signList && signList.length > 0) {
			// 包含签名文件
			for (let i = 0; i < signList.length; i++) {
				let sign = signList[i] // 单个签名的数据
				this.#renderSingleStampAnot(sign, pageContainer)
			}
		}
	}

	// 渲染注释层
	#renderAnnotLayer(pageData: XmlData, pageContainer: HTMLDivElement) {
		if (pageData.annots) {
			console.log("render annot layer", pageData)
			const annotationElement = new OfdAnnotationElement(this.ofdDocument, pageData, pageContainer);
			// 注释层通常应该放在最上层
			annotationElement.render()
		} else {
			console.log("该页面没有注释数据");
		}
	}
}
