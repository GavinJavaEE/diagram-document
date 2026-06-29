import { Sun, Moon, Menu, X, Code2, User, LogOut, ChevronDown, UserCircle, Plus, FileText, BarChart3 } from 'lucide-react';
import { useAuthStore } from '@/contexts/AuthContext';
import { useThemeStore } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export const Header = () => {
  const { user, logout, initialized } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);

  const pathname = location.pathname;

  // 胶囊式导航项样式：active 填充 primary/10，hover 填充 light-2，点击反馈明确
  const navItemClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-primary/10 text-primary hover:bg-primary/15'
        : 'text-gray-600 dark:text-gray-300 hover:text-dark-1 dark:hover:text-white hover:bg-light-2 dark:hover:bg-dark-2'
    }`;

  const handleLogout = async () => {
    // 必须先关闭菜单并跳转前的清理：await logout() 确保后端 /logout 完成、
    // store user 已清空，再 navigate。否则跳转后首页可能短暂读到旧 user 状态。
    setUserMenuOpen(false);
    try {
      await logout();
      showSuccess('已退出登录');
    } catch (err) {
      // 后端 logout 失败：前端 state 已清（AuthContext.logout 保证），但 cookie/Redis 可能未清
      // 刷新页面后会恢复登录态，提示用户重试
      const message = err instanceof Error ? err.message : '退出登录失败';
      showError(`退出登录失败：${message}，请刷新页面后重试`);
    }
    navigate('/');
  };

  // 点击外部关闭用户下拉菜单
  useEffect(() => {
    if (!userMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [userMenuOpen]);

  // 点击外部关闭新建下拉菜单
  useEffect(() => {
    if (!newMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setNewMenuOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [newMenuOpen]);

  // 点击外部关闭移动端菜单
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-header-menu-container]')) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [mobileMenuOpen]);

  // 从邮箱提取用户名
  const displayName = user?.email ? user.email.split('@')[0] : '用户';
  // 显示首字母（大写）
  const initial = displayName.slice(0, 1).toUpperCase();

  const handleNewChart = () => {
    setNewMenuOpen(false);
    setMobileMenuOpen(false);
    window.open('/editor', '_blank', 'noopener,noreferrer');
  };

  const handleNewDoc = () => {
    setNewMenuOpen(false);
    setMobileMenuOpen(false);
    window.open('/docs/new', '_blank', 'noopener,noreferrer');
  };

  return (
    <header className="relative h-14 bg-white dark:bg-dark-1 border-b border-light-3 dark:border-dark-3 flex items-center justify-between px-4 theme-transition">
      {/* 左侧：Logo + 导航（流式布局，避免 absolute 居中导致的间距跳跃） */}
      <div className="flex items-center gap-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-dark-1 dark:text-white hidden sm:block">DiagramAI</span>
        </Link>

        {/* 胶囊式导航：绘图（图表列表+编辑入口） + 文档 */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/charts"
            className={navItemClass(pathname.startsWith('/charts') || pathname.startsWith('/editor'))}
          >
            绘图
          </Link>
          <Link to="/docs" className={navItemClass(pathname.startsWith('/docs'))}>
            文档
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-2" data-header-menu-container>
        {/* +新建 下拉按钮 */}
        <div ref={newMenuRef} className="hidden sm:block relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNewMenuOpen(!newMenuOpen);
              setUserMenuOpen(false);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors shadow-sm shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            新建
            <ChevronDown className={`w-3 h-3 opacity-80 transition-transform ${newMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {newMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-dark-2 rounded-xl shadow-lg border border-light-3 dark:border-dark-3 overflow-hidden z-50 animate-fade-in">
              <button
                onClick={handleNewChart}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-light-2 dark:hover:bg-dark-3 transition-colors"
              >
                <BarChart3 className="w-4 h-4 text-primary" />
                新建图表
              </button>
              <button
                onClick={handleNewDoc}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-light-2 dark:hover:bg-dark-3 transition-colors"
              >
                <FileText className="w-4 h-4 text-emerald-500" />
                新建文档
              </button>
            </div>
          )}
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-dark-1 dark:hover:text-white hover:bg-light-2 dark:hover:bg-dark-2 transition-colors"
          title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* 桌面端：已登录状态 */}
        {initialized && user ? (
          <div ref={userMenuRef} className="hidden sm:block relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-light-2 dark:hover:bg-dark-2 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm">
                {initial || <User className="w-4 h-4" />}
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 max-w-[160px] truncate">
                {user.email}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-dark-2 rounded-xl shadow-lg border border-light-3 dark:border-dark-3 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-light-3 dark:border-dark-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">当前账号</p>
                  <p className="text-sm font-medium text-dark-1 dark:text-white truncate mt-0.5">
                    {user.email}
                  </p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-light-2 dark:hover:bg-dark-3 transition-colors"
                >
                  <UserCircle className="w-4 h-4" />
                  个人中心
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-light-2 dark:hover:bg-dark-3 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              </div>
            )}
          </div>
        ) : initialized ? (
          <div className="hidden sm:flex items-center gap-2">
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-dark-1 dark:hover:text-white hover:bg-light-2 dark:hover:bg-dark-2 transition-colors text-sm font-medium"
            >
              <User className="w-4 h-4" />
              登录
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium text-sm transition-colors"
            >
              注册
            </Link>
          </div>
        ) : null}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setMobileMenuOpen(!mobileMenuOpen);
          }}
          className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-dark-1 dark:hover:text-white hover:bg-light-2 dark:hover:bg-dark-2 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="absolute top-14 left-0 right-0 bg-white dark:bg-dark-1 border-b border-light-3 dark:border-dark-3 p-4 md:hidden animate-fade-in z-50 shadow-lg">
          <nav className="flex flex-col gap-2">
            <button
              onClick={handleNewChart}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white font-medium transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              新建图表
            </button>
            <button
              onClick={handleNewDoc}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 text-white font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              新建文档
            </button>
            <div className="h-px bg-light-3 dark:bg-dark-3 my-1" />
            <Link
              to="/charts"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-dark-1 dark:hover:text-white hover:bg-light-2 dark:hover:bg-dark-2 transition-colors"
            >
              绘图
            </Link>
            <Link
              to="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-dark-1 dark:hover:text-white hover:bg-light-2 dark:hover:bg-dark-2 transition-colors"
            >
              文档
            </Link>
            <button
              onClick={() => {
                toggleTheme();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-dark-1 dark:hover:text-white hover:bg-light-2 dark:hover:bg-dark-2 transition-colors text-left"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? '浅色模式' : '深色模式'}
            </button>
            {initialized && user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-medium">
                    {initial}
                  </div>
                  <span className="text-sm truncate">{user.email}</span>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-dark-1 dark:hover:text-white hover:bg-light-2 dark:hover:bg-dark-2 transition-colors"
                >
                  <UserCircle className="w-4 h-4" />
                  个人中心
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-dark-1 dark:hover:text-white hover:bg-light-2 dark:hover:bg-dark-2 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              </>
            ) : initialized ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-dark-1 dark:hover:text-white hover:bg-light-2 dark:hover:bg-dark-2 transition-colors"
                >
                  <User className="w-4 h-4" />
                  登录
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors"
                >
                  注册
                </Link>
              </>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  );
};
