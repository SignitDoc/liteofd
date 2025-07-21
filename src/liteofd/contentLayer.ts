/**
 * 内容层的渲染
 */
import Layer from "./layer"
import { OfdDocument } from "./ofdDocument"
import { OFD_KEY } from "./attrType"
import * as parser from "./parser"
import { XmlData } from "./ofdData"
import { PathSvg } from "./elements/PathSvg"
import { TextSvg } from "./elements/TextSvg"
import { ImageSvg } from "./elements/ImageSvg"
import { rendererConfig } from "./rendererConfig"

export class ContentLayer extends Layer {
	private ofdDocument: OfdDocument
	private setDefaultZOrder = false // 是否使用默认的zorder的值设置zindex
	private defaultZorderValue = -1 // 默认的zindex的值

	constructor(ofdDocument: OfdDocument) {
		super()
		this.ofdDocument = ofdDocument
		this.#initPageContainer()
	}

	renderWithZOrder(pageData: XmlData, pageContainer: Element, zOrder: number) {
		try {
			this.setDefaultZOrder = true
			this.defaultZorderValue = zOrder
			this.render(pageData, pageContainer)
		} catch (e) {
			console.log("render page content error", e, pageData)
			return null
		}
	}

	render(pageData: XmlData, pageContainer: Element) {
		try {
			let contentData = parser.findValueByTagName(pageData, OFD_KEY.Content)
			if(contentData) {
				// 渲染内容层
				this.#initPageContainer()
				this.#renderPageContent(contentData, pageContainer)
			}
		} catch (e) {
			console.log("render page content error", e, pageData)
			return null
		}
	}

	// 初始化页面数据
	#initPageContainer() {
		// 目前的页面是pages的第一个开始

	}

	#renderSingleLayer(layerData: XmlData, pageContainer: Element) {
		for (let i = 0; i < layerData.children.length; i++) {
			let dataObj = layerData.children[i]
			this.#renderLayerDataObject(dataObj, pageContainer)
		}
	}

	#renderLayerDataObject(dataObj: XmlData, pageContainer: Element) {
		if (rendererConfig.isCanvasRender()) {
			switch (dataObj.tagName) {
				case OFD_KEY.TextObject:
					this.#renderTextObject(dataObj, pageContainer)
					break
				case OFD_KEY.PageBlock:
					this.#renderPageBlock(dataObj, pageContainer)
					break
			}
		} else {
			switch (dataObj.tagName) {
				case OFD_KEY.TextObject:
					this.#renderTextObject(dataObj, pageContainer)
					break
				case OFD_KEY.PathObject:
					this.#renderPathObject(dataObj, pageContainer)
					break
				case OFD_KEY.ImageObject:
					this.#renderImageObject(dataObj, pageContainer)
					break
				case OFD_KEY.PageBlock:
					this.#renderPageBlock(dataObj, pageContainer)
					break
			}
		}
	}

	/**
	 * 渲染页面块
	 * @param dataObj 页面块的数据
	 * @param pageContainer 页面容器
	 * @private
	 */
	#renderPageBlock(dataObj: XmlData, pageContainer: Element) {
		if (dataObj.children && dataObj.children.length > 0) {
			for (let i = 0; i < dataObj.children.length; i++) {
				const childObj = dataObj.children[i].children[0];
				this.#renderLayerDataObject(childObj, pageContainer);
			}
		} else {
			console.log('PageBlock没有子元素');
		}
	}

	#renderLayer(layerData: XmlData, pageContainer: Element) {
		let layers = layerData.children
		for (let i = 0; i < layers.length; i++) {
			this.#renderSingleLayer(layers[i], pageContainer)
		}

	}

	/**
	 * 渲染content的内容
	 * TODO 渲染每个页面应该做成一个promise来控制，这样能够控制真正渲染的页面数，而不至于一次所有的都渲染了
	 * @param contentData 页面的content的数据
	 * @private
	 */
	#renderPageContent(contentData: XmlData, pageContainer: Element) {
		let layers = contentData.children
		for (let i = 0; i < layers.length; i++) {
			let layer = layers[i]
			this.#renderLayer(layer, pageContainer)
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

	#renderSingleTextObject(nodeData: XmlData, pageContainer: Element) {
		// path的路径的绘制的对象
		let svgEle = new TextSvg(this.ofdDocument, nodeData)
		let nodeEle = svgEle.getContainerSvg()


		// let nodeEle = renderText(nodeData, this.ofdDocument)
		if (this.setDefaultZOrder) {
			let newStyle = nodeEle.getAttribute("style") + `z-index: ${this.defaultZorderValue}`
			nodeEle.setAttribute("style", newStyle)
		}
		pageContainer.appendChild(nodeEle)
	}

	/**
	 * 判断是否多子节点，因为xml会使得下面的节点合并为一个，所以单个和多个不一样
	 * @private
	 */
	#isMultiNode(nodeObjs: XmlData){
		return nodeObjs.attrsMap.size > 0
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

	#renderSingleImageObject(nodeData: XmlData, pageContainer: Element) {
		// path的路径的绘制的对象
		let pathSvgEle = new ImageSvg(this.ofdDocument, nodeData)
		let nodeEle = pathSvgEle.getContainerSvg()
		if (this.setDefaultZOrder) {
			let newStyle = nodeEle.getAttribute("style") + `;z-index: ${this.defaultZorderValue}`
			nodeEle.setAttribute("style", newStyle)
		}
		pageContainer.appendChild(nodeEle)
	}

	/**
	 * 绘制图像
	 * @param nodeObjs
	 * @param pageContainer
	 * @private
	 */
	#renderImageObject(nodeObjs: XmlData, pageContainer: Element) {
		// 多个path
		for (let i = 0; i < nodeObjs.children.length; i++) {
			let nodeData = nodeObjs.children[i]
			this.#renderSingleImageObject(nodeData, pageContainer)
		}
	}

	#renderSingplePathObject(nodeData: XmlData, pageContainer: Element) {
		// path的路径的绘制的对象
		let pathSvgEle = new PathSvg(this.ofdDocument, nodeData)
		let nodeEle = pathSvgEle.getContainerSvg()
		if (this.setDefaultZOrder) {
			let newStyle = nodeEle.getAttribute("style") + `;z-index: ${this.defaultZorderValue}`
			nodeEle.setAttribute("style", newStyle)
		}
		pageContainer.appendChild(nodeEle)
	}
}
