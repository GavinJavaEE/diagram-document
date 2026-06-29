import { useDocStore } from '@/contexts/DocContext';
import { useLocalDocStore } from '@/contexts/LocalDocContext';
import { useAuthStore } from '@/contexts/AuthContext';

/**
 * 本地模式判定：已初始化且未登录。
 * 未初始化时返回 false，避免初始化期间误判为云端模式触发接口请求。
 */
export const useIsLocalMode = (): boolean => {
  const { user, initialized } = useAuthStore();
  return initialized && !user;
};

/**
 * 按登录态切换文档 store。
 *
 * 同时订阅两个 store（满足 React Hooks 规则：不可条件调用 Hook），
 * 仅返回当前模式对应的 store。非激活 store 不会被写入，订阅其无变化的状态开销可忽略。
 *
 * 返回类型结构对齐 DocState / LocalDocState，组件层无需感知差异。
 */
export const useActiveDocStore = () => {
  const isLocalMode = useIsLocalMode();
  const cloud = useDocStore();
  const local = useLocalDocStore();
  return isLocalMode ? local : cloud;
};

/**
 * 非 Hook 场景获取激活 store 的 API（用于 .getState()）。
 * 用于替代直接 useDocStore.getState() 的调用点。
 */
export const getActiveDocApi = (isLocalMode: boolean) =>
  isLocalMode ? useLocalDocStore : useDocStore;

/**
 * 本地文档 store 访问器：无论登录态均可访问本地文档。
 *
 * 用于登录态下的「本地存储」分区展示与编辑入口：
 * - DocSidebar / DocsPage 登录态并行读取本地 + 云端列表，分区渲染
 * - MarkdownEditorPage 登录态点击 local_ 前缀文档时切换到本地编辑
 *
 * 注意：登录态下对本地文档的保存会触发迁移到云端（见 MarkdownEditorPage 保存逻辑）。
 */
export const useLocalDocsAccessor = () => useLocalDocStore();

/**
 * 云端文档 store 访问器：登录态下访问云端 store。
 * 与 useActiveDocStore 在登录态下的返回等价，语义上更明确表达「访问云端」。
 */
export const useCloudDocsAccessor = () => useDocStore();

/**
 * 判断文档 ID 是否属于本地存储。
 * 本地文档 ID 格式为 local_xxx，云端为 doc_xxx 或数字。
 */
export const isLocalDocId = (id: string | undefined | null): boolean =>
  !!id && id.startsWith('local_');
