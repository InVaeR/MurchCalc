import { CalculatorMode, Engine } from '../../core/types';
import { LocalStore } from '../../storage/LocalStore';
import { computeLines, LineResult } from './lineEngine';

interface TextState {
  content: string;
  docsOpen: boolean;
}

const DEFAULT_CONTENT = `// Введите выражения построчно\nx = 10\ny = x * 2\ny + pi`;

const DOCS_HTML = `
  <div class="doc-section">
    <h4>Основы</h4>
    <p>Каждая строка — отдельное выражение, результат показывается справа
    на той же строке. Пустые строки и комментарии <code>// ...</code> пропускаются.</p>
  </div>
  <div class="doc-section">
    <h4>Переменные и prev</h4>
    <p><code>x = 10</code> — присвоить значение, дальше можно использовать
    <code>x</code>. Ссылка на предыдущий результат — <code>prev</code>.</p>
  </div>
  <div class="doc-section">
    <h4>Операторы</h4>
    <p><code>+ - * / % ^</code> с обычными приоритетами (<code>^</code>
    правоассоциативна), постфиксный факториал <code>5!</code>.</p>
  </div>
  <div class="doc-section">
    <h4>Константы и нотация</h4>
    <p><code>pi</code>, <code>e</code>; научная нотация: <code>1e3</code>,
    <code>2.5e-2</code>.</p>
  </div>
  <div class="doc-section">
    <h4>Функции</h4>
    <p><code>sin cos tan asin acos atan atan2 sinh cosh tanh</code></p>
    <p><code>sqrt cbrt pow exp log ln log2</code> — <code>log</code> десятичный,
    <code>ln</code> натуральный</p>
    <p><code>round floor ceil trunc abs sign min max</code></p>
  </div>
`;

export class TextMode implements CalculatorMode {
  id = 'text';
  title = 'Текстовый';
  icon = '📝';

  private engine!: Engine;
  private container!: HTMLElement;
  private textarea!: HTMLTextAreaElement;
  private resultsEl!: HTMLElement;
  private copyBtn!: HTMLElement;
  private helpBtn!: HTMLElement;
  private docsEl!: HTMLElement;
  private debounce = 0;
  private syncing = false;
  private docsOpen = false;

  mount(container: HTMLElement, engine: Engine): void {
    this.engine = engine;
    this.container = container;

    const wrap = document.createElement('div');
    wrap.className = 'text-mode';

    // Верхняя панель: заголовок + копирование + справка
    const toolbar = document.createElement('div');
    toolbar.className = 'text-toolbar';

    const title = document.createElement('span');
    title.className = 'text-title';
    title.textContent = 'Заметки';

    this.copyBtn = document.createElement('button');
    this.copyBtn.className = 'text-copy-btn';
    this.copyBtn.textContent = '📋';
    this.copyBtn.title = 'Копировать содержимое';
    this.copyBtn.addEventListener('click', () => this.handleCopy());

    this.helpBtn = document.createElement('button');
    this.helpBtn.className = 'text-help-btn';
    this.helpBtn.textContent = '?';
    this.helpBtn.title = 'Руководство по использованию';
    this.helpBtn.addEventListener('click', () => this.toggleDocs());

    toolbar.append(title, this.copyBtn, this.helpBtn);

    // Область ввода + результатов
    const body = document.createElement('div');
    body.className = 'text-body';

    this.textarea = document.createElement('textarea');
    this.textarea.className = 'text-input';
    this.textarea.spellcheck = false;
    this.textarea.value = DEFAULT_CONTENT;
    this.textarea.addEventListener('input', () => this.scheduleRecalc());
    this.textarea.addEventListener('scroll', () => {
      if (this.syncing) return;
      this.syncing = true;
      this.resultsEl.scrollTop = this.textarea.scrollTop;
      this.syncing = false;
    });

    this.resultsEl = document.createElement('div');
    this.resultsEl.className = 'text-results';
    // Двусторонняя синхронизация прокрутки
    this.resultsEl.addEventListener('scroll', () => {
      if (this.syncing) return;
      this.syncing = true;
      this.textarea.scrollTop = this.resultsEl.scrollTop;
      this.syncing = false;
    });

    body.append(this.textarea, this.resultsEl);

    // Встроенная документация
    this.docsEl = document.createElement('div');
    this.docsEl.className = 'text-docs';
    this.docsEl.innerHTML = DOCS_HTML;

    wrap.append(toolbar, body, this.docsEl);
    container.appendChild(wrap);
    this.recalc();
  }

  unmount(): void {
    window.clearTimeout(this.debounce);
    this.container.innerHTML = '';
  }

  serialize(): TextState {
    return { content: this.textarea.value, docsOpen: this.docsOpen };
  }

  deserialize(data: unknown): void {
    const s = data as TextState;
    if (s && typeof s.content === 'string') {
      this.textarea.value = s.content;
      this.recalc();
    }
    if (s && typeof s.docsOpen === 'boolean') {
      this.docsOpen = s.docsOpen;
      this.docsEl.classList.toggle('open', this.docsOpen);
      this.helpBtn.classList.toggle('active', this.docsOpen);
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

  private toggleDocs(): void {
    this.docsOpen = !this.docsOpen;
    this.docsEl.classList.toggle('open', this.docsOpen);
    this.helpBtn.classList.toggle('active', this.docsOpen);
    this.save();
  }

  private handleCopy(): void {
    navigator.clipboard.writeText(this.textarea.value).then(() => {
      this.copyBtn.textContent = '✓';
      this.copyBtn.style.color = 'var(--ok)';
      window.setTimeout(() => {
        this.copyBtn.textContent = '📋';
        this.copyBtn.style.color = '';
      }, 1200);
    }).catch(() => {});
  }

  private save(): void {
    LocalStore.save(`mode:${this.id}`, this.serialize());
  }
}
