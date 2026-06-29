import { LoginForm } from '@/components/Auth';
import { SEO } from '@/components/SEO';

export const LoginPage = () => {
  return (
    <>
      <SEO
        title="登录 - DiagramAI"
        description="登录 DiagramAI 账户，使用 AI 驱动的图表创作工具，创建流程图、时序图、甘特图、ER图等多种专业图表。"
        keywords="DiagramAI 登录, 图表工具登录, AI 绘图"
        url="https://diagramai.com/login"
      />
      <LoginForm />
    </>
  );
};
