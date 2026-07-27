/**
 * Реестр режимов калькулятора.
 * 
 * Регистрирует и управляет всеми доступными режимами калькулятора.
 * Позволяет создавать плагины-режимы без модификации ядра.
 */

import { CalculatorMode, Engine } from './types';

export class ModeRegistry {
  private static modes = new Map<string, CalculatorMode>();

  static register(mode: CalculatorMode): void {
    this.modes.set(mode.id, mode);
  }

  static get(id: string): CalculatorMode | undefined {
    return this.modes.get(id);
  }

  static list(): CalculatorMode[] {
    return Array.from(this.modes.values());
  }

  static mountAll(container: HTMLElement, engine: Engine): void {
    this.modes.forEach(mode => {
      mode.mount(container, engine);
    });
  }

  static unmountAll(): void {
    this.modes.forEach(mode => {
      mode.unmount();
    });
  }
}
