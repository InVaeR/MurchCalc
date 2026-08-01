import { CalculatorMode, Engine } from '../../core/types';
import { LocalStore } from '../../storage/LocalStore';

interface HistoryEntry {
  expression: string;
  result: string;
}

interface BasicState {
  expression: string;
  memory: number;
  history: HistoryEntry[];
}

const LAYOUT: Array<{ label: string; cls?: string; insert?: string; action?: string }> = [
  { label: 'C', cls: 'fn', action: 'clear' },
  { label: '⌫', cls: 'fn', action: 'back' },
  { label: '%', cls: 'fn', action: 'percent' },
  { label: '√', cls: 'fn', insert: 'sqrt(' },

  { label: '7', insert: '7' },
  { label: '8', insert: '8' },
  { label: '9', insert: '9' },
  { label: '/', cls: 'op', insert: '/' },

  { label: '4', insert: '4' },
  { label: '5', insert: '5' },
  { label: '6', insert: '6' },
  { label: '*', cls: 'op', insert: '*' },

  { label: '1', insert: '1' },
  { label: '2', insert: '2' },
  { label: '3', insert: '3' },
  { label: '-', cls: 'op', insert: '-' },

  { label: '0', insert: '0' },
  { label: '.', insert: '.' },
  { label: '^', cls: 'op', insert: '^' },
  { label: '+', cls: 'op', insert: '+' },

  { label: '(', cls: 'fn', insert: '(' },
  { label: ')', cls: 'fn', insert: ')' },
  { label: 'π', cls: 'fn', insert: 'pi' },
  { label: '=', cls: 'eq', action: 'equals' },
];

const MEMORY_LABELS = ['MC', 'MR', 'M+', 'M-', 'MS'] as const;

function formatNum(n: number): string {
  const str = Number.isInteger(n) ? String(n) : String(Number(n.toFixed(10)));
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join('.');
}

function stripFormat(s: string): string {
  return s.replace(/\s/g, '');
}

export class BasicMode implements CalculatorMode {
  id = 'basic';
  title = 'Обычный';
  icon = '🔢';

  private engine!: Engine;
  private container!: HTMLElement;
  private display!: HTMLElement;
  private sub!: HTMLElement;
  private memIndicator!: HTMLElement;
  private historyEl!: HTMLElement;
  private historyBody!: HTMLElement;
  private historyBtn!: HTMLElement;
  private copyBtn!: HTMLElement;

  private expression = '';
  private memory = 0;
  private hasMemory = false;
  private history: HistoryEntry[] = [];
  private historyVisible = false;
  private lastResult: string | null = null;
  private justEvaluated = false;

  private keyHandler = (e: KeyboardEvent) => this.onKey(e);

  mount(container: HTMLElement, engine: Engine): void {
    this.engine = engine;
    this.container = container;

    const top = document.createElement('div');
    top.className = 'basic-top';

    this.historyBtn = document.createElement('button');
    this.historyBtn.className = 'basic-history-btn';
    this.historyBtn.textContent = '☰';
    this.historyBtn.title = 'История вычислений';
    this.historyBtn.addEventListener('click', () => this.toggleHistory());

    const titleEl = document.createElement('span');
    titleEl.className = 'basic-title';
    titleEl.textContent = 'Калькулятор';

    this.memIndicator = document.createElement('span');
    this.memIndicator.className = 'basic-mem-indicator';

    this.copyBtn = document.createElement('button');
    this.copyBtn.className = 'basic-copy-btn';
    this.copyBtn.textContent = '📋';
    this.copyBtn.title = 'Копировать результат';
    this.copyBtn.addEventListener('click', () => this.handleCopy());

    top.append(this.historyBtn, titleEl, this.memIndicator, this.copyBtn);

    const body = document.createElement('div');
    body.className = 'basic-body';

    this.historyEl = document.createElement('div');
    this.historyEl.className = 'basic-history';
    const historyHeader = document.createElement('div');
    historyHeader.className = 'basic-history-header';
    const historyLabel = document.createElement('span');
    historyLabel.textContent = 'История';
    const clearHistBtn = document.createElement('button');
    clearHistBtn.textContent = '✕';
    clearHistBtn.className = 'basic-history-clear';
    clearHistBtn.title = 'Очистить историю';
    clearHistBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearHistory();
    });
    historyHeader.append(historyLabel, clearHistBtn);
    this.historyBody = document.createElement('div');
    this.historyBody.className = 'basic-history-body';
    this.historyEl.append(historyHeader, this.historyBody);
    this.historyEl.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('.basic-history-item');
      if (item) {
        const expr = (item as HTMLElement).dataset.expr;
        if (expr) {
          this.expression = expr;
          this.justEvaluated = false;
          this.update();
        }
      }
    });

    const calcWrap = document.createElement('div');
    calcWrap.className = 'basic-calc-wrap';

    this.sub = document.createElement('div');
    this.sub.className = 'basic-sub';

    this.display = document.createElement('div');
    this.display.className = 'basic-display';

    const memRow = document.createElement('div');
    memRow.className = 'basic-memory';
    for (const label of MEMORY_LABELS) {
      const b = document.createElement('button');
      b.textContent = label;
      b.dataset.mem = label;
      b.addEventListener('click', () => this.handleMemory(label));
      memRow.appendChild(b);
    }

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

    calcWrap.append(this.sub, this.display, memRow, grid);
    body.append(calcWrap, this.historyEl);
    container.append(top, body);

    this.historyVisible = window.innerWidth >= 720;
    this.historyEl.classList.toggle('open', this.historyVisible);

    document.addEventListener('keydown', this.keyHandler);
    this.update();
  }

  unmount(): void {
    document.removeEventListener('keydown', this.keyHandler);
    this.container.innerHTML = '';
  }

  serialize(): BasicState {
    return {
      expression: this.expression,
      memory: this.memory,
      history: this.history,
    };
  }

  deserialize(data: unknown): void {
    const s = data as BasicState;
    if (s && typeof s.expression === 'string') {
      this.expression = s.expression;
      if (typeof s.memory === 'number') {
        this.memory = s.memory;
        this.hasMemory = s.memory !== 0 || this.hasMemory;
      }
      if (Array.isArray(s.history)) {
        this.history = s.history.slice(0, 50);
        this.renderHistory();
      }
      this.update();
    }
  }

  private insert(text: string): void {
    if (this.justEvaluated && /[\d.]/.test(text)) {
      this.expression = '';
      this.justEvaluated = false;
    }
    this.justEvaluated = false;
    this.expression += text;
    this.update();
  }

  private handleAction(action: string): void {
    this.justEvaluated = false;
    if (action === 'clear') {
      this.expression = '';
      this.lastResult = null;
    } else if (action === 'back') {
      this.expression = this.expression.slice(0, -1);
    } else if (action === 'equals') {
      this.equals();
    } else if (action === 'percent') {
      this.handlePercent();
    }
    this.update();
  }

  private handlePercent(): void {
    if (!this.expression) return;
    const match = this.expression.match(/(\d+(?:\.\d+)?)$/);
    if (match) {
      const num = parseFloat(match[1]);
      const before = this.expression.slice(0, -match[1].length);
      this.expression = before + String(num / 100);
    }
  }

  private equals(): void {
    if (!this.expression) return;
    const expr = this.expression;
    const res = this.engine.evaluate(expr);
    if (res.error) {
      this.sub.textContent = `Ошибка: ${res.error}`;
      this.sub.style.color = 'var(--error)';
      return;
    }
    if (res.value !== undefined) {
      const formatted = formatNum(res.value);
      this.sub.textContent = stripFormat(expr) + ' =';
      this.sub.style.color = 'var(--text-muted)';
      this.display.textContent = formatted;
      this.expression = String(res.value);
      this.lastResult = formatted;
      this.justEvaluated = true;
      this.addHistory(stripFormat(expr), formatted);
    }
  }

  private handleMemory(label: string): void {
    const current = parseFloat(this.expression) || 0;
    switch (label) {
      case 'MC':
        this.memory = 0;
        this.hasMemory = false;
        break;
      case 'MR':
        if (this.hasMemory) {
          if (this.justEvaluated) this.expression = '';
          this.expression += String(this.memory);
          this.justEvaluated = false;
        }
        break;
      case 'M+':
        this.memory += current;
        this.hasMemory = true;
        break;
      case 'M-':
        this.memory -= current;
        this.hasMemory = true;
        break;
      case 'MS':
        this.memory = current;
        this.hasMemory = true;
        break;
    }
    this.update();
  }

  private handleCopy(): void {
    const text = this.lastResult || this.display.textContent || '';
    navigator.clipboard.writeText(stripFormat(text)).then(() => {
      this.copyBtn.textContent = '✓';
      this.copyBtn.style.color = 'var(--ok)';
      setTimeout(() => {
        this.copyBtn.textContent = '📋';
        this.copyBtn.style.color = '';
      }, 1200);
    }).catch(() => {});
  }

  private addHistory(expression: string, result: string): void {
    this.history.unshift({ expression, result });
    if (this.history.length > 50) this.history.pop();
    this.renderHistory();
    this.save();
  }

  private clearHistory(): void {
    this.history = [];
    this.renderHistory();
    this.save();
  }

  private toggleHistory(): void {
    this.historyVisible = !this.historyVisible;
    this.historyEl.classList.toggle('open', this.historyVisible);
  }

  private renderHistory(): void {
    this.historyBody.innerHTML = '';
    if (this.history.length === 0) {
      this.historyBody.innerHTML = '<div class="basic-history-empty">Нет вычислений</div>';
      return;
    }
    for (const entry of this.history) {
      const item = document.createElement('div');
      item.className = 'basic-history-item';
      item.dataset.expr = entry.expression;
      const exprLine = document.createElement('div');
      exprLine.className = 'basic-history-expr';
      exprLine.textContent = entry.expression;
      const resLine = document.createElement('div');
      resLine.className = 'basic-history-result';
      resLine.textContent = '= ' + entry.result;
      item.append(exprLine, resLine);
      this.historyBody.appendChild(item);
    }
  }

  private update(): void {
    this.display.textContent = this.expression || '0';
    this.memIndicator.textContent = this.hasMemory ? 'M' : '';

    if (!this.expression) {
      this.sub.textContent = '';
      return;
    }

    if (!this.justEvaluated) {
      const res = this.engine.evaluate(this.expression);
      if (res.value !== undefined && !res.error) {
        this.sub.style.color = 'var(--text-muted)';
        this.sub.textContent = '= ' + formatNum(res.value);
      } else if (res.error) {
        this.sub.style.color = 'var(--error)';
        this.sub.textContent = res.error;
      }
    }
    this.save();
  }

  private onKey(e: KeyboardEvent): void {
    // Не перехватываем ввод, если фокус в поле ввода (другой режим и т.п.)
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    if (e.key >= '0' && e.key <= '9') this.insert(e.key);
    else if ('+-*/^%()!.'.includes(e.key)) this.insert(e.key);
    else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      this.handleAction('equals');
    } else if (e.key === 'Backspace') this.handleAction('back');
    else if (e.key === 'Escape') this.handleAction('clear');
    else if (e.key === 'c' || e.key === 'C') this.handleCopy();
  }

  private save(): void {
    LocalStore.save(`mode:${this.id}`, this.serialize());
  }
}
