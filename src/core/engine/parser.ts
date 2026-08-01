/**
 * Парсер: токены → AST. Рекурсивный спуск с корректными приоритетами:
 * expression: + -
 * term:       * / %
 * power:      ^ (правоассоциативный)
 * unary:      унарные + -
 * postfix:    факториал !
 * call:       вызов функции f(...)
 * primary:    число, идентификатор, константа, ( expr )
 */
import { ParserResult, Token, TokenType, ASTNode, NodeType } from '../types';

class TokenStream {
  private tokens: Token[];
  private index = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  peek(): Token | undefined {
    return this.tokens[this.index];
  }

  advance(): Token {
    return this.tokens[this.index++];
  }

  hasMore(): boolean {
    return this.index < this.tokens.length;
  }

  matchOp(...values: string[]): boolean {
    const t = this.peek();
    return !!t && t.type === TokenType.Operator && values.includes(t.value);
  }

  matchPunct(value: string): boolean {
    const t = this.peek();
    return !!t && t.type === TokenType.Punctuator && t.value === value;
  }
}

export class Parser {
  parse(tokens: Token[]): ParserResult {
    const errors: string[] = [];
    let ast: ASTNode | null = null;

    try {
      const stream = new TokenStream(tokens);
      if (!stream.hasMore()) {
        return { ast: null, errors: [] };
      }
      ast = this.parseExpression(stream);
      if (stream.hasMore()) {
        errors.push(`Неожиданный токен: ${stream.peek()!.value}`);
      }
    } catch (error) {
      errors.push(`Ошибка парсинга: ${(error as Error).message}`);
    }

    return { ast, errors };
  }

  // + -
  private parseExpression(s: TokenStream): ASTNode {
    let left = this.parseTerm(s);
    while (s.matchOp('+', '-')) {
      const operator = s.advance().value;
      const right = this.parseTerm(s);
      left = { type: NodeType.BinaryExpression, left, right, operator, position: left.position };
    }
    return left;
  }

  // * / %
  private parseTerm(s: TokenStream): ASTNode {
    let left = this.parsePower(s);
    while (s.matchOp('*', '/', '%')) {
      const operator = s.advance().value;
      const right = this.parsePower(s);
      left = { type: NodeType.BinaryExpression, left, right, operator, position: left.position };
    }
    return left;
  }

  // ^ (правоассоциативный)
  private parsePower(s: TokenStream): ASTNode {
    const left = this.parseUnary(s);
    if (s.matchOp('^')) {
      const operator = s.advance().value;
      const right = this.parsePower(s); // рекурсия вправо
      return { type: NodeType.BinaryExpression, left, right, operator, position: left.position };
    }
    return left;
  }

  // унарные + -
  private parseUnary(s: TokenStream): ASTNode {
    if (s.matchOp('+', '-')) {
      const operator = s.advance().value;
      const argument = this.parseUnary(s);
      return { type: NodeType.UnaryExpression, argument, operator, position: argument.position };
    }
    return this.parsePostfix(s);
  }

  // постфиксный факториал: 5!, 3!! и т.п.
  private parsePostfix(s: TokenStream): ASTNode {
    let node = this.parseCall(s);
    while (s.matchOp('!')) {
      s.advance();
      node = {
        type: NodeType.UnaryExpression,
        argument: node,
        operator: '!',
        position: node.position,
      };
    }
    return node;
  }

  // вызов функции
  private parseCall(s: TokenStream): ASTNode {
    const callee = this.parsePrimary(s);
    if (s.matchPunct('(')) {
      s.advance(); // (
      const args: ASTNode[] = [];
      if (!s.matchPunct(')')) {
        do {
          args.push(this.parseExpression(s));
        } while (s.matchPunct(',') && (s.advance(), true));
      }
      if (!s.matchPunct(')')) {
        throw new Error('Ожидалась закрывающая скобка');
      }
      s.advance(); // )
      return { type: NodeType.CallExpression, callee, arguments: args, position: callee.position };
    }
    return callee;
  }

  private parsePrimary(s: TokenStream): ASTNode {
    const token = s.peek();
    if (!token) {
      throw new Error('Неожиданный конец выражения');
    }

    if (token.type === TokenType.Number) {
      s.advance();
      return { type: NodeType.Literal, value: token.value, position: token.position };
    }

    if (token.type === TokenType.Keyword) {
      s.advance();
      const value = token.value.toLowerCase() === 'pi' ? Math.PI : Math.E;
      return { type: NodeType.Literal, value, position: token.position };
    }

    if (token.type === TokenType.Identifier) {
      s.advance();
      return { type: NodeType.Identifier, name: token.value, position: token.position };
    }

    if (s.matchPunct('(')) {
      s.advance();
      const expr = this.parseExpression(s);
      if (!s.matchPunct(')')) {
        throw new Error('Ожидалась закрывающая скобка');
      }
      s.advance();
      return expr;
    }

    throw new Error(`Неожиданный токен: ${token.value}`);
  }
}
