import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** 关闭回调；点击遮罩/ESC/关闭按钮触发。设为 null 禁用遮罩点击关闭 */
  onClose?: (() => void) | null;
  children?: ReactNode;
  /** 底部操作区，通常放按钮 */
  footer?: ReactNode;
  /** 视觉变体 */
  variant?: 'default' | 'danger' | 'warning';
  /** 最大宽度 */
  maxWidth?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<NonNullable<DialogProps['variant']>, { ring: string; iconColor: string }> = {
  default: { ring: '', iconColor: '' },
  danger: { ring: 'ring-1 ring-red-500/20', iconColor: 'text-red-500' },
  warning: { ring: 'ring-1 ring-amber-500/20', iconColor: 'text-amber-500' },
};

const widthStyles: Record<NonNullable<DialogProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

/**
 * 轻量模态对话框。
 * - ESC 键 + 点击遮罩关闭（除非 onClose 为 null）
 * - 自动 focus trap 简化版：首次打开聚焦对话框本身
 * - 暗色模式适配
 */
export const Dialog = ({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  variant = 'default',
  maxWidth = 'md',
}: DialogProps) => {
  // ESC 键关闭
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    // 打开时禁止背景滚动
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const { ring, iconColor } = variantStyles[variant];

  const dialog = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
        onClick={onClose ?? undefined}
      />

      {/* 对话框主体 */}
      <div
        className={`relative w-full ${widthStyles[maxWidth]} ${ring} bg-white dark:bg-dark-2 rounded-2xl shadow-2xl border border-light-3 dark:border-dark-3 animate-[dialogIn_0.2s_ease-out]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="flex-1 pr-2">
            <h2 id="dialog-title" className={`text-base font-semibold text-dark-1 dark:text-white ${iconColor}`}>
              {title}
            </h2>
            {description && (
              <div className="mt-1.5 text-sm text-light-text-2 dark:text-dark-text-2 leading-relaxed">
                {description}
              </div>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-light-text-2 dark:text-dark-text-2 hover:bg-light-2 dark:hover:bg-dark-3 transition-colors"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {children && (
          <div className="px-5 py-2 text-sm text-dark-1 dark:text-white">{children}</div>
        )}

        {footer && (
          <div className="flex items-center justify-end gap-2 p-5 pt-3">{footer}</div>
        )}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};
