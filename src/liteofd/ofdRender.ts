import { XmlData } from "./ofdData"
import { OfdDocument } from "./ofdDocument"
import { OfdPageContainer } from "./elements/ofdPageContainer"
import { setPageScal } from "./utils/utils"
import { AttributeKey } from "./attrType"
import { getDefaultScale } from "./utils/elementUtils"

/**
 * OfdRender 类用于渲染 OFD 文档。
 * 
 * @class OfdRender
 * @property {OfdDocument} ofdDocument - OFD 文档对象
 * @property {XmlData[]} pages - 文档的页面数据
 * @property {HTMLDivElement | null} rootContainer - 整个渲染的根容器
 */
export class OfdRender {
	ofdDocument: OfdDocument
	pages: XmlData[]
	scrollContainer: HTMLDivElement = document.createElement('div') // 滚动容器，用于监听滚动事件
	rootContainer: HTMLDivElement = document.createElement('div') // 整个渲染的根页面，要放置到这个上面来
	currentPageIndex: number = 1; // 当前页面索引

	constructor(ofdDocument: OfdDocument) {
		this.ofdDocument = ofdDocument
		this.pages = this.ofdDocument.pages
	}

	renderOfdWithSize(width: string, height: string, pageWrapStyle: string | null = null): HTMLDivElement {
		// 创建外层容器div
		const containerDiv = document.createElement('div');
		containerDiv.style.cssText = `height: ${height}; width: ${width};`;
		// 设置默认scale
		let scale = getDefaultScale(this.ofdDocument);
		this.renderOfdWithScale(containerDiv, scale, pageWrapStyle);
		return containerDiv
	}

	renderOfd(): HTMLDivElement {
		// 创建外层容器div
		const containerDiv = document.createElement('div');
		// 设置默认scale
		let scale = getDefaultScale(this.ofdDocument);
		let pageWrapStyle = "background-color: #ffffff; margin-bottom: 12px;"
		this.renderOfdWithScale(containerDiv, scale, pageWrapStyle);
		return this.scrollContainer
	}

	renderOfdWithCustomDiv(customDiv: HTMLDivElement, pageWrapStyle: string | null = null) {
		// 获取默认缩放比例
		let scale = getDefaultScale(this.ofdDocument);
		this.renderOfdWithScale(customDiv, scale, pageWrapStyle)
	}

	changeScale(scale: number){
		setPageScal(scale)
	}

	renderOfdWithScale(rootDiv: HTMLDivElement, scale: number, pageWrapStyle: string | null = null) {
		setPageScal(scale)
		// 新建一个根的div来包裹整个渲染的ofd文档的内容
		this.ofdDocument.rootContainer = rootDiv
		this.render(rootDiv, pageWrapStyle)
	}

	render(rootContainer: HTMLDivElement, wrapStyle: string | null) {
		this.rootContainer = rootContainer
		// 渲染页面
		this.#renderPages(rootContainer, wrapStyle)
		// 给scrollContainer添加滑动的css
		this.scrollContainer.style.cssText = `
			overflow-y: auto;
			overflow-x: hidden;
			height: 100%;
			width: 100%;
			scroll-behavior: smooth;
		`;
		this.scrollContainer.appendChild(rootContainer)
		// 渲染完之后给scrollContainer添加滚动事件
		this.addScrollListener(this.scrollContainer)
	}

	/**
	 * 渲染页面内容，这里是根据每个page数据来渲染，而每个page包含了content和模板等
	 * @private
	 */
	#renderPages(rootContainer: HTMLDivElement, wrapStyle: string | null) {
		try {
			for (let i = 0; i < this.pages.length; i++) {
				let pageData = this.pages[i]
				let pageContainer = new OfdPageContainer(this.ofdDocument, pageData, rootContainer)
				// 为每个页面容器添加一个独特的ID
				const pageId = `ofd-page-${i + 1}`;
				let pageView = pageContainer.getPageElement()
				pageView.setAttribute(AttributeKey.ID, pageId);
				if (wrapStyle) {
					let tempStyle = pageView.getAttribute("style") || ""
					tempStyle += wrapStyle
					pageView.setAttribute("style", tempStyle)
				}
				rootContainer!.appendChild(pageView)
			}
		} catch (error) {
			console.log("render error", error)
		}
	}

	/**
	 * 放大文档
	 * 每次放大 10%
	 */
	zoomIn(): void {
		if (this.rootContainer) {
			const currentScale = parseFloat(this.rootContainer.dataset.scale || '1');
			const newScale = currentScale * 1.1; // 每次放大 10%
			this.applyZoom(this.rootContainer, newScale);
		}
	}
	
	/**
	 * 缩小文档
	 * 每次缩小 10%，但不小于 0.1
	 */
	zoomOut(): void {
		if (this.rootContainer) {
			const currentScale = parseFloat(this.rootContainer.dataset.scale || '1');
			const newScale = Math.max(currentScale * 0.9, 0.1); // 每次缩小 10%，但不小于 0.1
			this.applyZoom(this.rootContainer, newScale);
		}
	}
	
	/**
	 * 应用指定的缩放比例
	 * @param newScale 新的缩放比例
	 */
	public applyZoom(rootContainer: HTMLDivElement, newScale: number): void {
		if (rootContainer) {
			if (!rootContainer.dataset.originalWidth) {
				rootContainer.dataset.originalWidth = rootContainer.offsetWidth.toString();
			}
			const originalWidth = parseFloat(rootContainer.dataset.originalWidth);

			// 应用缩放
			rootContainer.style.transform = `scale(${newScale})`;
			rootContainer.style.transformOrigin = 'top left';
			rootContainer.dataset.scale = newScale.toString();

			// 调整内容大小，但保持原始尺寸
			rootContainer.style.width = `${originalWidth}px`;
			rootContainer.style.height = 'auto';

			// 调整父容器和内容位置
			this.adjustContainerAndPosition(rootContainer, originalWidth, newScale);
		}
	}
	
	/**
	 * 调整容器和内容的位置
	 * @param originalWidth 原始宽度
	 * @param scale 缩放比例
	 */
	private adjustContainerAndPosition(rootContainer: HTMLDivElement, originalWidth: number, scale: number): void {
		if (rootContainer && rootContainer.parentElement) {
			const parentElement = rootContainer.parentElement;
			const scaledWidth = originalWidth * scale;
			const scaledHeight = rootContainer.offsetHeight * scale;

			// 设置父容器大小为缩放后的大小
			parentElement.style.width = `${scaledWidth}px`;
			parentElement.style.height = `${scaledHeight}px`;

			// 计算并设置边距以居中内容
			const marginLeft = Math.max((parentElement.offsetWidth - scaledWidth) / 2, 0);
			const marginTop = Math.max((parentElement.offsetHeight - scaledHeight) / 2, 0);

			rootContainer.style.marginLeft = `${marginLeft}px`;
			rootContainer.style.marginTop = `${marginTop}px`;

			// 确保父容器可以滚动
			parentElement.style.overflow = 'auto';
		}
	}

	/**
	 * 重置缩放到初始比例
	 */
	public resetZoom(): void {
		this.rootContainer && this.applyZoom(this.rootContainer, 1);
	}

	public getScrollContainer(): HTMLDivElement {
		return this.scrollContainer
	}

	private addScrollListener(rootContainer: HTMLDivElement): void {
		console.log("addScrollListener", rootContainer)
		rootContainer.setAttribute(AttributeKey.ID, "ofd-scroll-container")
		const pages = rootContainer.querySelectorAll('[id^="ofd-page-"]');
		rootContainer.addEventListener('scroll', (event) => {
			const containerRect = rootContainer.getBoundingClientRect();
			pages.forEach((page, index) => {
				
				const pageRect = page.getBoundingClientRect();
				// 判断页面是否至少有一半在视图中
				const pageVisibleHeight = Math.min(pageRect.bottom, containerRect.bottom) - Math.max(pageRect.top, containerRect.top);
				const pageHalfHeight = pageRect.height / 5;
				if (pageVisibleHeight >= pageHalfHeight) {
					let tempPageIndex = index + 1;
					if (tempPageIndex !== this.currentPageIndex) {
						this.currentPageIndex = tempPageIndex;
						// 创建并分发自定义事件
						const event = new CustomEvent('ofdPageChange', {
							detail: { pageIndex: tempPageIndex, pageId: page.id }
						});
						window.dispatchEvent(event);
						return; // 找到第一个满足条件的页面后退出循环
					}
				}
			});
		});
	}
}


