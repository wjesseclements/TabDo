export interface ITask {
  id: string;
  text: string;
  checked: boolean;
  createdAt: number;
  order: number;
  isRecurring: boolean;
}

export interface IAppState {
  version: number;
  lists: {
    daily: ITask[];
    weekly: ITask[];
  };
  theme: 'light' | 'dark' | 'system';
  lastReset: number;
}

export type ListType = 'daily' | 'weekly';

export interface IStorageManager {
  load(): Promise<IAppState>;
  save(state: IAppState): Promise<void>;
  clear(): Promise<void>;
}

export interface ITaskOperations {
  addTask(listType: ListType, text: string): Promise<void>;
  updateTask(listType: ListType, taskId: string, updates: Partial<ITask>): Promise<void>;
  deleteTask(listType: ListType, taskId: string): Promise<void>;
  toggleTask(listType: ListType, taskId: string): Promise<void>;
  reorderTasks(listType: ListType, taskIds: string[]): Promise<void>;
}

export interface IResetManager {
  checkAndPerformReset(): Promise<void>;
  shouldReset(): boolean;
  resetDailyList(): Promise<void>;
}

export interface IThemeManager {
  setTheme(theme: 'light' | 'dark' | 'system'): void;
  getSystemTheme(): 'light' | 'dark';
  applyTheme(): void;
}

export interface IEventManager {
  setupEventListeners(): void;
  handleKeyboardShortcuts(event: KeyboardEvent): void;
  handleTaskInput(listType: ListType, event: KeyboardEvent): void;
  handleTaskEdit(taskId: string, newText: string): void;
}

export interface IUIManager {
  renderTask(task: ITask): HTMLElement;
  renderList(listType: ListType, tasks: ITask[]): void;
  showModal(modalId: string): void;
  hideModal(modalId: string): void;
  showConfirmDialog(message: string): Promise<boolean>;
  updateUI(): void;
}

export interface IPerformanceTracker {
  startTiming(operation: string): void;
  endTiming(operation: string): void;
  getMetrics(): Record<string, number>;
}

export interface IAccessibilityManager {
  setupKeyboardNavigation(): void;
  announceToScreenReader(message: string): void;
  manageFocus(element: HTMLElement): void;
  updateAriaLabels(): void;
}

export interface IDragDropManager {
  setupDragAndDrop(): void;
  handleDragStart(event: DragEvent): void;
  handleDragEnd(event: DragEvent): void;
  handleDrop(event: DragEvent): void;
}

export interface IValidationManager {
  validateTaskText(text: string): boolean;
  sanitizeInput(text: string): string;
  validateAppState(state: unknown): state is IAppState;
}

export interface IErrorManager {
  handleError(error: Error, context: string): void;
  logError(error: Error, context: string): void;
  showUserError(message: string): void;
}

export interface ITabDoApp {
  init(): Promise<void>;
  shutdown(): void;
  getState(): IAppState;
  setState(state: Partial<IAppState>): Promise<void>;
}

export type EventCallback = (event: Event) => void;
export type TaskEventCallback = (task: ITask) => void;

export interface IModalManager {
  openModal(modalId: string): void;
  closeModal(modalId: string): void;
  closeAllModals(): void;
  setupModalEventListeners(): void;
}

export interface IAnimationManager {
  fadeIn(element: HTMLElement, duration?: number): Promise<void>;
  fadeOut(element: HTMLElement, duration?: number): Promise<void>;
  slideDown(element: HTMLElement, duration?: number): Promise<void>;
  slideUp(element: HTMLElement, duration?: number): Promise<void>;
}

export interface IDebugManager {
  log(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: Error): void;
  isDebugMode(): boolean;
}

export const DEFAULT_APP_STATE: IAppState = {
  version: 1,
  lists: {
    daily: [],
    weekly: []
  },
  theme: 'system',
  lastReset: Date.now()
};

export const LIST_TYPES: ListType[] = ['daily', 'weekly'];

export const STORAGE_KEY = 'tabdo-state';
export const PERFORMANCE_THRESHOLDS = {
  LOAD_TIME: 200,
  TASK_OPERATION: 50,
  DRAG_FRAME_RATE: 60
};

export const THEME_TRANSITION_DURATION = 250;
export const ANIMATION_DURATIONS = {
  FADE: 200,
  SLIDE: 150,
  SCALE: 120
};

export const ACCESSIBILITY_CONSTANTS = {
  ARIA_LIVE_DELAY: 100,
  FOCUS_TIMEOUT: 50,
  KEYBOARD_REPEAT_DELAY: 300
};

export const VALIDATION_CONSTANTS = {
  MAX_TASK_LENGTH: 500,
  MIN_TASK_LENGTH: 1,
  MAX_TASKS_PER_LIST: 100
};

export const ERROR_MESSAGES = {
  STORAGE_QUOTA: 'Storage quota exceeded. Please clear some data.',
  INVALID_TASK: 'Invalid task data provided.',
  NETWORK_ERROR: 'Network error occurred.',
  GENERIC_ERROR: 'An unexpected error occurred.'
};