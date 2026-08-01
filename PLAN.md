# Адаптивный интерфейс: помещаемся в HD 1024×600

Основная проблема сейчас — вертикальная раскладка (шапка сверху, режим снизу) съедает высоту. На экране **1024×600** этого мало: Basic-калькулятор с `aspect-ratio: 1` и большими паддингами выходит за пределы 600px, а Text Mode тоже тянется вниз.

**Идея решения:**
1. Приложение занимает ровно `100dvh` без прокрутки страницы; скроллятся только внутренние области.
2. На «широких, но низких» экранах (ландшафт, HD) — компактная сетка, кнопки без `aspect-ratio: 1`, уменьшенные шрифты/паддинги.
3. На узких экранах (мобильный) — всё раскладывается в один столбец, режимы переносятся вертикально.
4. Basic-грид умеет **несколько столбцов** — на узком экране остаётся 4, но можно добавить широкую раскладку для планшета.

Дам полностью переписанный `theme.css` (главное) + небольшие правки `App.ts`, `TextMode.ts` и `index.html`.

---

## 1. `index.html` — запрет масштабирования и фикс высоты

```diff
   <head>
     <meta charset="UTF-8" />
-    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
+    <meta
+      name="viewport"
+      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
+    />
     <title>MurchCalc</title>
   </head>
   <body>
     <div id="app"></div>
     <script type="module" src="/src/main.ts"></script>
   </body>
```

---

## 2. `src/ui/theme/theme.css` — полностью переписан

Ключевые изменения:
- `html, body { height: 100%; overflow: hidden; }` — страница не скроллится.
- `.app` использует `100dvh` и `grid`-раскладку (шапка + область режима).
- `.mode-container` скроллится сам, а не тянет страницу.
- Три брейкпоинта: **широкий десктоп**, **низкий/HD ландшафт (`max-height: 640px`)**, **узкий мобильный (`max-width: 620px`)**.
- Basic-грид: убран жёсткий `aspect-ratio` — вместо него адаптивная высота кнопок; на низких экранах компактнее.

```css
:root {
  --bg: #e8ecf1;
  --surface: #ffffff;
  --surface-alt: #f2f5f9;
  --text: #1e2433;
  --text-muted: #6e7b8e;
  --accent: #3b5fe7;
  --accent-hover: #2d4ed4;
  --accent-text: #ffffff;
  --border: #d0d7e2;
  --ok: #1a8a4a;
  --error: #d9304a;
  --btn-bg: #ffffff;
  --btn-hover: #f0f3f8;
  --btn-active: #e2e7ef;
  --btn-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  --btn-shadow-hover: 0 4px 8px rgba(0, 0, 0, 0.1);
  --radius: 12px;
  --radius-sm: 6px;
  --font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  /* Управляемые размеры (переопределяются в media-queries) */
  --gap: 10px;
  --btn-h: 56px;
  --btn-font: 20px;
  --display-font: 36px;
  --pad: 20px;
}

:root[data-theme="dark"] {
  --bg: #101218;
  --surface: #1a1d28;
  --surface-alt: #222638;
  --text: #e8ecf2;
  --text-muted: #8b97ad;
  --accent: #5b7cf0;
  --accent-hover: #4a6be0;
  --accent-text: #ffffff;
  --border: #2e3444;
  --ok: #4ade80;
  --error: #f87171;
  --btn-bg: #222638;
  --btn-hover: #2a2f42;
  --btn-active: #32384e;
  --btn-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  --btn-shadow-hover: 0 4px 10px rgba(0, 0, 0, 0.35);
}

* { box-sizing: border-box; }

html, body {
  height: 100%;
  overflow: hidden; /* страница не скроллится — скроллятся внутренние области */
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  -webkit-font-smoothing: antialiased;
}

/* ---------- Каркас: шапка + область режима на всю высоту ---------- */
.app {
  height: 100dvh;
  max-width: 900px;
  margin: 0 auto;
  padding: 14px 16px;
  display: grid;
  grid-template-rows: auto 1fr; /* header, content */
  gap: 12px;
  min-height: 0; /* важно для grid + overflow дочерних */
}

.app-header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 0;
}

.app-header h1 {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  flex: 1;
  letter-spacing: -0.5px;
  white-space: nowrap;
}

.tabs {
  display: flex;
  gap: 4px;
  background: var(--surface-alt);
  padding: 3px;
  border-radius: 10px;
}

.tab {
  border: none;
  background: transparent;
  color: var(--text-muted);
  padding: 7px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}

.tab:hover { color: var(--text); }

.tab.active {
  background: var(--surface);
  color: var(--text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.icon-btn {
  border: none;
  background: var(--surface-alt);
  color: var(--text);
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.icon-btn:hover { background: var(--border); }

/* Контейнер режима занимает всё оставшееся место и скроллится сам */
.mode-container {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--pad);
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

/* ---------- Basic Mode ---------- */
.basic-calc {
  max-width: 460px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.basic-display {
  width: 100%;
  text-align: right;
  font-family: var(--mono);
  font-size: var(--display-font);
  font-weight: 500;
  padding: 12px 12px 8px;
  background: var(--surface);
  border: none;
  border-bottom: 2px solid var(--border);
  min-height: 0;
  overflow-x: auto;
  white-space: nowrap;
  letter-spacing: -0.5px;
}

.basic-sub {
  text-align: right;
  color: var(--text-muted);
  min-height: 20px;
  font-family: var(--mono);
  font-size: 14px;
  margin-top: 4px;
  padding: 0 4px;
}

.basic-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--gap);
  margin-top: 12px;
  flex: 1;
  min-height: 0;
}

.basic-grid button {
  min-height: var(--btn-h);
  padding: 0;
  font-size: var(--btn-font);
  font-weight: 500;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--btn-bg);
  color: var(--text);
  cursor: pointer;
  box-shadow: var(--btn-shadow);
  transition: background 0.1s, box-shadow 0.15s, transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.basic-grid button:hover {
  background: var(--btn-hover);
  box-shadow: var(--btn-shadow-hover);
}

.basic-grid button:active {
  background: var(--btn-active);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transform: scale(0.96);
}

.basic-grid button.op {
  background: var(--surface-alt);
  color: var(--accent);
  font-weight: 600;
}

.basic-grid button.op:hover { background: var(--btn-hover); }

.basic-grid button.eq {
  background: var(--accent);
  color: var(--accent-text);
  box-shadow: 0 2px 8px rgba(59, 95, 231, 0.3);
}

.basic-grid button.eq:hover {
  background: var(--accent-hover);
  box-shadow: 0 4px 12px rgba(59, 95, 231, 0.4);
}

.basic-grid button.eq:active {
  background: var(--accent-hover);
  box-shadow: 0 1px 4px rgba(59, 95, 231, 0.3);
}

.basic-grid button.fn {
  font-size: calc(var(--btn-font) - 2px);
  color: var(--text-muted);
}

/* ---------- Text Mode ---------- */
.text-mode {
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

.text-input {
  border: none;
  outline: none;
  resize: none;
  padding: 14px;
  font-family: var(--mono);
  font-size: 14px;
  line-height: 24px;
  background: var(--surface);
  color: var(--text);
  min-height: 0;
  overflow: auto;
}

.text-results {
  border-left: 1px solid var(--border);
  background: var(--surface-alt);
  padding: 14px;
  font-family: var(--mono);
  font-size: 14px;
  line-height: 24px;
  overflow-y: auto;
  min-height: 0;
}

.text-results .line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.text-results .ok { color: var(--ok); }
.text-results .err { color: var(--error); }
.text-results .muted { color: var(--text-muted); }

/* =========================================================
   БРЕЙКПОИНТЫ
   ========================================================= */

/* HD и другие «низкие» экраны (ландшафт планшета, 1024×600).
   Делаем всё компактнее по вертикали, чтобы влезть в 600px. */
@media (max-height: 640px) {
  :root {
    --gap: 7px;
    --btn-h: 40px;
    --btn-font: 17px;
    --display-font: 26px;
    --pad: 12px;
  }

  .app { padding: 8px 14px; gap: 8px; }
  .app-header h1 { font-size: 18px; }
  .basic-display { padding: 6px 10px 4px; }
  .basic-sub { min-height: 16px; font-size: 12px; margin-top: 2px; }
  .basic-grid { margin-top: 8px; }
  .basic-calc { max-width: 520px; }

  /* На низком широком экране Basic удобнее в компактной сетке,
     а дисплей — прижат к сетке. */
}

/* Очень низкие экраны — ещё компактнее */
@media (max-height: 520px) {
  :root {
    --btn-h: 34px;
    --btn-font: 15px;
    --display-font: 22px;
    --gap: 6px;
  }
  .basic-sub { display: none; }
}

/* Узкие экраны (мобильный / планшет-портрет): раскладка в один столбец */
@media (max-width: 620px) {
  .app { max-width: 100%; padding: 10px; }
  .app-header {
    flex-wrap: wrap;
    row-gap: 8px;
  }
  .app-header h1 { flex: 1 1 100%; font-size: 18px; }
  .tabs { flex: 1; }
  .tab { flex: 1; text-align: center; padding: 8px 6px; }

  /* Text Mode: результаты уходят вниз, а не вправо */
  .text-mode { grid-template-columns: 1fr; grid-template-rows: 1fr auto; }
  .text-results {
    border-left: none;
    border-top: 1px solid var(--border);
    max-height: 40%;
  }

  .basic-calc { max-width: 100%; }
}

/* Широкий десктоп: можно дать Text Mode больше воздуха и
   разложить контейнер под несколько колонок в будущем */
@media (min-width: 1100px) {
  .app { max-width: 1040px; }
  .text-mode { grid-template-columns: 1fr 320px; }
}
```

---

## 3. `src/ui/App.ts` — точечные правки

Header может переноситься на узких экранах — оборачиваем табы и тему в отдельный контейнер, чтобы они группировались. Также заголовок делаем «сжимаемым».

```diff
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

-    header.append(title, this.tabsEl, themeBtn);
+    // Группа управления (табы + тема) — чтобы корректно переносилась
+    // на узких экранах отдельным блоком.
+    const controls = document.createElement('div');
+    controls.className = 'header-controls';
+    controls.append(this.tabsEl, themeBtn);
+
+    header.append(title, controls);
```

И добавь в `theme.css` (в конце секции header, до брейкпоинтов) стиль группы:

```css
.header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

А в брейкпоинте `max-width: 620px` — чтобы группа занимала всю ширину и растягивала табы:

```diff
   .app-header h1 { flex: 1 1 100%; font-size: 18px; }
-  .tabs { flex: 1; }
+  .header-controls { flex: 1 1 100%; }
+  .tabs { flex: 1; }
   .tab { flex: 1; text-align: center; padding: 8px 6px; }
```

---

## 4. `src/modes/text/TextMode.ts` — синхронный скролл был односторонним

Мелкое улучшение UX: сейчас при скролле результатов колонка выражений не двигается, а на низких экранах это заметно. Добавим двустороннюю синхронизацию.

```diff
     this.textarea.addEventListener('scroll', () => {
       this.resultsEl.scrollTop = this.textarea.scrollTop;
     });

     this.resultsEl = document.createElement('div');
     this.resultsEl.className = 'text-results';
+    this.resultsEl.addEventListener('scroll', () => {
+      this.textarea.scrollTop = this.resultsEl.scrollTop;
+    });
```

> Порядок важен: `resultsEl` создаётся ниже `textarea`. Убедись, что слушатель на `resultsEl` вешается **после** его создания (как в диффе — сразу после `className`).

---

## 5. Как это решает задачу

| Экран | Поведение |
|-------|-----------|
| **1024×600 (HD, ландшафт)** | Срабатывает `@media (max-height: 640px)`: компактные кнопки (`--btn-h: 40px`), мелкий дисплей, уменьшенные паддинги. Всё в пределах 600px без прокрутки страницы. |
| **Десктоп (полный HD и выше)** | Просторная раскладка, Text Mode с колонкой результатов 240–320px. |
| **Узкий (< 620px, мобильный)** | Один столбец: заголовок сверху, табы на всю ширину, Text Mode — результаты уходят вниз. Basic-грид на всю ширину. |
| **Очень низкие (< 520px по высоте)** | Ещё компактнее, скрывается вспомогательная строка `basic-sub`. |

Ключевой приём — **`100dvh` + grid `auto 1fr` + `overflow: auto` только на `.mode-container`**. Страница никогда не выходит за экран, а лишний контент скроллится внутри.

---

## 6. Проверка

```bash
npm run typecheck
npm run test:run
npm run dev
```

Проверить в DevTools (режим адаптива), задав размеры:
- `1024 × 600` — Basic и Text должны помещаться целиком, без вертикального скролла страницы.
- `1366 × 768` — просторная раскладка.
- `375 × 667` (iPhone) — один столбец, табы во всю ширину.
- `800 × 480` (маленький ландшафт) — самая компактная сетка.
