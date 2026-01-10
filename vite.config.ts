import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  // 基本公共路径
  base: './',

  // 构建配置
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'), // 修改入口文件路径
      name: 'liteofd',
      formats: ['es', 'cjs'],
      fileName: (format) => {
        if (format === 'es') {
          return 'index.mjs';
        }
        else {
          return 'index.js';
        }
      }, // 修改输出文件名
    },
    outDir: 'dist', // 将输出目录改为 'dist'
    assetsDir: 'assets', // 将静态资源目录设置为 'assets'
    minify: 'terser', // 混淆器
    terserOptions: {
      compress: {
        drop_console: true, // 去除 console
        drop_debugger: true // 去除 debugger
      }
    },
    rollupOptions: {
      external: ['fast-xml-parser', 'js-md5', 'js-sha1', 'jsrsasign', 'jsrsasign-util', 'jszip', 'jszip-utils', 'sm-crypto', 'xmlbuilder2'],
      output: {
        globals: {
          'fast-xml-parser': 'fastXmlParser',
          'js-md5': 'md5',
          'js-sha1': 'sha1',
          'jsrsasign': 'jsrsasign',
          'jsrsasign-util': 'jsrsasignUtil',
          'jszip': 'JSZip',
          'jszip-utils': 'JSZipUtils',
          'sm-crypto': 'smCrypto',
          'xmlbuilder2': 'xmlbuilder2'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && (assetInfo.name.endsWith('.ttf') || assetInfo.name.endsWith('.otf'))) {
            return 'fonts/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      }
    },
    emptyOutDir: false
  },

  // 服务器选项
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: true, // 自动打开浏览器
    cors: true, // 允许跨域
  },

  // 解析选项
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'), // 设置 @ 指向 src 目录
    },
  },

  // 插件
  plugins: [
    dts({
      rollupTypes: true,
      insertTypesEntry: true,
      outDir: 'dist',
      // 添加以下配置
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    }),
    // 这里可以添加 Vite 插件
  ],

  publicDir: 'public'
})
