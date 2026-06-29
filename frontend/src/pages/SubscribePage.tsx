import { Header } from '@/components/Layout/Header';
import { PricingCard } from '@/components/Subscription/PricingCard';
import { useAuthStore } from '@/contexts/AuthContext';
import { SEO } from '@/components/SEO';

export const SubscribePage = () => {
  const { user } = useAuthStore();
  const isSubscribed = false;
  const subscribe = () => {};

  const plans = [
    {
      id: 'free',
      name: '免费版',
      price: '0',
      description: '适合个人使用的基础功能',
      features: [
        'Mermaid 图表编辑',
        '实时预览',
        'PNG/SVG 导出',
        '深色/浅色主题',
      ],
      highlighted: false,
    },
    {
      id: 'pro',
      name: 'Pro 版',
      price: '9.9',
      description: '解锁 AI 高级功能',
      features: [
        '包含免费版全部功能',
        'AI 图表生成',
        'AI 语法修复',
        '优先技术支持',
        '无广告体验',
      ],
      highlighted: true,
    },
  ];

  return (
    <>
      <SEO
        title="订阅方案 - DiagramAI"
        description="选择 DiagramAI 订阅方案，免费版支持 Mermaid 图表编辑与实时预览；Pro 版解锁 AI 图表生成、AI 语法修复等高级功能。"
        keywords="DiagramAI 订阅, 图表工具价格, Pro 版订阅, AI 图表生成"
        url="https://diagramai.com/subscribe"
      />
      <div className="min-h-screen bg-white dark:bg-dark-1 p-4">
      <Header />
      <div className="max-w-6xl mx-auto py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-dark-1 dark:text-white mb-4">选择您的方案</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            升级到 Pro 版，解锁 AI 强大功能，让图表创作更高效
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isSubscribed={isSubscribed}
              onSubscribe={() => subscribe()}
            />
          ))}
        </div>

        {user && (
          <div className="mt-8 p-4 bg-light-1 dark:bg-dark-2 border border-light-3 dark:border-dark-3 rounded-xl">
            <h3 className="font-medium text-dark-1 dark:text-white mb-2">当前状态</h3>
            <p className="text-gray-600 dark:text-gray-400">
              您当前使用的是 <span className={isSubscribed ? 'text-primary font-medium' : 'text-gray-500'}>
                {isSubscribed ? 'Pro 版' : '免费版'}
              </span>
            </p>
          </div>
        )}
      </div>
      </div>
    </>
  );
};
