import { Engine, CalculatorMode } from '../core/types';
import { ModeRegistry } from '../core/ModeRegistry';
import { LocalStore } from '../storage/LocalStore';

const THEME_KEY = 'theme';
const ACTIVE_MODE_KEY = 'activeMode';

export class App {
  private root: HTMLElement;
  private engine: Engine;
  private container!: HTMLElement;
  private tabsEl!: HTMLElement;
  private activeMode?: CalculatorMode;

  constructor(root: HTMLElement, engine: Engine) {
    this.root = root;
    this.engine = engine;
  }

  start(): void {
    this.applyTheme(LocalStore.load<string>(THEME_KEY) ?? 'light');
    this.render();

    const modes = ModeRegistry.list();
    const savedId = LocalStore.load<string>(ACTIVE_MODE_KEY);
    const initial = modes.find((m) => m.id === savedId) ?? modes[0];
    if (initial) this.switchTo(initial);
  }

  private render(): void {
    this.root.innerHTML = '';
    this.root.className = 'app';

    const header = document.createElement('header');
    header.className = 'app-header';

    const title = document.createElement('h1');
    title.textContent = 'MurchCalc';

    this.tabsEl = document.createElement('nav');
    this.tabsEl.className = 'tabs';

    ModeRegistry.list().forEach((mode) => {
      const btn = document.createElement('button');
      btn.className = 'tab';
      btn.dataset.modeId = mode.id;
      btn.textContent = `${mode.icon} ${mode.title}`;
      btn.addEventListener('click', () => this.switchTo(mode));
      this.tabsEl.appendChild(btn);
    });

    const themeBtn = document.createElement('button');
    themeBtn.className = 'icon-btn';
    themeBtn.textContent =
      this.root.ownerDocument.documentElement.dataset.theme === 'dark' ? '☀️' : '🌙';
    themeBtn.addEventListener('click', () => {
      const next =
        document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      this.applyTheme(next);
      themeBtn.textContent = next === 'dark' ? '☀️' : '🌙';
    });

    header.append(title, this.tabsEl, themeBtn);

    this.container = document.createElement('main');
    this.container.className = 'mode-container';

    this.root.append(header, this.container);
  }

  private switchTo(mode: CalculatorMode): void {
    if (this.activeMode?.id === mode.id) return;

    if (this.activeMode) this.activeMode.unmount();
    this.container.innerHTML = '';

    this.activeMode = mode;
    mode.mount(this.container, this.engine);

    const saved = LocalStore.load<unknown>(`mode:${mode.id}`);
    if (saved !== undefined) mode.deserialize(saved);

    this.tabsEl.querySelectorAll<HTMLElement>('.tab').forEach((el) => {
      el.classList.toggle('active', el.dataset.modeId === mode.id);
    });

    LocalStore.save(ACTIVE_MODE_KEY, mode.id);
  }

  private applyTheme(theme: string): void {
    document.documentElement.dataset.theme = theme;
    LocalStore.save(THEME_KEY, theme);
  }
}
