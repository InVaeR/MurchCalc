import { Engine } from '../../core/types';

export interface LineResult {
  display?: string;
  value?: number;
  error?: string;
  assignment?: boolean;
}

const ASSIGNMENT_RE = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/;

function stripComment(line: string): string {
  const idx = line.indexOf('//');
  return idx === -1 ? line : line.slice(0, idx);
}

export function computeLines(text: string, engine: Engine): LineResult[] {
  engine.clearVariables?.();

  const lines = text.split('\n');
  const results: LineResult[] = [];
  let prev: number | undefined;

  for (const rawLine of lines) {
    const line = stripComment(rawLine).trim();

    if (line === '') {
      results.push({});
      continue;
    }

    const assign = ASSIGNMENT_RE.exec(line);
    if (assign) {
      const [, name, expr] = assign;
      const res = engine.evaluate(injectPrev(expr, prev));
      if (res.error) {
        results.push({ error: res.error, assignment: true });
      } else if (res.value !== undefined) {
        engine.setVariable?.(name, res.value);
        prev = res.value;
        results.push({
          display: `${name} = ${format(res.value)}`,
          value: res.value,
          assignment: true,
        });
      } else {
        results.push({});
      }
      continue;
    }

    const res = engine.evaluate(injectPrev(line, prev));
    if (res.error) {
      results.push({ error: res.error });
    } else if (res.value !== undefined) {
      prev = res.value;
      results.push({ display: `= ${format(res.value)}`, value: res.value });
    } else {
      results.push({});
    }
  }

  return results;
}

function injectPrev(expr: string, prev: number | undefined): string {
  if (prev === undefined) return expr;
  return expr.replace(/\bprev\b/g, `(${prev})`);
}

function format(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(10)));
}
