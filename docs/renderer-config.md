# 渲染器配置管理器

## 概述

`RendererConfig` 是一个全局单例类，用于统一管理 OFD 文档的渲染器类型和相关配置。它解决了之前渲染器类型标志分散在各个文件中的问题，提供了集中化的配置管理。

## 主要特性

- **单例模式**: 确保全局只有一个配置实例
- **类型安全**: 支持 'canvas' 和 'svg' 两种渲染器类型
- **统一接口**: 提供一致的 API 来检查和设置渲染器类型
- **默认配置**: 默认使用 Canvas 渲染器

## 使用方法

### 基本用法

```typescript
import { rendererConfig } from 'liteofd';

// 检查当前渲染器类型
const isCanvas = rendererConfig.isCanvasRender();
const rendererType = rendererConfig.getRendererType();

// 切换渲染器类型
rendererConfig.setRendererType('canvas'); // 或 'svg'
rendererConfig.setCanvasRenderer(true);   // 或 false

// 重置为默认配置
rendererConfig.resetToDefault();
```

### API 参考

#### `getRendererType(): 'canvas' | 'svg'`
获取当前渲染器类型。

#### `setRendererType(type: 'canvas' | 'svg'): void`
设置渲染器类型。

#### `isCanvasRender(): boolean`
检查是否使用 Canvas 渲染器。

#### `isSvgRender(): boolean`
检查是否使用 SVG 渲染器。

#### `setCanvasRenderer(useCanvas: boolean): void`
直接设置是否使用 Canvas 渲染器。

#### `resetToDefault(): void`
重置为默认配置（Canvas 渲染器）。

## 在项目中的使用

### 1. 在页面渲染中使用

```typescript
// 在 OfdPageContainer 中
if (rendererConfig.isCanvasRender()) {
    // 使用 Canvas 渲染
    this.#renderCanvasContentLayer(pageData, pageContainer);
} else {
    // 使用 SVG 渲染
    this.#renderContentLayer(pageData, pageContainer);
}
```

### 2. 在页面渲染器中

```typescript
// 在 OfdPageRender 中
#renderLayers(pageData: XmlData, pageContainer: HTMLDivElement) {
    if (rendererConfig.isCanvasRender()) {
        this.#renderCanvasContentLayer(pageData, pageContainer);
    } else {
        this.#renderContentLayer(pageData, pageContainer);
    }
}
```

### 3. 动态切换渲染器

```typescript
// 在应用运行时切换渲染器
function switchToCanvas() {
    rendererConfig.setRendererType('canvas');
    // 重新渲染文档
    reRenderDocument();
}

function switchToSvg() {
    rendererConfig.setRendererType('svg');
    // 重新渲染文档
    reRenderDocument();
}
```

## 迁移指南

### 从分散的 isCanvasRender 迁移

**之前的方式:**
```typescript
// 每个类都有自己的 isCanvasRender 属性
class OfdPageContainer {
    private isCanvasRender: boolean = true;
    
    render() {
        if (this.isCanvasRender) {
            // Canvas 渲染
        } else {
            // SVG 渲染
        }
    }
}
```

**现在的方式:**
```typescript
// 使用全局配置
import { rendererConfig } from '../rendererConfig';

class OfdPageContainer {
    render() {
        if (rendererConfig.isCanvasRender()) {
            // Canvas 渲染
        } else {
            // SVG 渲染
        }
    }
}
```

## 优势

1. **集中管理**: 所有渲染器配置都在一个地方管理
2. **一致性**: 确保整个应用使用相同的渲染器配置
3. **易于维护**: 修改配置只需要在一个地方进行
4. **类型安全**: TypeScript 提供完整的类型检查
5. **扩展性**: 可以轻松添加更多配置选项

## 注意事项

- 渲染器配置是全局的，会影响所有新创建的 OFD 文档渲染
- 切换渲染器类型后，需要重新渲染文档才能生效
- 默认使用 Canvas 渲染器，因为它在大多数情况下性能更好

## 示例

查看 `example/renderer-config-demo.html` 文件，了解完整的使用示例和交互演示。 