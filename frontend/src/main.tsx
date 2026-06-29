import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as monaco from 'monaco-editor'
import { loader } from '@monaco-editor/react'

// 静态 import worker 模块：Vite 会把它们打包成独立 chunk 并自动处理 URL。
// ?worker 后缀让 Vite 把模块编译为 Worker 构造器；&inline 在 dev/prod 下都稳定，
// 避免动态 new URL('xxx?worker', import.meta.url) 在 Vite 4.5 下的解析问题。
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker&inline'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker&inline'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker&inline'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker&inline'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker&inline'
import App from './App'
import './index.css'
import { ThemeProvider } from './contexts/ThemeProvider'
import { migrateFromLocalStorageIfNeeded } from './lib/localDb'

/**
 * 注入本地打包的 Monaco 实例，告别 jsdelivr CDN。
 * 不调用 loader.config 时，@monaco-editor/react 默认从
 * https://cdn.jsdelivr.net/npm/monaco-editor@x.x.x/min/vs 加载 AMD runtime，
 * 国内访问慢且不稳。注入后 Monaco 与站点同域，由 Vite 打包分发。
 */
loader.config({ monaco })

/**
 * Monaco Web Worker 配置。
 *
 * 使用静态 import + ?worker&inline 把所有 worker 内联为 blob URL，
 * dev 和 prod 都稳定，避免 worker 文件 404 / 跨域 / 路径解析失败。
 * 代价：主 chunk 体积增加约 2-3MB（worker 内联为 base64）。
 *
 * 保留全部语言服务 worker（TS/CSS/JSON/HTML）以备未来扩展使用。
 */
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  },
}

/**
 * 应用根包装：仅 ThemeProvider。
 *
 * chartTypes（图表类型元信息）使用前端内置硬编码数据，无需请求后端，
 * 见 services/chartTypes.ts 的说明。
 */
const AppWrapper = () => {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  )
}

/**
 * 应用启动入口。
 *
 * 执行顺序：
 * 1. Monaco worker 配置（同步）
 * 2. localStorage → IndexedDB 一次性数据迁移（异步，不阻塞渲染）
 * 3. createRoot().render()
 *
 * 迁移采用 fire-and-forget 策略：不阻塞首屏渲染，避免 IDB 冷启动延迟。
 * 迁移失败不影响应用启动（migrateFromLocalStorageIfNeeded 内部已 catch），
 * 下次启动会重试。期间若用户访问未迁移的本地数据，readAllCharts/readAllDocs
 * 会返回空数组，UI 显示空态；迁移完成后的轮询/刷新会拉到正确数据。
 */
const bootstrap = () => {
  // 触发迁移（不阻塞）：默认空数组返回，迁移完成后下次读取即可见
  void migrateFromLocalStorageIfNeeded()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppWrapper />
    </StrictMode>,
  )
}

bootstrap()
