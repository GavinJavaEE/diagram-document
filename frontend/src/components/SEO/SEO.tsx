import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
}

const DEFAULT_TITLE = 'DiagramAI - AI 驱动的图表创作平台 | 流程图 时序图 甘特图 ER图';
const DEFAULT_DESCRIPTION = 'DiagramAI 是一款 AI 驱动的图表创作工具，支持流程图、时序图、甘特图、ER图、类图、状态图等多种图表类型。使用 Mermaid 语法，通过代码或 AI 描述即可快速绘制专业的架构图与业务图。';
const DEFAULT_KEYWORDS = 'DiagramAI, Mermaid, 流程图, 时序图, 甘特图, ER图, 类图, 状态图, AI绘图, 图表工具, 代码绘图, 在线图表, 架构图, 业务流程图, UML图';

export const SEO = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  image = '/og-image.svg',
  url,
}: SEOProps) => {
  useEffect(() => {
    document.title = title;

    const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    setMeta('description', description);
    setMeta('keywords', keywords);

    setMeta('og:title', title, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:image', image, 'property');
    if (url) setMeta('og:url', url, 'property');

    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image);
  }, [title, description, keywords, image, url]);

  return null;
};
