import { XmlData } from "./ofdData"
import { OfdDocument } from "./ofdDocument"
import * as parser from "./parser"
import { AttributeKey, OFD_KEY } from "./attrType"
import { convertToBox, convertToDpi } from "./utils/utils"
import PromiseCapability from "./promiseCapability"
import { ConfigManager } from "../config/configManager"

// 图片渲染器类
export class ImageRenderer {
	private ofdDocument: OfdDocument
	private pageCanvasCtx: CanvasRenderingContext2D
	private mediaFileList: XmlData[] // 多媒体节点的数组
	private configManager: ConfigManager

	constructor(ofdDocument: OfdDocument, pageCanvasCtx: CanvasRenderingContext2D) {
		this.ofdDocument = ofdDocument
		this.pageCanvasCtx = pageCanvasCtx
		this.configManager = ConfigManager.getInstance()
		if (ofdDocument.mediaFileList) {
			this.mediaFileList = ofdDocument.mediaFileList
		} else {
			this.mediaFileList = parser.findNodeListByTagName(this.ofdDocument.documentRes, OFD_KEY.MultiMedia)
			ofdDocument.mediaFileList = this.mediaFileList
		}
	}

	/**
	 * 渲染图片对象
	 * @param nodeObjs 图片对象数据
	 * @param pageContainer 页面容器
	 */
	renderImageObject(nodeObjs: XmlData, pageContainer: Element) {
		// 多个图片子节点
		for (let i = 0; i < nodeObjs.children.length; i++) {
			let nodeData = nodeObjs.children[i]
			this.renderSingleImageObject(nodeData, pageContainer)
		}
	}

	/**
	 * 渲染单个图片对象
	 * @param nodeData 单个图片节点数据
	 * @param pageContainer 页面容器
	 */
	private async renderSingleImageObject(nodeData: XmlData, pageContainer: Element) {
		console.log("Canvas绘制图片:", nodeData)

		// 获取图片位置
		let boundaryStr = parser.findAttributeValueByKey(nodeData, AttributeKey.Boundary)
		let boundaryBox: { x: number; y: number; width: number; height: number; } | null = null
		if (boundaryStr) {
			boundaryBox = convertToBox(boundaryStr)
		}

		// 获取图片资源ID
		let imageId = parser.findAttributeValueByKey(nodeData, AttributeKey.ResourceID)
		if (!imageId) {
			console.error("图片资源ID不存在")
			return
		}
		// 绘制图片的boundaryBox边框，用于调试
		// if (boundaryBox) {
		// 	this.drawImageBoundaryBox(boundaryBox)
		// }

		if (boundaryBox) {
			// 先应用CTM变换
			this.applyCTMTransform(nodeData)
			// 在变换后的坐标系中绘制边界框
			// this.drawImageBoundaryBox(boundaryBox)
			// 绘制图片
			this.drawCanvasImage(nodeData, boundaryBox)
		}
	}

	/**
	 * 加载图片数据
	 * @param imgNode 图片的节点数据
	 * @private
	 */
	#loadImageSourceData(imgNode: XmlData): PromiseCapability<string> {
		let imgName = imgNode.value
		let upperCaseImgName = imgName.toUpperCase() // 这里默认名字是唯一表示图片资源的
		let loadedPromise = new PromiseCapability<string>()
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
	#findImageMediaData(nodeData: XmlData): PromiseCapability<string> | null {
		let imgResourceID = parser.findAttributeValueByKey(nodeData, AttributeKey.ResourceID)
		if (imgResourceID) {
			let mediaNodeRoot = this.mediaFileList[0]
			if (mediaNodeRoot) {
				let firstMediaNode = mediaNodeRoot.children[0]
				let isSingle = isNaN(Number(firstMediaNode.tagName))
				let tempNodeList: XmlData[] = []
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

	/**
	 * 绘制canvas图片
	 * @param nodeData 图片资源ID
	 * @param boundaryBox 边界框
	 */
	private async drawCanvasImage(nodeData: XmlData, boundaryBox: { x: number; y: number; width: number; height: number; }) {
		let imageData = await this.#findImageMediaData(nodeData)?.promise
		if (!imageData) {
			console.error("无法获取图片数据:", nodeData)
			return
		}

		// 创建图片对象
		const img = new Image()
		img.onload = () => {
			// 图片加载完成后绘制
			this.pageCanvasCtx.drawImage(
				img,
				boundaryBox.x,
				boundaryBox.y,
				boundaryBox.width,
				boundaryBox.height
			)
		}
		img.onerror = () => {
			console.error("图片加载失败:", nodeData)
		}

		// 设置图片源
		img.src = imageData as string
	}

	/**
	 * 从文档资源中获取图片数据
	 * @param imageId 图片资源ID
	 * @returns 图片数据URL或null
	 */
	private getImageData(imageId: string): string | null {
		debugger
		// 从多媒体资源中查找图片
		let mediaNodeList: XmlData[] = []
		if (this.mediaFileList) {
			mediaNodeList = this.mediaFileList as XmlData[]
		} else {
			mediaNodeList = parser.findNodeListByTagName(this.ofdDocument.documentRes, OFD_KEY.MultiMedia)
			this.mediaFileList = mediaNodeList
		}

		if (mediaNodeList && mediaNodeList.length > 0) {
			let mediaNodeRoot = mediaNodeList[0]
			if (mediaNodeRoot && mediaNodeRoot.children && mediaNodeRoot.children.length > 0) {
				let firstMediaNode = mediaNodeRoot.children[0]
				let isSingle = isNaN(Number(firstMediaNode.tagName))
				let tempNodeList: XmlData[] = []
				if (isSingle) {
					tempNodeList = [mediaNodeRoot]
				} else {
					tempNodeList = mediaNodeRoot.children
				}

				for (let i = 0; i < tempNodeList.length; i++) {
					let mediaNode = tempNodeList[i]
					let mediaId = parser.findAttributeValueByKey(mediaNode, AttributeKey.ID)
					if (imageId === mediaId) {
						// 拿到图片数据
						let mediaFileNode = parser.findValueByTagName(mediaNode, OFD_KEY.MediaFile)
						if (mediaFileNode) {
							return this.loadImageSourceData(mediaFileNode)
						}
					}
				}
			}
		}

		return null
	}

	/**
	 * 加载图片数据
	 * @param imgNode 图片的节点数据
	 * @returns 图片数据URL或null
	 */
	private loadImageSourceData(imgNode: XmlData): string | null {
		let imgName = imgNode.value
		let upperCaseImgName = imgName.toUpperCase() // 这里默认名字是唯一表示图片资源的

		// 查看是否已经加载
		if(this.ofdDocument.loadedMediaFile.has(upperCaseImgName)) {
			return this.ofdDocument.loadedMediaFile.get(upperCaseImgName)
		} else {
			let keys = Object.keys(this.ofdDocument.files)
			for (let i = 0; i < keys.length; i++) {
				let upperCaseKey = keys[i].toUpperCase()
				if (upperCaseKey.indexOf(upperCaseImgName) >= 0) {
					let fileData = this.ofdDocument.files[keys[i]]
					// 同步获取base64数据
					try {
						const bytes = fileData.async("base64")
						const imgBase64 = 'data:image/png;base64,' + bytes
						this.ofdDocument.loadedMediaFile.set(upperCaseImgName, imgBase64)
						return imgBase64
					} catch (err) {
						console.error("图片加载失败:", err)
						return null
					}
				}
			}
		}

		return null
	}

	/**
	 * 应用CTM变换（直接设置当前变换矩阵）
	 * @param nodeData 节点数据
	 */
	private applyCTMTransform(nodeData: XmlData) {
		const ctmStr = parser.findAttributeValueByKey(nodeData, AttributeKey.CTM)
		if (ctmStr) {
			const ctms = ctmStr.split(' ')
			if (ctms.length >= 6) {
				const a = parseFloat(ctms[0])
				const b = parseFloat(ctms[1])
				const c = parseFloat(ctms[2])
				const d = parseFloat(ctms[3])
				const e = convertToDpi(parseFloat(ctms[4]))
				const f = convertToDpi(parseFloat(ctms[5]))
				this.pageCanvasCtx.save()
				this.pageCanvasCtx.setTransform(a, b, c, d, e, f)
			}
		}
	}



	/**
	 * 绘制图片的boundaryBox边框，用于调试
	 * @param boundaryBox 边界框
	 */
	private drawImageBoundaryBox(boundaryBox: { x: number; y: number; width: number; height: number; }) {
		const ctx = this.pageCanvasCtx

		// 保存当前的绘制状态
		ctx.save()

		// 设置边框样式
		ctx.strokeStyle = 'green' // 绿色边框
		ctx.lineWidth = 1
		ctx.setLineDash([4, 4]) // 虚线边框

		// 绘制矩形边框
		ctx.strokeRect(boundaryBox.x, boundaryBox.y, boundaryBox.width, boundaryBox.height)

		// 绘制四个角点
		ctx.fillStyle = 'red'
		ctx.beginPath()
		ctx.arc(boundaryBox.x, boundaryBox.y, 3, 0, 2 * Math.PI) // 左上角
		ctx.arc(boundaryBox.x + boundaryBox.width, boundaryBox.y, 3, 0, 2 * Math.PI) // 右上角
		ctx.arc(boundaryBox.x, boundaryBox.y + boundaryBox.height, 3, 0, 2 * Math.PI) // 左下角
		ctx.arc(boundaryBox.x + boundaryBox.width, boundaryBox.y + boundaryBox.height, 3, 0, 2 * Math.PI) // 右下角
		ctx.fill()

		// 绘制中心点
		ctx.fillStyle = 'blue'
		ctx.beginPath()
		ctx.arc(boundaryBox.x + boundaryBox.width / 2, boundaryBox.y + boundaryBox.height / 2, 2, 0, 2 * Math.PI)
		ctx.fill()

		// 恢复绘制状态
		ctx.restore()

		console.log("绘制图片边界框:", boundaryBox)
	}
}
