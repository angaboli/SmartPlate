import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// vitest.config.ts doesn't set `test.globals: true`, so Testing
// Library's automatic afterEach cleanup (which relies on detecting a
// global `afterEach`) never registers — do it explicitly instead.
afterEach(() => {
  cleanup();
});

// This setup file runs for every test file, including the ones using the
// default 'node' environment (no `Element`/DOM globals) — only patch when
// a jsdom environment actually provided them.
if (typeof Element !== 'undefined') {
  // jsdom doesn't implement these, but Radix UI primitives (Select,
  // Popover, Dropdown...) call them when opening/positioning content.
  if (typeof Element.prototype.hasPointerCapture !== 'function') {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (typeof Element.prototype.scrollIntoView !== 'function') {
    Element.prototype.scrollIntoView = () => {};
  }
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  // embla-carousel-react (src/components/ui/carousel.tsx) also uses this
  // to detect slide visibility — same jsdom gap as ResizeObserver above.
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  }
  // embla-carousel-react (src/components/ui/carousel.tsx) calls
  // window.matchMedia on mount to watch for reduced-motion/breakpoint
  // changes — jsdom doesn't implement it at all.
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
  }
}
