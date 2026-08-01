/**
 * Эвалуатор: вычисляет AST в точное число (decimal.js).
 * Публичный метод evaluate(expression) реализует интерфейс Engine.
 */
import Decimal from 'decimal.js';

import {
  Engine,
  EvaluationResult,
  ASTNode,
  NodeType,
  EvaluationContext,
} from '../types';
import { Lexer } from './lexer';
import { Parser } from './parser';
import { FunctionRegistry } from './functions';

const FACTORIAL_MAX = 500;

export class Evaluator implements Engine {
  private context: EvaluationContext;
  private lexer = new Lexer();
  private parser = new Parser();

  constructor(context?: Partial<EvaluationContext>) {
    FunctionRegistry.initDefaults();
    this.context = {
      variables: context?.variables ?? new Map<string, number>(),
      functions: context?.functions ?? new Map(),
      constants:
        context?.constants ??
        new Map<string, number>([
          ['pi', Math.PI],
          ['e', Math.E],
        ]),
      previousResults: context?.previousResults ?? [],
    };
  }

  /** Публичный API (Engine): строка → результат/ошибка. */
  evaluate(expression: string, context?: Partial<EvaluationContext>): EvaluationResult {
    const ctx = context ? { ...this.context, ...context } : this.context;

    if (!expression || expression.trim() === '') {
      return {};
    }

    try {
      const lexed = this.lexer.lex(expression);
      if (lexed.errors.length > 0) {
        return { error: lexed.errors.join('; ') };
      }

      const parsed = this.parser.parse(lexed.tokens);
      if (parsed.errors.length > 0) {
        return { error: parsed.errors.join('; ') };
      }
      if (!parsed.ast) {
        return {};
      }

      const result = this.evaluateNode(parsed.ast, ctx);
      return { value: result.toNumber() };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  /** Рекурсивное вычисление узла AST. */
  private evaluateNode(node: ASTNode, ctx: EvaluationContext): Decimal {
    switch (node.type) {
      case NodeType.BinaryExpression: {
        const left = this.evaluateNode(node.left!, ctx);
        const right = this.evaluateNode(node.right!, ctx);
        switch (node.operator) {
          case '+': return left.plus(right);
          case '-': return left.minus(right);
          case '*': return left.times(right);
          case '/':
            if (right.isZero()) throw new Error('Деление на ноль');
            return left.dividedBy(right);
          case '%':
            if (right.isZero()) throw new Error('Деление на ноль (остаток)');
            return left.mod(right);
          case '^': return left.pow(right);
          default: throw new Error(`Неизвестный оператор: ${node.operator}`);
        }
      }

      case NodeType.UnaryExpression: {
        const arg = this.evaluateNode(node.argument!, ctx);
        switch (node.operator) {
          case '+': return arg;
          case '-': return arg.negated();
          case '!': return this.factorial(arg);
          default: throw new Error(`Неизвестный унарный оператор: ${node.operator}`);
        }
      }

      case NodeType.CallExpression: {
        const name =
          typeof node.callee === 'string'
            ? node.callee
            : (node.callee as ASTNode).name ?? '';

        const func = ctx.functions.get(name) ?? FunctionRegistry.get(name);
        if (!func) throw new Error(`Неизвестная функция: ${name}`);

        const args = (node.arguments ?? []).map((a) => this.evaluateNode(a, ctx));
        if (args.length !== func.arity) {
          throw new Error(
            `Функция ${name} ожидает ${func.arity} аргумент(ов), получено ${args.length}`
          );
        }
        const result = func.fn(...args.map((a) => a.toNumber()));
        if (!Number.isFinite(result)) {
          throw new Error(`Функция ${name}: результат вне области определения`);
        }
        return new Decimal(result);
      }

      case NodeType.Identifier: {
        const name = node.name!;
        if (ctx.functions.get(name) ?? FunctionRegistry.get(name)) {
          throw new Error(`Функция ${name} должна вызываться со скобками: ${name}(...)`);
        }
        const constant = ctx.constants.get(name);
        if (constant !== undefined) return new Decimal(constant);
        const variable = ctx.variables.get(name);
        if (variable !== undefined) return new Decimal(variable);
        throw new Error(`Неопределённое значение: ${name}`);
      }

      case NodeType.Literal: {
        return new Decimal(node.value as string | number);
      }

      default:
        throw new Error(`Неизвестный тип узла: ${node.type}`);
    }
  }

  private factorial(n: Decimal): Decimal {
    if (!n.isInteger() || n.isNegative()) {
      throw new Error('Факториал определён только для целых неотрицательных чисел');
    }
    if (n.greaterThan(FACTORIAL_MAX)) {
      throw new Error(`Факториал: максимум ${FACTORIAL_MAX}!`);
    }
    let result = new Decimal(1);
    const limit = n.toNumber();
    for (let i = 2; i <= limit; i++) {
      result = result.times(i);
    }
    return result;
  }

  setVariable(name: string, value: number): void {
    this.context.variables.set(name, value);
  }

  clearVariables(): void {
    this.context.variables.clear();
  }

  getContext(): EvaluationContext {
    return this.context;
  }
}
