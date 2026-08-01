/**
 * Реестр математических функций.
 * Каждый режим может регистрировать собственные функции.
 *
 * Соглашения (как в инженерных калькуляторах):
 *   log  — десятичный логарифм (log10)
 *   ln   — натуральный логарифм
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

    // Тригонометрия
    this.register('sin', { arity: 1, fn: Math.sin });
    this.register('cos', { arity: 1, fn: Math.cos });
    this.register('tan', { arity: 1, fn: Math.tan });
    this.register('asin', { arity: 1, fn: Math.asin });
    this.register('acos', { arity: 1, fn: Math.acos });
    this.register('atan', { arity: 1, fn: Math.atan });
    this.register('atan2', { arity: 2, fn: Math.atan2 });
    this.register('sinh', { arity: 1, fn: Math.sinh });
    this.register('cosh', { arity: 1, fn: Math.cosh });
    this.register('tanh', { arity: 1, fn: Math.tanh });

    // Степени и корни
    this.register('sqrt', { arity: 1, fn: Math.sqrt });
    this.register('cbrt', { arity: 1, fn: Math.cbrt });
    this.register('pow', { arity: 2, fn: Math.pow });
    this.register('exp', { arity: 1, fn: Math.exp });

    // Логарифмы
    this.register('log', { arity: 1, fn: Math.log10 });
    this.register('ln', { arity: 1, fn: Math.log });
    this.register('log10', { arity: 1, fn: Math.log10 });
    this.register('log2', { arity: 1, fn: Math.log2 });

    // Округление и прочее
    this.register('abs', { arity: 1, fn: Math.abs });
    this.register('round', { arity: 1, fn: Math.round });
    this.register('floor', { arity: 1, fn: Math.floor });
    this.register('ceil', { arity: 1, fn: Math.ceil });
    this.register('trunc', { arity: 1, fn: Math.trunc });
    this.register('sign', { arity: 1, fn: Math.sign });
    this.register('min', { arity: 2, fn: Math.min });
    this.register('max', { arity: 2, fn: Math.max });

    // Константы (pi, e) и операторы (+,-,*,...) НЕ являются функциями —
    // они обрабатываются отдельно в лексере/эвалуаторе.
  }
}
