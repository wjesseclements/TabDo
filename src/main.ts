import { 
  IAppState, 
  ITask, 
  ListType, 
  IStorageManager, 
  ITaskOperations, 
  IResetManager,
  IThemeManager,
  IUIManager,
  ITabDoApp,
  DEFAULT_APP_STATE,
  STORAGE_KEY,
  PERFORMANCE_THRESHOLDS,
  VALIDATION_CONSTANTS,
  ERROR_MESSAGES
} from './types';
// Lazy load SortableJS for better initial performance
let SortableJS: any | null = null;
import browser from 'webextension-polyfill';

class StorageManager implements IStorageManager {
  private debounceTimer: number | null = null;
  private readonly DEBOUNCE_DELAY = 100;

  async load(): Promise<IAppState> {
    try {
      const result = await browser.storage.local.get(STORAGE_KEY);
      const storedState = result[STORAGE_KEY];
      
      if (storedState && this.validateState(storedState)) {
        return {
          ...DEFAULT_APP_STATE,
          ...storedState,
          version: 1
        };
      }
      
      return DEFAULT_APP_STATE;
    } catch (error) {
      console.error('Error loading state:', error);
      return DEFAULT_APP_STATE;
    }
  }

  async save(state: IAppState): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    return new Promise((resolve, reject) => {
      this.debounceTimer = window.setTimeout(async () => {
        try {
          await browser.storage.local.set({ [STORAGE_KEY]: state });
          resolve();
        } catch (error) {
          console.error('Error saving state:', error);
          reject(error);
        }
      }, this.DEBOUNCE_DELAY);
    });
  }

  async clear(): Promise<void> {
    try {
      await browser.storage.local.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  private validateState(state: unknown): state is IAppState {
    return (
      typeof state === 'object' &&
      state !== null &&
      'lists' in state &&
      'theme' in state &&
      'lastReset' in state
    );
  }
}

class TaskOperations implements ITaskOperations {
  constructor(
    private app: TabDoApp,
    private storage: StorageManager
  ) {}

  async addTask(listType: ListType, text: string): Promise<void> {
    const operationStart = performance.now();
    
    const trimmedText = text.trim();
    if (!this.validateTaskText(trimmedText)) {
      throw new Error(ERROR_MESSAGES.INVALID_TASK);
    }

    const state = this.app.getState();
    const tasks = state.lists[listType];
    
    if (tasks.length >= VALIDATION_CONSTANTS.MAX_TASKS_PER_LIST) {
      throw new Error('Maximum number of tasks reached');
    }

    const newTask: ITask = {
      id: this.generateId(),
      text: trimmedText,
      checked: false,
      createdAt: Date.now(),
      order: 0,
      isRecurring: false
    };

    // Optimize by creating new array instead of mutating
    const updatedTasks = [newTask, ...tasks.map(task => ({ ...task, order: task.order + 1 }))];

    await this.app.setState({ lists: { ...state.lists, [listType]: updatedTasks } });
    
    const operationTime = performance.now() - operationStart;
    if (operationTime > PERFORMANCE_THRESHOLDS.TASK_OPERATION) {
      console.warn(`Task operation time (${operationTime.toFixed(2)}ms) exceeded threshold`);
    }
  }

  async updateTask(listType: ListType, taskId: string, updates: Partial<ITask>): Promise<void> {
    const state = this.app.getState();
    const tasks = state.lists[listType];
    const taskIndex = tasks.findIndex(task => task.id === taskId);

    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    if (updates.text && !this.validateTaskText(updates.text)) {
      throw new Error(ERROR_MESSAGES.INVALID_TASK);
    }

    tasks[taskIndex] = { ...tasks[taskIndex], ...updates } as ITask;
    await this.app.setState({ lists: { ...state.lists, [listType]: tasks } });
  }

  async deleteTask(listType: ListType, taskId: string): Promise<void> {
    const state = this.app.getState();
    const tasks = state.lists[listType];
    const filteredTasks = tasks.filter(task => task.id !== taskId);

    await this.app.setState({ lists: { ...state.lists, [listType]: filteredTasks } });
  }

  async toggleTask(listType: ListType, taskId: string): Promise<void> {
    const state = this.app.getState();
    const tasks = state.lists[listType];
    const taskIndex = tasks.findIndex(task => task.id === taskId);

    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    const task = tasks[taskIndex];
    if (task) {
      task.checked = !task.checked;
      
      // Reorder tasks based on completion status
      const reorderedTasks = this.reorderTasksByCompletion(tasks);
      await this.app.setState({ lists: { ...state.lists, [listType]: reorderedTasks } });
    }
  }

  private reorderTasksByCompletion(tasks: ITask[]): ITask[] {
    // Separate completed and uncompleted tasks
    const uncompletedTasks = tasks.filter(task => !task.checked);
    const completedTasks = tasks.filter(task => task.checked);
    
    // Sort uncompleted tasks by order
    uncompletedTasks.sort((a, b) => a.order - b.order);
    
    // Sort completed tasks by order (most recently completed first)
    completedTasks.sort((a, b) => a.order - b.order);
    
    // Combine: uncompleted tasks first, then completed tasks
    const reorderedTasks = [...uncompletedTasks, ...completedTasks];
    
    // Update order property to reflect new positions
    reorderedTasks.forEach((task, index) => {
      task.order = index;
    });
    
    return reorderedTasks;
  }

  async reorderTasks(listType: ListType, taskIds: string[]): Promise<void> {
    const state = this.app.getState();
    const tasks = state.lists[listType];
    const reorderedTasks = taskIds.map(id => tasks.find(task => task.id === id)).filter((task): task is ITask => task !== undefined);
    
    reorderedTasks.forEach((task, index) => {
      task.order = index;
    });

    await this.app.setState({ lists: { ...state.lists, [listType]: reorderedTasks } });
  }

  private validateTaskText(text: string): boolean {
    return text.length >= VALIDATION_CONSTANTS.MIN_TASK_LENGTH && 
           text.length <= VALIDATION_CONSTANTS.MAX_TASK_LENGTH;
  }

  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

class ResetManager implements IResetManager {
  constructor(private app: TabDoApp) {}

  async checkAndPerformReset(): Promise<void> {
    if (this.shouldReset()) {
      await this.resetDailyList();
      
      const state = this.app.getState();
      await this.app.setState({ lastReset: Date.now() });
    }
  }

  shouldReset(): boolean {
    const state = this.app.getState();
    const lastReset = new Date(state.lastReset);
    const now = new Date();
    
    return (
      lastReset.getDate() !== now.getDate() ||
      lastReset.getMonth() !== now.getMonth() ||
      lastReset.getFullYear() !== now.getFullYear()
    );
  }

  async resetDailyList(): Promise<void> {
    const state = this.app.getState();
    const dailyTasks = state.lists.daily;
    
    // Process tasks based on their recurring status
    const processedTasks: ITask[] = [];
    
    dailyTasks.forEach(task => {
      if (task.isRecurring) {
        // Recurring tasks: uncheck and move to top
        processedTasks.unshift({
          ...task,
          checked: false,
          order: 0
        });
      } else if (!task.checked) {
        // Non-recurring unchecked tasks: keep as is
        processedTasks.push(task);
      }
      // Non-recurring checked tasks: remove (don't add to processedTasks)
    });
    
    // Reorder all tasks to ensure proper order values
    processedTasks.forEach((task, index) => {
      task.order = index;
    });
    
    await this.app.setState({
      lists: {
        ...state.lists,
        daily: processedTasks
      }
    });
  }

}

class ThemeManager implements IThemeManager {
  private mediaQuery: MediaQueryList;

  constructor(private app: TabDoApp) {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', () => {
      if (this.app.getState().theme === 'system') {
        this.applyTheme();
      }
    });
  }

  setTheme(theme: 'light' | 'dark' | 'system'): void {
    this.app.setState({ theme });
    this.applyTheme();
  }

  getSystemTheme(): 'light' | 'dark' {
    return this.mediaQuery.matches ? 'dark' : 'light';
  }

  applyTheme(): void {
    const state = this.app.getState();
    const theme = state.theme === 'system' ? this.getSystemTheme() : state.theme;
    
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }
}

class ClockManager {
  private timeUpdateInterval: number | null = null;

  init(): void {
    this.updateClock();
    this.startClockUpdates();
  }

  private updateClock(): void {
    const now = new Date();
    
    // Format time (HH:MM)
    const timeString = now.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    // Format date (Month Day, Year)
    const dateString = now.toLocaleDateString([], {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    
    // Format day of week
    const dayString = now.toLocaleDateString([], {
      weekday: 'long'
    });
    
    // Update DOM elements
    const timeElement = document.getElementById('clock-time');
    const dateElement = document.getElementById('clock-date');
    const dayElement = document.getElementById('clock-day');
    
    if (timeElement) timeElement.textContent = timeString;
    if (dateElement) dateElement.textContent = dateString;
    if (dayElement) dayElement.textContent = dayString;
  }

  private startClockUpdates(): void {
    // Update every second
    this.timeUpdateInterval = window.setInterval(() => {
      this.updateClock();
    }, 1000);
  }

  shutdown(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }
}

class UIManager implements IUIManager {
  constructor(private app: TabDoApp, private taskOps: TaskOperations) {}

  renderTask(task: ITask): HTMLElement {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.setAttribute('data-task-id', task.id);
    li.setAttribute('draggable', 'true');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.checked;
    checkbox.setAttribute('aria-label', `Mark "${task.text}" as ${task.checked ? 'incomplete' : 'complete'}`);

    const textSpan = document.createElement('span');
    textSpan.className = 'task-text';
    textSpan.textContent = task.text;
    textSpan.setAttribute('role', 'button');
    textSpan.setAttribute('tabindex', '0');

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'task-actions';

    // Add recurring toggle button
    const recurringBtn = document.createElement('button');
    recurringBtn.className = 'task-recurring-btn';
    recurringBtn.innerHTML = task.isRecurring ? '🔄' : '↻';
    recurringBtn.setAttribute('aria-label', `Mark "${task.text}" as ${task.isRecurring ? 'non-recurring' : 'recurring'}`);
    recurringBtn.setAttribute('title', task.isRecurring ? 'Make non-recurring' : 'Make recurring');

    const editBtn = document.createElement('button');
    editBtn.className = 'task-edit-btn';
    editBtn.innerHTML = '✏️';
    editBtn.setAttribute('aria-label', `Edit "${task.text}"`);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-delete-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.setAttribute('aria-label', `Delete "${task.text}"`);

    const dragHandle = document.createElement('div');
    dragHandle.className = 'task-drag-handle';
    dragHandle.innerHTML = '⋮⋮';
    dragHandle.setAttribute('aria-label', 'Drag to reorder');

    actionsDiv.appendChild(recurringBtn);
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    actionsDiv.appendChild(dragHandle);

    li.appendChild(checkbox);
    li.appendChild(textSpan);
    li.appendChild(actionsDiv);

    this.setupTaskEventListeners(li, task);

    return li;
  }

  renderList(listType: ListType, tasks: ITask[]): void {
    const listElement = document.getElementById(`${listType}-list`);
    if (!listElement) return;

    listElement.innerHTML = '';
    tasks.forEach(task => {
      const taskElement = this.renderTask(task);
      listElement.appendChild(taskElement);
    });
  }

  showModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      
      const firstFocusable = modal.querySelector('button, input, select, textarea') as HTMLElement;
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }

  hideModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  async showConfirmDialog(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const messageElement = document.getElementById('confirm-message');
      const cancelBtn = document.getElementById('confirm-cancel');
      const okBtn = document.getElementById('confirm-ok');

      if (messageElement) messageElement.textContent = message;

      const handleCancel = () => {
        this.hideModal('confirm-modal');
        resolve(false);
      };

      const handleOk = () => {
        this.hideModal('confirm-modal');
        resolve(true);
      };

      cancelBtn?.addEventListener('click', handleCancel, { once: true });
      okBtn?.addEventListener('click', handleOk, { once: true });

      this.showModal('confirm-modal');
    });
  }

  updateUI(): void {
    const state = this.app.getState();
    
    this.renderList('daily', state.lists.daily);
    this.renderList('weekly', state.lists.weekly);

    const themeSelect = document.getElementById('theme-toggle') as HTMLSelectElement;
    if (themeSelect) {
      themeSelect.value = state.theme;
    }

    const versionInfo = document.getElementById('version-info');
    if (versionInfo) {
      versionInfo.textContent = '1.0.0';
    }
  }

  announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  private setupTaskEventListeners(taskElement: HTMLElement, task: ITask): void {
    const checkbox = taskElement.querySelector('.task-checkbox') as HTMLInputElement;
    const textSpan = taskElement.querySelector('.task-text') as HTMLSpanElement;
    const recurringBtn = taskElement.querySelector('.task-recurring-btn') as HTMLButtonElement;
    const editBtn = taskElement.querySelector('.task-edit-btn') as HTMLButtonElement;
    const deleteBtn = taskElement.querySelector('.task-delete-btn') as HTMLButtonElement;

    checkbox.addEventListener('change', () => {
      const listType = this.getListTypeFromElement(taskElement);
      this.taskOps.toggleTask(listType, task.id);
      const action = checkbox.checked ? 'completed' : 'uncompleted';
      this.announceToScreenReader(`Task "${task.text}" ${action}`);
    });

    recurringBtn.addEventListener('click', () => {
      const listType = this.getListTypeFromElement(taskElement);
      this.taskOps.updateTask(listType, task.id, { isRecurring: !task.isRecurring });
      const action = task.isRecurring ? 'non-recurring' : 'recurring';
      this.announceToScreenReader(`Task "${task.text}" marked as ${action}`);
    });

    editBtn.addEventListener('click', () => {
      this.enableTaskEdit(taskElement, task);
    });

    deleteBtn.addEventListener('click', () => {
      const listType = this.getListTypeFromElement(taskElement);
      this.taskOps.deleteTask(listType, task.id);
      this.announceToScreenReader(`Task "${task.text}" deleted`);
    });

    textSpan.addEventListener('dblclick', () => {
      this.enableTaskEdit(taskElement, task);
    });

    textSpan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        this.enableTaskEdit(taskElement, task);
      }
    });
  }

  private enableTaskEdit(taskElement: HTMLElement, task: ITask): void {
    const textSpan = taskElement.querySelector('.task-text') as HTMLSpanElement;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = task.text;
    input.className = 'task-edit-input';

    const saveEdit = () => {
      const newText = input.value.trim();
      if (newText && newText !== task.text) {
        const listType = this.getListTypeFromElement(taskElement);
        this.taskOps.updateTask(listType, task.id, { text: newText });
      }
      textSpan.textContent = newText || task.text;
      taskElement.replaceChild(textSpan, input);
    };

    const cancelEdit = () => {
      taskElement.replaceChild(textSpan, input);
    };

    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    });

    taskElement.replaceChild(input, textSpan);
    input.focus();
    input.select();
  }

  private getListTypeFromElement(element: HTMLElement): ListType {
    const listElement = element.closest('.task-list') as HTMLElement;
    const listId = listElement.id;
    
    if (listId === 'daily-list') return 'daily';
    if (listId === 'weekly-list') return 'weekly';
    
    throw new Error('Unknown list type');
  }
}

// Performance monitoring
interface IPerformanceMetrics {
  domContentLoaded: number;
  appInitStart: number;
  appInitEnd: number;
  firstPaint: number;
  loadTime: number;
}

class PerformanceMonitor {
  private metrics: Partial<IPerformanceMetrics> = {};
  
  constructor() {
    this.metrics.domContentLoaded = performance.now();
    
    // Track first paint if available
    if ('PerformanceObserver' in window) {
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.metrics.firstPaint = entry.startTime;
            }
          }
        }).observe({ entryTypes: ['paint'] });
      } catch (error) {
        // PerformanceObserver not supported, skip
      }
    }
  }
  
  startAppInit(): void {
    this.metrics.appInitStart = performance.now();
  }
  
  endAppInit(): void {
    this.metrics.appInitEnd = performance.now();
    this.metrics.loadTime = this.metrics.appInitEnd - (this.metrics.domContentLoaded || 0);
    this.logMetrics();
  }
  
  private logMetrics(): void {
    const loadTime = this.metrics.loadTime || 0;
    const appInitTime = (this.metrics.appInitEnd || 0) - (this.metrics.appInitStart || 0);
    
    const metrics = {
      loadTime: `${loadTime.toFixed(2)}ms`,
      appInitTime: `${appInitTime.toFixed(2)}ms`,
      firstPaint: this.metrics.firstPaint ? `${this.metrics.firstPaint.toFixed(2)}ms` : 'N/A',
      target: '<200ms'
    };
    
    console.log('TabDo Performance Metrics:', metrics);
    
    // Warn if performance target is not met
    if (loadTime > PERFORMANCE_THRESHOLDS.LOAD_TIME) {
      console.warn(`⚠️ Load time (${loadTime.toFixed(2)}ms) exceeds target (${PERFORMANCE_THRESHOLDS.LOAD_TIME}ms)`);
    }
  }
  
  getMetrics(): Partial<IPerformanceMetrics> {
    return { ...this.metrics };
  }
}

class TabDoApp implements ITabDoApp {
  private state: IAppState = DEFAULT_APP_STATE;
  private storage: StorageManager;
  private taskOps: TaskOperations;
  private resetManager: ResetManager;
  private themeManager: ThemeManager;
  private uiManager: UIManager;
  private clockManager: ClockManager;
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.storage = new StorageManager();
    this.taskOps = new TaskOperations(this, this.storage);
    this.resetManager = new ResetManager(this);
    this.themeManager = new ThemeManager(this);
    this.uiManager = new UIManager(this, this.taskOps);
    this.clockManager = new ClockManager();
    this.performanceMonitor = new PerformanceMonitor();
  }

  async init(): Promise<void> {
    this.performanceMonitor.startAppInit();
    
    try {
      // Load state with performance tracking
      const loadStart = performance.now();
      this.state = await this.storage.load();
      const loadTime = performance.now() - loadStart;
      
      if (loadTime > PERFORMANCE_THRESHOLDS.TASK_OPERATION) {
        console.warn(`Storage load time (${loadTime.toFixed(2)}ms) exceeded task operation threshold`);
      }
      
      // Critical path optimizations
      await this.resetManager.checkAndPerformReset();
      this.themeManager.applyTheme();
      
      // Defer non-critical initialization
      requestAnimationFrame(async () => {
        this.setupEventListeners();
        await this.setupDragAndDrop();
        this.clockManager.init();
        this.uiManager.updateUI();
        this.performanceMonitor.endAppInit();
      });
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.performanceMonitor.endAppInit();
    }
  }

  shutdown(): void {
    // Cleanup event listeners and timers
    this.clockManager.shutdown();
  }

  getState(): IAppState {
    return this.state;
  }

  async setState(updates: Partial<IAppState>): Promise<void> {
    this.state = { ...this.state, ...updates };
    await this.storage.save(this.state);
    this.uiManager.updateUI();
  }

  private setupEventListeners(): void {
    // Input event listeners
    ['daily', 'weekly'].forEach(listType => {
      const input = document.getElementById(`${listType}-input`) as HTMLInputElement;
      const button = document.getElementById(`${listType}-add-btn`) as HTMLButtonElement;
      
      if (input && button) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && input.value.trim()) {
            this.addTask(listType as any, input.value.trim());
            input.value = '';
          }
        });

        button.addEventListener('click', () => {
          if (input.value.trim()) {
            this.addTask(listType as any, input.value.trim());
            input.value = '';
          }
        });
      }
    });

    // Settings modal
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettings = document.getElementById('close-settings');
    const themeToggle = document.getElementById('theme-toggle') as HTMLSelectElement;
    const clearDataBtn = document.getElementById('clear-data-btn');

    settingsBtn?.addEventListener('click', () => {
      this.uiManager.showModal('settings-modal');
    });

    closeSettings?.addEventListener('click', () => {
      this.uiManager.hideModal('settings-modal');
    });

    themeToggle?.addEventListener('change', () => {
      this.themeManager.setTheme(themeToggle.value as any);
    });

    clearDataBtn?.addEventListener('click', async () => {
      const confirmed = await this.uiManager.showConfirmDialog(
        'Are you sure you want to clear all data? This action cannot be undone.'
      );
      if (confirmed) {
        await this.storage.clear();
        this.state = DEFAULT_APP_STATE;
        this.uiManager.updateUI();
      }
    });

    // Modal click outside to close
    document.addEventListener('click', (e) => {
      if (e.target instanceof HTMLElement && e.target.classList.contains('modal')) {
        this.uiManager.hideModal(e.target.id);
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.uiManager.hideModal('settings-modal');
        this.uiManager.hideModal('confirm-modal');
      }
      
      // Global keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case '1':
            e.preventDefault();
            document.getElementById('daily-input')?.focus();
            break;
          case '2':
            e.preventDefault();
            document.getElementById('weekly-input')?.focus();
            break;
          case ',':
            e.preventDefault();
            this.uiManager.showModal('settings-modal');
            break;
        }
      }
    });
  }

  private async setupDragAndDrop(): Promise<void> {
    // Lazy load SortableJS
    if (!SortableJS) {
      const { default: Sortable } = await import('sortablejs');
      SortableJS = Sortable;
    }
    
    ['daily', 'weekly'].forEach(listType => {
      const listElement = document.getElementById(`${listType}-list`);
      if (listElement && SortableJS) {
        new SortableJS(listElement, {
          animation: 150,
          ghostClass: 'task-ghost',
          chosenClass: 'task-chosen',
          dragClass: 'task-drag',
          handle: '.task-drag-handle',
          onEnd: (evt: any) => {
            if (evt.oldIndex !== evt.newIndex) {
              const taskIds = Array.from(listElement.children).map(el => 
                el.getAttribute('data-task-id')!
              );
              this.taskOps.reorderTasks(listType as ListType, taskIds);
            }
          }
        });
      }
    });
  }

  private async addTask(listType: 'daily' | 'weekly', text: string): Promise<void> {
    await this.taskOps.addTask(listType, text);
    this.uiManager.announceToScreenReader(`Added task "${text}" to ${listType} list`);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new TabDoApp();
  app.init();
});

export default TabDoApp;