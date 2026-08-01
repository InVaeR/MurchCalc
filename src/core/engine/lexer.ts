/**
 * Лексер для разбора математических выражений.
 * Токенизирует строку в числа, операторы, идентификаторы, скобки, ключевые слова.
 * Поддерживает научную нотацию (1e3, 2.5E-2) и постфиксный факториал (!).
 */
import { Token, TokenType, Position, LexerResult } from '../types';

const KEYWORDS = new Set(['pi', 'e']);
const OPERATORS = new Set(['+', '-', '*', '/', '%', '^', '!']);
const PUNCTUATORS = new Set(['(', ')', ',', '=']);

export class Lexer {
  lex(input: string): LexerResult {
    const tokens: Token[] = [];
    const errors: string[] = [];
    let position = 0;
    let line = 1;
    let column = 1;

    const pos = (): Position => ({ line, column });

    const isDigit = (c: string) => c >= '0' && c <= '9';
    const isAlpha = (c: string) =>
      (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
    const isAlphaNum = (c: string) => isAlpha(c) || isDigit(c);

    while (position < input.length) {
      const char = input[position];

      // Пропуск пробелов
      if (char === ' ' || char === '\t' || char === '\r') {
        position++;
        column++;
        continue;
      }

      // Перевод строки
      if (char === '\n') {
        position++;
        line++;
        column = 1;
        continue;
      }

      // Комментарии //
      if (char === '/' && input[position + 1] === '/') {
        while (position < input.length && input[position] !== '\n') {
          position++;
          column++;
        }
        continue;
      }

      // Числа (включая дробные и научную нотацию: 1e3, 2.5E-2)
      if (isDigit(char) || (char === '.' && isDigit(input[position + 1]))) {
        const start = position;
        const startPos = pos();
        while (position < input.length && isDigit(input[position])) {
          position++;
          column++;
        }
        if (input[position] === '.') {
          position++;
          column++;
          while (position < input.length && isDigit(input[position])) {
            position++;
            column++;
          }
        }
        // Экспоненциальная часть — только если за e/E следует [+-]?цифра,
        // иначе 'e' остаётся отдельным токеном (константа Эйлера).
        if (input[position] === 'e' || input[position] === 'E') {
          let j = position + 1;
          if (input[j] === '+' || input[j] === '-') j++;
          if (isDigit(input[j])) {
            while (j < input.length && isDigit(input[j])) j++;
            column += j - position;
            position = j;
          }
        }
        tokens.push({
          type: TokenType.Number,
          value: input.substring(start, position),
          position: startPos,
        });
        continue;
      }

      // Идентификаторы / ключевые слова
      if (isAlpha(char)) {
        const start = position;
        const startPos = pos();
        while (position < input.length && isAlphaNum(input[position])) {
          position++;
          column++;
        }
        const text = input.substring(start, position);
        tokens.push({
          type: KEYWORDS.has(text.toLowerCase())
            ? TokenType.Keyword
            : TokenType.Identifier,
          value: text,
          position: startPos,
        });
        continue;
      }

      // Операторы
      if (OPERATORS.has(char)) {
        tokens.push({ type: TokenType.Operator, value: char, position: pos() });
        position++;
        column++;
        continue;
      }

      // Пунктуаторы
      if (PUNCTUATORS.has(char)) {
        tokens.push({ type: TokenType.Punctuator, value: char, position: pos() });
        position++;
        column++;
        continue;
      }

      // Неизвестный символ
      errors.push(`Неизвестный символ '${char}' (строка ${line}, столбец ${column})`);
      position++;
      column++;
    }

    return { tokens, errors };
  }
}
