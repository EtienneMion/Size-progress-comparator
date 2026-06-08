import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement ResizeObserver, which the chart uses to track width.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserverStub;
