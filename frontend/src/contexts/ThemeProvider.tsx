import { useEffect } from 'react';
import { useThemeStore } from '@/contexts/ThemeContext';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const { theme } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    if (!root || !body) return;
    
    // 清除旧的主题类
    root.classList.remove('dark', 'light');
    body.classList.remove('dark', 'light');
    
    // 设置新主题
    root.classList.add(theme);
    body.classList.add(theme);
    
    // 设置背景色和文字颜色
    if (theme === 'dark') {
      root.style.backgroundColor = '#0F172A';
      body.style.backgroundColor = '#0F172A';
      body.style.color = '#F8FAFC';
    } else {
      root.style.backgroundColor = '#FFFFFF';
      body.style.backgroundColor = '#FFFFFF';
      body.style.color = '#1E293B';
    }
  }, [theme]);

  return <>{children}</>;
};
