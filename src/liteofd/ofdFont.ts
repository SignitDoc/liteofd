import { getSerifFonts, getStdFontMap, getSymbolsFonts } from "./font/standard_fonts"
import { getMetrics } from "./font/metrics"
import { FontFlags } from "./font/fonts_utils"
import { IdentityToUnicodeMap, ToUnicodeMap } from "./font/to_unicode_map"
import { defaultEncoding, differences, glyphsWidths, toUnicodeMap } from "./font/differences"
import { TranslatedFont } from "./font/translatedFont"
import { FontFaceObject, FontLoader } from "./font/font_loader"
import { ChunkedStream } from "./font/chunked_stream"
import { Font } from "./font/fonts"
import { XmlData } from "./ofdData"
import * as parser from "./parser"
import { AttributeKey } from "./attrType"
import { normalizeFontName } from "./utils/ofdUtils"
import { fontCache } from "./font/font_cache"
import { tryLoadSystemFont, isFontLoaded } from "./font/system_font_loader"
import { getChineseFontSubstitution, isChineseFont } from "./font/chinese_font_substitutions"

// 全局变量，表示已经加载的字体（向后兼容）
export const loadedFonts = new Map()

// 字体预加载路径配置
let fontPreloadPath = '/fonts/'

// 字体 URL 生成函数
export type FontURLGenerator = (fontName: string, extension?: string) => string
let fontURLGenerator: FontURLGenerator | null = null

/**
 * 设置字体预加载路径
 * @param path 字体文件的基础路径，例如 '/fonts/' 或 'https://cdn.example.com/fonts/'
 */
export const setFontPreloadPath = (path: string) => {
	if (!path) {
		console.warn('[FontLoader] Font preload path is empty, using default')
		return
	}
	fontPreloadPath = path.endsWith('/') ? path : path + '/'
	console.log(`[FontLoader] Font preload path set to: ${fontPreloadPath}`)
}

/**
 * 获取当前字体预加载路径
 */
export const getFontPreloadPath = () => {
	return fontPreloadPath
}

/**
 * 设置字体 URL 生成函数
 * @param generator 字体 URL 生成函数，参数为字体名称和扩展名，返回字体文件的完整 URL
 *
 * @example
 * // 使用 CDN 地址
 * setFontURLGenerator((fontName, extension) =>
 *   `https://cdn.example.com/fonts/${fontName}.${extension || 'otf'}`
 * )
 *
 * @example
 * // 根据字体名称返回不同的路径
 * setFontURLGenerator((fontName) => {
 *   if (fontName.startsWith('Times')) {
 *     return `/static/times/${fontName}.ttf`
 *   }
 *   return `/fonts/${fontName}.otf`
 * })
 *
 * @example
 * // 重置为默认行为
 * setFontURLGenerator(null)
 */
export const setFontURLGenerator = (generator: FontURLGenerator | null) => {
	fontURLGenerator = generator
	if (generator) {
		console.log('[FontLoader] Font URL generator set')
	} else {
		console.log('[FontLoader] Font URL generator reset to default')
	}
}

/**
 * 获取字体文件的 URL
 * @param fontName 字体名称
 * @param extension 字体文件扩展名，默认为 'otf'
 */
export const getFontURL = (fontName: string, extension = 'otf'): string => {
	if (fontURLGenerator) {
		return fontURLGenerator(fontName, extension)
	}
	return `${fontPreloadPath}${fontName}.${extension}`
}

/**
 * 加载内置文件的字体
 * @param fontName 字体名称
 * @param fontBytes 字体文件
 */
const loadFontByArrayBuffer = async (fontName, fontBytes) => {
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
	properties.differences = differences(); 
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
}

/**
 * 按需加载单个字体
 * @param fontFile 字体文件
 * @param fontData 字体数据
 */
export const loadSingleFont = async (fontFile, fontData) => {
	try {
		let fontName = parser.findAttributeValueByKey(fontData, AttributeKey.FontName);
		fontName = normalizeFontName(fontName);
		console.log("加载字体:", fontName);

		await loadFontOnDemand(fontName, fontFile, fontData);
		
		// 向后兼容：设置 loadedFonts
		loadedFonts.set(fontName, true);
	} catch (e) {
		console.error("加载字体出错", e);
	}
}

/**
 * 按需加载字体（主要入口函数）
 * @param fontName 字体名称
 * @param fontFile 字体文件（OFD 文档中嵌入）
 * @param fontData 字体数据
 */
export const loadFontOnDemand = async (
	fontName,
	fontFile,
	fontData
) => {
	const normalizedName = normalizeFontName(fontName);
	console.log(`[FontLoader] Loading font on demand: ${normalizedName}`);

	if (fontCache.has(normalizedName)) {
		fontCache.markUsed(normalizedName);
		console.log(`[FontLoader] Font loaded from cache: ${normalizedName}`);
		return;
	}

	if (isFontLoaded(normalizedName)) {
		const entry = {
			type: 'system',
			name: normalizedName
		};
		fontCache.set(normalizedName, entry);
		console.log(`[FontLoader] Font already loaded: ${normalizedName}`);
		return;
	}

	if (await tryLoadSystemFont(normalizedName)) {
		console.log(`[FontLoader] System font loaded: ${normalizedName}`);
		return;
	}

	if (fontFile) {
		try {
			const fontBytes = await fontFile.async("uint8array");
			await loadEmbeddedFont(normalizedName, fontBytes);
			console.log(`[FontLoader] Embedded font loaded: ${normalizedName}`);
			return;
		} catch (e) {
			console.warn(`[FontLoader] Failed to load embedded font: ${normalizedName}`, e);
		}
	}

	if (isDefaultFont(normalizedName)) {
		try {
			await loadStandardFont(normalizedName);
			console.log(`[FontLoader] Standard font loaded: ${normalizedName}`);
			return;
		} catch (e) {
			console.warn(`[FontLoader] Failed to load standard font: ${normalizedName}`, e);
		}
	}

	console.warn(`[FontLoader] Font not found, using fallback: ${normalizedName}`);
	await loadFallbackFont(normalizedName);
};

/**
 * 加载嵌入字体
 * @param fontName 字体名称
 * @param fontBytes 字体字节数组
 */
const loadEmbeddedFont = async (fontName, fontBytes) => {
	try {
		const fontFace = new FontFace(fontName, fontBytes);
		await fontFace.load();
		document.fonts.add(fontFace);

		const entry = {
			type: 'embedded',
			name: fontName,
			fontFace: fontFace
		};
		fontCache.set(fontName, entry);
	} catch (e) {
		await loadFontByArrayBuffer(fontName, fontBytes);
		fontCache.set(fontName, { type: 'embedded', name: fontName });
	}
}

/**
 * 加载标准字体
 * @param fontName 字体名称
 */
const loadStandardFont = async (fontName) => {
	if (!isDefaultFont(fontName)) {
		return;
	}

	if (await tryLoadSystemFont(fontName)) {
		return;
	}

	const fontPath = getFontURL(fontName, 'otf');
	try {
		const response = await fetch(fontPath);
		if (!response.ok) {
			throw new Error(`Failed to fetch font: ${fontName}`);
		}

		const fontData = await response.arrayBuffer();
		const font = new FontFace(fontName, fontData);
		await font.load();
		document.fonts.add(font);

		const entry = {
			type: 'standard',
			name: fontName,
			fontFace: font
		};
		fontCache.set(fontName, entry);
	} catch (e) {
		console.warn(`Failed to load standard font ${fontName}:`, e);
		await loadFallbackFont(fontName);
	}
}

/**
 * 加载回退字体
 * @param fontName 字体名称
 */
const loadFallbackFont = async (fontName) => {
	const chineseSubstitution = getChineseFontSubstitution(fontName);
	let fallbackFontName = "SimSun";

	if (chineseSubstitution) {
		if (chineseSubstitution.fallback) {
			fallbackFontName = chineseSubstitution.fallback;
		} else if (chineseSubstitution.ultimate) {
			fallbackFontName = chineseSubstitution.ultimate;
		}
	}

	if (isChineseFont(fontName)) {
		if (fallbackFontName === "serif") {
			fallbackFontName = "SimSun";
		} else if (fallbackFontName === "sans-serif") {
			fallbackFontName = "SimHei";
		}
	}

	console.log(`[FontLoader] Using fallback font: ${fontName} -> ${fallbackFontName}`);

	const entry = {
		type: 'fallback',
		name: fontName,
		substitutedName: fallbackFontName
	};
	fontCache.set(fontName, entry);

	if (await tryLoadSystemFont(fallbackFontName)) {
		return;
	}

	if (isDefaultFont(fallbackFontName)) {
		try {
			await loadStandardFont(fallbackFontName);
		} catch (e) {
			console.error(`Failed to load fallback font ${fallbackFontName}:`, e);
		}
	}
}

/**
 * 判断是否为衬线字体
 */
const isSerifFont = (baseFontName) => {
	const fontNameWoStyle = baseFontName.split("-", 1)[0];
	return (
		fontNameWoStyle in getSerifFonts() || /serif/gi.test(fontNameWoStyle)
	);
}

/**
 * 获取字体度量
 */
const getBaseFontMetrics = (name) => {
	let defaultWidth = 0;
	let widths = Object.create({});
	let monospace = false;
	const stdFontMap = getStdFontMap();
	let lookupName = stdFontMap[name] || name;
	const Metrics = getMetrics();

	if (!(lookupName in Metrics)) {
		lookupName = isSerifFont(name) ? "Times-Roman" : "Helvetica";
	}
	const glyphWidths = Metrics[lookupName];

	if (typeof glyphWidths === "number") {
		defaultWidth = glyphWidths;
		monospace = true;
	} else {
		widths = glyphWidths();
	}

	return {
		defaultWidth,
		monospace,
		widths,
	};
}

/**
 * 获取字体类型
 */
const getFontType = (fontData) => {
	return "Type1"
}

/**
 * 获取字体属性
 */
const getFontProperties = (fontType, baseFontName, firstChar, lastChar, loadedName) => {
	const properties = {
		baseEncodingName: null,
		ascent: 690,
		capHeight: 690,
		descent: -209,
		type: fontType,
		name: baseFontName,
		systemFontInfo: null,
		isSimulatedFlags: true,
		flags: 4,
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
 * 加载本地的默认字体（已废弃，使用按需加载）
 * @deprecated 使用 loadFontOnDemand 替代
 */
export const loadLocalDefaultFonts = async () => {
	console.warn("loadLocalDefaultFonts is deprecated. Using on-demand font loading instead.");
	fontCache.clear();
	loadedFonts.clear();
}

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

export const isDefaultFont = (fontName) => {
    return defaultFonts.includes(fontName);
}

export const loadDefaultFont = async (fontName) => {
	if(!isDefaultFont(fontName)) {
		return;
	}
	await loadStandardFont(fontName);
}

export const loadLocalDefaultFont = async (fontName, fontPath) => {
	try {
		console.log('load local font', fontName, fontPath)
		await loadOTFFont(fontName, fontPath)
	} catch (error) {
		console.error(`加载字体 ${fontName} 时出错:`, error);
	}
}

export async function loadOTFFont(fontName, fontPath) {
	try {
	  if (document.fonts.check(`1em ${fontName}`)) {
	        return;
	  }
	  const response = await fetch(fontPath);
	  if (!response.ok) {
		console.error(`无法加载字体文件: ${fontName}`)
		return;
	  }

	  const fontData = await response.arrayBuffer();
	  const font = new FontFace(fontName, fontData);
	  let loadRes = await font.load();
	  console.log("load font res", fontName, loadRes)
	  document.fonts.add(font);

	  const entry = {
		type: 'standard',
		name: fontName,
		fontFace: font
	  };
	  fontCache.set(fontName, entry);
	} catch (error) {
	  console.error(`加载字体 ${fontName} 时出错:`, error);
	  throw error;
	}
  }
