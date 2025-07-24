import * as parser from "./parser"
import { AttributeKey, OFD_KEY } from "./attrType"
import { XmlData } from "./ofdData"

/**
 * ofd的文档数据，解析之后的
 */
export class OfdDocument {

	files: any // ofd解析出来的所有文件，也就是zip解压缩之后的原始文件，包含了文件路径
	data: any = null // 解析的ofd的数据，xmldata
	pages: XmlData[] = []// ofd的页面数据
	ofdXml: XmlData = new XmlData() // OFD.xml文件
	documentData: XmlData = new XmlData() // document.xml文件
	publicRes: XmlData = new XmlData() // publicres.xml文件
	documentRes: XmlData = new XmlData() // documentRes.xml文件
	rootContainer: Element = document.createElement("div") // 根的容器
	loadedMediaFile: Map<string, any> // 已经加载了的资源图片/包括图片等
	mediaFileList: any // 多媒体文件列表
	signatures: XmlData = new XmlData() // 签名数据，这个是signatures.xml文件的数据
	signatureList: XmlData[] = [] // 签名数据列表，包含了signatures.xml里面所有签名组成的xmldata的数组
	outlines: XmlData = new XmlData() // 大纲数据列表，包含了ofd:Outlines里面所有大纲数据
	annots: XmlData = new XmlData() // 注释数据列表，包含了ofd:Annotations
	isTextLayer: boolean = true // 是否是textlayer层，textlayer层的text使用div和span进行文字渲染

	constructor() {
		this.loadedMediaFile = new Map()
	}

	/**
	 * 获取内容中最大的id和最小的id
	 */
	getMaxAndMinContentIDByPage(pageIndex: number){
		let min = -1
		let max = 9999
		if (this.pages && this.pages.length > pageIndex) {
			let currentPage = this.pages[pageIndex]
			this.#getNodeAttributeMaxID(currentPage, max, min)
			console.log("find id max and min", max, min)
		}

		return {min, max}
	}

	#getNodeAttributeMaxID(node: XmlData, maxID: number, min: number){
		let currentID = parser.findAttributeValueByKey(node, AttributeKey.ID)
		if (currentID) {
			let idValue = parseInt(currentID)
			if (idValue > maxID) {
				maxID = idValue
			}
			if (min > idValue){
				min = idValue
			}
		}
		if (node.children && node.children.length > 0) {
			for (let i = 0; i < node.children.length; i++) {
				let tempNode = node.children[i]
				this.#getNodeAttributeMaxID(tempNode, maxID, min)
			}
		}
	}

	#getNodeAttributeMinID(node: XmlData){

	}

	getMinContentID(){

	}

	/**
	 * 获取内容文本
	 * @param page 页码，如果为null，则获取全部文本
	 * @returns
	 */
	getContentText(page: number | null) {
		if(page == null){
			// 获取全部文本
			return this.getAllContentText()
		} else {
			// 获取指定页面全部文本
			return this.getContentTextByPageByIndex(page)
		}
	}

	private getAllContentText(){
		let content = ""
		this.pages.forEach(page => {
			content += this.getContentTextByPageByData(page)
		})
		return content
	}

	private getContentTextByPageByIndex(pageIndex: number){
		let page = this.pages[pageIndex - 1]
		return this.getContentTextByPageByData(page)
	}

	private getContentTextByPageByData(page: XmlData){
		let content = ""
		let textCodeList = parser.findAllNodesByTagName(page, OFD_KEY.TextCode)
		console.log("textCodeList", textCodeList)
		textCodeList.forEach(textCode => {
			content += textCode.value
		})

		return content
	}
}
