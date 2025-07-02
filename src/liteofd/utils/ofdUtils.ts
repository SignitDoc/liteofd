import * as parser from "../parser"
import { AttributeKey, OFD_KEY } from "../attrType"
import { getOFDFilePath } from "./elementUtils"
import { RootDocPath } from "../parser"
import { OfdDocument } from "../ofdDocument"
import { XmlData } from "../ofdData"
import { isDefaultFont, loadDefaultFont, loadedFonts, loadSingleFont } from "../ofdFont"

const fontDefaultDir = "/Doc_0/Res"
/**
 * 加载字体
 * @param files
 * @param fonts
 */
const loadOFDFonts = async (files: any, fonts: XmlData) => {
	if (fonts && fonts.children) {
		for (let i = 0; i < fonts.children.length; i++) {
			let fontData = fonts.children[i]
			let fontName = parser.findAttributeValueByKey(fontData, AttributeKey.FontName)
			let familyName = parser.findAttributeValueByKey(fontData, AttributeKey.FamilyName)
			let fontFile = parser.findValueByTagName(fontData, OFD_KEY.FontFile)
			if (fontFile && fontFile.value) {
				let fileName = fontFile.value
				let fontFilePath = fontDefaultDir + "/" + fileName
				let realFilePath = getOFDFilePath(fontFilePath)
				let nativeFontFile = files[realFilePath]
				if (nativeFontFile) {
					let fontRes = await loadSingleFont(nativeFontFile, fontData)
					// console.log("font res", fontRes)
				}
			} else {
				let realFontName = fontName || familyName
				realFontName = convertNonStandardFont(realFontName)
				console.log("realFontName", realFontName)
				if(realFontName && isDefaultFont(realFontName)) {
					// await loadDefaultFont(realFontName)
				}
			}
		}
	}
}

/**
 * 根据ofd的文件来解析出一个ofdDocument对象来
 * @param zipData 解压缩之后的zip数据，包含了files这个所有文件的列表组合
 */
export const parseOFDFiles = async (zipData: any) => {
	let ofdDocument = new OfdDocument()
	// 获取到了zip数据，开始解析ofd的内容到数据对象了
	// 首先是解析最外层的OFD.xml文件
	let ofdFiles = zipData.files
	ofdDocument.files = ofdFiles
	// 解析OFD文件的根文件
	let ofdData = await parser.parseXmlByFileName(ofdFiles, "OFD.xml")
	let documentData;
	if(ofdData) {
		ofdDocument.ofdXml = ofdData
		let docRoot = parser.findValueByTagName(ofdData, OFD_KEY.DocRoot)
		if(docRoot) {
			// 解析OFD的document文件
			let docRootPath = getOFDFilePath(docRoot.value)
			documentData = await parser.parseXmlByFileName(ofdFiles, docRootPath)
			documentData && (ofdDocument.documentData = documentData)
		}

		// 解析签名signatures
		await parseOFDSignatures(ofdDocument, ofdData, ofdFiles)
	}

	if(documentData) {
		// 解析pages页面数据
		let pagesObj = parser.findValueByTagName(documentData, OFD_KEY.Pages)
		pagesObj && (ofdDocument.pages = await parser.parseOFDPages(ofdDocument, pagesObj))

		// 解析OFD的documentres文件
		let documentResObj = parser.findValueByTagName(documentData, OFD_KEY.DocumentRes)
		if (documentResObj) {
			let documentResPath = `${RootDocPath}/${documentResObj.value}`
			// 查找publicres的数据
			let docRes = await parser.parseXmlByFileName(ofdFiles, documentResPath)
			docRes && (ofdDocument.documentRes = docRes)
		}

		// publicres的数据，可能没有
		let publicResObj = parser.findValueByTagName(documentData, OFD_KEY.PublicRes)
		if (publicResObj) {
			let publicResPath = `${RootDocPath}/${publicResObj.value}`
			// 查找publicres的数据
			let publicRes = await parser.parseXmlByFileName(ofdFiles, publicResPath)
			publicRes && (ofdDocument.publicRes = publicRes)

			// 解析publicres中的字体
			let ofdFonts = parser.findValueByTagName(ofdDocument.publicRes, OFD_KEY.Font)
			if (ofdFonts) {
				await loadOFDFonts(ofdFiles, ofdFonts)
			}
		}

		// 解析大纲数据
		let outlinesObj = parser.findValueByTagName(documentData, OFD_KEY.Outlines)
		if(outlinesObj) {
			await parser.parseOFDOutlines(ofdDocument, outlinesObj)
		}

		// 解析注释数据，需要在解析pages之后获取
		let annotationsObj = parser.findValueByTagName(documentData, OFD_KEY.Annotations)
		if (annotationsObj) {
			let annotePath = `${RootDocPath}/${annotationsObj.value}`
			let annoteRes = await parser.parseXmlByFileName(ofdFiles, annotePath)
			ofdDocument.annots = annoteRes
			await loadAnnots(ofdFiles, ofdDocument, annoteRes)
		}
	}

	return ofdDocument
}


/**
 * 根据ofd.xml中的ofd:signatures来拿到签名的根文件
 * @param ofdDocument
 * @param ofdData
 * @param ofdFiles
 * @private
 */
export const parseOFDSignatures = async (ofdDocument: OfdDocument, ofdData: XmlData, ofdFiles) => {
	let signaturesObj = parser.findValueByTagName(ofdData, OFD_KEY.Signatures)
	if (signaturesObj) {
		// 签名文件的包含文件路径
		let signaturesPath = getOFDFilePath(signaturesObj.value)
		let signaturesDir = signaturesPath.substring(0, signaturesPath.lastIndexOf("/"))
		ofdDocument.signatures = await parser.parseXmlByFileName(ofdFiles, signaturesPath)
		// 将signatures中的签名xml全部提取出来
		let signatureFileObj = parser.findValueByTagName(ofdDocument.signatures, OFD_KEY.Signature)
		if (signatureFileObj && signatureFileObj.children.length > 0) {
			// 将每个signature的文件进行解析
			let signObjList: XmlData[] = []
			for (let i = 0; i < signatureFileObj.children.length; i++) {
				let signatureFile = signatureFileObj.children[i]
				let signID = parser.findAttributeValueByKey(signatureFile, AttributeKey.ID)
				let tempPath = parser.findAttributeValueByKey(signatureFile, AttributeKey.BaseLoc)
				tempPath = getOFDFilePath(tempPath)
				if (!tempPath.startsWith(signaturesDir)) {
					tempPath = `${signaturesDir}/${tempPath}`;
				}
				let signFilePath = getOFDFilePath(tempPath)
				let signatureObj = await parser.parseXmlByFileName(ofdFiles, signFilePath)
				signID && (signatureObj.id = signID)
				signObjList.push(signatureObj)
			}
			ofdDocument.signatureList = signObjList
		}
	}
}


/**
 * 解析注释数据
 * @param ofdDocument
 * @param annoteRes
 */
const loadAnnots = async (ofdFiles: any, ofdDocument: OfdDocument, annoteRes: XmlData) => {
	console.log("annoteRes", annoteRes, ofdDocument.pages)
	let pageObj = parser.findValueByTagName(annoteRes, OFD_KEY.Page)
	let annotDir = annoteRes.fileName.substring(0, annoteRes.fileName.lastIndexOf("/"))
	console.log("annot page ", pageObj)
	if(pageObj && pageObj.children.length > 0) {
		for(let i = 0; i < pageObj.children.length; i++) {
			let pageAnnotObj = pageObj.children[i]
			console.log("page annotObj", pageAnnotObj)
			let annotPageId = parser.findAttributeValueByKey(pageAnnotObj, AttributeKey.PageID)
			console.log("pageId", annotPageId)
			let fileLocObj = parser.findValueByTagName(pageAnnotObj, OFD_KEY.FileLoc)
			console.log("fileLocObj location", fileLocObj)
			if(fileLocObj) {
				let annotFilePath = fileLocObj.value
				if(!annotFilePath.startsWith(annotDir)) {
					annotFilePath = `${annotDir}/${annotFilePath}`
				}
				console.log("annotFilePath", annotFilePath, annotPageId)
				let annotPageObj = await parser.parseXmlByFileName(ofdFiles, annotFilePath)
				// 将带有注释的page数据添加到ofdDocument对应的page页面数据中
				for(let j = 0; j < ofdDocument.pages.length; j++) {
					let pageId = ofdDocument.pages[j].id
					if(pageId == annotPageId) {
						ofdDocument.pages[j].annots = annotPageObj
						console.log("load annotPageObj data", ofdDocument.pages[j])
					}
				}
			}
		}
	}

}


/**
 * 将非标准字体转换为标准字体
 * @param fontName
 * @returns
 */
export const convertNonStandardFont = (fontName: string): string => {
	// 处理带有前缀的字体名称
	console.log("convert fontName", fontName, loadedFonts)
	if(loadedFonts.has(fontName)) {
		return fontName
	}
	// 定义非标准字体到标准字体的映射
	const fontMapping: { [key: string]: string } = {
		// 'Calibri': 'Helvetica',
		// 'Calibri Bold': 'Helvetica-Bold',
		// 'Calibri-Bold': 'Helvetica-Bold',
		// 'Calibri BoldItalic': 'Helvetica-BoldOblique',
		// 'Calibri-BoldItalic': 'Helvetica-BoldOblique',
		// 'Calibri Italic': 'Helvetica-Oblique',
		// 'Calibri-Italic': 'Helvetica-Oblique',
		// 'ArialUnicodeMS': 'Helvetica',
		// 'ArialUnicodeMS Bold': 'Helvetica-Bold',
		// 'ArialUnicodeMS-Bold': 'Helvetica-Bold',
		// 'ArialUnicodeMS BoldItalic': 'Helvetica-BoldOblique',
		// 'ArialUnicodeMS-BoldItalic': 'Helvetica-BoldOblique',
		// 'ArialUnicodeMS Italic': 'Helvetica-Oblique',
		// 'ArialUnicodeMS-Italic': 'Helvetica-Oblique'
		'KaiTi_GB2312': 'KaiTi',
		'KaiTi_GB2312-Bold': 'KaiTi-Bold',
		'KaiTi_GB2312-BoldItalic': 'KaiTi-BoldItalic',
		'KaiTi_GB2312-Italic': 'KaiTi-Italic'
	};

	// 将非标准字体转换为标准字体
	if (fontMapping[fontName]) {
		fontName = fontMapping[fontName];
	}
	

	// 循环检查fontMapping中的key，查找包含fontName的匹配项
	for (const key in fontMapping) {
		// 检查key是否以fontName开头，并且后面跟着特殊符号（-或_）
		const pattern = new RegExp(`^${fontName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[-_].*$`);
		if (pattern.test(key)) {
			return fontMapping[key];
		}
		
		// 也检查fontName是否包含key（反向匹配）
		if (fontName.includes(key)) {
			return fontMapping[key];
		}
	}	
	return fontName;
}


/**
 * 将字体名称规整化
 * @param fontName
 * @returns
 */
export const normalizeFontName = (fontName: string): string => {
	const prefixMatch = fontName.match(/^[A-Z]+\+(.+)$/);
	if (prefixMatch) {
		fontName = prefixMatch[1];
	}

	// 处理逗号分隔的字体名称
	if (fontName.includes(',')) {
		fontName = fontName.split(',')[0].trim();
	}

	// 处理分号分隔的字体名称
	if (fontName.includes(';')) {
		fontName = fontName.split(';')[0].trim();
	}


	// 定义标准字体名称列表
	const standardFonts = [
		'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic',
		'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique',
		'Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique',
		'Symbol', 'ZapfDingbats'
	];

	// 如果是标准字体,直接返回
	if (standardFonts.includes(fontName)) {
		return fontName;
	}

	// 处理重复名称的情况
	const parts = fontName.split('-');
	const uniqueParts = [...new Set(parts)].filter(part => isNaN(Number(part)));
	fontName = uniqueParts.join('-');

	// 处理带有样式和数字的字体名称,但保留常见的样式后缀
	// const commonStyles = ['Bold', 'Italic', 'Medium', 'Light', 'Regular', 'Heavy', 'Black', 'Thin', 'Condensed', 'Expanded', 'Medi', 'Regu', 'MediItal', 'ReguItal'];
	// const parts = fontName.split(/[-\s]+/);

	// // 保留基本名称和常见样式
	// const uniqueParts = parts.filter((part, index) =>
	// 	index === 0 || commonStyles.includes(part)
	// );

	// // 如果处理后没有任何部分,返回原始名称
	// if (uniqueParts.length === 0) {
	// 	return fontName;
	// }

	// // 重新组合字体名称
	// return uniqueParts.join('-');
	return fontName
}
