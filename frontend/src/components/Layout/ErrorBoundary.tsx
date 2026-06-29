import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 注意：此 fallback 渲染在 <Router> 之外（ErrorBoundary 包裹 Router），
      // 因此不能使用 react-router 的 <Link> / useNavigate，否则会触发
      // "Cannot destructure property 'basename' of useContext(...)" 错误。
      // 改用原生 a 标签 + window.location 跳转。
      return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-dark-1 p-4">
          <div className="max-w-md w-full bg-light-1 dark:bg-dark-2 rounded-xl border border-light-3 dark:border-dark-3 p-8 shadow-lg">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-error" />
              </div>
              <h2 className="text-xl font-semibold text-dark-1 dark:text-white mb-2">
                页面出现了问题
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 break-all">
                {this.state.error?.message || '发生了一个意外错误，请尝试刷新页面。'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-light-2 dark:bg-dark-3 text-gray-600 dark:text-gray-300 hover:bg-light-3 dark:hover:bg-dark-2 rounded-lg transition-colors"
                >
                  <Home className="w-4 h-4" />
                  返回首页
                </button>
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  刷新页面
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
