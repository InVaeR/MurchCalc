/**
 * Реестр математических функций.
 * Каждый режим может регистрировать собственные функции.
 */
import { FunctionInfo } from '../types';

export class FunctionRegistry {
  private static registry = new Map<string, FunctionInfo>();

  static register(name: string, definition: FunctionInfo): void {
    this.registry.set(name, definition);
  }

  static get(name: string): FunctionInfo | undefined {
    return this.registry.get(name);
  }

  static list(): string[] {
    return Array.from(this.registry.keys());
  }

  static initDefaults(): void {
    if (this.registry.size > 0) return; // защита от повторной инициализации
    this.register('sin', { arity: 1, fn: Math.sin });
    this.register('cos', { arity: 1, fn: Math.cos });
    this.register('tan', { arity: 1, fn: Math.tan });
    this.register('sqrt', { arity: 1, fn: Math.sqrt });
    this.register('log', { arity: 1, fn: Math.log });
    this.register('log10', { arity: 1, fn: Math.log10 });
    this.register('abs', { arity: 1, fn: Math.abs });
    this.register('round', { arity: 1, fn: Math.round });
    this.register('floor', { arity: 1, fn: Math.floor });
    this.register('ceil', { arity: 1, fn: Math.ceil });
    this.register('min', { arity: 2, fn: Math.min });
    this.register('max', { arity: 2, fn: Math.max });
    // Константы (pi, e) и операторы (+,-,*,...) НЕ являются функциями —
    // они обрабатываются отдельно в лексере/эвалуаторе.
  }
}
