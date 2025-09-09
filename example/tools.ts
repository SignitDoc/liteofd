import { AttributeKey, OFD_KEY } from '../src/liteofd/attrType';
import LiteOfd from '../src/liteofd/liteOfd';
import { XmlData } from '../src/liteofd/ofdData';
import { OfdDocument } from '../src/liteofd/ofdDocument';
import { findAttributeValueByKey, findValueByTagName } from '../src/liteofd/parser';

let selectedFile: File | null = null;

const liteOfd = new LiteOfd()

// 选择 OFD 文件
export function selectOfdFile() {
    const fileInput = document.getElementById('ofdFileInput') as HTMLInputElement;
    fileInput.click();
}

function parseOfdFile(file: File) {
    liteOfd.parse(file).then((data: OfdDocument) => {
        console.log('解析OFD文件成功:', data);
        // 显示ofd的结构
        showOfdStructure(data)
    }).catch((error) => {
        console.error('解析OFD文件失败:', error);
    });
}

// 处理文件选择
function handleFileChange(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (file) {
        if (file.name.toLowerCase().endsWith('.ofd')) {
            console.log('选中的 OFD 文件:', file.name);
            selectedFile = file;
            // 显示选中的文件名
            const fileNameElement = document.getElementById('selectedFileName');
            if (fileNameElement) {
                fileNameElement.textContent = file.name;
            }

        // 解析 OFD 文件
        parseOfdFile(file)

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

let previewEle;

function getFontMap(page: XmlData, index: number, pageItem: HTMLElement) {
     // 展示字体
     const textObject = findValueByTagName(page, OFD_KEY.TextObject)
     console.log("textObject :", textObject)
     console.log("document :", ofdDocument)
     const fontRes = findValueByTagName(ofdDocument!!.publicRes, OFD_KEY.Font)
     console.log("fontRes :", fontRes)
     const fontMap = new Map<string, XmlData>()
     textObject?.children.forEach((child: XmlData) => {
         const font = findAttributeValueByKey(child, AttributeKey.FONT)
         fontRes?.children.forEach((fontChild: XmlData) => {
            const fontID = findAttributeValueByKey(fontChild, AttributeKey.ID)
            // console.log("fontNameID :", fontID)
            if(fontID === font) {
                // console.log("fontChild :", fontChild)
                fontMap.set(font, fontChild)
            }
         })
     })

     // 创建字体组件
     const fontComponent = document.createElement('div');
     fontComponent.className = 'font-component';

     // 创建字体树
     const fontTree = document.createElement('ul');
     fontTree.className = 'font-tree';

     // 将fontMap中的fontID和fontName进行树形展示
     fontMap.forEach((fontChild: XmlData, fontID: string) => {
        const fontName = findAttributeValueByKey(fontChild, AttributeKey.FontName)
        const fontItem = document.createElement('li');
        fontItem.className = 'font-item';

        const fontHeader = document.createElement('span');
        fontHeader.textContent = `${fontID} : ${fontName}`;
        fontItem.appendChild(fontHeader);

        fontItem.addEventListener('click', (event) => {
            event.stopPropagation(); // 阻止事件冒泡到pageItem

            console.log(`点击了字体: ${fontID} - ${fontName}`);
            // 预览字体
            previewFont(fontID, fontName)
        });

        fontTree.appendChild(fontItem);
     })

     // 将字体树添加到字体组件
     fontComponent.appendChild(fontTree);

     return fontComponent;
}


// 预览字体，在ofd-preview中展示字体的样式显示
function previewFont(fontID: string, fontName: string) {
    const fontWrapper = document.createElement('div');
    fontWrapper.className = 'font-wrapper';

    const fontContainer = document.createElement('div');
    fontContainer.className = 'font-container';
    // 设置字体样式
    const fontStyle = document.createElement('style');
    fontStyle.textContent = `
        @font-face {
            font-family: '${fontName}';
            src: local('${fontName}');
        }
    `;
    document.head.appendChild(fontStyle);

    // 创建预览文本
    const previewText = document.createElement('p');
    previewText.textContent = '这是一段使用该字体的预览文本 This is a preview text using this font';
    previewText.style.fontFamily = `'${fontName}', sans-serif`;
    previewText.style.fontSize = '16px';
    previewText.style.marginTop = '10px';

    fontContainer.appendChild(previewText);

    // 添加字体信息
    const fontInfo = document.createElement('p');
    fontInfo.textContent = `字体ID: ${fontID}, 字体名称: ${fontName}`;
    fontInfo.style.fontSize = '14px';
    fontInfo.style.color = '#666';
    fontInfo.style.marginTop = '5px';

    fontContainer.appendChild(fontInfo);
    fontWrapper.appendChild(fontContainer);

    if (previewEle) {
        previewEle.appendChild(fontWrapper);
    }
}


function getFontContainer(page: XmlData, index: number, pageItem: HTMLElement) {
    const fontWrapper = getFontMap(page, index, pageItem);
    fontWrapper.className = 'font-wrapper';
    // 创建字体组件容器
    const fontContainer = document.createElement('div');
    fontContainer.className = 'font-container';

    // 创建字体标题
    const fontTitle = document.createElement('span');
    fontTitle.textContent = '字体';
    fontTitle.className = 'font-title';

    // 将字体标题和字体组件添加到容器中
    fontContainer.appendChild(fontTitle);
    fontContainer.appendChild(fontWrapper);

    // 将字体容器添加到页面项目中
    pageItem.appendChild(fontContainer);

    // 添加切换显示/隐藏的功能
    fontTitle.addEventListener('click', (event) => {
        event.stopPropagation(); // 阻止事件冒泡
        fontWrapper.style.display = fontWrapper.style.display === 'none' ? 'block' : 'none';
    });

    // 默认隐藏字体组件
    fontWrapper.style.display = 'none';
}

// 展示页面中的元素
function togglePageItem(page: XmlData, index: number, pageItem: HTMLElement) {
    getFontContainer(page, index, pageItem)
}

// 渲染ofd的对应页面
function renderOfdPage(pageIndex: number){
    if(!previewEle) {
        previewEle = document.getElementById("ofd-preview")
    }
    previewEle.innerHTML = ''
    let pageEle = liteOfd.renderPage(pageIndex, 'background-color: white')
    console.log("page ele", pageEle)
    previewEle?.appendChild(pageEle)
}

function renderPageTreeView(pages: XmlData[]) {
    const container = document.createElement('div');
    if (container) {
        container.innerHTML = '';
        pages.forEach((page, index) => {
            // 页面元素
            const pageItem = document.createElement('li');
            pageItem.textContent = `第 ${index + 1} 页`;
            pageItem.className = 'tree-item';
            pageItem.addEventListener('click', () => {
                renderOfdPage(index)
                togglePageItem(page, index, pageItem)
            });

            container.appendChild(pageItem);
        });
        return container
    }
}

let ofdDocument: OfdDocument | null = null

// 显示OFD结构
export function showOfdStructure(data: OfdDocument) {
    if (!selectedFile) {
        alert('请先选择一个 OFD 文件');
        return;
    }
    if (!data) {
        alert('OFD 文件结构为空');
        return;
    }
    console.log('OFD 文件结构:', data);
    ofdDocument = data
    // 将data中的pages显示为树形结构，pages是数组，每个数组元素是一个XmlData
    const ofdStructureDisplay = document.getElementById('ofdStructureDisplay') as HTMLDivElement;
    if (ofdStructureDisplay) {
        ofdStructureDisplay.innerHTML = '';
        let treeView = renderPageTreeView(data.pages)
        if (treeView) {
            ofdStructureDisplay.appendChild(treeView)
        }
    }
}

// 显示签名信息
export function showSignatures() {
    if (!selectedFile) {
        alert('请先选择一个 OFD 文件');
        return;
    }

}

// 显示注释
export function showAnnotations() {
    if (!selectedFile) {
        alert('请先选择一个 OFD 文件');
        return;
    }
}

// 显示附件
export function showAttachments() {
    if (!selectedFile) {
        alert('请先选择一个 OFD 文件');
        return;
    }
}

// 添加文件选择事件监听器
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('ofdFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileChange);
    }
});

// 将函数添加到 window 对象，使其可以从 HTML 中直接调用
Object.assign(window, {
    selectOfdFile,
    showOfdStructure,
    showSignatures,
    showAnnotations,
    showAttachments
});
