import { describe, it, expect } from 'vitest';
import { Evaluator } from './evaluator';

const calc = (expr: string) => new Evaluator().evaluate(expr);

describe('Evaluator', () => {
  it('базовая арифметика', () => {
    expect(calc('2 + 3').value).toBe(5);
    expect(calc('10 - 4').value).toBe(6);
    expect(calc('6 * 7').value).toBe(42);
    expect(calc('20 / 5').value).toBe(4);
  });

  it('приоритеты операторов', () => {
    expect(calc('2 + 3 * 4').value).toBe(14);
    expect(calc('(2 + 3) * 4').value).toBe(20);
  });

  it('степень выше умножения и правоассоциативна', () => {
    expect(calc('2 + 3 ^ 2').value).toBe(11);
    expect(calc('2 ^ 3 ^ 2').value).toBe(512); // 2^(3^2)
  });

  it('дробные числа', () => {
    expect(calc('3.14 + 0.86').value).toBe(4);
    expect(calc('.5 * 2').value).toBe(1);
  });

  it('точность decimal.js', () => {
    expect(calc('0.1 + 0.2').value).toBe(0.3);
  });

  it('унарный минус', () => {
    expect(calc('-5 + 3').value).toBe(-2);
    expect(calc('-(2 + 3)').value).toBe(-5);
  });

  it('функции и константы', () => {
    expect(calc('sqrt(16)').value).toBe(4);
    expect(calc('max(3, 7)').value).toBe(7);
    expect(calc('abs(-5)').value).toBe(5);
    expect(Math.round(calc('pi').value! * 100) / 100).toBe(3.14);
  });

  it('переменные', () => {
    const e = new Evaluator();
    e.setVariable('x', 10);
    expect(e.evaluate('x * 2').value).toBe(20);
  });

  it('ошибки', () => {
    expect(calc('1 / 0').error).toContain('Деление на ноль');
    expect(calc('foo()').error).toContain('Неизвестная функция');
    expect(calc('sqrt(1, 2)').error).toContain('ожидает');
    expect(calc('sin').error).toContain('скобками');
    expect(calc('2 @ 3').error).toContain('Неизвестный символ');
    expect(calc('(2 + 3').error).toContain('скобка');
  });

  it('пустой ввод', () => {
    expect(calc('').value).toBeUndefined();
    expect(calc('   ').value).toBeUndefined();
  });

  it('игнорирует комментарии', () => {
    expect(calc('2 + 2 // это комментарий').value).toBe(4);
  });
});
