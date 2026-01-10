/**
 * OFD 中文字体替换映射
 * 扩展 PDF.js 的字体替换机制以支持 OFD 中常见的中文字体
 */

import { normalizeFontName } from "./fonts_utils";

const NORMAL = {
    style: "normal",
    weight: "normal",
};
const BOLD = {
    style: "normal",
    weight: "bold",
};
const ITALIC = {
    style: "italic",
    weight: "normal",
};
const BOLDITALIC = {
    style: "italic",
    weight: "bold",
};

/**
 * OFD 中文字体替换映射
 */
const chineseSubstitutionMap = new Map([
    // 宋体
    [
        "SimSun",
        {
            local: [
                "SimSun",
                "宋体",
                "宋体-简",
                "宋体-常规",
                "Songti SC",
                "Noto Sans CJK SC",
                "Source Han Sans SC",
                "HanaMinA",
                "HanaMinB",
                "MingLiU",
                "PMingLiU",
                "MSung GB18030",
                "STSong",
                "DengXian",
                "微软雅黑"
            ],
            style: NORMAL,
            ultimate: "serif",
        },
    ],
    [
        "NSimSun",
        {
            alias: "SimSun",
            style: NORMAL,
            ultimate: "serif",
        },
    ],
    [
        "SimSun-18030",
        {
            alias: "SimSun",
            style: NORMAL,
            ultimate: "serif",
        },
    ],

    // 黑体
    [
        "SimHei",
        {
            local: [
                "SimHei",
                "黑体",
                "黑体-简",
                "黑体-常规",
                "Noto Sans CJK SC",
                "Source Han Sans SC",
                "Microsoft YaHei",
                "微软雅黑",
                "Heiti SC",
                "STHeiti",
                "Droid Sans",
                "WenQuanYi Micro Hei"
            ],
            style: BOLD,
            ultimate: "sans-serif",
        },
    ],
    [
        "SimHei-18030",
        {
            alias: "SimHei",
            style: BOLD,
            ultimate: "sans-serif",
        },
    ],

    // 楷体
    [
        "SimKai",
        {
            local: [
                "SimKai",
                "楷体",
                "楷体-简",
                "楷体-常规",
                "Kaiti SC",
                "Noto Serif CJK SC",
                "Source Han Serif SC",
                "STKaiti",
                "BiauKai",
                "AR PL UKai CN",
                "WenQuanYi Micro Hei Mono"
            ],
            style: NORMAL,
            ultimate: "serif",
        },
    ],
    [
        "KaiTi",
        {
            alias: "SimKai",
            style: NORMAL,
            ultimate: "serif",
        },
    ],

    // 仿宋
    [
        "SimFang",
        {
            local: [
                "SimFang",
                "FangSong",
                "仿宋",
                "仿宋-简",
                "仿宋-常规",
                "FangSong_GB2312",
                "STFangsong",
                "Noto Serif CJK SC",
                "Source Han Serif SC"
            ],
            style: NORMAL,
            ultimate: "serif",
        },
    ],
    [
        "FangSong_GB2312",
        {
            alias: "SimFang",
            style: NORMAL,
            ultimate: "serif",
        },
    ],

    // 微软雅黑
    [
        "MicrosoftYaHei",
        {
            local: [
                "Microsoft YaHei",
                "微软雅黑",
                "微软雅黑-简",
                "微软雅黑-常规",
                "Noto Sans CJK SC",
                "Source Han Sans SC",
                "Heiti SC",
                "SimHei",
                "WenQuanYi Micro Hei"
            ],
            style: NORMAL,
            fallback: "SimHei",
            ultimate: "sans-serif",
        },
    ],
    [
        "Microsoft YaHei",
        {
            alias: "MicrosoftYaHei",
            style: NORMAL,
            ultimate: "sans-serif",
        },
    ],
    [
        "Microsoft YaHei Bold",
        {
            alias: "MicrosoftYaHei",
            style: BOLD,
            ultimate: "sans-serif",
        },
    ],
    [
        "Microsoft YaHei Light",
        {
            alias: "MicrosoftYaHei",
            style: {
                style: "normal",
                weight: "300",
            },
            ultimate: "sans-serif",
        },
    ],

    // 方正舒体
    [
        "FZShuTi",
        {
            local: [
                "FZShuTi",
                "方正舒体",
                "FZShuTi_Regular",
                "STSong",
                "SimSun"
            ],
            style: NORMAL,
            fallback: "SimSun",
            ultimate: "serif",
        },
    ],

    // 方正姚体
    [
        "FZYaoti",
        {
            local: [
                "FZYaoti",
                "方正姚体",
                "FZYaoti_Regular",
                "SimHei",
                "Microsoft YaHei"
            ],
            style: NORMAL,
            fallback: "SimHei",
            ultimate: "sans-serif",
        },
    ],

    // 华文细黑
    [
        "STHeiti",
        {
            local: [
                "STHeiti",
                "华文细黑",
                "STHeiti-Light",
                "Heiti SC",
                "SimHei",
                "Microsoft YaHei"
            ],
            style: NORMAL,
            fallback: "SimHei",
            ultimate: "sans-serif",
        },
    ],

    // 华文楷体
    [
        "STKaiti",
        {
            local: [
                "STKaiti",
                "华文楷体",
                "Kaiti SC",
                "SimKai",
                "KaiTi"
            ],
            style: NORMAL,
            fallback: "SimKai",
            ultimate: "serif",
        },
    ],

    // 华文宋体
    [
        "STSong",
        {
            local: [
                "STSong",
                "华文宋体",
                "Songti SC",
                "SimSun",
                "MingLiU"
            ],
            style: NORMAL,
            fallback: "SimSun",
            ultimate: "serif",
        },
    ],

    // 华文中宋
    [
        "STZhongsong",
        {
            local: [
                "STZhongsong",
                "华文中宋",
                "SimSun",
                "Songti SC"
            ],
            style: NORMAL,
            fallback: "SimSun",
            ultimate: "serif",
        },
    ],

    // 华文仿宋
    [
        "STFangsong",
        {
            local: [
                "STFangsong",
                "华文仿宋",
                "FangSong",
                "SimFang",
                "FangSong_GB2312"
            ],
            style: NORMAL,
            fallback: "SimFang",
            ultimate: "serif",
        },
    ],

    // 华文新魏
    [
        "STXinwei",
        {
            local: [
                "STXinwei",
                "华文新魏",
                "SimSun",
                "Songti SC"
            ],
            style: NORMAL,
            fallback: "SimSun",
            ultimate: "serif",
        },
    ],

    // 华文行楷
    [
        "STXingkai",
        {
            local: [
                "STXingkai",
                "华文行楷",
                "KaiTi",
                "SimKai"
            ],
            style: NORMAL,
            fallback: "SimKai",
            ultimate: "serif",
        },
    ],

    // 思源黑体
    [
        "Source Han Sans SC",
        {
            local: [
                "Source Han Sans SC",
                "Noto Sans CJK SC",
                "SimHei",
                "Microsoft YaHei",
                "思源黑体"
            ],
            style: NORMAL,
            fallback: "SimHei",
            ultimate: "sans-serif",
        },
    ],
    [
        "Noto Sans CJK SC",
        {
            alias: "Source Han Sans SC",
            style: NORMAL,
            ultimate: "sans-serif",
        },
    ],

    // 思源宋体
    [
        "Source Han Serif SC",
        {
            local: [
                "Source Han Serif SC",
                "Noto Serif CJK SC",
                "SimSun",
                "Songti SC",
                "思源宋体"
            ],
            style: NORMAL,
            fallback: "SimSun",
            ultimate: "serif",
        },
    ],
    [
        "Noto Serif CJK SC",
        {
            alias: "Source Han Serif SC",
            style: NORMAL,
            ultimate: "serif",
        },
    ],

    // Adobe 楷体
    [
        "Adobe Kaiti Std",
        {
            local: [
                "Adobe Kaiti Std",
                "Kaiti SC",
                "SimKai",
                "KaiTi"
            ],
            style: NORMAL,
            fallback: "SimKai",
            ultimate: "serif",
        },
    ],

    // Adobe 黑体
    [
        "Adobe Heiti Std",
        {
            local: [
                "Adobe Heiti Std",
                "Heiti SC",
                "SimHei",
                "Microsoft YaHei"
            ],
            style: NORMAL,
            fallback: "SimHei",
            ultimate: "sans-serif",
        },
    ],

    // Adobe 宋体
    [
        "Adobe Song Std",
        {
            local: [
                "Adobe Song Std",
                "Songti SC",
                "SimSun",
                "STSong"
            ],
            style: NORMAL,
            fallback: "SimSun",
            ultimate: "serif",
        },
    ],

    // 文泉驿正黑
    [
        "WenQuanYi Zen Hei",
        {
            local: [
                "WenQuanYi Zen Hei",
                "文泉驿正黑",
                "SimHei",
                "Microsoft YaHei",
                "Noto Sans CJK SC"
            ],
            style: NORMAL,
            fallback: "SimHei",
            ultimate: "sans-serif",
        },
    ],

    // 文泉驿微米黑
    [
        "WenQuanYi Micro Hei",
        {
            local: [
                "WenQuanYi Micro Hei",
                "文泉驿微米黑",
                "SimHei",
                "Microsoft YaHei",
                "Noto Sans CJK SC"
            ],
            style: NORMAL,
            fallback: "SimHei",
            ultimate: "sans-serif",
        },
    ],

    // 等宽字体（中文）
    [
        "SimSun-ExtB",
        {
            alias: "SimSun",
            style: NORMAL,
            ultimate: "serif",
        },
    ],

    // 特殊 OFD 字体
    [
        "xbst",
        {
            local: [
                "SimSun",
                "宋体",
                "Songti SC",
                "SimHei"
            ],
            style: NORMAL,
            fallback: "SimSun",
            ultimate: "serif",
        },
    ],

    // ArialMT（OFD 中常见）
    [
        "ArialMT",
        {
            local: [
                "Arial",
                "Arial MT",
                "Helvetica",
                "Helvetica Neue",
                "Liberation Sans",
                "Nimbus Sans"
            ],
            style: NORMAL,
            ultimate: "sans-serif",
        },
    ],
]);

/**
 * 获取 OFD 中文字体替换映射
 * @param fontName 字体名称
 * @returns 字体替换信息
 */
export function getChineseFontSubstitution(fontName) {
    const normalizedName = normalizeFontName(fontName);
    return chineseSubstitutionMap.get(normalizedName);
}

/**
 * 检查是否为 OFD 中文字体
 * @param fontName 字体名称
 * @returns 是否为中文字体
 */
export function isChineseFont(fontName) {
    const normalizedName = normalizeFontName(fontName);
    return chineseSubstitutionMap.has(normalizedName);
}

/**
 * 获取中文字体映射表
 * @returns 字体映射表
 */
export function getChineseFontMap() {
    return chineseSubstitutionMap;
}
