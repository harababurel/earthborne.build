import { vi } from "vitest";

global.console.time = vi.fn();
global.console.timeEnd = vi.fn();

vi.stubGlobal("localStorage", {
  getItem: vi.fn(),
  setItem: vi.fn(),
});
