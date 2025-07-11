import * as parser from "../parser"
import { AttributeKey, OFD_KEY } from "../attrType"
import { convertToDpi, convertToDpiWithScale } from "./utils"
import { XmlData } from "../ofdData"
import { OfdDocument } from "../ofdDocument"

const domParser = new DOMParser()

export const decodeHtml = function (s) {
	s = (s != undefined) ? s : this.toString();
	if ( typeof s == "string") {
		return decodeHTML(s)
	} else {
		return s
	}
};

function decodeHTML(html) {
	const doc = domParser.parseFromString(html, "text/html");
	return doc.documentElement.textContent;
}

/**
 * 将textcode字符串转换为待坐标也就是deltax和deltau的值的数组
 * @param textStr
 * @param deltaXList
 * @param deltaYList
 * @param originX
 * @param originY
 */
export const extractTextToCharArray = (textStr: string, deltaXList: any[], deltaYList: any[], originX: any, originY: any): Array<{x: number, y: number, text: string, deltaX: number, deltaY: number}> => {
	let textCodePointList = []
	let lastXDeltaIndex = 0
	let lastYDeltaIndex = 0
	let x = parseFloat(originX)
	let y = parseFloat(originY)


	for (let i = 0; i < textStr.length; i++) {
		let tempDeltaX = 0
		let tempDeltaY = 0
		if (i > 0 && deltaXList.length > 0) {
			let deltaX = deltaXList[i - 1];
			if (deltaX || deltaX === 0) {
				x += deltaX;
				lastXDeltaIndex = i - 1;
			} else {
				deltaX = deltaXList[lastXDeltaIndex];
				x += deltaX;
			}

			tempDeltaX = deltaX
		}
		if (i > 0 && deltaYList.length > 0) {
			let deltaY = deltaYList[i - 1];
			if (deltaY || deltaY === 0) {
				y += deltaY;
				lastYDeltaIndex = i - 1;
			} else {
				deltaY = deltaYList[lastYDeltaIndex];
				y += 0;
			}

			tempDeltaY = deltaY
		}
		if (isNaN(x)) {
			x = 0;
		}
		if (isNaN(y)) {
			y = 0;
		}
		let text = textStr.substring(i, i + 1)

		let textCodePoint = { 'x': convertToDpi(x), 'y': convertToDpi(y), 'text': text, deltaX: tempDeltaX, deltaY: tempDeltaY  }
		textCodePointList.push(textCodePoint)
	}
	return textCodePointList
}

/**
 * 将HTML实体转换为对应的字符
 * @param text 包含HTML实体的文本
 * @return 转换后的文本
 */
const decodeHtmlEntities = (text: string): string => {
  const entities: { [key: string]: string } = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&apos;': "'",
    '&#x20;': ' ',
    '&#x0020;': ' '
  };

  return text.replace(/&[^;]+;/g, (entity) => {
    return entities[entity] || entity;
  });
}


/**
 * 根据textcode来创建显示字符串的tspan
 * @param nodeData 文本的textCode标签
 * @param node 文本的textCode标签
 * @param textNode 文本的textCode标签
 */
export const createTextSpan = (nodeData: XmlData, textCodeData: XmlData, textNode: Element) => {
	// 根据scale计算tspan的位置
	let hScale = parser.findAttributeValueByKey(nodeData, AttributeKey.HScale)
	let vScale = parser.findAttributeValueByKey(nodeData, AttributeKey.VScale)
	// TODO 对已经存在CTM的情况需要对CTM基础上进行缩放计算，现在是简单对这两种情况进行了区分也就是hscale和ctm进行了一个分解处理
	if(vScale || hScale) {
		textNode.setAttribute("transform", `scale(${hScale ? hScale : 1}, ${vScale ? vScale : 1})`)
	}
	let x = parser.findAttributeValueByKey(textCodeData, AttributeKey.X)
	let y = parser.findAttributeValueByKey(textCodeData, AttributeKey.Y)

	let textCode = parser.findValueByTagName(textCodeData, OFD_KEY.TextCode)
	let textStr = textCode.value.toString()
	textStr = decodeHtmlEntities(textStr)
	// 根据node的deltax和deltay进行创建字符位置
	let deltaX = getDeltaList(textStr, textCode, AttributeKey.DeltaX)
	let deltaY = getDeltaList(textStr, textCode, AttributeKey.DeltaY)

	// 将char分割，并且添加上x和y的值
	let charList = extractTextToCharArray(textStr, deltaX, deltaY, x, y)
	for (let i = 0; i < charList.length; i++) {
		let charObj = charList[i]
		let nodeEle = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
		let x = charObj.x
		if (hScale && hScale != 0) {
			x = x / hScale
		}
		let y = charObj.y
		if (vScale && vScale != 0) {
			y = y / vScale
		}
		nodeEle.setAttribute("x", x);
		nodeEle.setAttribute("y", y);
		nodeEle.innerHTML = charObj.text

		textNode.appendChild(nodeEle)
	}
}


/**
 * 获取字体的文字大小
 * @param textObj
 */
export const getFontSize = (textObj: XmlData) => {
	let originSize = parser.findAttributeValueByKey(textObj, AttributeKey.FontSize)
	if (originSize) {
		originSize = convertToDpi(originSize)
		return originSize
	} else {
		return null
	}
}

/**
 * 获取ctm，进行转换
 * @param obj
 */
export const getCTM = (obj: XmlData) => {
	let ctmStr = parser.findAttributeValueByKey(obj, AttributeKey.CTM)
	if (ctmStr) {
		let ctms = ctmStr.split(' ');
		return `matrix(${ ctms[0] } ${ ctms[1] } ${ ctms[2] } ${ ctms[3] } ${ convertToDpi(ctms[4]) } ${ convertToDpi(ctms[5]) })`
	}

	return null
}

export const getDeltaList = (text: string, obj: XmlData, key) => {
	let deltaStr = parser.findAttributeValueByKey(obj, key)
	if (deltaStr) {
		return deltaFormatter(text, deltaStr)
		// 判断数组是否是纯数组还是带有数字的那种数组
	} else {
		return []
	}
}

/**
 * 将textobject的字符的delta进行解析，比如如果是g数组那么解析成对应数字的数组，如果是单个字符那么需要解析称为多少个字符的位置数组每个位置一样
 * @param delta
 */
export const deltaFormatter = function (text: string, delta) {
	if (delta.indexOf("g") === -1) {
		let floatList = [];
		const deltaArray = delta.split(' ').filter(f => f.trim().length > 0);
		
		// 如果只有一个数字，则返回与text字符长度相同的数组
		if (deltaArray.length === 1) {
			const singleValue = parseFloat(deltaArray[0]);
			for (let i = 0; i < text.length - 1; i++) {
				floatList.push(singleValue);
			}
			return floatList;
		} else {
			// 多个数字的情况，按原来的逻辑处理
			for (let f of deltaArray) {
				floatList.push(parseFloat(f));
			}
			return floatList;
		}
	} else {
		const array = delta.split(' ');
		let floatList = [];
		let currentIndex = 0;
		const totalIntervals = text.length - 1;
		
		for (let i = 0; i < array.length; i++) {
			const s = array[i];
			
			if (!s || s.trim().length == 0) {
				continue;
			}
			
			if ('g' === s) {
				// 处理g指令
				if (i + 2 < array.length) {
					const gItemCount = parseInt(array[i + 1]);
					const gValue = parseFloat(array[i + 2]);
					
					// 添加指定数量的gValue
					for (let j = 0; j < gItemCount && currentIndex < totalIntervals; j++) {
						floatList.push(gValue);
						currentIndex++;
					}
					
					// 跳过已处理的参数
					i += 2;
				}
			} else {
				// 处理非g指令的数字（作为剩余值）
				if (currentIndex < totalIntervals) {
					floatList.push(parseFloat(s));
					currentIndex++;
				}
			}
		}
		
		// 如果生成的数组长度不够，用最后一个值填充
		while (floatList.length < totalIntervals) {
			if (floatList.length > 0) {
				floatList.push(floatList[floatList.length - 1]);
			} else {
				floatList.push(0);
			}
		}
		
		return floatList;
	}
}

/**
 * 解析字符串为颜色，比如rgb格式
 * @param color
 */
export const parseColor = function (color: string) {
	if (color) {
		if (color.indexOf('#') !== -1) {
			color = color.replace(/#/g, '');
			color = color.replace(/ /g, '');
			color = '#' + color.toString();
			return color;
		}
		let array = color.split(' ');
		return `rgb(${array[0]}, ${array[1]}, ${array[2]})`
	} else {
		return `rgb(0, 0, 0)`
	}
}


export const parseColorToHex = function (color: string, alpha: number | undefined) {
	if (color) {
		if(alpha || alpha === 0){
			if (color.indexOf('#') !== -1) {
				color = color.replace(/#/g, '');
				color = color.replace(/ /g, '');
				color = '#' + color.toString();
				return color;
			}
			let array = color.split(' ');
			let hexColor = rgbToHexWithAlpha(
				parseInt(array[0]),
				parseInt(array[1]),
				parseInt(array[2]),
				alpha
			);
			return hexColor
		} else {
			return (parseColor)
		}
	} else {
		return `rgb(0, 0, 0)`
	}
}

/**
 * 将RGB颜色转换为带alpha的16进制颜色值
 * @param r 红色分量 (0-255)
 * @param g 绿色分量 (0-255)
 * @param b 蓝色分量 (0-255)
 * @param alpha 透明度 (0-255)
 * @returns 带alpha的16进制颜色值
 */
export const rgbToHexWithAlpha = (r: number, g: number, b: number, alpha: number): string => {
	// 确保输入值在有效范围内
	r = Math.max(0, Math.min(255, r));
	g = Math.max(0, Math.min(255, g));
	b = Math.max(0, Math.min(255, b));
	alpha = Math.max(0, Math.min(255, alpha));

	// 转换为16进制并补零
	const hexR = r.toString(16).padStart(2, '0');
	const hexG = g.toString(16).padStart(2, '0');
	const hexB = b.toString(16).padStart(2, '0');
	const hexAlpha = alpha.toString(16).padStart(2, '0');

	// 返回带alpha的16进制颜色值
	return `#${hexR}${hexG}${hexB}${hexAlpha}`;
}

/**
 * 根据节点的属性值来查找到对应的节点
 */
export const findValueByAttributeValue = (parent: XmlData, attrValue: any) => {
	if (parent.attrsMap.size > 0) {
		for (let pair of parent.attrsMap) {
			const [key, value] = pair;
			if (value === attrValue) {
				return parent
			}
		}
	}
	if (parent.children && parent.children.length > 0) {
		for (let i = 0; i < parent.children.length; i++) {
			let child = parent.children[i]
			let res = findValueByAttributeValue(child, attrValue)
			if (res) {
				return res
			}
		}
	}
}

/**
 * 获取内容页面最大和最小的id，用来进行zindex的设置
 * @param node
 * @param idObj
 */
export const getNodeAttributeMaxAndMinID = (node: XmlData, idObj: { max: number, min: number }) => {
	let currentID = parser.findAttributeValueByKey(node, AttributeKey.ID)
	if (currentID) {
		let idValue = parseInt(currentID)
		if (idValue > idObj.max) {
			idObj.max = idValue
		}
		if (idObj.min > idValue){
			idObj.min = idValue
		}
	}
	if (node.children && node.children.length > 0) {
		for (let i = 0; i < node.children.length; i++) {
			let tempNode = node.children[i]
			getNodeAttributeMaxAndMinID(tempNode,idObj)
		}
	}
}

// 去掉以/开头的路径
export const getOFDFilePath = (path: string) => {
	if (path.startsWith("/")) {
		return path.substring(1, path.length)
	}
	return path
}


	/**
	 * 获取默认的缩放比例
	 * @returns {number} 默认的缩放比例
	 */
	export const getDefaultScale = (ofdDocument: OfdDocument): number => {
		let screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
		let physicalBoxObj = parser.findValueByTagName(ofdDocument.documentData, OFD_KEY.PhysicalBox)
		console.log("physicalBoxObj", physicalBoxObj);
		if(physicalBoxObj){
			let physicalBox = physicalBoxObj.value.split(" ")
			let ofdWidth = parseFloat(physicalBox[2])

			let newofdWidth = convertToDpiWithScale(ofdWidth, 1)
			console.log("ofdWidth", ofdWidth, newofdWidth, screenWidth);
			// 计算缩放比例
			let scale = (screenWidth - 100) / ofdWidth
			return scale
		}
		// 如果物理盒不存在，则返回1
		return 1
	}
