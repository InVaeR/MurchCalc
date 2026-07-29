# План разработки: два режима (Text + Basic) с UI

Отличная база — ядро (`lexer/parser/evaluator`), `ModeRegistry` и интерфейс `CalculatorMode` уже есть. Сейчас логично реализовать **Basic Mode** (кнопочный) и **Text Mode** (построчный с переменными), UI-слой с переключением табов, тёмную/светлую тему и автосохранение в LocalStorage.

Ниже — полный план, затем все новые файлы и диффы к существующим.

---

## Часть 1. План разработки

### Этап A. Подготовка ядра (минимальные правки)
1. Добавить в `Evaluator` метод `clearVariables()` и геттеры для UI (список функций/констант).
2. Убедиться, что `Engine` можно переиспользовать между строками Text Mode (переменные копятся в контексте).

### Этап B. UI-слой (vanilla DOM, без фреймворка)
1. `src/ui/theme/theme.css` — CSS-переменные, тёмная/светлая тема, адаптив.
2. `src/ui/App.ts` — оболочка: шапка, табы режимов, переключатель темы, контейнер режима.
3. `src/storage/LocalStore.ts` — версионируемое сохранение состояния.

### Этап C. Basic Mode
1. `src/modes/basic/BasicMode.ts` — реализует `CalculatorMode`: дисплей + сетка кнопок, работает через `engine.evaluate`.

### Этап D. Text Mode
1. `src/modes/text/TextMode.ts` — `<textarea>` + колонка результатов, построчный расчёт, переменные `x = 5`, комментарии, `prev`, автосохранение.

### Этап E. Интеграция
1. Переписать `main.ts`: регистрация режимов + запуск `App`.
2. Обновить документацию (`structure.txt`, `README.md`, `PLAN.md` чек-боксы).
3. Тесты на построчный вычислитель Text Mode.

---

## Часть 2. Правки существующих файлов (диффы)

### `src/core/engine/evaluator.ts`

```diff
   setVariable(name: string, value: number): void {
     this.context.variables.set(name, value);
   }
 
+  clearVariables(): void {
+    this.context.variables.clear();
+  }
+
   getContext(): EvaluationContext {
     return this.context;
   }
 }
```

### `src/core/types.ts` — расширяем `Engine` (опциональные методы, чтобы не ломать текущие реализации)

```diff
 export interface Engine {
   evaluate(expression: string, context?: Partial<EvaluationContext>): EvaluationResult;
+  setVariable?(name: string, value: number): void;
+  clearVariables?(): void;
 }
```

### `main.ts` — полностью заменяем

```typescript
/**
 * Точка входа приложения.
 * Регистрирует режимы и запускает UI-оболочку App.
 */
import { Evaluator } from './core/engine/evaluator';
import { ModeRegistry } from './core/ModeRegistry';
import { App } from './ui/App';
import { BasicMode } from './modes/basic/BasicMode';
import { TextMode } from './modes/text/TextMode';
import './ui/theme/theme.css';

function bootstrap(): void {
  const root = document.getElementById('app');
  if (!root) {
    throw new Error('Не найден элемент #app');
  }

  // Регистрируем режимы (порядок = порядок табов).
  ModeRegistry.register(new TextMode());
  ModeRegistry.register(new BasicMode());

  const engine = new Evaluator();
  const app = new App(root, engine);
  app.start();
}

bootstrap();
```

### `vite.config.ts` — переключить окружение тестов на `jsdom` (нужно Text/Basic-тестам)

```diff
   base: '/MurchCalc/',
   test: {
     globals: true,
-    environment: 'node',
+    environment: 'jsdom',
   },
 });
```

### `package.json` — добавить `jsdom`

```diff
   "devDependencies": {
     "@typescript-eslint/eslint-plugin": "^8.18.0",
     "@typescript-eslint/parser": "^8.18.0",
     "eslint": "^9.17.0",
+    "jsdom": "^24.0.0",
     "typescript": "^5.4.0",
     "vite": "^5.2.0",
     "vitest": "^1.5.0"
   }
```

---

## Часть 3. Новые файлы

### `src/storage/LocalStore.ts`

```typescript
/**
 * Версионируемое хранилище состояния в LocalStorage.
 * Формат: { version, data } — для будущих миграций.
 */
const PREFIX = 'murchcalc:';
const VERSION = 1;

interface Envelope<T> {
  version: number;
  data: T;
}

export const LocalStore = {
  save<T>(key: string, data: T): void {
    try {
      const env: Envelope<T> = { version: VERSION, data };
      localStorage.setItem(PREFIX + key, JSON.stringify(env));
    } catch {
      // Хранилище может быть недоступно (приватный режим) — тихо игнорируем.
    }
  },

  load<T>(key: string): T | undefined {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return undefined;
      const env = JSON.parse(raw) as Envelope<T>;
      if (env.version !== VERSION) return undefined; // место под миграции
      return env.data;
    } catch {
      return undefined;
    }
  },
};
```

### `src/ui/theme/theme.css`

```css
:root {
  --bg: #f5f6f8;
  --surface: #ffffff;
  --surface-alt: #eef0f3;
  --text: #1a1d21;
  --text-muted: #6b7280;
  --accent: #2563eb;
  --accent-text: #ffffff;
  --border: #d7dbe0;
  --ok: #15803d;
  --error: #dc2626;
  --radius: 10px;
  --font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}

:root[data-theme="dark"] {
  --bg: #14171c;
  --surface: #1d2127;
  --surface-alt: #262b33;
  --text: #e6e9ee;
  --text-muted: #9aa2ad;
  --accent: #3b82f6;
  --accent-text: #ffffff;
  --border: #333a44;
  --ok: #4ade80;
  --error: #f87171;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
}

.app {
  max-width: 820px;
  margin: 0 auto;
  padding: 16px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.app-header h1 {
  font-size: 20px;
  margin: 0;
  flex: 1;
}

.tabs {
  display: flex;
  gap: 6px;
}

.tab {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  padding: 8px 14px;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 14px;
}

.tab:hover { background: var(--surface-alt); }

.tab.active {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
}

.icon-btn {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  width: 38px;
  height: 38px;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 18px;
}

.mode-container {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
}

/* ---------- Basic Mode ---------- */
.basic-display {
  width: 100%;
  text-align: right;
  font-family: var(--mono);
  font-size: 28px;
  padding: 16px;
  background: var(--surface-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  min-height: 64px;
  overflow-x: auto;
  white-space: nowrap;
}

.basic-sub {
  text-align: right;
  color: var(--text-muted);
  min-height: 20px;
  font-family: var(--mono);
  font-size: 14px;
  margin-top: 4px;
}

.basic-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.basic-grid button {
  padding: 18px 0;
  font-size: 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-alt);
  color: var(--text);
  cursor: pointer;
}

.basic-grid button:hover { filter: brightness(1.08); }
.basic-grid button.op { color: var(--accent); font-weight: 600; }
.basic-grid button.eq { background: var(--accent); color: var(--accent-text); }
.basic-grid button.fn { font-size: 15px; }

/* ---------- Text Mode ---------- */
.text-mode {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  min-height: 320px;
}

.text-input {
  border: none;
  outline: none;
  resize: none;
  padding: 12px;
  font-family: var(--mono);
  font-size: 15px;
  line-height: 24px;
  background: var(--surface);
  color: var(--text);
}

.text-results {
  border-left: 1px solid var(--border);
  background: var(--surface-alt);
  padding: 12px;
  font-family: var(--mono);
  font-size: 15px;
  line-height: 24px;
  overflow-y: auto;
}

.text-results .line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.text-results .ok { color: var(--ok); }
.text-results .err { color: var(--error); }
.text-results .muted { color: var(--text-muted); }

@media (max-width: 640px) {
  .text-mode { grid-template-columns: 1fr; }
  .text-results { border-left: none; border-top: 1px solid var(--border); }
  .app-header h1 { font-size: 17px; }
}
```

### `src/ui/App.ts`

```typescript
/**
 * UI-оболочка: шапка, табы режимов, переключатель темы, контейнер активного режима.
 */
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

    // Восстановление состояния режима, если было сохранено.
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
```

### `src/modes/basic/BasicMode.ts`

```typescript
/**
 * Basic Mode — кнопочный калькулятор.
 * Собирает выражение строкой и вычисляет через общий движок.
 */
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
```

### `src/modes/text/TextMode.ts`

```typescript
/**
 * Text Mode — построчный ввод выражений с переменными и результатами справа.
 * Поддержка: x = 5 (присваивание), // комментарии, prev (предыдущий результат).
 */
import { CalculatorMode, Engine } from '../../core/types';
import { LocalStore } from '../../storage/LocalStore';
import { computeLines, LineResult } from './lineEngine';

interface TextState {
  content: string;
}

const DEFAULT_CONTENT = `// Введите выражения построчно\nx = 10\ny = x * 2\ny + pi`;

export class TextMode implements CalculatorMode {
  id = 'text';
  title = 'Текстовый';
  icon = '📝';

  private engine!: Engine;
  private container!: HTMLElement;
  private textarea!: HTMLTextAreaElement;
  private resultsEl!: HTMLElement;
  private debounce = 0;

  mount(container: HTMLElement, engine: Engine): void {
    this.engine = engine;
    this.container = container;

    const wrap = document.createElement('div');
    wrap.className = 'text-mode';

    this.textarea = document.createElement('textarea');
    this.textarea.className = 'text-input';
    this.textarea.spellcheck = false;
    this.textarea.value = DEFAULT_CONTENT;
    this.textarea.addEventListener('input', () => this.scheduleRecalc());
    this.textarea.addEventListener('scroll', () => {
      this.resultsEl.scrollTop = this.textarea.scrollTop;
    });

    this.resultsEl = document.createElement('div');
    this.resultsEl.className = 'text-results';

    wrap.append(this.textarea, this.resultsEl);
    container.appendChild(wrap);
    this.recalc();
  }

  unmount(): void {
    window.clearTimeout(this.debounce);
    this.container.innerHTML = '';
  }

  serialize(): TextState {
    return { content: this.textarea.value };
  }

  deserialize(data: unknown): void {
    const s = data as TextState;
    if (s && typeof s.content === 'string') {
      this.textarea.value = s.content;
      this.recalc();
    }
  }

  private scheduleRecalc(): void {
    window.clearTimeout(this.debounce);
    this.debounce = window.setTimeout(() => this.recalc(), 150);
  }

  private recalc(): void {
    const results = computeLines(this.textarea.value, this.engine);
    this.renderResults(results);
    LocalStore.save(`mode:${this.id}`, this.serialize());
  }

  private renderResults(results: LineResult[]): void {
    this.resultsEl.innerHTML = '';
    for (const r of results) {
      const div = document.createElement('div');
      div.className = 'line';
      if (r.error) {
        div.classList.add('err');
        div.textContent = `⚠ ${r.error}`;
      } else if (r.display !== undefined) {
        div.classList.add(r.assignment ? 'muted' : 'ok');
        div.textContent = r.display;
      } else {
        div.innerHTML = '&nbsp;';
      }
      this.resultsEl.appendChild(div);
    }
  }
}
```

Продолжаю с файла `src/modes/text/lineEngine.ts`.

### `src/modes/text/lineEngine.ts`

```typescript
/**
 * Построчный вычислитель для Text Mode.
 * Отделён от UI, чтобы можно было тестировать изолированно.
 *
 * Поддерживает:
 *  - пустые строки и комментарии (// ...)
 *  - присваивание переменных: name = expression
 *  - обычные выражения
 *  - ссылку prev на результат предыдущей вычисленной строки
 *  - переменные видны на последующих строках
 */
import { Engine } from '../../core/types';

export interface LineResult {
  /** Текст для отображения в колонке результатов (например "= 42" или "x = 10"). */
  display?: string;
  /** Числовое значение строки, если есть. */
  value?: number;
  /** Сообщение об ошибке, если вычисление не удалось. */
  error?: string;
  /** true, если строка — присваивание (для другого стиля отображения). */
  assignment?: boolean;
}

const ASSIGNMENT_RE = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/;

/** Убирает комментарий // из строки (упрощённо, вне учёта строковых литералов). */
function stripComment(line: string): string {
  const idx = line.indexOf('//');
  return idx === -1 ? line : line.slice(0, idx);
}

/**
 * Вычисляет весь текст построчно.
 * Каждый вызов создаёт «чистое» состояние: сбрасывает переменные движка,
 * затем наполняет их по мере прохода по строкам.
 */
export function computeLines(text: string, engine: Engine): LineResult[] {
  // Сбрасываем переменные, чтобы удалённые строки не «залипали».
  engine.clearVariables?.();

  const lines = text.split('\n');
  const results: LineResult[] = [];
  let prev: number | undefined;

  for (const rawLine of lines) {
    const line = stripComment(rawLine).trim();

    // Пустая строка / только комментарий.
    if (line === '') {
      results.push({});
      continue;
    }

    // Присваивание: name = expression
    const assign = ASSIGNMENT_RE.exec(line);
    if (assign) {
      const [, name, expr] = assign;
      const res = engine.evaluate(injectPrev(expr, prev));
      if (res.error) {
        results.push({ error: res.error, assignment: true });
      } else if (res.value !== undefined) {
        engine.setVariable?.(name, res.value);
        prev = res.value;
        results.push({
          display: `${name} = ${format(res.value)}`,
          value: res.value,
          assignment: true,
        });
      } else {
        results.push({});
      }
      continue;
    }

    // Обычное выражение.
    const res = engine.evaluate(injectPrev(line, prev));
    if (res.error) {
      results.push({ error: res.error });
    } else if (res.value !== undefined) {
      prev = res.value;
      results.push({ display: `= ${format(res.value)}`, value: res.value });
    } else {
      results.push({});
    }
  }

  return results;
}

/**
 * Заменяет идентификатор prev на числовое значение предыдущей строки.
 * Простейшая подстановка по границам слова.
 */
function injectPrev(expr: string, prev: number | undefined): string {
  if (prev === undefined) return expr;
  return expr.replace(/\bprev\b/g, `(${prev})`);
}

/** Форматирование числа: убираем «хвосты» плавающей точки. */
function format(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(10)));
}
```

### `src/modes/text/lineEngine.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { Evaluator } from '../../core/engine/evaluator';
import { computeLines } from './lineEngine';

const run = (text: string) => computeLines(text, new Evaluator());

describe('Text Mode lineEngine', () => {
  it('вычисляет простые выражения построчно', () => {
    const r = run('2 + 3\n10 / 2');
    expect(r[0].value).toBe(5);
    expect(r[1].value).toBe(4);
  });

  it('поддерживает присваивание и использование переменных', () => {
    const r = run('x = 10\ny = x * 2\ny + 1');
    expect(r[0].assignment).toBe(true);
    expect(r[0].value).toBe(10);
    expect(r[1].value).toBe(20);
    expect(r[2].value).toBe(21);
  });

  it('игнорирует пустые строки и комментарии', () => {
    const r = run('// заголовок\n\n2 + 2');
    expect(r[0].display).toBeUndefined();
    expect(r[1].display).toBeUndefined();
    expect(r[2].value).toBe(4);
  });

  it('срезает inline-комментарий', () => {
    const r = run('2 + 2 // сумма');
    expect(r[0].value).toBe(4);
  });

  it('поддерживает prev', () => {
    const r = run('5 * 5\nprev + 1');
    expect(r[0].value).toBe(25);
    expect(r[1].value).toBe(26);
  });

  it('ошибка в одной строке не роняет остальные', () => {
    const r = run('1 / 0\n2 + 2');
    expect(r[0].error).toBeDefined();
    expect(r[1].value).toBe(4);
  });

  it('удаление переменной сбрасывает её (пересчёт с нуля)', () => {
    const e = new Evaluator();
    computeLines('x = 5\nx + 1', e);
    const r2 = computeLines('x + 1', e);
    expect(r2[0].error).toBeDefined(); // x больше не определён
  });
});
```

---

## Часть 4. Обновление документации

### `src/structure.txt` — заменить полностью

```
// АКТУАЛЬНАЯ структура (обновляйте при изменениях):
// src/
// ├── core/                      # Ядро, независимое от UI
// │   ├── engine/                # Математический движок
// │   │   ├── functions.ts       # Реестр функций (sin, sqrt...)
// │   │   ├── evaluator.test.ts
// │   │   ├── evaluator.ts       # Вычисление AST (+ setVariable/clearVariables)
// │   │   ├── lexer.ts           # Токенизация
// │   │   └── parser.ts          # AST
// │   ├── ModeRegistry.ts        # Реестр режимов
// │   └── types.ts               # Общие типы (Engine, CalculatorMode...)
// │
// ├── modes/                     # Режимы (реализуют CalculatorMode)
// │   ├── basic/
// │   │   └── BasicMode.ts       # Кнопочный калькулятор
// │   └── text/
// │       ├── TextMode.ts        # Построчный ввод + результаты
// │       ├── lineEngine.ts      # Построчный вычислитель (тестируемый)
// │       └── lineEngine.test.ts
// │
// ├── ui/                        # UI-слой (vanilla DOM)
// │   ├── App.ts                 # Оболочка: табы, тема, контейнер режима
// │   └── theme/
// │       └── theme.css          # Темы (светлая/тёмная) + адаптив
// │
// ├── storage/
// │   └── LocalStore.ts          # Версионируемое хранилище (LocalStorage)
// │
// └── main.ts                    # Точка входа: регистрация режимов + App
//
// НЕ РЕАЛИЗОВАНО (roadmap):
// ├── modes/spreadsheet/         # Excel-подобный режим
// └── storage → IndexedDB        # для нескольких документов
```

### `PLAN.md` — обновить чек-боксы дорожной карты

```diff
 ### Этап 1. MVP движка + Text Mode

-- [ ] Lexer, Parser, Evaluator
-- [ ] Базовые операторы и функции
-- [ ] Text Mode на `<textarea>` с результатами
-- [ ] Переменные
+- [x] Lexer, Parser, Evaluator
+- [x] Базовые операторы и функции
+- [x] Text Mode на `<textarea>` с результатами
+- [x] Переменные

 ### Этап 2. Улучшение Text Mode

-- [ ] Комментарии
-- [ ] Ссылки на строки/результаты, `sum/prev`
-- [ ] Обработка ошибок построчно
-- [ ] Автосохранение (LocalStorage)
+- [x] Комментарии
+- [~] Ссылки на строки/результаты (реализован `prev`; `sum`, `$N` — TODO)
+- [x] Обработка ошибок построчно
+- [x] Автосохранение (LocalStorage)
```

И в разделе про режимы/UI:

```diff
 ### Этап 4. Расширяемость и полировка

-- [ ] ModeRegistry, интерфейс режимов
-- [ ] Реестр функций
-- [ ] Темы, адаптивность
+- [x] ModeRegistry, интерфейс режимов
+- [x] Реестр функций
+- [x] Темы, адаптивность
 - [ ] Экспорт/импорт
```

### `README.md` — обновить блок структуры

```diff
 ## Структура проекта

-> ⚠️ Реализовано только ядро (`src/core/`) и временный UI (`main.ts`).
-> Разделы `modes/`, `ui/`, `storage/`, `utils/` — план, ещё не созданы.
+> Реализовано: ядро (`src/core/`), режимы **Text** и **Basic** (`src/modes/`),
+> UI-оболочка с темами (`src/ui/`) и автосохранение (`src/storage/`).
+> В планах: Spreadsheet Mode, экспорт/импорт, IndexedDB.
```

---

## Часть 5. Порядок внедрения и проверки

Выполняй по шагам, проверяя после каждого:

```bash
# 1. Установить новую зависимость для тестов
npm install

# 2. Создать все новые файлы и применить диффы

# 3. Проверки (в порядке из AGENTS.md)
npm run lint
npm run typecheck
npm run test:run

# 4. Локальный запуск
npm run dev
```

### Что проверить вручную
- Переключение табов **Текстовый / Обычный** сохраняется после перезагрузки.
- Кнопка темы 🌙/☀️ переключает и запоминает тему.
- **Text Mode**: `x = 10`, `y = x * 2`, `y + pi`, `prev`, комментарии, ошибки построчно.
- **Basic Mode**: ввод с клавиатуры и кнопками, `=`, `C`, `⌫`, `√(`, `π`.
- Содержимое обоих режимов восстанавливается после перезагрузки.

---

## Итоговое дерево после изменений

```
src/
├── core/                     (без структурных изменений; +clearVariables, +типы Engine)
├── modes/
│   ├── basic/
│   │   └── BasicMode.ts          [новый]
│   └── text/
│       ├── TextMode.ts           [новый]
│       ├── lineEngine.ts         [новый]
│       └── lineEngine.test.ts    [новый]
├── ui/
│   ├── App.ts                    [новый]
│   └── theme/
│       └── theme.css             [новый]
├── storage/
│   └── LocalStore.ts             [новый]
└── main.ts                       [переписан]
```

### Замечания на будущее (по желанию)
1. **`sum` и `$N`** в Text Mode — легко добавить в `lineEngine.ts` (накапливать массив результатов и подставлять по аналогии с `prev`).
2. **Экспорт/импорт** — добавить в `App.ts` кнопки, использующие `mode.serialize()`/`deserialize()` + `Blob`/`FileReader`.
3. **Граф зависимостей** для инкрементального пересчёта — сейчас пересчёт полный (для десятков строк это мгновенно, оптимизация не нужна).
4. Если позже подключишь **Preact**, UI-слой (`App.ts`, режимы) изолирован — ядро трогать не придётся.
