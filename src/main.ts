/**
 * Точка входа приложения.
 */
import { Evaluator } from './core/engine/evaluator';

function bootstrap(): void {
  const root = document.getElementById('app');
  if (!root) {
    throw new Error('Не найден элемент #app');
  }

  const engine = new Evaluator();

  // Временный UI для проверки движка (позже заменится на режимы).
  root.innerHTML = `
    <main style="font-family: system-ui; max-width: 640px; margin: 40px auto;">
      <h1>MurchCalc</h1>
      <p>Введите выражение (например: <code>2 + 3 * 4</code>, <code>sqrt(16) + pi</code>)</p>
      <input id="expr" type="text" style="width:100%; padding:8px; font-size:16px;" />
      <div id="result" style="margin-top:12px; font-size:18px;"></div>
    </main>
  `;

  const input = document.getElementById('expr') as HTMLInputElement;
  const output = document.getElementById('result') as HTMLDivElement;

  input.addEventListener('input', () => {
    const res = engine.evaluate(input.value);
    if (res.error) {
      output.style.color = 'crimson';
      output.textContent = `Ошибка: ${res.error}`;
    } else if (res.value !== undefined) {
      output.style.color = 'green';
      output.textContent = `= ${res.value}`;
    } else {
      output.textContent = '';
    }
  });
}

bootstrap();
