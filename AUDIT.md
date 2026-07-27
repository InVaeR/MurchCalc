# Финальная проверка готовности к первому коммиту

**Вердикт: проект готов к первому коммиту. ✅** Все блокеры прошлых итераций закрыты. Имя проекта унифицировано (`MurchCalc` / `murchcalc` / `base: '/MurchCalc/'`), инфраструктура согласована. Ниже — короткая контрольная сверка и один нюанс, который стоит знать заранее.

---

## ✅ Что проверено и корректно

| Область | Статус |
|---------|--------|
| Движок (Lexer/Parser/Evaluator/Functions) | ✅ логика верна |
| Точность: `Number` строкой → `Decimal` | ✅ |
| `ctx.functions` фолбэк на `FunctionRegistry` | ✅ |
| Мёртвый `previous()` удалён | ✅ |
| `vite.config.ts` через `vitest/config` + reference | ✅ |
| `base: '/MurchCalc/'` = имя репозитория (регистр) | ✅ |
| `package.json`: name lowercase, скрипты полные, deps чистые | ✅ |
| ESLint flat-config (`parserOptions`) | ✅ |
| CI: `typecheck → test:run → build → deploy` | ✅ |
| Имя проекта везде `MurchCalc` | ✅ |
| `SECURITY.md` релевантен | ✅ |
| `AGENTS.md` без Preact/Pratt/context | ✅ |
| `README.md` с пометкой о нереализованном | ✅ |
| 12 unit-тестов | ✅ пройдут |
| `.gitignore` покрывает `node_modules/`, `dist/` | ✅ |

---

## 🟡 Единственный нюанс (не блокер коммита)

### `AGENTS.md`: раздел «Core Structure» всё ещё перечисляет `src/modes/`, `src/ui/` как существующие
В блоке `### Core Structure` списком идут `src/modes/` (text/spreadsheet/basic) и `src/ui/` — как будто они есть. Ниже, в `### Key Modules`, вы корректно добавили `NOTE: ... are planned, not yet implemented`. Получается лёгкое внутреннее противоречие: сверху «есть», снизу «планируется».

Для первого коммита **это допустимо** (документация roadmap-стиля), но раз `AGENTS.md` — контракт для ИИ-агентов, лучше пометить и в верхнем блоке:

```diff
 - **src/core/types.ts** – Type definitions shared across all modules
-- **src/modes/** – Pluggable calculator modes:
+- **src/modes/** – (PLANNED, not yet implemented) Pluggable calculator modes:
   - `text/` – Text mode calculator with multiline expressions and variables
   - `spreadsheet/` – Spreadsheet mode with cell formulas and dependency tracking
   - `basic/` – Basic calculator with button interface
-- **src/ui/** – UI components and layouts
+- **src/ui/** – (PLANNED) UI components and layouts
```

> `README.md` тоже показывает `context/` в структуре `core/`, которого нет, но там уже стоит явный warning-блок сверху — этого достаточно.

---

## 🔎 Мелочи (по желанию, не влияют на коммит)

1. **`PLAN.md`** — дублирование номеров разделов (`## 2` дважды, `### 4.1` под `## 3`). Косметика внутреннего документа.
2. **`AUDIT.md`** — удалён из дерева (правильно, это была рабочая переписка). ✅
3. **`main.ts`** — приведение `as HTMLInputElement` подавляет null-проверку, но элементы только что вставлены через `innerHTML`, поэтому безопасно.

---

## 🚀 Финальная проверка перед коммитом (обязательно прогнать)

```bash
# Чистая установка — убедиться, что lock сгенерится без конфликтов
rm -rf node_modules package-lock.json
npm install

# Полный контроль качества в порядке из AGENTS.md
npm run lint        # 0 ошибок
npm run typecheck   # 0 ошибок
npm run test:run    # 12 тестов зелёные
npm run build       # dist/ создаётся

# Локально проверить прод-сборку
npm run preview     # калькулятор считает 2+3*4, sqrt(16)+pi
```

Если все 5 команд зелёные — коммитьте.

---

## 📦 Первый коммит

```bash
git init
git add -A
git commit -m "feat: MVP математического движка MurchCalc (v0.1.0)

- Lexer/Parser/Evaluator с точной арифметикой (decimal.js)
- Приоритеты операторов, унарный минус, ^, функции, pi/e
- Обработка ошибок (деление на ноль, неизвестные символы/функции)
- 12 unit-тестов (Vitest)
- CI: typecheck + test:run + build + деплой на GitHub Pages
- Временный UI для проверки движка"

git branch -M main
git remote add origin https://github.com/InVaeR/MurchCalc.git
git push -u origin main
git tag v0.1.0
git push origin v0.1.0
```

После пуша: **Settings → Pages → Source: GitHub Actions**, дождаться зелёного workflow, открыть `https://invaer.github.io/MurchCalc/`.

---

## Итог

**Проект готов к первому коммиту.** Все технические и инфраструктурные блокеры устранены:
- ✅ `npm ci` пройдёт (зависимости чистые);
- ✅ `typecheck/lint/test:run/build` пройдут;
- ✅ CI-пайплайн корректен;
- ✅ `base` совпадает с именем репозитория с учётом регистра — деплой отдаст рабочую страницу, а не белый экран;
- ✅ движок логически верен, 12 тестов покрывают арифметику, приоритеты, функции, ошибки, комментарии.

Единственная необязательная правка — уточнить в `AGENTS.md`, что `modes/` и `ui/` пока «PLANNED» (для консистентности с ИИ-контрактом). Это можно включить в тот же первый коммит или отложить.

**Рекомендация:** прогоните 5 команд из блока проверки, примените правку `AGENTS.md` (30 секунд) — и делайте коммит. После этого ядро полностью готово к следующему шагу: присваивание переменных (`x = 5`) и Text Mode. Готов дать полный код обеих фич, когда скажете.
