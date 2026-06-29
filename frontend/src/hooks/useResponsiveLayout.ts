import { useState, useEffect } from 'react';

export type LayoutMode = 'THREE_COLUMN' | 'COLLAPSIBLE_AI' | 'MODAL';

export interface LayoutInfo {
  mode: LayoutMode;
  screenWidth: number;
  isWideScreen: boolean;
  isMediumScreen: boolean;
  isNarrowScreen: boolean;
}

/**
 * 断点定义：与 tailwind.config.js 的 screens 保持一致（唯一来源），改动需同步。
 * - NARROW=768  对应 tailwind 'md'
 * - MEDIUM=1280 对应 tailwind 'xl'
 * - WIDE=1440   对应 tailwind 自定义 'wide'
 */
export const BREAKPOINTS = {
  WIDE: 1440,
  MEDIUM: 1280,
  NARROW: 768,
} as const;

const computeLayout = (width: number): LayoutInfo => {
  let mode: LayoutMode;
  if (width >= BREAKPOINTS.MEDIUM) {
    mode = 'THREE_COLUMN';
  } else if (width >= BREAKPOINTS.NARROW) {
    mode = 'COLLAPSIBLE_AI';
  } else {
    mode = 'MODAL';
  }
  return {
    mode,
    screenWidth: width,
    isWideScreen: width >= BREAKPOINTS.WIDE,
    isMediumScreen: width >= BREAKPOINTS.MEDIUM && width < BREAKPOINTS.WIDE,
    isNarrowScreen: width < BREAKPOINTS.NARROW,
  };
};

export const useResponsiveLayout = (): LayoutInfo => {
  const [layout, setLayout] = useState<LayoutInfo>(() =>
    computeLayout(typeof window !== 'undefined' ? window.innerWidth : 1440),
  );

  useEffect(() => {
    // matchMedia 的 change 事件仅在跨越断点时触发，性能远优于直接监听 resize
    const mqlWide = window.matchMedia(`(min-width: ${BREAKPOINTS.WIDE}px)`);
    const mqlMedium = window.matchMedia(`(min-width: ${BREAKPOINTS.MEDIUM}px)`);
    const mqlNarrow = window.matchMedia(`(min-width: ${BREAKPOINTS.NARROW}px)`);

    const onChange = () => setLayout(computeLayout(window.innerWidth));
    mqlWide.addEventListener('change', onChange);
    mqlMedium.addEventListener('change', onChange);
    mqlNarrow.addEventListener('change', onChange);

    // resize 用 rAF 合并：仅保留每帧最新值，避免高频 setState 引发重排
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setLayout(computeLayout(window.innerWidth)));
    };
    window.addEventListener('resize', onResize);

    return () => {
      mqlWide.removeEventListener('change', onChange);
      mqlMedium.removeEventListener('change', onChange);
      mqlNarrow.removeEventListener('change', onChange);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return layout;
};

export default useResponsiveLayout;
