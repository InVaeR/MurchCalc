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
  private syncing = false;

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
