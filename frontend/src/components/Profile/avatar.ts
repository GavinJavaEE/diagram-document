import type { UserProfileResp } from '@/types';

/**
 * 预设头像渐变配色（8 套）。
 * 用于「资料设置」中的头像选择弹窗；选择结果持久化到 localStorage，
 * 跨设备同步留待阶段三（真实头像上传至 OSS）。
 */
export const AVATAR_GRADIENTS: { id: number; from: string; to: string; label: string }[] = [
  { id: 0, from: '#6366f1', to: '#8b5cf6', label: '靛紫' },
  { id: 1, from: '#3b82f6', to: '#06b6d4', label: '海蓝' },
  { id: 2, from: '#10b981', to: '#34d399', label: '翡翠' },
  { id: 3, from: '#f59e0b', to: '#f97316', label: '琥珀' },
  { id: 4, from: '#ef4444', to: '#ec4899', label: '赤霞' },
  { id: 5, from: '#8b5cf6', to: '#d946ef', label: '兰紫' },
  { id: 6, from: '#14b8a6', to: '#0ea5e9', label: '碧波' },
  { id: 7, from: '#64748b', to: '#334155', label: '岩灰' },
];

const STORAGE_PREFIX = 'profile_avatar_color_';

/** 读取用户自定义配色 index，无则返回 null */
export const getAvatarColorIndex = (userId: string): number | null => {
  const raw = localStorage.getItem(STORAGE_PREFIX + userId);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n < AVATAR_GRADIENTS.length ? n : null;
};

/** 持久化用户选择的配色 index */
export const setAvatarColorIndex = (userId: string, index: number) => {
  localStorage.setItem(STORAGE_PREFIX + userId, String(index));
};

/**
 * 基于字符串 hash 选配色（用户未自定义时的默认视觉身份）。
 * 同一 userId 始终得到同一配色，提供稳定的身份识别。
 */
const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

export interface AvatarStyle {
  /** CSS background 渐变值 */
  background: string;
  /** 显示首字母 */
  initial: string;
}

/**
 * 计算头像样式：优先自定义配色，其次 hash 默认配色。
 * 若 profile.avatarUrl 存在（真实头像 URL），由调用方自行用 <img> 渲染，
 * 本函数仅负责占位头像。
 */
export const getAvatarStyle = (profile: Pick<UserProfileResp, 'userId' | 'nickname' | 'email'>): AvatarStyle => {
  const name = profile.nickname || profile.email || '用户';
  const initial = name.slice(0, 1).toUpperCase();
  const customIdx = getAvatarColorIndex(profile.userId);
  const idx = customIdx !== null ? customIdx : hashString(profile.userId) % AVATAR_GRADIENTS.length;
  const g = AVATAR_GRADIENTS[idx];
  return {
    background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
    initial,
  };
};
