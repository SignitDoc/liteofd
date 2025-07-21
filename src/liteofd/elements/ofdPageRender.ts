import { ContentLayer } from "../contentLayer"
import { XmlData } from "../ofdData"
import PromiseCapability from "../promiseCapability"
import { OFD_KEY } from "../attrType"
import { OfdDocument } from "../ofdDocument"
import { CanvasContentLayer } from "../canvasContentLayer"
import { rendererConfig } from "../rendererConfig"


/**
 * ofd的页面渲染，包含内容，模板层，签名层等
 */
export class OfdPageRender {
	private contentLayer!: ContentLayer // 使用svg进行绘制内容层
	private canvasContentLayer: CanvasContentLayer | null = null // 使用canvas进行绘制内容层
	private ofdPage: XmlData // 页面数据，包含签名数据
	private readonly renderPromise: PromiseCapability<any>
	private ofdDocument: OfdDocument
	private pageContainer!: HTMLDivElement
	private pageCanvas!: HTMLCanvasElement


	constructor(ofdDocument: OfdDocument, ofdPage: XmlData) {
		this.ofdPage = ofdPage
		this.ofdDocument = ofdDocument
		this.renderPromise = new PromiseCapability()
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

	// 使用canvas进行绘制渲染
	#renderCanvasContentLayer(pageData: XmlData, pageContainer: Element, zOrder: number = 0) {
		console.log("create canvas content layer 1")
		this.canvasContentLayer?.render(pageData, pageContainer)
	}

	render(container: HTMLDivElement, canvasContentLayer: CanvasContentLayer | null = null, pageCanvas: HTMLCanvasElement) {
		this.pageContainer = container
		this.pageCanvas = pageCanvas
		if (!canvasContentLayer) {
			this.canvasContentLayer = canvasContentLayer
		} else {
			this.canvasContentLayer = new CanvasContentLayer(this.ofdDocument, this.pageContainer, this.pageCanvas)
		}
		this.#render()
		// 开始进行渲染
		return this.renderPromise
	}

	/**
	 * 渲染页面
	 * 此方法使用setTimeout来异步执行渲染过程，以避免阻塞主线程
	 * 它会遍历ofdPage的子元素，找到Page标签，然后调用#renderLayers方法进行实际的渲染
	 * 渲染完成后，会resolve renderPromise，如果出现错误则reject
	 */
	#render(){
		setTimeout(() => {
			try {
				// 遍历ofdPage的子元素，找到Page标签，然后调用#renderLayers方法进行实际的渲染
				const pageData = Array.from(this.ofdPage.children).find(child => child.tagName === OFD_KEY.Page) as XmlData
				if (!pageData) throw new Error("Page data not found")
				// 渲染页面
				this.#renderLayers(pageData, this.pageContainer)
				this.renderPromise.resolve(this.ofdPage)
			} catch (e) {
				this.renderPromise.reject(e)
			}
		}, 10)
	}

	/**
	 * 渲染页面
	 */
	#renderLayers(pageData: XmlData, pageContainer: HTMLDivElement) {
		console.log("content render type", rendererConfig.isCanvasRender(), pageData, pageContainer)
		// canvas绘制内容
		this.#renderCanvasContentLayer(pageData, pageContainer)
		// div绘制文字层，进行选择
		this.#renderContentLayer(pageData, pageContainer)

		// 渲染内容层
		// if (rendererConfig.isCanvasRender()) {
		// 	this.#renderCanvasContentLayer(pageData, pageContainer)
		// } else {
		// 	this.#renderContentLayer(pageData, pageContainer)
		// }
	}
}
