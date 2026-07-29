import { describe, it, expect } from 'vitest';
import { Evaluator } from '../../core/engine/evaluator';
import { computeLines } from './lineEngine';

const run = (text: string) => computeLines(text, new Evaluator());

describe('Text Mode lineEngine', () => {
  it('вычисляет простые выражения построчно', () => {
    const r = run('2 + 3\n10 / 2');
    expect(r[0].value).toBe(5);
    expect(r[1].value).toBe(5);
  });

  it('поддерживает присваивание и использование переменных', () => {
    const r = run('x = 10\ny = x * 2\ny + 1');
    expect(r[0].assignment).toBe(true);
    expect(r[0].value).toBe(10);
    expect(r[1].value).toBe(20);
    expect(r[2].value).toBe(21);
  });

  it('игнорирует пустые строки и комментарии', () => {
    const r = run('// заголовок\n\n2 + 2');
    expect(r[0].display).toBeUndefined();
    expect(r[1].display).toBeUndefined();
    expect(r[2].value).toBe(4);
  });

  it('срезает inline-комментарий', () => {
    const r = run('2 + 2 // сумма');
    expect(r[0].value).toBe(4);
  });

  it('поддерживает prev', () => {
    const r = run('5 * 5\nprev + 1');
    expect(r[0].value).toBe(25);
    expect(r[1].value).toBe(26);
  });

  it('ошибка в одной строке не роняет остальные', () => {
    const r = run('1 / 0\n2 + 2');
    expect(r[0].error).toBeDefined();
    expect(r[1].value).toBe(4);
  });

  it('удаление переменной сбрасывает её (пересчёт с нуля)', () => {
    const e = new Evaluator();
    computeLines('x = 5\nx + 1', e);
    const r2 = computeLines('x + 1', e);
    expect(r2[0].error).toBeDefined();
  });
});
