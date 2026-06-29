import { RegisterForm } from '@/components/Auth';
import { SEO } from '@/components/SEO';

export const RegisterPage = () => {
  return (
    <>
      <SEO
        title="注册 - DiagramAI"
        description="免费注册 DiagramAI 账户，体验 AI 驱动的图表创作工具，支持流程图、时序图、甘特图、ER图等多种图表类型。"
        keywords="DiagramAI 注册, 免费注册, 图表工具账户"
        url="https://diagramai.com/register"
      />
      <RegisterForm />
    </>
  );
};
