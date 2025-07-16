import { IAppState, DEFAULT_APP_STATE } from './types';

// Mock browser.storage.local
(global as any).browser = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn()
    }
  }
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock performance.now
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
  },
  writable: true,
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock UUID generation for tests
let mockUuidCounter = 0;
export const generateMockUUID = () => `mock-uuid-${mockUuidCounter++}`;

// Helper function to create mock tasks
export const createMockTask = (overrides: Partial<IAppState['lists']['daily'][0]> = {}) => ({
  id: generateMockUUID(),
  text: 'Test task',
  checked: false,
  createdAt: Date.now(),
  order: 0,
  ...overrides,
});

// Helper function to create mock app state
export const createMockAppState = (overrides: Partial<IAppState> = {}): IAppState => ({
  ...DEFAULT_APP_STATE,
  ...overrides,
});

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockUuidCounter = 0;
});

// Setup DOM environment
beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});