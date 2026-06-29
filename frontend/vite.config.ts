import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vite.dev/config/
export default defineConfig({
  build: {
    // 生产环境关闭 sourcemap：显著减小产物体积，错误堆栈通过监控平台另行获取
    sourcemap: false,
    // 产物分块：将重量级依赖拆为独立 chunk，提升缓存命中率并降低首屏 JS 体积
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          mermaid: ['mermaid'],
          monaco: ['monaco-editor', '@monaco-editor/react'],
        },
      },
    },
  },
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 5173,
    proxy: {
      '/send-verification-code': {
        target: 'http://localhost:9091',
        changeOrigin: true,
      },
      '/register': {
        target: 'http://localhost:9091',
        changeOrigin: true,
      },
      '/login': {
        target: 'http://localhost:9091',
        changeOrigin: true,
      },
      '/logout': {
        target: 'http://localhost:9091',
        changeOrigin: true,
      },
      '/github': {
        target: 'http://localhost:9091',
        changeOrigin: true,
      },
      '/me': {
        target: 'http://localhost:9091',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:9091',
        changeOrigin: true,
      },
    },
  },
});
