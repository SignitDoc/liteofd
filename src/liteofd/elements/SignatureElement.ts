import { XmlData } from "../ofdData"
import * as parser from "../parser"
import { AttributeKey, OFD_KEY } from "../attrType"
import { convertToBox, convertToDpi } from "../utils/utils"
import { OfdDocument } from "../ofdDocument"
import PromiseCapability from "../promiseCapability"
import { OfdRender } from "../ofdRender"

/**
 * 签名组件
 */
export class SignatureElement {

	private nodeData: XmlData // 最外层的svg的数据
	private ofdPage: XmlData // 当前签名所对应的页面数据
	private ofdDocument: OfdDocument // 能拿到图片资源的公共资源数据节点
	private viewContainer: HTMLDivElement | SVGSVGElement // svg的包裹的，每个组件都有一个svg包裹，比如path带有一个，而text则是svg包裹text，然后text包裹tspan这样子
	private viewContainerStyle = "position: absolute;overflow: visible; cursor: pointer;" // 外层的style
	private boundaryBox: {
		x: number,
		y: number,
		width: number,
		height: number,
	}
	private signZIndex = 999 // 最高的
	private mediaNodeList: XmlData[] // 多媒体节点的数组
	private sealObject: any // 签名数据

	// 初始化传入xmldata构建一个path的数据
	constructor(ofdDocument: OfdDocument, ofdPage: XmlData, nodeData: XmlData) {
		this.ofdPage = ofdPage
		this.ofdDocument = ofdDocument
		this.nodeData = nodeData
		this.sealObject = nodeData.sealObject

		if (this.sealObject) {
			this.initViewContainer()
			this.addClickListener()
		}
	}

	private initViewContainer() {
		if (this.sealObject.type === "ofd") {
			this.#addOFDSignature(this.nodeData.sealData)
		} else if (this.sealObject.type === "png") {
			this.#addImageSvgAsync(this.nodeData)
		}
	}

	/**
	 * 渲染签章
	 * @param ofdDocument 对于ofd类型的签名，需要渲染ofd文件
	 * @private
	 */
	#addOFDSignature(ofdDocument: OfdDocument){
		console.log("render signature ", ofdDocument)
		ofdDocument.isTextLayer = false
		// 包含签名数据
		this.viewContainer = document.createElement("div")
		this.#addSvgIDAndZIndex()
		this.#addBoundary(this.nodeData)
		this.viewContainer.setAttribute("name", "seal_img_div")
		let sesSignature = this.sealObject.SES_Signature
		let signedInfo = this.sealObject
		// this.viewContainer.setAttribute('data-ses-signature', `${JSON.stringify(sesSignature)}`)
		// this.viewContainer.setAttribute('data-signed-info', `${JSON.stringify(signedInfo)}`)
		this.viewContainer.setAttribute("style", this.viewContainerStyle)

		// 渲染ofddocument
		let sealRootContainer = document.createElement("div")
		let sealRender = new OfdRender(ofdDocument)
		sealRender.render(sealRootContainer, null)
		this.viewContainer.appendChild(sealRootContainer)
	}

	// 添加boundary范围
	#addBoundary(node: XmlData) {
		// 每个对应的是一个数组
		let stampAnnotList = parser.findValueByTagName(node, OFD_KEY.StampAnnot)
		for (let i = 0; i < stampAnnotList.children.length; i++) {
			let tempData = stampAnnotList.children[i]
			let pageRefId = parser.findAttributeValueByKey(tempData, AttributeKey.PageRef)
			if (pageRefId === this.ofdPage.id) {
				// 查找到页面对应的签名引用
				let boundaryStr = parser.findAttributeValueByKey(tempData, AttributeKey.Boundary)
				if (boundaryStr) {
					this.boundaryBox = convertToBox(boundaryStr)
					node.boundaryBox = this.boundaryBox

					let svgStyle = `left: ${this.boundaryBox.x}px;top: ${this.boundaryBox.y}px;
	width: ${this.boundaryBox.width}px;height: ${this.boundaryBox.height}px;`
					this.viewContainerStyle += svgStyle
				}
				let clip = parser.findAttributeValueByKey(tempData, AttributeKey.Clip)
				if (clip) {
					let clipBox = convertToBox(clip)
					let clipStyle =	`clip: rect(${clipBox.y}px, ${clipBox.width + clipBox.x}px, ${clipBox.height + clipBox.y}px, ${clipBox.x}px);`
					this.viewContainerStyle += clipStyle
				}
				return
			}
		}

	}

	#addImageHref(imgData: string, eleSvg: SVGImageElement) {
		if (imgData) {
			eleSvg.setAttribute("xlink:href", imgData)
			eleSvg.setAttribute("href", imgData)
		}
	}

	async #addImageSvgAsync(nodeData: XmlData){
		// 包含签名数据
		this.viewContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		this.#addSvgIDAndZIndex()
		this.#addBoundary(this.nodeData)
		this.viewContainer.setAttribute("name", "seal_img_div")
		let sesSignature = this.sealObject.SES_Signature
		let signedInfo = this.sealObject
		// this.viewContainer.setAttribute('data-ses-signature', `${JSON.stringify(sesSignature)}`)
		// this.viewContainer.setAttribute('data-signed-info', `${JSON.stringify(signedInfo)}`)
		this.viewContainer.setAttribute("style", this.viewContainerStyle)

		let imgData = nodeData.sealData
		let img = document.createElementNS('http://www.w3.org/2000/svg', 'image')
		img.setAttribute("href", imgData)
		img.setAttribute("xlink:href", imgData)
		img.setAttribute('preserveAspectRatio', `none`);
		img.setAttribute("width", `${this.boundaryBox.width}px`)
		img.setAttribute("height", `${this.boundaryBox.height}px`)
		img.setAttribute("opacity", "1")

		this.viewContainer.appendChild(img)
	}

	getContainerSvg(): HTMLDivElement | SVGSVGElement {
		return this.viewContainer
	}

	#addSvgIDAndZIndex() {
		this.viewContainerStyle += `z-index: ${this.signZIndex};`
	}

	/**
	 * 加载图片数据
	 * @param imgNode 图片的节点数据
	 * @private
	 */
	#loadImageSourceData(imgNode: XmlData): PromiseCapability<string> {
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
						.then(bytes => {
							const imgBase64 = 'data:image/png;base64,' + bytes;
							this.ofdDocument.loadedMediaFile.set(upperCaseImgName, imgBase64)
							loadedPromise.resolve(imgBase64)
						})
						.catch(err => {
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
	#findImageMediaData(nodeData: XmlData): PromiseCapability<string> | null {
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

	private addClickListener() {
		if (this.viewContainer) {
			this.viewContainer.addEventListener('click', (event) => {
				event.stopPropagation() // 阻止事件冒泡
				const customEvent = new CustomEvent('signature-element-click', {
					detail: {
						nodeData: this.nodeData,
						sealObject: this.sealObject,
						boundaryBox: this.boundaryBox,
						page: this.ofdPage
					},
					bubbles: true,
					cancelable: true
				})
				this.viewContainer.dispatchEvent(customEvent)
			})
		}
	}
}
