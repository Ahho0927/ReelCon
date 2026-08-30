import { vi } from 'vitest';

Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });

vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
vi.stubGlobal('cancelAnimationFrame', vi.fn());

if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = vi.fn();
}
