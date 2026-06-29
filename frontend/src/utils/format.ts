/**
 * 邮箱脱敏：用户名部分仅保留首字符，其余用 *** 代替，域名完整保留。
 * 例：826343411@qq.com → 8***@qq.com
 */
export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  if (name.length <= 1) return `${name}***@${domain}`;
  return `${name[0]}***@${domain}`;
};
