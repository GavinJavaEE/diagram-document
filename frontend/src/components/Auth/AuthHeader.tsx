import { Sun, Moon, Code2, Home, ArrowRight } from 'lucide-react';
import { useThemeStore } from '@/contexts/ThemeContext';
import { Link } from 'react-router-dom';

export const AuthHeader = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="h-14 bg-white dark:bg-dark-1 border-b border-light-3 dark:border-dark-3 flex items-center justify-between px-4 theme-transition">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Code2 className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-dark-1 dark:text-white hidden sm:block">DiagramAI</span>
      </Link>

      <div className="flex items-center gap-2">
        <Link
          to="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:text-dark-1 dark:hover:text-white hover:bg-light-2 dark:hover:bg-dark-2 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">首页</span>
        </Link>
        <Link
          to="/editor"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Code2 className="w-4 h-4" />
          <span className="hidden sm:inline">编辑器</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-dark-1 dark:hover:text-white hover:bg-light-2 dark:hover:bg-dark-2 transition-colors"
          title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};
