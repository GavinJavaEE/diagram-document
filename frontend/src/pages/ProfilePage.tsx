import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, History, Shield, ArrowLeft } from 'lucide-react';
import type { UserProfileResp } from '@/types';
import { getUserProfile } from '@/services/api';
import { useAuthStore } from '@/contexts/AuthContext';
import { Header } from '@/components/Layout/Header';
import { SEO } from '@/components/SEO';
import { FullPageLoader, LoadingError, useLoadingTimeout } from '@/components/Common/Loading';
import { OverviewTab } from '@/components/Profile/OverviewTab';
import { SettingsTab } from '@/components/Profile/SettingsTab';
import { AiHistoryTab } from '@/components/Profile/AiHistoryTab';
import { SecurityTab } from '@/components/Profile/SecurityTab';
import { buildLoginUrl } from '@/utils/loginRedirect';

type TabId = 'overview' | 'settings' | 'history' | 'security';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: '概览', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'settings', label: '资料设置', icon: <Settings className="w-4 h-4" /> },
  { id: 'history', label: 'AI 历史', icon: <History className="w-4 h-4" /> },
  { id: 'security', label: '账号安全', icon: <Shield className="w-4 h-4" /> },
];

export const ProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, initialized } = useAuthStore();
  const [profile, setProfile] = useState<UserProfileResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const state = location.state as { tab?: TabId } | null;
    return state?.tab || 'overview';
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserProfile();
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载个人资料失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 登录守卫：未登录跳转登录页，带 redirect 参数以便登录后回跳到个人中心
  useEffect(() => {
    if (initialized && !user) {
      navigate(buildLoginUrl('/profile'), { replace: true });
    }
  }, [initialized, user, navigate]);

  // 初始化加载 profile
  useEffect(() => {
    if (user) {
      void loadProfile();
    }
  }, [user, loadProfile]);

  const timedOut = useLoadingTimeout(loading);

  // 未初始化或正在跳转登录
  if (!initialized || (!user && loading)) {
    return <FullPageLoader />;
  }

  // 未登录（守卫已在跳转中）
  if (!user) {
    return <FullPageLoader message="正在跳转登录…" />;
  }

  if (loading) {
    return timedOut ? (
      <div className="min-h-screen flex items-center justify-center bg-light-1 dark:bg-dark-1 p-4">
        <LoadingError message="加载时间较长，请检查网络后重试" onRetry={loadProfile} />
      </div>
    ) : (
      <>
        <Header />
        <FullPageLoader message="正在加载个人中心…" />
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <Header />
        <div className="min-h-[60vh] flex items-center justify-center bg-light-1 dark:bg-dark-1 p-4">
          <LoadingError message={error || '加载失败'} onRetry={loadProfile} />
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title="个人中心 - DiagramAI" description="管理个人资料、查看 AI 用量与历史记录" />
      <Header />
      <div className="min-h-screen bg-light-1 dark:bg-dark-1">
        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* 页面标题 */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-light-2 dark:hover:bg-dark-2 transition-colors"
              title="返回"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-dark-1 dark:text-white">个人中心</h1>
          </div>

          {/* Tab 导航：桌面端横向，移动端横向滚动 */}
          <div className="mb-6 overflow-x-auto">
            <nav className="flex gap-1 min-w-max border-b border-light-3 dark:border-dark-3">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === t.id
                      ? 'text-primary after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-0.5 after:bg-primary after:content-[""]'
                      : 'text-gray-500 dark:text-gray-400 hover:text-dark-1 dark:hover:text-white'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab 内容 */}
          <div className="pb-12">
            {activeTab === 'overview' && (
              <OverviewTab
                profile={profile}
                onNavigateToAiHistory={() => setActiveTab('history')}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsTab profile={profile} onUpdated={setProfile} />
            )}
            {activeTab === 'history' && <AiHistoryTab />}
            {activeTab === 'security' && <SecurityTab profile={profile} />}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
