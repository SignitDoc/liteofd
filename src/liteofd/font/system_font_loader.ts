/**
 * 系统字体加载模块
 * 实现系统字体检测和 FontFace API 的 local() 源加载
 */

import { fontCache } from "./font_cache";
import { getChineseFontSubstitution } from "./chinese_font_substitutions";
import { normalizeFontName } from "./fonts_utils";

/**
 * 尝试加载系统字体
 * @param fontName 字体名称
 * @returns 是否成功加载系统字体
 */
export async function tryLoadSystemFont(fontName) {
    if (!document.fonts) {
        return false;
    }

    const normalizedName = normalizeFontName(fontName);

    // 检查缓存
    if (fontCache.has(normalizedName)) {
        const entry = fontCache.get(normalizedName);
        if (entry && entry.type === 'system') {
            fontCache.markUsed(normalizedName);
            return true;
        }
    }

    // 检查字体是否已经加载
    if (document.fonts.check(`1em ${fontName}`) || document.fonts.check(`1em ${normalizedName}`)) {
        const entry = {
            type: 'system',
            name: normalizedName
        };
        fontCache.set(normalizedName, entry);
        return true;
    }

    // 尝试通过字体替换映射加载系统字体
    const chineseSubstitution = getChineseFontSubstitution(fontName);
    if (chineseSubstitution && chineseSubstitution.local) {
        for (const localName of chineseSubstitution.local) {
            try {
                const fontFace = new FontFace(fontName, `local('${localName}')`);
                await fontFace.load();
                document.fonts.add(fontFace);

                const entry = {
                    type: 'system',
                    name: normalizedName,
                    fontFace: fontFace,
                    substitutedName: localName
                };
                fontCache.set(normalizedName, entry);
                console.log(`[FontLoader] System font loaded: ${normalizedName} -> ${localName}`);
                return true;
            } catch (e) {
                continue;
            }
        }
    }

    // 尝试直接使用字体名称
    try {
        const fontFace = new FontFace(fontName, `local('${fontName}')`);
        await fontFace.load();
        document.fonts.add(fontFace);

        const entry = {
            type: 'system',
            name: normalizedName,
            fontFace: fontFace
        };
        fontCache.set(normalizedName, entry);
        console.log(`[FontLoader] System font loaded: ${normalizedName}`);
        return true;
    } catch (e) {
        // 尝试规整后的字体名称
        try {
            const fontFace = new FontFace(normalizedName, `local('${normalizedName}')`);
            await fontFace.load();
            document.fonts.add(fontFace);

            const entry = {
                type: 'system',
                name: normalizedName,
                fontFace: fontFace
            };
            fontCache.set(normalizedName, entry);
            console.log(`[FontLoader] System font loaded: ${normalizedName}`);
            return true;
        } catch (e2) {
            return false;
        }
    }
}

/**
 * 检查字体是否已加载
 * @param fontName 字体名称
 * @returns 是否已加载
 */
export function isFontLoaded(fontName) {
    const normalizedName = normalizeFontName(fontName);
    return fontCache.has(normalizedName) || 
           document.fonts.check(`1em ${fontName}`) || 
           document.fonts.check(`1em ${normalizedName}`);
}

/**
 * 等待字体加载完成
 * @param fontName 字体名称
 * @param timeout 超时时间（毫秒）
 * @returns 是否加载成功
 */
export async function waitForFontLoad(fontName, timeout = 5000) {
    const normalizedName = normalizeFontName(fontName);
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (isFontLoaded(fontName)) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return false;
}
