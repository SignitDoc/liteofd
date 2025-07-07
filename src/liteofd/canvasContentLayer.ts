import Layer from "./layer"
import { XmlData } from "./ofdData"
import { OfdDocument } from "./ofdDocument"
import * as parser from "./parser"
import { OFD_KEY } from "./attrType"

// 使用canvas进行绘制界面
export class CanvasContentLayer extends Layer {

	private ofdDocument: OfdDocument
	private setDefaultZOrder = false // 是否使用默认的zorder的值设置zindex
	private defaultZorderValue = -1 // 默认的zindex的值

	constructor(ofdDocument: OfdDocument) {
		super()
		this.ofdDocument = ofdDocument
		this.#initPageContainer()
	}

	// 初始化页面数据
	#initPageContainer() {
		// 目前的页面是pages的第一个开始

	}

	#renderPageContent(contentData: XmlData, pageContainer: Element) {
		console.log("canvas render data", contentData, pageContainer)
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

}
