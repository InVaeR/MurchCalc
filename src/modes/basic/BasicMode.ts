import { CalculatorMode, Engine } from '../../core/types';
import { LocalStore } from '../../storage/LocalStore';

interface BasicState {
  expression: string;
}

const LAYOUT: Array<{ label: string; cls?: string; insert?: string; action?: string }> = [
  { label: 'C', cls: 'fn', action: 'clear' },
  { label: '⌫', cls: 'fn', action: 'back' },
  { label: '%', cls: 'op', insert: '%' },
  { label: '/', cls: 'op', insert: '/' },
  { label: '7', insert: '7' }, { label: '8', insert: '8' }, { label: '9', insert: '9' },
  { label: '*', cls: 'op', insert: '*' },
  { label: '4', insert: '4' }, { label: '5', insert: '5' }, { label: '6', insert: '6' },
  { label: '-', cls: 'op', insert: '-' },
  { label: '1', insert: '1' }, { label: '2', insert: '2' }, { label: '3', insert: '3' },
  { label: '+', cls: 'op', insert: '+' },
  { label: '(', cls: 'fn', insert: '(' }, { label: ')', cls: 'fn', insert: ')' },
  { label: '0', insert: '0' },
  { label: '.', insert: '.' },
  { label: '√', cls: 'fn', insert: 'sqrt(' },
  { label: '^', cls: 'op', insert: '^' },
  { label: 'π', cls: 'fn', insert: 'pi' },
  { label: '=', cls: 'eq', action: 'equals' },
];

export class BasicMode implements CalculatorMode {
  id = 'basic';
  title = 'Обычный';
  icon = '🔢';

  private engine!: Engine;
  private container!: HTMLElement;
  private display!: HTMLElement;
  private sub!: HTMLElement;
  private expression = '';
  private keyHandler = (e: KeyboardEvent) => this.onKey(e);

  mount(container: HTMLElement, engine: Engine): void {
    this.engine = engine;
    this.container = container;

    this.display = document.createElement('div');
    this.display.className = 'basic-display';

    this.sub = document.createElement('div');
    this.sub.className = 'basic-sub';

    const grid = document.createElement('div');
    grid.className = 'basic-grid';

    for (const key of LAYOUT) {
      const btn = document.createElement('button');
      btn.textContent = key.label;
      if (key.cls) btn.classList.add(key.cls);
      btn.addEventListener('click', () => {
        if (key.action) this.handleAction(key.action);
        else if (key.insert) this.insert(key.insert);
      });
      grid.appendChild(btn);
    }

    container.append(this.display, this.sub, grid);
    document.addEventListener('keydown', this.keyHandler);
    this.update();
  }

  unmount(): void {
    document.removeEventListener('keydown', this.keyHandler);
    this.container.innerHTML = '';
  }

  serialize(): BasicState {
    return { expression: this.expression };
  }

  deserialize(data: unknown): void {
    const s = data as BasicState;
    if (s && typeof s.expression === 'string') {
      this.expression = s.expression;
      this.update();
    }
  }

  private insert(text: string): void {
    this.expression += text;
    this.update();
  }

  private handleAction(action: string): void {
    if (action === 'clear') this.expression = '';
    else if (action === 'back') this.expression = this.expression.slice(0, -1);
    else if (action === 'equals') this.equals();
    this.update();
  }

  private equals(): void {
    const res = this.engine.evaluate(this.expression);
    if (res.error) {
      this.sub.textContent = `Ошибка: ${res.error}`;
      this.sub.style.color = 'var(--error)';
    } else if (res.value !== undefined) {
      this.sub.textContent = this.expression + ' =';
      this.sub.style.color = 'var(--text-muted)';
      this.expression = String(res.value);
    }
  }

  private update(): void {
    this.display.textContent = this.expression || '0';
    const res = this.engine.evaluate(this.expression);
    if (this.expression && res.value !== undefined && !res.error) {
      this.sub.style.color = 'var(--text-muted)';
      this.sub.textContent = `= ${res.value}`;
    } else if (!this.expression) {
      this.sub.textContent = '';
    }
    this.save();
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key >= '0' && e.key <= '9') this.insert(e.key);
    else if ('+-*/^%().'.includes(e.key)) this.insert(e.key);
    else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); this.handleAction('equals'); }
    else if (e.key === 'Backspace') this.handleAction('back');
    else if (e.key === 'Escape') this.handleAction('clear');
  }

  private save(): void {
    LocalStore.save(`mode:${this.id}`, this.serialize());
  }
}
