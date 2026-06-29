import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

type ToastType = 'error' | 'success' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdCounter = 0;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'error') => {
      const id = ++toastIdCounter;
      setToasts((prev) => [...prev, { id, type, message }]);
      // 自动消失
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast],
  );

  const showError = useCallback(
    (message: string) => showToast(message, 'error'),
    [showToast],
  );

  const showSuccess = useCallback(
    (message: string) => showToast(message, 'success'),
    [showToast],
  );

  const showInfo = useCallback(
    (message: string) => showToast(message, 'info'),
    [showToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess, showInfo }}>
      {children}
     {/* Toast 容器 - 正上方居中定位 */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-5 py-4 rounded-xl shadow-xl border transform transition-all duration-300 flex items-start gap-3 ${
              toast.type === 'error'
                ? 'bg-red-700 border-red-600'
                : toast.type === 'success'
                  ? 'bg-green-700 border-green-600'
                  : 'bg-blue-700 border-blue-600'
            }`}
          >
            <span className="text-lg leading-none mt-0.5 text-white">
              {toast.type === 'error' ? '✕' : toast.type === 'success' ? '✓' : 'ⓘ'}
            </span>
            <p className="text-sm flex-1 text-white font-medium">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-lg leading-none hover:opacity-70 transition-opacity text-white"
              aria-label="关闭提示"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
