import { Suspense, useEffect, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { ToastProvider } from '@/contexts/ToastContext';
import { useAuthStore } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/Layout/ErrorBoundary';
import { FullPageLoader } from '@/components/Common/Loading';
import { ReLoginModal } from '@/components/Common/ReLoginModal';
import { SettingsDrawer } from '@/components/Settings/SettingsDrawer';

// 路由级懒加载：将 mermaid / monaco 等重量级依赖隔离到对应 chunk，
// 首页/登录页不再下载编辑器代码，显著降低首屏 JS 体积。
const EditorPage = lazy(() =>
  import('@/pages/EditorPage').then((m) => ({ default: m.EditorPage })),
);
const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const GithubCallbackPage = lazy(() =>
  import('@/pages/GithubCallbackPage').then((m) => ({ default: m.GithubCallbackPage })),
);
const AIWireframePage = lazy(() =>
  import('@/pages/AIWireframePage').then((m) => ({ default: m.AIWireframePage })),
);
const MarkdownEditorPage = lazy(() =>
  import('@/pages/MarkdownEditorPage').then((m) => ({ default: m.MarkdownEditorPage })),
);
const MarkdownSharePage = lazy(() =>
  import('@/pages/MarkdownSharePage').then((m) => ({ default: m.MarkdownSharePage })),
);
const MarkdownViewPage = lazy(() =>
  import('@/pages/MarkdownViewPage').then((m) => ({ default: m.MarkdownViewPage })),
);
const DocsPage = lazy(() =>
  import('@/pages/DocsPage').then((m) => ({ default: m.DocsPage })),
);
const ChartsPage = lazy(() =>
  import('@/pages/ChartsPage').then((m) => ({ default: m.ChartsPage })),
);
const ChartViewPage = lazy(() =>
  import('@/pages/ChartViewPage').then((m) => ({ default: m.ChartViewPage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);

// 路由级加载占位：复用统一全屏加载组件，保持视觉一致
const RouteFallback = () => <FullPageLoader />;

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ErrorBoundary>
      {/* main.tsx 已挂载 ThemeProvider，此处不再重复嵌套，避免副作用重复执行 */}
      <ToastProvider>
        <Router>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/editor" element={<EditorPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login/github-callback" element={<GithubCallbackPage />} />
              <Route path="/ai-wireframe" element={<AIWireframePage />} />
              <Route path="/docs/new" element={<MarkdownEditorPage />} />
              <Route path="/docs/:id" element={<MarkdownEditorPage />} />
              <Route path="/docs/:id/view" element={<MarkdownViewPage />} />
              <Route path="/docs/:id/share/:token" element={<MarkdownSharePage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/charts" element={<ChartsPage />} />
              <Route path="/charts/:id/view" element={<ChartViewPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </Suspense>
          {/* 全局重新登录弹窗：1002 响应触发，挂在 Router 内以支持 useNavigate */}
          <ReLoginModal />
          {/* 全局设置 Drawer：实时预览 + 手动持久化，z-index 低于 ReLoginModal */}
          <SettingsDrawer />
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}
