import './style.css'
import LiteOfd from "../src/liteofd/liteOfd.ts"
import { XmlData } from '../src/liteofd/ofdData.ts';
import * as parser from '../src/liteofd/parser.ts'
import { AttributeKey, OFD_KEY } from '../src/liteofd/attrType.ts';
import {OfdDocument} from "../src/liteofd/ofdDocument.ts";
import { OfdTools } from '../src/liteofd/ofdtools.ts';
import { ChildProcess } from 'child_process';

const appContent = document.getElementById('content') as HTMLDivElement

const liteOfd = new LiteOfd()

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
    const { nodeData, sealObject } = customEvent.detail;
    console.log('Clicked Signature Element:', nodeData);
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

  function createOutlineElement(outlineData: XmlData): HTMLElement {
    const outlineElement = document.createElement('div');
    outlineElement.className = 'outline-item';

    const titleElement = document.createElement('span');
    titleElement.textContent = parser.findAttributeValueByKey(outlineData, AttributeKey.Title) || "无标题";
    titleElement.className = 'outline-title';
    outlineElement.appendChild(titleElement);


    // 查找actions
    let actions = parser.findValueByTagName(outlineData, OFD_KEY.Actions)
    if (actions) {
      console.log("actions", actions)
    }
    let actionListObj = actions?.children[0]
    if (actionListObj) {
      console.log("actionListObj", actionListObj)
    }
    actionListObj?.children.forEach(action => {
      titleElement.addEventListener('click', () => {
        liteOfd.executeAction(action)
      });
    })

    return outlineElement;
  }

  outlinesContainer.innerHTML = '';
  if (outlines && outlines.children && outlines.children.length > 0) {
    outlines.children.forEach(outline => {
      outlinesContainer.appendChild(createOutlineElement(outline));
    });
    toggleOutlines(); // 如果有大纲数据，初始显示大纲
  }
}


function parseOfdFile(file: File) {
	appContent.innerHTML = ''
    liteOfd.parse(file).then((data: OfdDocument) => {
    console.log('解析OFD文件成功:', data);
    updatePageInfo()
      let temp = liteOfd.render(undefined, 'background-color: white; margin-top: 12px;')
      appContent.appendChild(temp)
	  initOfdEventListeners(); // 在渲染完成后初始化事件监听器
    // 添加大纲
    renderOutlines(data.outlines);

    // 初始化 OfdTools
    ofdTools = new OfdTools(data);
    // 将 ofdTools 添加到 window 对象，使其可以从 iframe 中访问
    (window as any).ofdTools = ofdTools;
  }).catch((error) => {
    console.error('解析OFD文件失败:', error);
    alert('解析OFD文件失败，请检查文件是否正确');
    // 清除文件名显示
    const fileNameElement = document.getElementById('selectedFileName');
    if (fileNameElement) {
      fileNameElement.textContent = '';
    }
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
