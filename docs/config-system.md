# LiteOFD 配置系统

LiteOFD 提供了一个灵活的全局配置系统，用于控制调试功能、渲染选项和性能设置。

## 配置文件

配置文件位于 `src/config.json`，包含以下主要部分：

### 调试选项 (debug)

```json
{
  "debug": {
    "drawTextBoundaryBox": false,    // 是否绘制文本边界框
    "drawPathBoundaryBox": false,    // 是否绘制路径边界框
    "drawImageBoundaryBox": false,   // 是否绘制图像边界框
    "logCTMTransform": true,         // 是否输出CTM变换日志
    "logTextRendering": true,        // 是否输出文本渲染日志
    "logFontLoading": true,          // 是否输出字体加载日志
    "showFPS": false                 // 是否显示FPS
  }
}
```

### 渲染选项 (rendering)

```json
{
  "rendering": {
    "enableAntialiasing": true,      // 是否启用抗锯齿
    "textRenderingOptimization": true, // 是否启用文本渲染优化
    "fontCacheSize": 100,            // 字体缓存大小
    "maxCanvasSize": 8192            // 最大Canvas尺寸
  }
}
```

### 性能选项 (performance)

```json
{
  "performance": {
    "enableLazyLoading": true,       // 是否启用懒加载
    "enablePageCaching": true,       // 是否启用页面缓存
    "maxCachedPages": 3              // 最大缓存页面数
  }
}
```

### 功能选项 (features)

```json
{
  "features": {
    "enableZoom": true,              // 是否启用缩放功能
    "enablePan": true,               // 是否启用平移功能
    "enableTextSelection": true,     // 是否启用文本选择
    "enableAnnotation": false         // 是否启用注释功能
  }
}
```

## 使用方法

### 1. 基本使用

```javascript
import LiteOfd from './liteofd/liteOfd.js'

const liteOfd = new LiteOfd()

// 显示配置UI
liteOfd.showConfigUI()

// 隐藏配置UI
liteOfd.hideConfigUI()

// 切换配置UI显示状态
liteOfd.toggleConfigUI()
```

### 2. 编程方式修改配置

```javascript
import { ConfigManager } from './config/configManager.js'

const configManager = ConfigManager.getInstance()

// 启用文本边界框绘制
configManager.updateDebugConfig({ drawTextBoundaryBox: true })

// 禁用CTM变换日志
configManager.updateDebugConfig({ logCTMTransform: false })

// 更新渲染配置
configManager.updateRenderingConfig({ 
  enableAntialiasing: false,
  textRenderingOptimization: false 
})

// 重置为默认配置
configManager.resetToDefault()
```

### 3. 配置持久化

配置会自动保存到浏览器的 localStorage 中，页面刷新后会保持用户的设置。

## 调试功能

### 文本边界框

启用后会在每个文本元素周围绘制红色虚线边框，帮助调试文本位置和大小：

```javascript
configManager.updateDebugConfig({ drawTextBoundaryBox: true })
```

### CTM变换日志

启用后会输出详细的CTM矩阵变换信息：

```javascript
configManager.updateDebugConfig({ logCTMTransform: true })
```

### 文本渲染日志

启用后会输出文本渲染的详细信息：

```javascript
configManager.updateDebugConfig({ logTextRendering: true })
```

## 性能优化

### 字体缓存

可以调整字体缓存大小以平衡内存使用和性能：

```javascript
configManager.updateRenderingConfig({ fontCacheSize: 200 })
```

### 页面缓存

可以调整页面缓存数量：

```javascript
configManager.updatePerformanceConfig({ maxCachedPages: 5 })
```

## 键盘快捷键

在示例页面中可以使用以下快捷键：

- `←` / `→`: 上一页 / 下一页
- `+` / `-`: 放大 / 缩小
- `0`: 重置缩放
- `C`: 切换配置UI

## 自定义配置

可以通过修改 `src/config.json` 文件来自定义默认配置，或者通过编程方式动态修改配置。

## 注意事项

1. 配置更改会立即生效，但某些更改可能需要重新渲染页面才能看到效果
2. 调试功能会影响性能，建议在生产环境中禁用
3. 配置会自动保存到 localStorage，清除浏览器数据会重置配置
4. 使用 `resetToDefault()` 方法可以恢复到默认配置 