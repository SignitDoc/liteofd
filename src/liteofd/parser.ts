import * as JsZip from "jszip"
import { AttributeKey, MultiChildTagName, OFD_KEY } from "./attrType"
import { XmlData } from "./ofdData"
import { OfdDocument } from "./ofdDocument"
import { getOFDFilePath } from "./utils/elementUtils"
import { XMLParser } from "fast-xml-parser"
import { decodeSignatureStringData } from "./utils/signatureUtil"
import { parseOFDFiles } from "./utils/ofdUtils"
import PromiseCapability from "./promiseCapability"
import * as JSZipUtils from "jszip-utils"

export const RootDocPath = "Doc_0"

// TODO 将parser方法进行包保护，不暴露

export const unzipOfd = async function (file: ArrayBuffer) {
	try {
		let zip = await JsZip.loadAsync(file)
		return zip
	} catch (e) {
		console.log("jszip unzipfile err", e)
		return null
	}
}

// 解析单个xml文件
export const parseXmlByXmlString = async (xmlStr: string, fileName: string) => {
	const xmlParser = new XMLParser({
		ignoreAttributes: false,
		attributesGroupName: false,
		trimValues: false,
		attributeNamePrefix: '@_', // you have assign this so use this to access the attribute
		numberParseOptions: {
			leadingZeros: true,
			hex: true,
			skipLike: /[0-9]*/,
		}
	})
	let xmlObj = xmlParser.parse(xmlStr)
	return convertToOFDData(xmlObj, fileName)
}

const isMultiChildKey = (nodeKey: string) => {
	return MultiChildTagName.indexOf(nodeKey) >= 0
}

var loopDeep = 1

const loopXmlNode = (node: any) => {
	loopDeep++
	let xmlData = new XmlData()
	for (const nodeKey in node) {
		let value = node[nodeKey]
		let valueType = typeof value
		// 判断是否是属性
		if (nodeKey.startsWith("@_")) {
			// 是属性值
			xmlData.attrsMap.set(nodeKey, value)
		} else if (nodeKey.startsWith("#text")) {
			xmlData.value = node[nodeKey]
		} else  {
			if (valueType === "object") {
				if (isMultiChildKey(nodeKey) && !(value instanceof Array)) {
					// 是包含了多个子节点的子节点，并且他的值不是数组，那么需要组成一个数组
					value = [value]
				}
				// 包含了子节点
				let subXmlData = loopXmlNode(value)
				subXmlData.tagName = nodeKey
				xmlData.children.push(subXmlData)
			} else if (valueType === 'string' || valueType === 'boolean' || valueType === 'number'){
				let subXmlData = new XmlData()
				subXmlData.value = value + ""
				subXmlData.tagName = nodeKey
				xmlData.children.push(subXmlData)
			}
		}
	}
	return xmlData
}

// xml对象数据构建ofd数据XMLData类型的
const convertToOFDData = (xmlObj: any, fileName: string) => {
	// 这里转换出来的对象，比如同一个对象
	let xmlData = loopXmlNode(xmlObj)
	xmlData.fileName = fileName
	return xmlData
}

/**
 * 预先解析所有签名数据，并行解析并存入缓存
 * @param ofdDocument 根据files提取到签名文件中的数据
 * @param signList 签名列表
 */
const preParseAllSignatures = async (ofdDocument: OfdDocument, signList: XmlData[]) => {
	if (!signList || signList.length === 0) {
		return
	}
	
	console.log("开始预解析所有签名数据，共", signList.length, "个签名")
	
	// 收集所有需要解析的签名信息
	const signParseTasks: Array<{tempSign: XmlData, signPath: string}> = []
	for (let j = 0; j < signList.length; j++) {
		try {
			let tempSign = signList[j]
			let signPathObj = findValueByTagName(tempSign, OFD_KEY.SignedValue)
			if (!signPathObj) {
				continue
			}
			let signPath = signPathObj.value
			signPath = getOFDFilePath(signPath)
			
			// 检查缓存中是否已有解析过的签名数据
			if (!ofdDocument.parsedSignData.has(signPath)) {
				signParseTasks.push({ tempSign, signPath })
			}
		} catch (e) {
			console.error("收集签名解析任务错误", e)
		}
	}
	
	// 并行解析所有签名
	const signParsePromises = signParseTasks.map(async ({ tempSign, signPath }) => {
		try {
			// 读取数据
			let signData = await ofdDocument.files[signPath].async("base64")
			let sealObj = await decodeSignatureStringData(signData) // 获取签名文件中解析的签名数据
			
				// 将解析结果存入缓存
				if (sealObj) {
					ofdDocument.parsedSignData.set(signPath, sealObj)
					
					// 处理签名数据
					if (sealObj.type === "ofd") {
						// 需要对签名数据进行解压
						await parseSignatureOFDData(sealObj, tempSign)
					} else if (sealObj.type === "png") {
						// 图片类型签名
						let img = 'data:image/png;base64,' + btoa(String.fromCharCode.apply(null, sealObj.ofdArray));
						tempSign.sealData = img
					}
					
					// 设置签名对象（sealObject 类型为 any，可以接受任何值）
					;(tempSign as any).sealObject = sealObj
				}
		} catch (e) {
			console.error("预解析签名错误:", signPath, e)
		}
	})
	
	// 等待所有签名解析完成
	await Promise.all(signParsePromises)
	console.log("所有签名数据预解析完成")
}

/**
 * 将签名数据匹配到页面（从缓存中获取已解析的签名数据）
 * @param ofdDocument 根据files提取到签名文件中的数据
 * @param signList
 * @param pageID
 * @param pageData
 */
const matchSignatureToPage = (ofdDocument: OfdDocument, signList: XmlData[], pageID, pageData: XmlData) => {
	// 根据pageID来匹配对应的签名
	if (signList && signList.length > 0) {
		for (let j = 0; j < signList.length; j++) {
			try {
				// 一个signature.xml文件中的签名信息数据
				let tempSign = signList[j]
				// 查找signature.xml中的stampannot的列表
				let signPathObj = findValueByTagName(tempSign, OFD_KEY.SignedValue)
				if (!signPathObj) {
					continue
				}
				let signPath = signPathObj.value
				signPath = getOFDFilePath(signPath)
				
				// 从缓存中获取已解析的签名数据
				let sealObj = ofdDocument.parsedSignData.get(signPath)
				if (!sealObj) {
					// 如果缓存中没有，说明预解析时出错了，跳过
					continue
				}
				
				// 确保签名对象已设置
				tempSign.sealObject = sealObj
				
				let tempStampAnnotObj = findValueByTagName(tempSign, OFD_KEY.StampAnnot)
				if (!tempStampAnnotObj) {
					continue
				}

				// 将签章的列表添加到对应的pageData里面，也就是把页面数据匹配到对应的签章数据
				for (let k = 0; k < tempStampAnnotObj.children.length; k++) {
					let tempStampAnnot = tempStampAnnotObj.children[k]
					let pageRefID = findAttributeValueByKey(tempStampAnnot, AttributeKey.PageRef)
					console.log("get pagerefid", pageRefID, pageID)
					// 页面id和签章上面的引用id匹配就可以
					if (pageRefID === pageID) {
						pageData.signList.push(tempSign)
					}
				}
			} catch (e) {
				console.error("匹配签名到页面错误", e)
			}
		}
	}
}

// 将签名的ofd进行解压解析出来
const parseSignatureOFDData = async (sealObj: any, tempSign: XmlData) => {
	// 签章的ofd数据，是一个zip的数据，需要解压和其他的ofd一样处理
	let ofdData = sealObj.ofdArray
	let sealOFDObj = await unzipOfd(ofdData)
	// 将签章的解析出来
	let ofdDoc = await parseOFDFiles(sealOFDObj)
	tempSign.sealData = ofdDoc
	console.log("parse seal ofddocument", ofdDoc)
}

/**
 * 解析ofd的所有的page，页面
 * @param ofdDocument 整体文档
 * @param pages 页面的数据，是个数组
 */
export const parseOFDPages = async (ofdDocument: OfdDocument, pages: XmlData) => {
	let files = ofdDocument.files
	let signList = ofdDocument.signatureList
	let pageSubPages = findValueByTagName(pages, OFD_KEY.Page)
	let ofdPages: XmlData[] = []
	if (!pageSubPages) {
		return ofdPages
	}
	
	// 第一步：预先解析所有签名数据（并行解析并存入缓存）
	await preParseAllSignatures(ofdDocument, signList)
	
	// 第二步：收集所有需要解析的页面信息
	const pageParseTasks: Array<{pageID: string, pagePath: string, index: number}> = []
	for (let i = 0; i < pageSubPages.children.length; i++) {
		let page = pageSubPages.children[i]
		if (!page) {
			continue
		}
		let pageLoc = findAttributeValueByKey(page, AttributeKey.BaseLoc)
		let pageID = findAttributeValueByKey(page, AttributeKey.ID)
		let pagePath = `${RootDocPath}/${pageLoc}`
		pageParseTasks.push({ pageID, pagePath, index: i })
	}
	
	// 第三步：并行解析所有页面（签名数据已从缓存中获取）
	const pageDataPromises = pageParseTasks.map(async ({ pageID, pagePath, index }) => {
		try {
			// 检查缓存中是否已有解析过的页面数据
			let pageData = ofdDocument.parsedPageData.get(pagePath)
			
			if (!pageData) {
				// 缓存中没有，需要重新解析
				pageData = await parseXmlByFileName(files, pagePath)
				if (pageData) {
					// 将解析结果存入缓存
					ofdDocument.parsedPageData.set(pagePath, pageData)
				}
			} else {
				console.log("使用缓存的页面数据:", pagePath)
			}
			
			if (pageData) {
				pageID && (pageData.id = pageID)
				// 从缓存中匹配签名数据到页面（同步操作，不需要等待）
				matchSignatureToPage(ofdDocument, signList, pageID, pageData)
				return { pageData, index }
			}
		} catch (e) {
			console.error("解析页面错误:", pagePath, e)
		}
		return null
	})
	
	// 等待所有页面解析完成
	const pageResults = await Promise.all(pageDataPromises)
	
	// 按照原始顺序添加到结果数组
	const validPages = pageResults
		.filter(result => result !== null)
		.sort((a, b) => a!.index - b!.index)
		.map(result => result!.pageData)
	
	ofdPages.push(...validPages)
	
	return ofdPages
}

// 解析大纲数据
export const parseOFDOutlines = async (ofdDocument: OfdDocument, outlinesObj: XmlData) => {
	if(outlinesObj && outlinesObj.children.length > 0) {
		let outlineElems = outlinesObj.children[0]
		if(outlineElems && outlineElems.children.length > 0) {
			ofdDocument.outlines = outlineElems
		}
	}
	console.log("parseOFDOutlines", outlinesObj, ofdDocument.outlines)

}

/**
 * 根据文件来解析xml
 * @param files
 * @param fileName
 */
export const parseXmlByFileName = async (files: any, fileName: string): Promise<XmlData> => {
	try {
		let pathKeys = Object.keys(files)
		let upperFileName = fileName.toUpperCase()
		for (const pathKey of pathKeys) {
			let existFilePath = pathKey.toString().toLocaleUpperCase()
			if (upperFileName === existFilePath) {
				let ofdXml = files[pathKey]
				if (ofdXml) {
					// 通过xml的字符串内容尽心那个解析
					let fileContent = await ofdXml.async("string")
					return await parseXmlByXmlString(fileContent, fileName)
				} else {
					return new XmlData()
				}
			}
		}
	} catch (e) {
		console.log("parse file err", e, fileName, files)
	}
	return new XmlData()
}

// 根据tagname来查找对应xml中的值
export const findValueByTagName = (xmlData:XmlData, tagName: string): XmlData | undefined => {
	if (!xmlData) {
		console.warn("xmlData 为空，无法查找标签");
	} else {
		if (xmlData.tagName === tagName) {
			return xmlData
		}
		if (xmlData.children && xmlData.children.length > 0) {
			for (let i = 0; i < xmlData.children.length; i++) {
				let subNode = xmlData.children[i]
				let findData = findValueByTagName(subNode, tagName)
				if (findData) {
					return findData
				}
			}
		}
	}
}

// 查找第一个符合条件的节点
export const findValueByTagNameOfFirstNode = (xmlData:XmlData, tagName: string): XmlData | undefined => {
	if (xmlData.tagName === tagName) {
		return xmlData
	}
	if (xmlData.children && xmlData.children.length > 0) {
		for (let i = 0; i < xmlData.children.length; i++) {
			let subNode = xmlData.children[i]
			if (subNode.tagName === tagName) {
				return subNode
			}
		}
	}
	return undefined
}


/**
 * 查找所有节点包含子节点的方法
 * @param xmlData 要搜索的XML数据
 * @param tagName 要查找的标签名
 * @returns 包含所有匹配节点的数组
 */
export const findAllNodesByTagName = (xmlData: XmlData, tagName: string): XmlData[] => {
  let result: XmlData[] = [];

  // 检查当前节点
  if (xmlData.tagName === tagName) {
    result.push(xmlData);
  }

  // 递归搜索子节点
  if (xmlData.children && xmlData.children.length > 0) {
    for (let child of xmlData.children) {
      result = result.concat(findAllNodesByTagName(child, tagName));
    }
  }

  return result;
}



/**
 * 根据tagname查找所有的子节点
 * @param xmlData
 * @param tagName
 */
export const findNodeListByTagName = (xmlData:XmlData, tagName: string): XmlData[] => {
	if (xmlData.tagName === tagName) {
		return [xmlData]
	}
	if (xmlData.children && xmlData.children.length > 0) {
		let subNodeList: XmlData[] = []
		for (let i = 0; i < xmlData.children.length; i++) {
			let subNode = xmlData.children[i]
			let findData = findValueByTagName(subNode, tagName)
			if (findData) {
				subNodeList.push(findData)
			}
		}
		return subNodeList
	}
	return []
}

// 查找ofd节点的属性值
export const findAttributeValueByKey = (xmlData:XmlData | undefined | null, key: string): string => {
	let findKey = key
	if (!findKey.startsWith("@_")) {
		findKey = `@_${key}`
	}
	let attrsMap = xmlData?.attrsMap
	if (attrsMap && attrsMap.size > 0) {
		for (let i = 0; i < attrsMap.size; i++) {
			if(attrsMap.has(findKey)){
				return attrsMap.get(findKey)
			}
		}
	}
	if (xmlData?.children && xmlData.children.length > 0) {
		for (let i = 0; i < xmlData.children.length; i++) {
			let subNode = xmlData.children[i]
			let findData = findAttributeValueByKey(subNode, findKey)
			if (findData) {
				return findData
			}
		}
	}
}

// 查找第一层的node的属性值，不深入children进行查找
export const findFirstAttributeValueByKey = (xmlData:XmlData, key: string): string => {
	let findKey = key
	if (!findKey.startsWith("@_")) {
		findKey = `@_${key}`
	}
	let attrsMap = xmlData.attrsMap
	if (attrsMap && attrsMap.size > 0) {
		for (let i = 0; i < attrsMap.size; i++) {
			if(attrsMap.has(findKey)){
				return attrsMap.get(findKey)
			}
		}
	}
}


export const setAttributeToNode = (node: XmlData, key: string, value: string) => {
	if (!key.startsWith("@_")) {
		key = `@_${key}`
	}
	node.attrsMap.set(key, value)
}

/**
 * 根据id查找节点，可能是单节点，可能多节点
 */
export const findNodeByAttributeKeyValue = (targetValue: any, attrKey: string, node: XmlData): XmlData | undefined => {
	let nodeID = findFirstAttributeValueByKey(node, attrKey)
	if (nodeID === targetValue) {
		return node
	} else {
		for (let i = 0; i < node.children.length; i++) {
			let tempNode = node.children[i]
			let res = findNodeByAttributeKeyValue(targetValue, attrKey, tempNode)
			if (res) {
				return res
			}
		}
	}
}

/**
 * 根据id查找节点，可能是单节点，可能多节点，从列表里面面查找
 */
export const findNodeByAttributeKeyValueInList = (targetValue: any, attrKey: string, nodeList: XmlData[]): XmlData | undefined => {
	for (let i = 0; i < nodeList.length; i++) {
		let tempNode = nodeList[i]
		let res = findNodeByAttributeKeyValue(targetValue, attrKey, tempNode)
		if (res) {
			return res
		}
	}
}

/**
 * 根据tagName来查找具体的targetValue值，因为像ofd:Fonts可能存在多个节点，需要再publiicRes中去查找对应的值
 */
export const findNodeByAttributeKeyValueWithTagName = (targetValue: any, attrKey: string, node: XmlData, tagName: string): XmlData | undefined => {
	let nodeID = findFirstAttributeValueByKey(node, attrKey)
	if (nodeID === targetValue) {
		return node
	} else {
		for (let i = 0; i < node.children.length; i++) {
			let tempNode = node.children[i]
			// 让tagName相同的情况
			if (tempNode.tagName === tagName) {
				let res = findNodeByAttributeKeyValue(targetValue, attrKey, tempNode)
				if (res) {
					return res
				}
			}
		}
	}
}


export const parseOFDFile = (file: string | File | ArrayBuffer): PromiseCapability<OfdDocument> => {
	try {
		let promiseCap = new PromiseCapability<OfdDocument>()
		// 判断file是文件还是二进制数据
		file instanceof File || file instanceof ArrayBuffer
			? parseFileByArrayBuffer(file, promiseCap)
			: parseFileByPath(file, promiseCap)

		return promiseCap
	} catch (e) {
		console.error("解析文件错误", e)
		throw e
	}
}

/**
	   * 解析OFD文件二进制数据
	   * @param file
	   * @param promiseCap
	   */
export const  parseFileByArrayBuffer = async(file: File | ArrayBuffer, promiseCap: PromiseCapability<OfdDocument>) => {
		console.log("parseFileByArrayBuffer", file)
		const data = file instanceof File ? await file.arrayBuffer() : file
		const ofdDoc = await processOfdData(data)
		promiseCap.resolve(ofdDoc)
}
/**
	   * 解析OFD文件路径
	   * @param file
	   * @param promiseCap
	   */
const parseFileByPath = (file: string, promiseCap: PromiseCapability<OfdDocument>) => {
		console.log("parseFileByPath", file)
		JSZipUtils.getBinaryContent(file, async (err: any, data: any) => {
		  if (err) {
			promiseCap.reject(err)
		  } else {
			try {
			  const ofdDoc = await processOfdData(data)
			  promiseCap.resolve(ofdDoc)
			} catch (error) {
			  promiseCap.reject(error)
			}
		  }
		})
}
/**
	   * 处理OFD数据
	   * @param data ofd文件的二进制数据
	   * @returns
	   */
const  processOfdData = async (data: ArrayBuffer): Promise<OfdDocument> => {
		try {
			const zipData = await unzipOfd(data)
			const ofdDoc = await parseOFDFiles(zipData)
			return ofdDoc
		} catch (e) {
			console.log("processOfdData err", e)
			throw e
		}
}

// /**
//  * 解析OFD文件中的注释数据
//  * @param ofdDocument document.xml的数据
//  * @param ofdFiles 所有OFD文件
//  * @returns 解析后的注释数据
//  */
// export const parseAnnotations = async (ofdDocument: OfdDocument, annotData: XmlData): Promise<XmlData> => {
//   try {
// 	// 注释的文件路径
// 	let annotsPath = annotData.value
// 	let files = ofdDocument.files


//     const annotationsFilePath = findAttributeValueByKey(annotations, AttributeKey.FileLoc)
//     if (!annotationsFilePath) {
//       return new XmlData()
//     }

//     const fullPath = `${RootDocPath}/${annotationsFilePath}`
//     const annotationsFileData = await parseXmlByFileName(ofdFiles, fullPath)

//     if (!(anno tationsFileData instanceof XmlData)) {
//       console.error("解析注释文件失败")
//       return new XmlData()
//     }

//     return annotationsFileData
//   } catch (e) {
//     console.error("解析注释数据时出错", e)
//     return new XmlData()
//   }
// }

