import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// vitest.config.ts doesn't set `test.globals: true`, so Testing
// Library's automatic afterEach cleanup (which relies on detecting a
// global `afterEach`) never registers — do it explicitly instead.
afterEach(() => {
  cleanup();
});
