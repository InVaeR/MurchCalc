/**
 * Режим «Конвертер» — перевод величин между единицами измерения.
 * Поле значения принимает не только числа, но и выражения (2 + 3, sqrt(2)...) —
 * они вычисляются общим движком.
 */
import { CalculatorMode, Engine } from '../../core/types';
import { LocalStore } from '../../storage/LocalStore';

interface Unit {
  id: string;
  label: string;
  toBase: (v: number) => number;
  fromBase: (v: number) => number;
}

interface Category {
  id: string;
  title: string;
  icon: string;
  units: Unit[];
}

interface ConverterState {
  category: string;
  from: string;
  to: string;
  value: string;
}

const lin = (id: string, label: string, k: number): Unit => ({
  id,
  label,
  toBase: (v) => v * k,
  fromBase: (v) => v / k,
});

const CATEGORIES: Category[] = [
  {
    id: 'length', title: 'Длина', icon: '📏',
    units: [
      lin('mm', 'Миллиметры', 0.001),
      lin('cm', 'Сантиметры', 0.01),
      lin('m', 'Метры', 1),
      lin('km', 'Километры', 1000),
      lin('in', 'Дюймы', 0.0254),
      lin('ft', 'Футы', 0.3048),
      lin('mi', 'Мили', 1609.344),
    ],
  },
  {
    id: 'mass', title: 'Масса', icon: '⚖️',
    units: [
      lin('mg', 'Миллиграммы', 1e-6),
      lin('g', 'Граммы', 0.001),
      lin('kg', 'Килограммы', 1),
      lin('t', 'Тонны', 1000),
      lin('oz', 'Унции', 0.028349523125),
      lin('lb', 'Фунты', 0.45359237),
    ],
  },
  {
    id: 'temp', title: 'Температура', icon: '🌡️',
    units: [
      { id: 'c', label: 'Цельсий (°C)', toBase: (v) => v, fromBase: (v) => v },
      { id: 'f', label: 'Фаренгейт (°F)', toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      { id: 'k', label: 'Кельвин (K)', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  {
    id: 'data', title: 'Данные', icon: '💾',
    units: [
      lin('bit', 'Биты', 1),
      lin('b', 'Байты', 8),
      lin('kb', 'Килобайты', 8 * 1024),
      lin('mb', 'Мегабайты', 8 * 1024 ** 2),
      lin('gb', 'Гигабайты', 8 * 1024 ** 3),
      lin('tb', 'Терабайты', 8 * 1024 ** 4),
    ],
  },
  {
    id: 'time', title: 'Время', icon: '⏱️',
    units: [
      lin('ms', 'Миллисекунды', 0.001),
      lin('s', 'Секунды', 1),
      lin('min', 'Минуты', 60),
      lin('h', 'Часы', 3600),
      lin('d', 'Дни', 86400),
      lin('w', 'Недели', 604800),
    ],
  },
  {
    id: 'speed', title: 'Скорость', icon: '🚀',
    units: [
      lin('mps', 'м/с', 1),
      lin('kmh', 'км/ч', 1 / 3.6),
      lin('mph', 'мили/ч', 0.44704),
      lin('kn', 'Узлы', 0.514444),
    ],
  },
];

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) return n.toExponential(6);
  const str = Number.isInteger(n) ? String(n) : String(Number(n.toFixed(9)));
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join('.');
}

export class ConverterMode implements CalculatorMode {
  id = 'converter';
  title = 'Конвертер';
  icon = '🔄';

  private engine!: Engine;
  private container!: HTMLElement;
  private catsEl!: HTMLElement;
  private input!: HTMLInputElement;
  private fromSel!: HTMLSelectElement;
  private toSel!: HTMLSelectElement;
  private resultEl!: HTMLElement;
  private hintEl!: HTMLElement;

  private category = CATEGORIES[0].id;
  private fromUnit = '';
  private toUnit = '';

  mount(container: HTMLElement, engine: Engine): void {
    this.engine = engine;
    this.container = container;

    const wrap = document.createElement('div');
    wrap.className = 'converter';

    // Категории
    this.catsEl = document.createElement('div');
    this.catsEl.className = 'conv-cats';
    for (const cat of CATEGORIES) {
      const btn = document.createElement('button');
      btn.className = 'conv-cat';
      btn.dataset.cat = cat.id;
      btn.textContent = `${cat.icon} ${cat.title}`;
      btn.addEventListener('click', () => this.setCategory(cat.id));
      this.catsEl.appendChild(btn);
    }

    // Значение
    const valueField = document.createElement('div');
    valueField.className = 'conv-field';
    const valueLabel = document.createElement('label');
    valueLabel.textContent = 'Значение (можно выражение: 2 + 3, sqrt(2)...)';
    this.input = document.createElement('input');
    this.input.className = 'conv-input';
    this.input.type = 'text';
    this.input.spellcheck = false;
    this.input.value = '1';
    this.input.addEventListener('input', () => this.recalc());
    valueField.append(valueLabel, this.input);

    // Из / в
    const grid = document.createElement('div');
    grid.className = 'conv-grid';

    const fromField = document.createElement('div');
    fromField.className = 'conv-field';
    const fromLabel = document.createElement('label');
    fromLabel.textContent = 'Из';
    this.fromSel = document.createElement('select');
    this.fromSel.className = 'conv-select';
    this.fromSel.addEventListener('change', () => {
      this.fromUnit = this.fromSel.value;
      this.recalc();
    });
    fromField.append(fromLabel, this.fromSel);

    const swapBtn = document.createElement('button');
    swapBtn.className = 'conv-swap';
    swapBtn.textContent = '⇄';
    swapBtn.title = 'Поменять местами';
    swapBtn.addEventListener('click', () => this.swap());

    const toField = document.createElement('div');
    toField.className = 'conv-field';
    const toLabel = document.createElement('label');
    toLabel.textContent = 'В';
    this.toSel = document.createElement('select');
    this.toSel.className = 'conv-select';
    this.toSel.addEventListener('change', () => {
      this.toUnit = this.toSel.value;
      this.recalc();
    });
    toField.append(toLabel, this.toSel);

    grid.append(fromField, swapBtn, toField);

    // Результат
    this.resultEl = document.createElement('div');
    this.resultEl.className = 'conv-result';

    this.hintEl = document.createElement('div');
    this.hintEl.className = 'conv-hint';

    wrap.append(this.catsEl, valueField, grid, this.resultEl, this.hintEl);
    container.appendChild(wrap);

    this.setCategory(this.category, true);
  }

  unmount(): void {
    this.container.innerHTML = '';
  }

  serialize(): ConverterState {
    return {
      category: this.category,
      from: this.fromUnit,
      to: this.toUnit,
      value: this.input.value,
    };
  }

  deserialize(data: unknown): void {
    const s = data as ConverterState;
    if (!s || typeof s.category !== 'string') return;
    if (CATEGORIES.some((c) => c.id === s.category)) {
      this.category = s.category;
      this.setCategory(s.category, true);
    }
    const cat = this.currentCategory();
    if (cat.units.some((u) => u.id === s.from)) {
      this.fromUnit = s.from;
      this.fromSel.value = s.from;
    }
    if (cat.units.some((u) => u.id === s.to)) {
      this.toUnit = s.to;
      this.toSel.value = s.to;
    }
    if (typeof s.value === 'string') this.input.value = s.value;
    this.recalc();
  }

  private currentCategory(): Category {
    return CATEGORIES.find((c) => c.id === this.category) ?? CATEGORIES[0];
  }

  private setCategory(id: string, force = false): void {
    if (!force && this.category === id) return;
    this.category = id;
    const cat = this.currentCategory();

    this.catsEl.querySelectorAll<HTMLElement>('.conv-cat').forEach((el) => {
      el.classList.toggle('active', el.dataset.cat === id);
    });

    const fill = (sel: HTMLSelectElement) => {
      sel.innerHTML = '';
      for (const u of cat.units) {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.label;
        sel.appendChild(opt);
      }
    };
    fill(this.fromSel);
    fill(this.toSel);

    this.fromUnit = cat.units[0].id;
    this.toUnit = cat.units[Math.min(1, cat.units.length - 1)].id;
    this.fromSel.value = this.fromUnit;
    this.toSel.value = this.toUnit;
    this.recalc();
  }

  private swap(): void {
    [this.fromUnit, this.toUnit] = [this.toUnit, this.fromUnit];
    this.fromSel.value = this.fromUnit;
    this.toSel.value = this.toUnit;
    this.recalc();
  }

  private recalc(): void {
    const cat = this.currentCategory();
    const from = cat.units.find((u) => u.id === this.fromUnit);
    const to = cat.units.find((u) => u.id === this.toUnit);
    if (!from || !to) return;

    const raw = this.input.value.trim();
    if (raw === '') {
      this.resultEl.textContent = '—';
      this.resultEl.classList.remove('err');
      this.hintEl.textContent = '';
      this.save();
      return;
    }

    const res = this.engine.evaluate(raw);
    if (res.error || res.value === undefined) {
      this.resultEl.textContent = res.error ?? 'Ошибка';
      this.resultEl.classList.add('err');
      this.hintEl.textContent = '';
      this.save();
      return;
    }

    const converted = to.fromBase(from.toBase(res.value));
    this.resultEl.classList.remove('err');
    this.resultEl.textContent = formatNum(converted);
    this.hintEl.textContent = `${formatNum(res.value)} ${from.label} = ${formatNum(converted)} ${to.label}`;
    this.save();
  }

  private save(): void {
    LocalStore.save(`mode:${this.id}`, this.serialize());
  }
}
