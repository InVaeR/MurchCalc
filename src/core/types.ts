/**
 * Унифицированные типы и интерфейсы для всего приложения.
 * Содержат общие определения типов, используемые во всех модулях.
 */

export interface Position {
  line: number;
  column: number;
}

export interface Token {
  type: TokenType;
  value: string;
  position: Position;
}

export enum TokenType {
  Number = 'Number',
  String = 'String',
  Identifier = 'Identifier',
  Operator = 'Operator',
  Keyword = 'Keyword',
  Punctuator = 'Punctuator',
}

export interface ASTNode {
  type: NodeType;
  value?: string | number;
  left?: ASTNode;
  right?: ASTNode;
  argument?: ASTNode;
  arguments?: ASTNode[];
  operator?: string;
  callee?: string | ASTNode;
  name?: string;
  position?: Position;
}

export enum NodeType {
  Program = 'Program',
  BinaryExpression = 'BinaryExpression',
  UnaryExpression = 'UnaryExpression',
  CallExpression = 'CallExpression',
  Identifier = 'Identifier',
  Literal = 'Literal',
  VariableDeclaration = 'VariableDeclaration',
}

export interface EvaluationContext {
  variables: Map<string, number>;
  functions: Map<string, FunctionInfo>;
  constants: Map<string, number>;
  previousResults: number[];
}

export interface FunctionInfo {
  arity: number;
  fn: (...args: number[]) => number;
}

// TODO: задействовать при добавлении API пользовательских констант.
export interface ConstantInfo {
  value: number;
}

export interface EvaluationResult {
  value?: number;
  error?: string;
}

export interface LexerResult {
  tokens: Token[];
  errors: string[];
}

export interface ParserResult {
  ast: ASTNode | null;
  errors: string[];
}

export interface CalculatorMode {
  id: string;
  title: string;
  icon: string;
  mount(container: HTMLElement, engine: Engine): void;
  unmount(): void;
  serialize(): unknown;
  deserialize(data: unknown): void;
}

export interface Engine {
  evaluate(expression: string, context?: Partial<EvaluationContext>): EvaluationResult;
  setVariable?(name: string, value: number): void;
  clearVariables?(): void;
}
