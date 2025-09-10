import { OfdDocument } from "./ofdDocument"
import { OfdRender } from "./ofdRender"
import * as parser from "./parser"
import { OfdWriter } from "./ofdWriter"
import { XmlData } from "./ofdData"
import * as ofdActions from "./ofdActions"
import { loadLocalDefaultFonts } from "./ofdFont"
import { ConfigUI } from "../config/configUI"
import { ConfigManager } from "../config/configManager"

/**
 * LiteOfd 类是一个用于处理 OFD 文件的轻量级库。
 * 它提供了渲染、导航、缩放、解析和保存 OFD 文档的功能。
 */
export default class LiteOfd {
  private ofdDocument: OfdDocument
  private ofdRender: OfdRender | null = null
  private currentScale: number = 1
  private configUI: ConfigUI | null = null
  private containerDiv: HTMLDivElement
  private renderTextLayer: boolean = true

  constructor() {
    this.ofdDocument = new OfdDocument()
  }

  /**
   * 渲染 OFD 文档
   * @param container 可选的自定义容器
   * @param pageWrapStyle 可选的页面包装样式
   * @param pageIndexes 指定渲染的页面索引数组，可选
   * @param scrollListener 自定义的滑动
   * @returns 渲染后的 HTMLDivElement
   */
  render(container?: HTMLDivElement, pageWrapStyle?: string, pageIndexes?: number[], scrollListener?: HTMLDivElement): HTMLDivElement {
    this.ofdRender = new OfdRender(this.ofdDocument)
    const containerDiv = container || document.createElement('div')
    containerDiv.setAttribute("class", "pages-container")
    this.containerDiv = containerDiv
    return this.ofdRender.renderOfdWithCustomDiv(containerDiv, pageWrapStyle, pageIndexes, scrollListener)
  }

  /**
   * 渲染对应页面
   * @param pageIndex 页面位置
   */
  renderPage(pageIndex: number, pageWrapStyle?: string){
    this.ofdRender = new OfdRender(this.ofdDocument)
    const containerDiv = document.createElement('div')
    this.ofdRender.renderOfdWithPageIndexWithScale(pageIndex, containerDiv, pageWrapStyle, 2)
    return containerDiv
  }

  /**
   * 是否liteofd渲染文本选择层，默认开启正常渲染，关闭则是缩略图层的渲染
   * @param renderTextLayer 渲染文本曾开关
   */
  toggleRenderTextLayer(renderTextLayer: boolean){
    this.renderTextLayer = renderTextLayer
  }

  /**
   * 获取当前页码
   */
  get currentPage(): number {
    return this.ofdRender?.currentPageIndex || 1
  }

  /**
   * 获取总页数
   */
  get totalPages(): number {
    return this.ofdDocument.pages?.length || 0
  }

  /**
   * 跳转到指定页面
   * @param pageIndex 目标页码
   */
  goToPage(pageIndex: number): void {
    if (!this.ofdRender) return

    let targetPage = Math.max(1, Math.min(pageIndex, this.totalPages))
    this.ofdRender.currentPageIndex = targetPage

    const pageId = `ofd-page-${targetPage}`
    const pageElement = document.getElementById(pageId)
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth' })
    }
    // 创建并分发自定义事件
    const event = new CustomEvent('ofdPageChange', {
      detail: { pageIndex: pageIndex, pageId: pageId }
    });
    window.dispatchEvent(event);
  }

  /**
   * 跳转到下一页
   */
  nextPage(): void {
    this.goToPage(this.currentPage + 1)
  }

  /**
   * 跳转到上一页
   */
  prevPage(): void {
    this.goToPage(this.currentPage - 1)
  }

  /**
   * 缩放文档
   * @param scale 缩放比例（0.1 到 5 之间）
   */
  zoom(scale: number): void {
    if (this.ofdRender) {
      const newScale = Math.max(0.1, Math.min(scale, 5))
      this.ofdRender.applyZoom(this.ofdRender.rootContainer, newScale)
      this.currentScale = newScale
    }
  }

    /**
   * 放大文档
   * @param step 放大步长，默认为 0.1
   */
	zoomIn(step: number = 0.1): void {
		this.zoom(this.currentScale + step)
	  }

	  /**
	   * 缩小文档
	   * @param step 缩小步长，默认为 0.1
	   */
	  zoomOut(step: number = 0.1): void {
		this.zoom(this.currentScale - step)
	  }

	    /**
   * 重置缩放到默认比例
   */
  resetZoom(): void {
	this.currentScale = 1
    this.zoom(this.currentScale)
  }

  /**
   * 解析 OFD 文件
   * @param file OFD 文件（可以是文件路径、File 对象或 ArrayBuffer）
   * @returns Promise<OfdDocument>
   */
  async parse(file: string | File | ArrayBuffer): Promise<OfdDocument> {
    try {
      // 添加本地的simSun等字体
      await loadLocalDefaultFonts()
      this.ofdDocument = await parser.parseOFDFile(file).promise
      this.ofdDocument.renderTextLayer = this.renderTextLayer
      return this.ofdDocument
    } catch (e) {
      console.error("解析文件错误", e)
      throw e
    }
  }

  /**
   * 保存 OFD 文档
   * @param path 保存路径
   */
  save(path: string): void {
    new OfdWriter(this.ofdDocument).saveTo(path)
  }

  /**
   * 获取文档内容
   * @param page 可选的页码，如果不指定则获取全部内容
   * @returns 文档内容文本
   */
  getContent(page?: number): string {
    return this.ofdDocument.getContentText(page || null)
  }

  /**
   * 搜索文档内容
   * @param keyword 搜索关键词
   */
  search(keyword: string): void {
    // TODO: 实现搜索功能
  }

  /**
   * 执行 OFD 文档中的动作
   * @param action 动作数据
   */
  executeAction(action: XmlData): void {
    ofdActions.executeAction(this, this.ofdDocument, action)
  }

  /**
   * 获取OFD文档对象
   * @returns OfdDocument 当前的OFD文档对象
   */
  getOfdDocument(): OfdDocument {
    if (!this.ofdDocument) {
      throw new Error('OFD文档尚未解析，请先调用parse方法');
    }
    return this.ofdDocument;
  }

  /**
   * 显示配置UI
   * @param container 可选的容器元素，默认为document.body
   */
  showConfigUI(container?: HTMLElement): void {
    if (!this.configUI) {
      this.configUI = new ConfigUI()
      this.configUI.createConfigUI(container || document.body)
    } else {
      this.configUI.show()
    }
  }

  getConfigManager(): ConfigManager {
    return ConfigManager.getInstance()
  }

  /**
   * 隐藏配置UI
   */
  hideConfigUI(): void {
    if (this.configUI) {
      this.configUI.hide()
    }
  }

  /**
   * 切换配置UI显示状态
   */
  toggleConfigUI(container?: HTMLElement): void {
    if (!this.configUI) {
      this.showConfigUI(container)
    } else {
      this.configUI.toggle()
    }
  }

  getContainer() {
    return this.containerDiv
  }

  /**
   * 销毁配置UI
   */
  destroyConfigUI(): void {
    if (this.configUI) {
      this.configUI.destroy()
      this.configUI = null
    }
  }
}
