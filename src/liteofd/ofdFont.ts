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
import { normalizeFontName } from "./utils/ofdUtils"
import opentype from '../opentype/index.js'

// 全局变量，表示已经加载的字体
export const loadedFonts = new Map()
// ofd文件中的字体文件数据进行加载，加载出来的数据
export const opentypeFonts = new Map()
// 字体的id和字体名字的对应值
export const fontIdWithName = new Map()

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
	let loadRes = await fontLoader.bind(fontFaceObj)
	console.log("load font res", loadRes)
	// fontLoader
	// 	.bind(fontFaceObj)
	// 	.then(res => {
	// 		console.log("load font res", res)
	// 	})
	// 	.catch((error) => {
	// 		console.log("load font err", error)
	// 	})
	// 	.finally(() => {
	// 		// 加载字体完成
	// 		console.log("load font finish", fontName)
	// 	});
}


/**
 * 加载单个字体
 * @param fontFile 字体文件
 * @param fontData 字体数据
 */
export const loadSingleFont = async (fontFile: any, fontData: XmlData) => {
	let fontName = parser.findAttributeValueByKey(fontData, AttributeKey.FontName);
	try {
		// 规整字体名称
		// fontName = normalizeFontName(fontName);
		console.log("规整后的字体名称", fontName);

		if (isDefaultFont(fontName)) {
			await loadDefaultFont(fontName);
		} else {
			let fontBytes = await fontFile.async("uint8array");
			// 使用opentype进行加载完成的字体对象，这个对象要用来进行绘制字体字形灯内容
			let fontData = opentype.parse(fontBytes.buffer, null)
			opentypeFonts.set(fontName, fontData)
			console.log("opentype load font", fontName, fontData)
			// opentype.load(fontFile.name, (err, font) => {
			// 	console.log("opentype load font", font, err)
			// }, null)
			await loadFontByArrayBuffer(fontName, fontBytes);
			loadedFonts.set(fontName, true)
			// fontIdWithName.set()
		}
	} catch (e) {
		console.error("加载字体出错", fontName, e);
	}
}

/**
 * 加载本地的默认字体，比如simSun等，加载到一个全局变量的map中表示已经加载
 */
export const loadLocalDefaultFonts = async () => {
	try {
		loadedFonts.clear()
		if(!loadedFonts.has("SimSun")) {
			const fontPath = `./assets/fonts/simsun.ttf`;
			await loadLocalDefaultFont("SimSun", fontPath)
			loadedFonts.set("SimSun", true)
		}
		if(!loadedFonts.has("NSimSun")) {
			const fontPath = `./assets/fonts/Nsimsun.ttf`;
			await loadLocalDefaultFont("NSimSun", fontPath)
			loadedFonts.set("NSimSun", true)
		}
		if(!loadedFonts.has("SimHei")) {
			const fontPath = `/assets/fonts/simhei.ttf`;
			await loadLocalDefaultFont("SimHei", fontPath)
			loadedFonts.set("SimHei", true)
		}
		if(!loadedFonts.has("SimKai")) {
			const fontPath = `/assets/fonts/simkai.ttf`;
			await loadLocalDefaultFont("SimKai", fontPath)
			loadedFonts.set("SimKai", true)
		}
		if(!loadedFonts.has("SimFang")) {
			const fontPath = `/assets/fonts/SimFang.ttf`;
			await loadLocalDefaultFont("SimFang", fontPath)
			loadedFonts.set("SimFang", true)
		}
		if(!loadedFonts.has("Courier")) {
			const fontPath = `/assets/fonts/Courier.otf`;
			await loadLocalDefaultFont("Courier", fontPath)
			loadedFonts.set("Courier", true)
		}
		if(!loadedFonts.has("Courier-Bold")) {
			const fontPath = `/assets/fonts/Courier-Bold.otf`;
			await loadLocalDefaultFont("Courier-Bold", fontPath)
			loadedFonts.set("Courier-Bold", true)
		}
		if(!loadedFonts.has("Courier-BoldOblique")) {
			const fontPath = `/assets/fonts/Courier-BoldOblique.otf`;
			await loadLocalDefaultFont("Courier-BoldOblique", fontPath)
			loadedFonts.set("Courier-BoldOblique", true)
		}
		if(!loadedFonts.has("FangSong_GB2312")) {
			const fontPath = `/assets/fonts/FangSong_GB2312.otf`;
			await loadLocalDefaultFont("FangSong_GB2312", fontPath)
			loadedFonts.set("FangSong_GB2312", true)
		}
		if(!loadedFonts.has("KaiTi_GB2312")) {
			const fontPath = `/assets/fonts/KaiTi_GB2312.ttf`;
			await loadLocalDefaultFont("KaiTi_GB2312", fontPath)
			loadedFonts.set("KaiTi_GB2312", true)
		}
		if(!loadedFonts.has("Helvetica-Bold")) {
			const fontPath = `/assets/fonts/Helvetica-Bold.otf`;
			await loadLocalDefaultFont("Helvetica-Bold", fontPath)
			loadedFonts.set("Helvetica-Bold", true)
		}
		if(!loadedFonts.has("Helvetica")) {
			const fontPath = `/assets/fonts/Helvetica.otf`;
			await loadLocalDefaultFont("Helvetica", fontPath)
			loadedFonts.set("Helvetica", true)
		}
		if(!loadedFonts.has("Helvetica-Oblique")) {
			const fontPath = `/assets/fonts/Helvetica-Oblique.otf`;
			await loadLocalDefaultFont("Helvetica-Oblique", fontPath)
			loadedFonts.set("Helvetica-Oblique", true)
		}
		if(!loadedFonts.has("Helvetica-BoldOblique")) {
			const fontPath = `/assets/fonts/Helvetica-BoldOblique.ttf`;
			await loadLocalDefaultFont("Helvetica-BoldOblique", fontPath)
			loadedFonts.set("Helvetica-BoldOblique", true)
		}
		if(!loadedFonts.has("Times-Roman")) {
			const fontPath = `/assets/fonts/Times-Roman.otf`;
			await loadLocalDefaultFont("Times-Roman", fontPath)
			loadedFonts.set("Times-Roman", true)
		}
		if(!loadedFonts.has("Times-Bold")) {
			const fontPath = `/assets/fonts/Times-Bold.otf`;
			await loadLocalDefaultFont("Times-Bold", fontPath)
			loadedFonts.set("Times-Bold", true)
		}
		if(!loadedFonts.has("Times-Italic")) {
			const fontPath = `/assets/fonts/Times-Italic.otf`;
			await loadLocalDefaultFont("Times-Italic", fontPath)
			loadedFonts.set("Times-Italic", true)
		}
		if(!loadedFonts.has("Times-BoldItalic")) {
			const fontPath = `/assets/fonts/Times-BoldItalic.otf`;
			await loadLocalDefaultFont("Times-BoldItalic", fontPath)
			loadedFonts.set("Times-BoldItalic", true)
		}
		if(!loadedFonts.has("ZapfDingbats")) {
			const fontPath = `/assets/fonts/ZapfDingbats.otf`;
			await loadLocalDefaultFont("ZapfDingbats", fontPath)
			loadedFonts.set("ZapfDingbats", true)
		}
		if(!loadedFonts.has("xbst")) {
			const fontPath = `/assets/fonts/xbst.ttf`;
			await loadLocalDefaultFont("xbst", fontPath)
			loadedFonts.set("xbst", true)
		}
		if(!loadedFonts.has("ArialMT")) {
			const fontPath = `/assets/fonts/ArialMT.ttf`;
			await loadLocalDefaultFont("ArialMT", fontPath)
			loadedFonts.set("ArialMT", true)
		}
		if(!loadedFonts.has("小标宋体")) {
			const fontPath = `/assets/fonts/xiaobiaosongti.ttf`;
			await loadLocalDefaultFont("小标宋体", fontPath)
			loadedFonts.set("小标宋体", true)
		}
	} catch (e) {
		console.error("加载本地字体出错", e);
	}
}

/**
 * 默认字体映射，字体名称到字体文件名的映射
 * 基于 public/assets/fonts 目录中的实际字体文件
 */
const defaultFontsMap = new Map([
	['KaiTi_GB2312', 'KaiTi_GB2312.ttf'],
	['FangSong_GB2312', 'FangSong_GB2312.otf'],
	['Times-Roman', 'Times-Roman.otf'],
	['Times-Bold', 'Times-Bold.otf'],
	['Times-Italic', 'Times-Italic.otf'],
	['Times-BoldItalic', 'Times-BoldItalic.otf'],
	['Helvetica', 'Helvetica.otf'],
	['Helvetica-Bold', 'Helvetica-Bold.otf'],
	['Helvetica-Oblique', 'Helvetica-Oblique.otf'],
	['Helvetica-BoldOblique', 'Helvetica-BoldOblique.ttf'],
	['Courier', 'Courier.otf'],
	['Courier-Bold', 'Courier-Bold.otf'],
	['Courier-Oblique', 'Courier-Oblique.otf'],
	['Courier-BoldOblique', 'Courier-BoldOblique.otf'],
	['ZapfDingbats', 'ZapfDingbats.otf'],
	['SimSun', 'simsun.ttf'],
	['NSimSun', 'Nsimsun.ttf'],
	['SimHei', 'simhei.ttf'],
	['SimKai', 'simkai.ttf'],
	['SimFang', 'SIMFANG.TTF'],
	['xbst', 'xbst.ttf'],
	['ArialMT', 'ArialMT.ttf']
]);

/**
 * 默认字体列表，用于兼容性
 */
const defaultFonts = Array.from(defaultFontsMap.keys());

/**
 * 获取默认字体映射
 * @returns 字体名称到文件名的映射
 */
export const getDefaultFontsMap = () => {
	return defaultFontsMap;
}

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
		// 从字体映射中获取对应的文件名
		const fileName = defaultFontsMap.get(fontName);
		if (!fileName) {
			console.error(`未找到字体 ${fontName} 对应的文件`);
			return;
		}
		const fontPath = `/assets/fonts/${fileName}`;
		await loadOTFFont(fontName, fontPath)
	} catch (error) {
		console.error(`加载字体 ${fontName} 时出错:`, error);
		throw error;
	}
}

export const loadLocalDefaultFont = async (fontName: string, fontPath: string) => {
	try {
		console.log('load local font', fontName, fontPath)
		await loadOTFFont(fontName, fontPath)
	} catch (error) {
		console.error(`加载字体 ${fontName} 时出错:`, error);
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
	  	const fontBuffer = await response.arrayBuffer();
	  	let fontData = opentype.parse(fontBuffer, null)
		opentypeFonts.set(fontName, fontData)
		console.log("opentype set fonts", opentypeFonts)
	} catch (error) {
	  console.error(`加载字体 ${fontName} 时出错:`, error);
	  throw error;
	}
  }

