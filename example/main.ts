import './style.css'
import LiteOfd from "../src/liteofd/liteOfd.ts"
import { XmlData } from '../src/liteofd/ofdData.ts';
import * as parser from '../src/liteofd/parser.ts'
import { AttributeKey, OFD_KEY } from '../src/liteofd/attrType.ts';
import {OfdDocument} from "../src/liteofd/ofdDocument.ts";
import { OfdTools } from '../src/liteofd/ofdtools.ts';
import { ChildProcess } from 'child_process';
import { ConfigManager } from '../src/config/configManager'

const appContent = document.getElementById('content') as HTMLDivElement
const thumbContent = document.getElementById('thumb') as HTMLDivElement

const liteOfd = new LiteOfd()
const thumbOfd = new LiteOfd()
thumbOfd.toggleRenderTextLayer(false)

export function uploadFile() {
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
  fileInput.click();
}

export function handleFileChange(event: Event) {
  const fileInput = event.target as HTMLInputElement;
  const file = fileInput.files?.[0];

  if (file) {
    if (file.name.toLowerCase().endsWith('.ofd')) {
      console.log('选中的 OFD 文件:', file.name);
      // 显示选中的文件名
      const fileNameElement = document.getElementById('selectedFileName');
      if (fileNameElement) {
        fileNameElement.textContent = file.name;
      }
      parseOfdFile(file);
    } else {
      alert('请选择 .ofd 文件');
      // 清除文件名显示
      const fileNameElement = document.getElementById('selectedFileName');
      if (fileNameElement) {
        fileNameElement.textContent = '';
      }
    }

    // 清除文件输入，允许选择相同的文件
    fileInput.value = '';
  }
}

function initOfdEventListeners() {
  appContent.addEventListener('signature-element-click', (event: Event) => {
    event.stopPropagation(); // 阻止事件冒泡
    const customEvent = event as CustomEvent;
    const { nodeData, sealObject, boundaryBox, page } = customEvent.detail;
    console.log('Clicked Signature Element:', page);
    console.log('Seal Object:', sealObject);
    displaySignatureDetails(nodeData, sealObject);
  });

  // 添加点击他地方关闭弹窗的监听器
  document.addEventListener('click', (event) => {
    const detailsContainer = document.getElementById('signature-details');
    const overlay = document.getElementById('overlay');
    if (detailsContainer && overlay && !detailsContainer.contains(event.target as Node)) {
      detailsContainer.style.display = 'none';
      overlay.style.display = 'none';
    }
  });
}

function displaySignatureDetails(nodeData: XmlData, sealObject: any) {
  const detailsContainer = document.getElementById('signature-details');
  const overlay = document.getElementById('overlay');
  if (detailsContainer && overlay) {
    detailsContainer.innerHTML = `
      <h3>Signature Details</h3>
      <pre>Node Data: ${JSON.stringify(nodeData, null, 2)}</pre>
      <pre>Seal Object: ${JSON.stringify(sealObject, null, 2)}</pre>
    `;
    detailsContainer.style.display = 'block';
    overlay.style.display = 'block';
  }
}
function renderOutlines(outlines: XmlData) {
  const outlinesContainer = document.getElementById('outlines');
  if (!outlinesContainer) return;

  /**
   * 递归创建大纲元素
   * @param outlineData 大纲数据
   * @param level 当前层级（用于缩进）
   * @returns 创建的大纲元素
   */
  function createOutlineElement(outlineData: XmlData, level: number = 0): HTMLElement {
    console.log(`大纲数据 (层级 ${level}):`, outlineData);

    const outlineElement = document.createElement('div');
    outlineElement.className = 'outline-item';
    outlineElement.style.paddingLeft = `${level * 20}px`; // 根据层级添加缩进

    // 创建标题容器
    const titleContainer = document.createElement('div');
    titleContainer.className = 'outline-title-container';
    titleContainer.style.display = 'flex';
    titleContainer.style.alignItems = 'center';

    // 创建标题元素
    const titleElement = document.createElement('span');
    const title = parser.findAttributeValueByKey(outlineData, AttributeKey.Title) || "无标题";
    titleElement.textContent = title;
    titleElement.className = 'outline-title';
    titleElement.style.cursor = 'pointer';
    titleElement.style.flex = '1';

    // 查找所有子大纲（递归查找）
    const subOutlines = findAllSubOutlines(outlineData);

    // 如果有子大纲，添加展开/折叠按钮
    if (subOutlines.length > 0) {
      const expandButton = document.createElement('span');
      expandButton.className = 'outline-expand-btn';
      expandButton.textContent = '▶';
      expandButton.style.cursor = 'pointer';
      expandButton.style.marginRight = '5px';
      expandButton.style.userSelect = 'none';

      // 创建子大纲容器
      const subContainer = document.createElement('div');
      subContainer.className = 'outline-sub-container';
      subContainer.style.display = 'none'; // 默认折叠

      // 展开/折叠功能
      expandButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = subContainer.style.display !== 'none';
        subContainer.style.display = isExpanded ? 'none' : 'block';
        expandButton.textContent = isExpanded ? '▶' : '▼';
      });

      titleContainer.appendChild(expandButton);

      // 递归创建子大纲
      subOutlines.forEach(subOutline => {
        const subElement = createOutlineElement(subOutline, level + 1);
        subContainer.appendChild(subElement);
      });

      // 先添加标题容器到 outlineElement
      outlineElement.appendChild(titleContainer);
      // 然后添加子大纲容器
      outlineElement.appendChild(subContainer);
    } else {
      // 没有子大纲时，只添加标题容器
      outlineElement.appendChild(titleContainer);
    }

    titleContainer.appendChild(titleElement);

    // 处理 Actions
    setupActions(outlineData, titleElement);

    return outlineElement;
  }
  /**
   * 递归查找所有子大纲
   * @param outlineData 大纲数据
   * @returns 所有子大纲的数组
   */
  function findAllSubOutlines(outlineData: XmlData): XmlData[] {
    const subOutlines: XmlData[] = [];

    // 直接查找子大纲
    const directSubOutlines = parser.findValueByTagName(outlineData, OFD_KEY.OutlineElem);
    if (directSubOutlines && directSubOutlines.children) {
      subOutlines.push(...directSubOutlines.children);
    }

    // 递归查找更深层级的子大纲
    if (outlineData.children) {
      outlineData.children.forEach(child => {
        if (child.tagName === OFD_KEY.OutlineElem) {
          // 如果当前子元素本身就是大纲元素，递归查找其子大纲
          const nestedSubOutlines = findAllSubOutlines(child);
          subOutlines.push(...nestedSubOutlines);
        }
      });
    }

    return subOutlines;
  }

  /**
   * 设置大纲项的 Actions
   * @param outlineData 大纲数据
   * @param titleElement 标题元素
   */
  function setupActions(outlineData: XmlData, titleElement: HTMLElement) {
    try {
      const actions = parser.findValueByTagName(outlineData, OFD_KEY.Actions);
      if (actions && actions.children && actions.children.length > 0) {
        console.log("找到 Actions:", actions);

        const actionListObj = actions.children[0];
        if (actionListObj && actionListObj.children) {
          console.log("ActionList 对象:", actionListObj);

          // 为每个 action 添加点击事件
          actionListObj.children.forEach(action => {
            titleElement.addEventListener('click', (e) => {
              e.stopPropagation();
              console.log('执行 Action:', action);
              liteOfd.executeAction(action);
            });
          });

          // 添加视觉提示（有 action 的大纲项）
          titleElement.style.color = '#0066cc';
          titleElement.title = '点击执行操作';
        }
      }
    } catch (error) {
      console.warn('处理 Actions 时出错:', error);
    }
  }

  // 清空容器并重新渲染
  outlinesContainer.innerHTML = '';

  if (outlines && outlines.children && outlines.children.length > 0) {
    console.log('开始渲染大纲，共', outlines.children.length, '个顶级大纲项');

    outlines.children.forEach((outline, index) => {
      console.log(`渲染第 ${index + 1} 个大纲项:`, outline);
      const outlineElement = createOutlineElement(outline, 0);
      outlinesContainer.appendChild(outlineElement);
    });

    toggleOutlines(); // 如果有大纲数据，初始显示大纲
  } else {
    console.log('没有找到大纲数据');
  }
}


function parseOfdFile(file: File) {
	appContent.innerHTML = ''
    thumbContent.innerHTML = ''
    liteOfd.parse(file).then((data: OfdDocument) => {
    console.log('解析OFD文件成功:', data);
    updatePageInfo()
      // 读取 configManager 的 renderPages 配置
      const configManager = ConfigManager.getInstance();
      const renderPages = configManager.getRenderPagesConfig();
      let temp = liteOfd.render(undefined, 'background-color: white; margin-top: 12px;', renderPages)
      appContent.appendChild(temp)
	  initOfdEventListeners(); // 在渲染完成后初始化事件监听器
    // 添加大纲
    renderOutlines(data.outlines);

    // 初始化 OfdTools
    ofdTools = new OfdTools(data);
    // 将 ofdTools 添加到 window 对象，使其可以从 iframe 中访问
    (window as any).ofdTools = ofdTools;

    // // 渲染缩略图
    // let thumbDiv = thumbOfd.renderWithDocument(data, undefined, 'background-color: white; margin-top: 12px;', renderPages)
    // thumbContent.appendChild(thumbDiv)
  }).catch((error) => {
    console.error('解析OFD文件失败:', error);
    alert('解析OFD文件失败，请检查文件是否正确');
    // 清除文件名显示
    const fileNameElement = document.getElementById('selectedFileName');
    if (fileNameElement) {
      fileNameElement.textContent = '';
    }
  });
  // 重新解析用缩略图的
  thumbOfd.parse(file).then((data: OfdDocument) => {
    data.supportZoom = false
    data.renderTextLayer = false
    // 读取 configManager 的 renderPages 配置
    const configManager = ConfigManager.getInstance();
    const renderPages = configManager.getRenderPagesConfig();
    // 渲染缩略图
    let div = thumbOfd.renderWithSize(undefined, "#ffffff",   renderPages)
    thumbContent.appendChild(div)
  }).catch((error) => {
    console.error('缩略图OFD文件失败:', error);
  });
}

export function handleSaveOFD() {
  console.log('保存OFD文件');
  // 保存OFD文件的逻辑
  	appContent.innerHTML = ''
}

export function plus() {
  console.log('放大');
  liteOfd.zoomIn()
}

export function minus() {
  console.log('缩小');
  liteOfd.zoomOut()
}

export function firstPage() {
  console.log('第一页');
  liteOfd.goToPage(1)
}

export function prePage() {
  console.log('上一页');
  liteOfd.prevPage()
}

export function nextPage() {
  console.log('下一页');
  liteOfd.nextPage()
}

export function lastPage() {
  console.log('最后一页');
  liteOfd.goToPage(liteOfd.totalPages)
}

export function resetZoom() {
  console.log('还原缩放');
  liteOfd.resetZoom();
}
function updatePageInfo() {
  const totalPages = liteOfd.totalPages;
  console.log(`当前页面: /${totalPages}`);
  // 更新 UI 显示当前页面和总页数
  const pageInfoElement = document.querySelector('.page-info') as HTMLElement;
  if (pageInfoElement) {
    pageInfoElement.textContent = `${liteOfd.currentPage} / ${totalPages}`;
  }
}


export function searchKeyword() {
  const searchInput = document.getElementById('searchInput') as HTMLInputElement;
  if (searchInput) {
    const keyword = searchInput.value;
    console.log('搜索关键词:', keyword);
    // 在这里添加搜索逻辑
    liteOfd.search(keyword);
  } else {
    console.error('未找到搜索输入框');
  }

  let content = liteOfd.getContent()
  console.log("get content", content)
}

export function addOfdPageChangeListener() {
  console.log('添加OFD页面变化监听器');
  window.addEventListener('ofdPageChange', (event: Event) => {
    updatePageInfo();
  });
}

export function toggleOutlines() {
  const outlinesElement = document.getElementById('outlines');
  const contentElement = document.getElementById('content');

  if (outlinesElement && contentElement) {
    outlinesElement.classList.toggle('show');
    contentElement.classList.toggle('with-outlines');
  }
}

export function toggleConfigUI() {
  liteOfd.toggleConfigUI()
}

// 添加新的函数来处理工具按钮点击
export function openToolsMenu() {
  console.log('切换工具菜单');
  const ofdtoolsElement = document.getElementById('ofdtools') as HTMLIFrameElement;
  const contentElement = document.getElementById('content');

  if (ofdtoolsElement && contentElement) {
    if (ofdtoolsElement.style.display === 'none') {
      ofdtoolsElement.style.display = 'block';
      contentElement.style.width = 'calc(100% - 300px)';
    } else {
      ofdtoolsElement.style.display = 'none';
      contentElement.style.width = '100%';
    }
  }
}

let ofdTools: OfdTools


document.addEventListener('DOMContentLoaded', () => {
  console.log('文档加载完成');
  initializeApp();
});

function initializeApp() {
  // 在这里放置所有需要在文档加载完成后执行的初始化代码
  addOfdPageChangeListener();
  initOfdEventListeners();
  // 可以添加其他初始化函数
  // openToolsMenu()
}


// 将函数添加到window对象
Object.assign(window, {
  resetZoom,
  uploadFile,
  handleFileChange,
  handleSaveOFD,
  plus,
  minus,
  firstPage,
  prePage,
  nextPage,
  updatePageInfo,
  searchKeyword,
  lastPage,
  toggleOutlines,  // 添加 toggleOutlines 到这里
  openToolsMenu,
  toggleConfigUI
});
