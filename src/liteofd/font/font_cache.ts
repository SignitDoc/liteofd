/**
 * 字体缓存模块
 * 用于管理已加载的字体，支持缓存清理和使用统计
 */

/**
 * 字体缓存类
 */
export class FontCache {
    constructor() {
        this.cache = new Map();
    }

    /**
     * 获取字体缓存条目
     * @param fontName 字体名称
     * @returns 字体缓存条目
     */
    get(fontName) {
        return this.cache.get(fontName);
    }

    /**
     * 设置字体缓存条目
     * @param fontName 字体名称
     * @param entry 缓存条目
     */
    set(fontName, entry) {
        entry.loadTime = Date.now();
        entry.usageCount = 0;
        this.cache.set(fontName, entry);
    }

    /**
     * 检查字体是否已缓存
     * @param fontName 字体名称
     * @returns 是否已缓存
     */
    has(fontName) {
        return this.cache.has(fontName);
    }

    /**
     * 标记字体使用（增加使用计数）
     * @param fontName 字体名称
     */
    markUsed(fontName) {
        const entry = this.cache.get(fontName);
        if (entry) {
            entry.usageCount = (entry.usageCount || 0) + 1;
        }
    }

    /**
     * 清理未使用的字体
     * @param maxAge 最大未使用时间（毫秒）
     * @returns 清理的字体数量
     */
    cleanup(maxAge = 60000) {
        const now = Date.now();
        let cleaned = 0;

        for (const [name, entry] of this.cache) {
            if (entry.loadTime && (now - entry.loadTime) > maxAge) {
                if (!entry.usageCount || entry.usageCount === 0) {
                    this.cache.delete(name);
                    if (entry.fontFace) {
                        document.fonts.delete(entry.fontFace);
                    }
                    cleaned++;
                }
            }
        }

        return cleaned;
    }

    /**
     * 清空缓存
     */
    clear() {
        for (const [name, entry] of this.cache) {
            if (entry.fontFace) {
                document.fonts.delete(entry.fontFace);
            }
        }
        this.cache.clear();
    }

    /**
     * 获取缓存统计信息
     * @returns 缓存统计
     */
    getStats() {
        const stats = {
            total: this.cache.size,
            system: 0,
            embedded: 0,
            standard: 0,
            substituted: 0,
            fallback: 0,
            used: 0
        };

        for (const entry of this.cache.values()) {
            stats[entry.type]++;
            if (entry.usageCount && entry.usageCount > 0) {
                stats.used++;
            }
        }

        return stats;
    }

    /**
     * 获取所有缓存的字体名称
     * @returns 字体名称数组
     */
    getFontNames() {
        return Array.from(this.cache.keys());
    }

    /**
     * 删除指定字体缓存
     * @param fontName 字体名称
     */
    delete(fontName) {
        const entry = this.cache.get(fontName);
        if (entry && entry.fontFace) {
            document.fonts.delete(entry.fontFace);
        }
        this.cache.delete(fontName);
    }
}

// 全局字体缓存实例
export const fontCache = new FontCache();
