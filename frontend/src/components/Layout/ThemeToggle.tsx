import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/contexts/ThemeContext';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-light-2 dark:hover:bg-dark-2 text-gray-600 dark:text-gray-300 hover:text-dark-1 dark:hover:text-white transition-colors theme-transition"
      title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
    >
      {theme === 'dark' ? (
        <Sun size={18} />
      ) : (
        <Moon size={18} />
      )}
    </button>
  );
};
