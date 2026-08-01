/**
 * Точка входа приложения.
 * Регистрирует режимы и запускает UI-оболочку App.
 */
import { Evaluator } from './core/engine/evaluator';
import { ModeRegistry } from './core/ModeRegistry';
import { App } from './ui/App';
import { BasicMode } from './modes/basic/BasicMode';
import { TextMode } from './modes/text/TextMode';
import { ConverterMode } from './modes/converter/ConverterMode';
import './ui/theme/theme.css';

function bootstrap(): void {
  const root = document.getElementById('app');
  if (!root) {
    throw new Error('Не найден элемент #app');
  }

  // Регистрируем режимы (порядок = порядок табов).
  ModeRegistry.register(new TextMode());
  ModeRegistry.register(new BasicMode());
  ModeRegistry.register(new ConverterMode());

  const engine = new Evaluator();
  const app = new App(root, engine);
  app.start();
}

bootstrap();
