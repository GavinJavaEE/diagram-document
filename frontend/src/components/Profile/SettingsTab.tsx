import { useState } from 'react';
import { Save, Check, Palette } from 'lucide-react';
import type { UserProfileResp, UserProfileUpdateReq } from '@/types';
import { updateUserProfile } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { Dialog } from '@/components/Common/Dialog';
import { Spinner } from '@/components/Common/Loading';
import { AVATAR_GRADIENTS, getAvatarColorIndex, getAvatarStyle, setAvatarColorIndex } from './avatar';
import { maskEmail } from '@/utils/format';

interface SettingsTabProps {
  profile: UserProfileResp;
  /** 保存成功后回调，父组件刷新 profile */
  onUpdated: (p: UserProfileResp) => void;
}

export const SettingsTab = ({ profile, onUpdated }: SettingsTabProps) => {
  const { showSuccess, showError } = useToast();
  const [form, setForm] = useState<UserProfileUpdateReq>({
    nickname: profile.nickname || '',
    phone: profile.phone || '',
    location: profile.location || '',
  });
  const [saving, setSaving] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [colorIdx, setColorIdx] = useState<number>(
    getAvatarColorIndex(profile.userId) ?? -1,
  );

  const avatar = getAvatarStyle(profile);
  const dirty =
    (form.nickname || '') !== (profile.nickname || '') ||
    (form.phone || '') !== (profile.phone || '') ||
    (form.location || '') !== (profile.location || '');

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const updated = await updateUserProfile(form);
      onUpdated(updated);
      showSuccess('资料已更新');
    } catch (err) {
      showError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePickColor = (idx: number) => {
    setColorIdx(idx);
    setAvatarColorIndex(profile.userId, idx);
    setShowAvatarDialog(false);
    showSuccess('头像配色已更新');
  };

  return (
    <div className="space-y-6">
      {/* 头像设置 */}
      <div className="bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-2xl p-6">
        <h3 className="text-base font-semibold text-dark-1 dark:text-white mb-4">头像与昵称</h3>
        <div className="flex items-center gap-4">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.nickname || profile.email}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl"
              style={{ background: avatar.background }}
            >
              {avatar.initial}
            </div>
          )}
          <div>
            <button
              type="button"
              onClick={() => setShowAvatarDialog(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-light-2 dark:bg-dark-3 hover:bg-light-3 dark:hover:bg-dark-2 rounded-lg transition-colors"
            >
              <Palette className="w-4 h-4" />
              更换配色
            </button>
            <p className="text-xs text-light-text-2 dark:text-dark-text-2 mt-1.5">
              基于首字母生成占位头像，真实头像上传将在后续版本支持
            </p>
          </div>
        </div>
      </div>

      {/* 资料表单 */}
      <div className="bg-white dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-2xl p-6">
        <h3 className="text-base font-semibold text-dark-1 dark:text-white mb-4">基本资料</h3>
        <div className="space-y-4">
          <Field label="邮箱（不可修改）">
            <input
              type="email"
              value={maskEmail(profile.email)}
              disabled
              className="w-full px-3 py-2 text-sm bg-light-2 dark:bg-dark-3 text-light-text-2 dark:text-dark-text-2 rounded-lg border border-light-3 dark:border-dark-3 cursor-not-allowed"
            />
          </Field>
          <Field label="昵称">
            <input
              type="text"
              value={form.nickname || ''}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              placeholder="设置一个昵称"
              maxLength={32}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-1 text-dark-1 dark:text-white rounded-lg border border-light-3 dark:border-dark-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </Field>
          <Field label="手机号">
            <input
              type="tel"
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="选填"
              maxLength={20}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-1 text-dark-1 dark:text-white rounded-lg border border-light-3 dark:border-dark-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </Field>
          <Field label="所在地">
            <input
              type="text"
              value={form.location || ''}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="选填，如 北京"
              maxLength={64}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-1 text-dark-1 dark:text-white rounded-lg border border-light-3 dark:border-dark-3 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 mt-5">
          {dirty && (
            <span className="text-xs text-amber-500">有未保存的更改</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Spinner size="sm" /> : dirty ? <Save className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            保存
          </button>
        </div>
      </div>

      {/* 头像配色选择弹窗 */}
      <Dialog
        open={showAvatarDialog}
        title="选择头像配色"
        description="选择一个喜欢的配色，将基于昵称首字母生成专属头像。"
        onClose={() => setShowAvatarDialog(false)}
        maxWidth="md"
      >
        <div className="grid grid-cols-4 gap-3 py-2">
          {AVATAR_GRADIENTS.map((g) => {
            const active = colorIdx === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => handlePickColor(g.id)}
                className={`relative aspect-square rounded-2xl flex items-center justify-center text-white font-bold text-2xl transition-all ${active ? 'ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-dark-2 scale-105' : 'hover:scale-105'}`}
                style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                title={g.label}
              >
                {avatar.initial}
                {active && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Dialog>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-medium text-light-text-2 dark:text-dark-text-2 mb-1.5">{label}</label>
    {children}
  </div>
);
