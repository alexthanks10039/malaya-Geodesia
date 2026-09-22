const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "paren"; value: "(" | ")" }
  | { type: "comma"; value: "," };

export type FormulaDefinition = {
  key: string;
  expression: string;
  enabled?: boolean;
};

export type FormulaEvaluationResult = {
  values: Record<string, number>;
  order: string[];
};

export const FORMULA_FUNCTIONS = [
  "abs",
  "ceil",
  "clamp",
  "floor",
  "max",
  "min",
  "pow",
  "round",
  "roundTo",
] as const;

export function isFormulaKey(value: string): boolean {
  return IDENTIFIER_RE.test(value);
}

function tokenize(expression: string): Token[] {
  if (expression.length > 600) {
    throw new Error("Формула слишком длинная: максимум 600 символов.");
  }

  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/\d|\./.test(char)) {
      const match = expression.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if (!match) throw new Error("Некорректное число рядом с "" + char + "".");
      const value = Number(match[0]);
      if (!Number.isFinite(value)) throw new Error("Числовое значение должно быть конечным.");
      tokens.push({ type: "number", value });
      index += match[0].length;
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      const match = expression.slice(index).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (!match) throw new Error("Некорректное имя переменной рядом с "" + char + "".");
      tokens.push({ type: "identifier", value: match[0] });
      index += match[0].length;
      continue;
    }

    if ("+-*/^".includes(char)) {
      tokens.push({ type: "operator", value: char as Token["value"] });
      index += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: "comma", value: char });
      index += 1;
      continue;
    }

    throw new Error("Недопустимый символ "" + char + "".");
  }

  if (tokens.length > 240) {
    throw new Error("Формула содержит слишком много частей.");
  }

  return tokens;
}

class ExpressionParser {
  private index = 0;
  private lastValue = "";

  constructor(
    private readonly tokens: Token[],
    private readonly resolveIdentifier: (name: string) => number,
  ) {}

  parse(): number {
    if (!this.tokens.length) throw new Error("Формула пуста.");
    const result = this.parseAdditive();
    if (this.index !== this.tokens.length) {
      throw new Error("В формуле остались необработанные символы.");
    }
    if (!Number.isFinite(result)) throw new Error("Формула вернула нечисловой результат.");
    return result;
  }

  private parseAdditive(): number {
    let result = this.parseMultiplicative();

    while (this.matchOperator("+") || this.matchOperator("-")) {
      const operator = this.previousTokenValue() as "+" | "-";
      const right = this.parseMultiplicative();
      result = operator === "+" ? result + right : result - right;
    }

    return result;
  }

  private parseMultiplicative(): number {
    let result = this.parsePower();

    while (this.matchOperator("*") || this.matchOperator("/")) {
      const operator = this.previousTokenValue() as "*" | "/";
      const right = this.parsePower();
      if (operator === "/" && right === 0) throw new Error("Деление на ноль.");
      result = operator === "*" ? result * right : result / right;
    }

    return result;
  }

  private parsePower(): number {
    const left = this.parseUnary();
    if (!this.matchOperator("^")) return left;
    const right = this.parsePower();
    const result = Math.pow(left, right);
    if (!Number.isFinite(result)) throw new Error("Степень дала нечисловой результат.");
    return result;
  }

  private parseUnary(): number {
    if (this.matchOperator("+")) return +this.parseUnary();
    if (this.matchOperator("-")) return -this.parseUnary();
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.peek();
    if (!token) throw new Error("Ожидалось число, переменная или функция.");

    if (token.type === "number") {
      this.index += 1;
      return token.value;
    }

    if (token.type === "identifier") {
      this.index += 1;
      if (this.matchParen("(")) {
        const args: number[] = [];
        if (!this.matchParen(")")) {
          do {
            args.push(this.parseAdditive());
          } while (this.matchComma());
          this.expectParen(")");
        }
        return callFunction(token.value, args);
      }
      return this.resolveIdentifier(token.value);
    }

    if (this.matchParen("(")) {
      const result = this.parseAdditive();
      this.expectParen(")");
      return result;
    }

    throw new Error("Ожидалось число, переменная или функция.");
  }

  private matchOperator(value: "+" | "-" | "*" | "/" | "^"): boolean {
    const token = this.peek();
    if (token?.type === "operator" && token.value === value) {
      this.index += 1;
      this.lastValue = token.value;
      return true;
    }
    return false;
  }

  private matchParen(value: "(" | ")"): boolean {
    const token = this.peek();
    if (token?.type === "paren" && token.value === value) {
      this.index += 1;
      this.lastValue = token.value;
      return true;
    }
    return false;
  }

  private matchComma(): boolean {
    const token = this.peek();
    if (token?.type === "comma") {
      this.index += 1;
      this.lastValue = ",";
      return true;
    }
    return false;
  }

  private expectParen(value: "(" | ")"): void {
    if (!this.matchParen(value)) throw new Error("Ожидался символ "" + value + "".");
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private previousTokenValue(): string {
    return this.lastValue;
  }
}

function callFunction(name: string, args: number[]): number {
  if (!(FORMULA_FUNCTIONS as readonly string[]).includes(name)) {
    throw new Error("Неизвестная функция "" + name + "".");
  }

  if (name === "min" || name === "max") {
    if (!args.length) throw new Error(name + " требует минимум один аргумент.");
    return name === "min" ? Math.min(...args) : Math.max(...args);
  }

  if (name === "abs" || name === "ceil" || name === "floor" || name === "round") {
    if (args.length !== 1) throw new Error(name + " требует 1 аргумент.");
    const value = args[0];
    if (name === "abs") return Math.abs(value);
    if (name === "ceil") return Math.ceil(value);
    if (name === "floor") return Math.floor(value);
    return Math.round(value);
  }

  if (name === "pow") {
    if (args.length !== 2) throw new Error("pow требует 2 аргумента.");
    return Math.pow(args[0], args[1]);
  }

  if (name === "clamp") {
    if (args.length !== 3) throw new Error("clamp требует 3 аргумента.");
    return Math.max(args[1], Math.min(args[2], args[0]));
  }

  if (name === "roundTo") {
    if (args.length !== 2) throw new Error("roundTo требует 2 аргумента.");
    if (args[1] <= 0) throw new Error("Шаг округления должен быть больше нуля.");
    return Math.round(args[0] / args[1]) * args[1];
  }

  throw new Error("Функция "" + name + "" не поддерживается.");
}

export function evaluateExpression(
  expression: string,
  variables: Record<string, number>,
  formulas: Record<string, string> = {},
): number {
  const formulaMap = new Map(Object.entries(formulas));
  const cache = new Map<string, number>();
  const visiting = new Set<string>();

  const resolve = (name: string): number => {
    if (!isFormulaKey(name)) throw new Error("Некорректное имя "" + name + "".");

    if (Object.prototype.hasOwnProperty.call(variables, name)) {
      const value = variables[name];
      if (!Number.isFinite(value)) throw new Error("Переменная "" + name + "" нечисловая.");
      return value;
    }

    const cached = cache.get(name);
    if (cached !== undefined) return cached;

    const formula = formulaMap.get(name);
    if (formula === undefined) {
      throw new Error("Переменная "" + name + "" не найдена.");
    }

    if (visiting.has(name)) {
      throw new Error("Обнаружен цикл формул: "" + name + "".");
    }

    visiting.add(name);
    const value = new ExpressionParser(tokenize(formula), resolve).parse();
    visiting.delete(name);
    cache.set(name, value);
    return value;
  };

  return new ExpressionParser(tokenize(expression), resolve).parse();
}

export function evaluateFormulas(
  definitions: FormulaDefinition[],
  variables: Record<string, number>,
): FormulaEvaluationResult {
  const active = definitions.filter((definition) => definition.enabled !== false);
  const formulas = Object.fromEntries(active.map((definition) => [definition.key, definition.expression]));
  const keys = new Set<string>();

  for (const definition of definitions) {
    if (!isFormulaKey(definition.key)) {
      throw new Error("Некорректный ключ формулы "" + definition.key + "".");
    }
    if (keys.has(definition.key)) {
      throw new Error("Дублирующийся ключ формулы "" + definition.key + "".");
    }
    keys.add(definition.key);
    if (!definition.expression.trim()) {
      throw new Error("Формула "" + definition.key + "" пустая.");
    }
  }

  const values: Record<string, number> = {};
  const order: string[] = [];

  for (const definition of active) {
    const value = evaluateExpression(definition.expression, { ...variables, ...values }, formulas);
    values[definition.key] = value;
    order.push(definition.key);
  }

  return { values, order };
}

export function validateFormulaDefinitions(
  definitions: FormulaDefinition[],
  variables: Record<string, number>,
): string[] {
  const errors: string[] = [];
  try {
    evaluateFormulas(definitions, variables);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Не удалось проверить формулы.");
  }

  for (const definition of definitions) {
    if (!isFormulaKey(definition.key)) {
      errors.push("Ключ "" + definition.key + "" должен содержать только латинские буквы, цифры и "_".");
    }
    if (!definition.expression.trim()) {
      errors.push("Формула "" + (definition.key || "без ключа") + "" пустая.");
    }
  }

  return Array.from(new Set(errors));
}
