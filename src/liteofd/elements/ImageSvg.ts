import { BaseSvg } from "./BaseSvg"
import { XmlData } from "../ofdData"
import * as parser from "../parser"
import { AttributeKey, OFD_KEY } from "../attrType"
import { OfdDocument } from "../ofdDocument"
import PromiseCapability from "../promiseCapability"

/**
 * 图像组件
 */
export class ImageSvg extends BaseSvg {

	private nodeData: XmlData // 最外层的svg的数据
	private ofdDocument: OfdDocument // 能拿到图片资源的公共资源数据节点
	private svgContainer: SVGElement // svg的包裹的，每个组件都有一个svg包裹，比如path带有一个，而text则是svg包裹text，然后text包裹tspan这样子
	private svgContainerStyle = "position: absolute;overflow: visible;" // 外层svg的style
	private boundaryBox: {
		x: number,
		y: number,
		width: number,
		height: number,
	}
	private imageId = "" // 组件的id
	private mediaNodeList: XmlData[] // 多媒体节点的数组

	// 初始化传入xmldata构建一个path的数据
	constructor(ofdDocument: OfdDocument, nodeData: XmlData) {
		super()
		this.ofdDocument = ofdDocument
		this.nodeData = nodeData
		this.imageId = parser.findAttributeValueByKey(nodeData, AttributeKey.ID)
		if (ofdDocument.mediaFileList) {
			this.mediaNodeList = ofdDocument.mediaFileList
		} else {
			this.mediaNodeList = parser.findNodeListByTagName(this.ofdDocument.documentRes, OFD_KEY.MultiMedia)
			ofdDocument.mediaFileList = this.mediaNodeList
		}

		this.#initSvgElement()
	}

	// 添加boundary范围
	#addBoundary(node: XmlData) {
		let boundaryStr = parser.findAttributeValueByKey(node, AttributeKey.Boundary)
		if (boundaryStr) {
			this.boundaryBox = this.ofdDocument.convertToBox(boundaryStr)

			let svgStyle = `left: ${this.boundaryBox.x}px;top: ${this.boundaryBox.y}px;
	width: ${this.boundaryBox.width}px;height: ${this.boundaryBox.height}px;`
			this.svgContainerStyle += svgStyle
		}
	}

	// 给pathsvg添加ctm矩阵
	#addCTM(nodeData: XmlData, eleSvg: SVGImageElement) {
		let ctmStr = parser.findAttributeValueByKey(nodeData, AttributeKey.CTM)
		let ctms = ctmStr.split(" ")

		if ( ctmStr ) {
			ctms[0] = this.ofdDocument.convertToDpi(ctms[0]) / this.boundaryBox.width
			ctms[1] = this.ofdDocument.convertToDpi(ctms[1]) / this.boundaryBox.width
			ctms[2] = this.ofdDocument.convertToDpi(ctms[2]) / this.boundaryBox.height
			ctms[3] = this.ofdDocument.convertToDpi(ctms[3]) / this.boundaryBox.height
			ctms[4] = this.ofdDocument.convertToDpi(ctms[4])
			ctms[5] = this.ofdDocument.convertToDpi(ctms[5])
			eleSvg.setAttribute('transform', `matrix(${ctms[0]} ${ctms[1]} ${ctms[2]} ${ctms[3]} ${ctms[4]} ${ctms[5]})`)
		}
	}

	#addImageHref(imgData: string, eleSvg: SVGImageElement) {
		if (imgData) {
			eleSvg.setAttribute("xlink:href", imgData)
			eleSvg.setAttribute("href", imgData)
		}
	}

	async #addImageSvg(nodeData: XmlData, eleSvg: SVGImageElement) {
		// 添加图片比例属性
		eleSvg.setAttribute('preserveAspectRatio', `none`);
		// 增加image的大小
		eleSvg.setAttribute("width", this.boundaryBox.width + "px")
		eleSvg.setAttribute("height", this.boundaryBox.height+ "px")
		let filePromise = this.#findImageMediaData(nodeData)
		if (filePromise) {
			let imgData = await filePromise.promise
			imgData && this.#addImageHref(<string>imgData, eleSvg)
		}
		return eleSvg
	}

	async #addImageSvgAsync(nodeData: XmlData, svg: SVGSVGElement){
		let eleSvg = document.createElementNS('http://www.w3.org/2000/svg', 'image')
		this.#addSvgIDAndZIndex(nodeData, svg)
		// 添加矩阵变换
		this.#addCTM(this.nodeData, eleSvg)
		// svg下面添加path
		this.#addImageSvg(nodeData, eleSvg)
		this.#addImageSvgStyle(nodeData, eleSvg)
		svg.appendChild(eleSvg)
	}

	#addImageSvgStyle(nodeData: XmlData, eleSvg: SVGImageElement) {
		let alpha = parser.findAttributeValueByKey(nodeData, AttributeKey.Alpha)
		let imageStyle = ""
		if (alpha && parseFloat(alpha) > 0) {
			imageStyle += `opacity: ${parseFloat(alpha) / 255};`
		}
		eleSvg.setAttribute("style", imageStyle)
	}

	createContainerSvg(): SVGElement {
		let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		svg.setAttribute('version', '1.1')
		this.svgContainer = svg
		// 添加外层的boundary
		this.#addBoundary(this.nodeData)

		this.#addImageSvgAsync(this.nodeData, svg)
		return svg

	}

	getContainerSvg(): SVGElement {
		return this.svgContainer
	}

	#initSvgElement() {
		this.createContainerSvg()
		this.svgContainer.setAttribute("style", this.svgContainerStyle)
	}

	#addSvgIDAndZIndex(nodeData: XmlData, svg: SVGSVGElement) {
		let svgID = parser.findAttributeValueByKey(nodeData, AttributeKey.ID)
		if (svgID) {
			svg.setAttribute("SVG_ID", svgID)
			this.svgContainerStyle += `z-index: ${svgID};`
		}
	}

	/**
	 * 加载图片数据
	 * @param imgNode 图片的节点数据
	 * @private
	 */
	#loadImageSourceData(imgNode: XmlData): PromiseCapability {
		let imgName = imgNode.value
		let upperCaseImgName = imgName.toUpperCase() // 这里默认名字是唯一表示图片资源的
		let loadedPromise = new PromiseCapability()
		// 查看是否已经加载
		if(this.ofdDocument.loadedMediaFile.has(upperCaseImgName)) {
			let imgData = this.ofdDocument.loadedMediaFile.get(upperCaseImgName)
			loadedPromise.resolve(imgData)
		} else {
			let keys = Object.keys(this.ofdDocument.files)
			for (let i = 0; i < keys.length; i++) {
				let upperCaseKey = keys[i].toUpperCase()
				if (upperCaseKey.indexOf(upperCaseImgName) >= 0) {
					let fileData = this.ofdDocument.files[keys[i]]
					fileData.async("base64")
						.then((bytes: string) => {
							const imgBase64 = 'data:image/png;base64,' + bytes;
							this.ofdDocument.loadedMediaFile.set(upperCaseImgName, imgBase64)
							loadedPromise.resolve(imgBase64)
						})
						.catch((err: any) => {
							loadedPromise.reject(err)
						})
					break;
				}
			}
		}

		return loadedPromise
	}

	/**
	 * 加载图片数据
	 * @param nodeData
	 * @private
	 */
	#findImageMediaData(nodeData: XmlData): PromiseCapability | null {
		let imgResourceID = parser.findAttributeValueByKey(nodeData, AttributeKey.ResourceID)
		if (imgResourceID) {
			let mediaNodeRoot = this.mediaNodeList[0]
			if (mediaNodeRoot) {
				let firstMediaNode = mediaNodeRoot.children[0]
				let isSingle = isNaN(Number(firstMediaNode.tagName))
				let tempNodeList = []
				if (isSingle) {
					tempNodeList = [mediaNodeRoot]
				} else {
					tempNodeList = mediaNodeRoot.children
				}

				for (let i = 0; i < tempNodeList.length; i++) {
					let mediaNode = tempNodeList[i]
					let mediaId = parser.findAttributeValueByKey(mediaNode, AttributeKey.ID)
					if (imgResourceID === mediaId) {
						// 拿到图片数据
						let mediaFileNode = parser.findValueByTagName(mediaNode, OFD_KEY.MediaFile)
						if (mediaFileNode) {
							let mediaFilePromise = this.#loadImageSourceData(mediaFileNode)
							return mediaFilePromise
						}
					}
				}
			}
		}
		return null
	}
}
