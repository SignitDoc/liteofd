import { getSerifFonts, getStdFontMap, getSymbolsFonts } from "./font/standard_fonts.js"
import { getMetrics } from "./font/metrics"
import { FontFlags } from "./font/fonts_utils.js"
import { IdentityToUnicodeMap, ToUnicodeMap } from "./font/to_unicode_map.js"
import { defaultEncoding, differences, glyphsWidths, toUnicodeMap } from "./font/differences.js"
import { TranslatedFont } from "./font/translatedFont.js"
import { FontFaceObject, FontLoader } from "./font/font_loader.js"
import { ChunkedStream } from "./font/chunked_stream.js"
import { Font } from "./font/fonts.js"
import { XmlData } from "./ofdData"
import * as parser from "./parser"
import { AttributeKey } from "./attrType"

/**
 * 判断是否为衬线字体
 * @param baseFontName 字体名称
 * @returns 是否为衬线字体
 */
const isSerifFont = (baseFontName: string) => {
	// Simulating descriptor flags attribute
	const fontNameWoStyle = baseFontName.split("-", 1)[0];
	return (
		fontNameWoStyle in getSerifFonts() || /serif/gi.test(fontNameWoStyle)
	);
}

/**
 * 获取字体度量
 * @param name 字体名称
 * @returns 字体度量
 */
const getBaseFontMetrics = (name: string) => {
	let defaultWidth = 0;
	let widths = Object.create({});
	let monospace = false;
	const stdFontMap = getStdFontMap();
	let lookupName = stdFontMap[name] || name;
	const Metrics = getMetrics();

	if (!(lookupName in Metrics)) {
		// Use default fonts for looking up font metrics if the passed
		// font is not a base font
		lookupName = isSerifFont(name) ? "Times-Roman" : "Helvetica";
	}
	const glyphWidths = Metrics[lookupName];

	if (typeof glyphWidths === "number") {
		defaultWidth = glyphWidths;
		monospace = true;
	} else {
		widths = glyphWidths(); // expand lazy widths array
	}

	return {
		defaultWidth,
		monospace,
		widths,
	};
}

/**
 * 获取字体类型
 * @param fontData 字体数据
 * @returns 字体类型，目前固定返回 "Type1"
 */
const getFontType = (fontData: any) => {
	return "Type1"
}

/**
 * 获取字体属性
 * @param fontType 字体类型
 * @param baseFontName 字体名称
 * @param firstChar 第一个字符
 * @param lastChar 最后一个字符
 * @param loadedName 加载名称
 */
const getFontProperties = (fontType: string, baseFontName: string, firstChar: number, lastChar: number, loadedName: string) => {
	const properties = {
		baseEncodingName: null,
		ascent: 690,
		capHeight: 690,
		descent: -209,
		type: fontType,
		name: baseFontName,
		systemFontInfo: null,
		isSimulatedFlags: true,
		flags: 4, // 这里先默认填写这个
		italicAngle: 0,
		firstChar: firstChar,
		lastChar: lastChar,
		xHeight: 461,
		isType3Font: false,
		bbox: [-168, -341, 1000, 960],
		hasEncoding: true,
		length1: 1626,
		length2: 14082,
		length3: 532,
		fontMatrix: [0.001, 0, 0.001, 0, 0],
		hasIncludedToUnicodeMap: false,
		isInternalFont: false,
		loadedName: loadedName,
		toUnicode: toUnicodeMap,
		vmetrics: [],
		defaultEncoding: [""],
		differences: [null, ""],
		widths: [null, 0],
		defaultWidth: 0,
		defaultVMetrics: null,
		fontName: ""
	}
	return properties
}

/**
 * 加载内置文件的字体
 * @param fontName 字体名称
 * @param fontBytes 字体文件
 */
const loadFontByArrayBuffer = async (fontName: string, fontBytes: any) => {
	let fontType = getFontType(fontBytes)
	let baseFontName = fontName

	const metrics = getBaseFontMetrics(baseFontName)
	const fontNameWoStyle = baseFontName.split("-", 1)[0]
	const flags =
		(isSerifFont(fontNameWoStyle) ? FontFlags.Serif : 0) |
		(metrics.monospace ? FontFlags.FixedPitch : 0) |
		(getSymbolsFonts()[fontNameWoStyle]
			? FontFlags.Symbolic
			: FontFlags.Nonsymbolic);
	const composite = fontType === "Type0"
	const firstChar =  0,
		lastChar = (composite ? 0xffff : 0xff);
	const properties = getFontProperties(fontType, baseFontName, firstChar, lastChar, fontName)
	properties.defaultEncoding = defaultEncoding
	properties.differences = differences(); // 这个再ofd中要根据文件里面取读取，有的文件为空，有的文件为标准编码，有的文件中包含有differences需要读取之后取值，再文件的header里面
	properties.widths = glyphsWidths
	properties.defaultWidth = metrics.defaultWidth
	properties.defaultVMetrics = null;

	let fontStream = new ChunkedStream(fontBytes, fontBytes.length)
	let font = new Font(baseFontName, fontStream, properties)
	let fontFileData = font.data;

	let options = {
		"maxImageSize": -1,
		"disableFontFace": false,
		"ignoreErrors": true,
		"isEvalSupported": true,
		"isOffscreenCanvasSupported": true,
		"canvasMaxAreaInBytes": -1,
		"fontExtraProperties": false,
		"useSystemFonts": true,
		"cMapUrl": "../external/bcmaps/",
		"standardFontDataUrl": "../external/standard_fonts/"
	}
	let obj = {"Type": { "name": "Font" }, "Subtype": { "name": "Type1" }, "Encoding": { "num": 976, "gen": 0 }, "FirstChar": 45, "LastChar": 122, "Widths": { "num": 993, "gen": 0 }, "BaseFont": { "name": "TACTGM+NimbusRomNo9L-Medi" }, "FontDescriptor": { "num": 4, "gen": 0 } }
	let dict = new Map(Object.entries(obj))
	// 将加载的font对象转换为可以识别成FontFace的内容
	let translatedFont = new TranslatedFont({
		loadedName: font.loadedName,
		font: font,
		dict: dict,
		evaluatorOptions: options,
	});
	const fontFaceObj = new FontFaceObject(translatedFont.font, {
		isEvalSupported: true,
		disableFontFace: false,
		ignoreErrors: true,
		inspectFont: null,
	});
	let fontLoader = new FontLoader({
		loadedName: fontName
	});
	fontLoader
		.bind(fontFaceObj)
		.then(res => {
			// console.log("load font res", res)
		})
		.catch((error) => {
			// console.log("load font err", error)
		})
		.finally(() => {
			// 加载字体完成
			// console.log("load font finish", fontData, fontName)
		});
}

/**
 * 加载单个字体
 * @param fontFile 字体文件
 * @param fontData 字体数据
 */
export const loadSingleFont = async (fontFile: any, fontData: XmlData) => {
	try {
		let fontName =  parser.findAttributeValueByKey(fontData, AttributeKey.FontName)
		console.log("fontName", fontName)
		if(isDefaultFont(fontName)) {
			await loadDefaultFont(fontName)
		} else {
			let fontBytes = await fontFile.async("uint8array")
			await loadFontByArrayBuffer(fontName, fontBytes)
		}

	} catch (e) {
		console.error("load font err", e)
	}
}

/**
 * 默认字体，同PDF的14种内置默认字体
 */
const defaultFonts = [
	'Times-Roman',
	'Times-Bold',
	'Times-Italic',
	'Times-BoldItalic',
	'Helvetica',
	'Helvetica-Bold',
	'Helvetica-Oblique',
	'Helvetica-BoldOblique',
	'Courier',
	'Courier-Bold',
	'Courier-Oblique',
	'Courier-BoldOblique',
	'Symbol',
	'ZapfDingbats'
];

/**
 * 判断是否为默认字体
 * @param fontName 字体名称
 * @returns 是否为默认字体
 */
export const isDefaultFont = (fontName: string): boolean => {
    return defaultFonts.includes(fontName);
}

/**
 * 加载默认字体
 * @param fontName 字体名称
 */
export const loadDefaultFont = async (fontName: string) => {
	if(!isDefaultFont(fontName)) {
		return;
	}
	try {
		// 构建字体文件路径
		const fontPath = `./src/liteofd/assets/${fontName}.otf`;
		await loadOTFFont(fontName, fontPath)
	} catch (error) {
		console.error(`加载字体 ${fontName} 时出错:`, error);
		throw error;
	}
}

/**
 * 加载 OTF 字体并添加到 @font-face
 * @param {string} fontName 字体名称
 * @param {string} fontPath 字体文件路径
 * @returns {Promise<void>}
 */
export async function loadOTFFont(fontName: string, fontPath: string) {
	try {
	  // 加载字体文件
	  const response = await fetch(fontPath);
	  if (!response.ok) {
		console.error(`无法加载字体文件: ${fontName}`)
		return;
	  }

	  // 获取字体文件的 ArrayBuffer
	  const fontData = await response.arrayBuffer();
	  const font = new FontFace(fontName, fontData);
	  // 加载字体
	  await font.load();
      // 将字体添加到 document.fonts
	  document.fonts.add(font);
	} catch (error) {
	  console.error(`加载字体 ${fontName} 时出错:`, error);
	  throw error;
	}
  }