import { Check, Sparkles } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted: boolean;
}

interface PricingCardProps {
  plan: Plan;
  isSubscribed: boolean;
  onSubscribe: () => void;
}

export const PricingCard = ({ plan, isSubscribed, onSubscribe }: PricingCardProps) => {
  const isCurrentPlan = isSubscribed && plan.id === 'pro';

  return (
    <div
      className={`relative rounded-xl border-2 p-6 transition-all ${
        plan.highlighted
          ? 'border-primary bg-primary/5 dark:bg-primary/10'
          : 'border-light-3 dark:border-dark-3 bg-light-1 dark:bg-dark-2'
      }`}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-medium rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          推荐
        </div>
      )}
      
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-dark-1 dark:text-white mb-2">{plan.name}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{plan.description}</p>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-dark-1 dark:text-white">{plan.price}</span>
          {plan.price !== '0' && <span className="text-gray-500 dark:text-gray-400">元/月</span>}
        </div>
      </div>

      <ul className="space-y-3 mb-6">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-success" />
            </div>
            <span className="text-gray-600 dark:text-gray-300 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSubscribe}
        disabled={isCurrentPlan}
        className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
          isCurrentPlan
            ? 'bg-success/10 text-success cursor-default'
            : plan.highlighted
            ? 'bg-primary hover:bg-primary-dark text-white'
            : 'bg-light-2 dark:bg-dark-3 text-dark-1 dark:text-white hover:bg-light-3 dark:hover:bg-dark-4'
        }`}
      >
        {isCurrentPlan ? '已订阅' : plan.price === '0' ? '免费使用' : '立即订阅'}
      </button>
    </div>
  );
};
