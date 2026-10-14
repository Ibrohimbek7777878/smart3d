/* Smart3D engine/expr.js — XAVFSIZ MATEMATIK VA FORMULA PARSYERI (AST).
 *
 * 6 YILLIK ARXITEKTURA STANDARTI:
 *   - "eval" va "Function(...)" BUTUNLAY TAQIQLANGAN (Kiberxavfsizlik + Ishonchlilik).
 *   - Shunting-Yard algoritmi asosida ifodani tokenlarga ajratib baholaydi.
 *   - Qo'llab-quvvatlaydi:
 *       • O'zgaruvchilar: w, d, h, t, qty
 *       • Arifmetika: +, -, *, /, %, qavslar ( )
 *       • Taqqoslash: >, <, >=, <=, ==, !=
 *       • Mantiq: &&, ||, !
 *       • Shartli amal (Ternary): shart ? rost : yolg'on
 *       • Matematik funksiyalar: min(a,b), max(a,b), round(a), floor(a), ceil(a), abs(a)
 *
 * Testlangan: "w - 2 * t", "w > 600 ? 2 : 1", "w > 600 ? (w/2 - 3) : (w - 4)"
 */

// Operatorlar ustuvorligi (Precedence)
const PRECEDENCE = {
  '||': 1,
  '&&': 2,
  '==': 3, '!=': 3,
  '<': 4, '<=': 4, '>': 4, '>=': 4,
  '+': 5, '-': 5,
  '*': 6, '/': 6, '%': 6,
  'u+': 7, 'u-': 7, '!': 7 // Unar operatorlar
};

/**
 * Matnli ifodani tokenlarga ajratadi.
 */
function tokenize(exprStr) {
  const str = String(exprStr == null ? '' : exprStr).trim();
  const tokens = [];
  let i = 0;
  const n = str.length;

  while (i < n) {
    const ch = str[i];

    // Bo'shliqlarni o'tkazib yuborish
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Raqamlar (butun va o'nlik)
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(str[i + 1] || ''))) {
      let numStr = '';
      while (i < n && /[0-9.]/.test(str[i])) {
        numStr += str[i];
        i++;
      }
      tokens.push({ type: 'num', value: parseFloat(numStr) });
      continue;
    }

    // Identifikatorlar (o'zgaruvchilar va funksiyalar)
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < n && /[a-zA-Z0-9_]/.test(str[i])) {
        ident += str[i];
        i++;
      }
      tokens.push({ type: 'ident', value: ident.toLowerCase() });
      continue;
    }

    // Ikki belgili operatorlar: >=, <=, ==, !=, &&, ||
    const two = str.slice(i, i + 2);
    if (['>=', '<=', '==', '!=', '&&', '||'].includes(two)) {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }

    // Bir belgili operatorlar va punktuatsiya
    if ('+-*/%><!?:(),'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    throw new Error(`E_BAD_CHAR: Ifodada ruxsat etilmagan belgi '${ch}' (pozitsiya: ${i})`);
  }

  return tokens;
}

/**
 * Recursive Descent / Pratt uslubida ifodani hisoblash (AST qurmasdan tezkor evaluate).
 */
class ExprEvaluator {
  constructor(tokens, vars) {
    this.tokens = tokens;
    this.vars = vars || {};
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos] || null;
  }

  consume(expectedValue) {
    const t = this.tokens[this.pos];
    if (!t) throw new Error('E_UNEXPECTED_EOF: Ifoda kutilmaganda tugadi');
    if (expectedValue && t.value !== expectedValue) {
      throw new Error(`E_SYNTAX: Kutilgan '${expectedValue}', lekin '${t.value}' keldi`);
    }
    this.pos++;
    return t;
  }

  evaluate() {
    if (!this.tokens.length) return 0;
    const res = this.parseExpression();
    if (this.pos < this.tokens.length) {
      throw new Error(`E_EXTRA_TOKENS: Ifoda oxirida ortiqcha belgilar: '${this.tokens[this.pos].value}'`);
    }
    return typeof res === 'boolean' ? (res ? 1 : 0) : res;
  }

  parseExpression() {
    return this.parseTernary();
  }

  // Shartli amal: cond ? trueExpr : falseExpr
  parseTernary() {
    let cond = this.parseBinary(1);
    if (this.peek() && this.peek().value === '?') {
      this.consume('?');
      const trueVal = this.parseExpression();
      this.consume(':');
      const falseVal = this.parseExpression();
      return (cond && cond !== 0) ? trueVal : falseVal;
    }
    return cond;
  }

  // Binar amallar ustuvorlik bo'yicha
  parseBinary(minPrec) {
    let left = this.parseUnary();

    while (this.peek()) {
      const tok = this.peek();
      if (tok.type !== 'op' || !PRECEDENCE[tok.value] || PRECEDENCE[tok.value] < minPrec) {
        break;
      }
      if (tok.value === '?' || tok.value === ':' || tok.value === ')' || tok.value === ',') {
        break;
      }

      const op = this.consume().value;
      const prec = PRECEDENCE[op];
      const right = this.parseBinary(prec + 1);

      switch (op) {
        case '+': left = left + right; break;
        case '-': left = left - right; break;
        case '*': left = left * right; break;
        case '/':
          if (right === 0) throw new Error('E_ZERO_DIV: Nolga bo\'lish taqiqlangan');
          left = left / right;
          break;
        case '%': left = left % right; break;
        case '>': left = left > right ? 1 : 0; break;
        case '<': left = left < right ? 1 : 0; break;
        case '>=': left = left >= right ? 1 : 0; break;
        case '<=': left = left <= right ? 1 : 0; break;
        case '==': left = left === right ? 1 : 0; break;
        case '!=': left = left !== right ? 1 : 0; break;
        case '&&': left = (left && right) ? 1 : 0; break;
        case '||': left = (left || right) ? 1 : 0; break;
        default:
          throw new Error(`E_UNKNOWN_OP: Noma'lum operator '${op}'`);
      }
    }

    return left;
  }

  // Unar amallar (+, -, !)
  parseUnary() {
    const tok = this.peek();
    if (tok && tok.type === 'op' && (tok.value === '-' || tok.value === '+' || tok.value === '!')) {
      const op = this.consume().value;
      const val = this.parseUnary();
      if (op === '-') return -val;
      if (op === '+') return +val;
      if (op === '!') return (!val || val === 0) ? 1 : 0;
    }
    return this.parsePrimary();
  }

  // Birlamchi qiymatlar (raqamlar, o'zgaruvchilar, funksiyalar, qavslar)
  parsePrimary() {
    const tok = this.peek();
    if (!tok) throw new Error('E_UNEXPECTED_EOF: Qiymat kutilgan edi');

    // Raqam
    if (tok.type === 'num') {
      return this.consume().value;
    }

    // Qavs
    if (tok.type === 'op' && tok.value === '(') {
      this.consume('(');
      const val = this.parseExpression();
      this.consume(')');
      return val;
    }

    // Identifikator (O'zgaruvchi yoki Funksiya)
    if (tok.type === 'ident') {
      const ident = this.consume().value;

      // Funksiya chaqiruvi bormi? ident(...)
      if (this.peek() && this.peek().value === '(') {
        this.consume('(');
        const args = [];
        if (this.peek() && this.peek().value !== ')') {
          args.push(this.parseExpression());
          while (this.peek() && this.peek().value === ',') {
            this.consume(',');
            args.push(this.parseExpression());
          }
        }
        this.consume(')');
        return this.evalFunction(ident, args);
      }

      // O'zgaruvchi qiymati
      if (Object.prototype.hasOwnProperty.call(this.vars, ident)) {
        const v = this.vars[ident];
        return typeof v === 'number' ? v : parseFloat(v) || 0;
      }

      // Noma'lum o'zgaruvchi
      throw new Error(`E_UNKNOWN_VAR: Noma'lum o'zgaruvchi '${ident}'`);
    }

    throw new Error(`E_SYNTAX: Kutilmagan belgi '${tok.value}'`);
  }

  // Standart matematik funksiyalar
  evalFunction(name, args) {
    switch (name) {
      case 'min': return Math.min(...args);
      case 'max': return Math.max(...args);
      case 'round': return Math.round(args[0] || 0);
      case 'floor': return Math.floor(args[0] || 0);
      case 'ceil': return Math.ceil(args[0] || 0);
      case 'abs': return Math.abs(args[0] || 0);
      default:
        throw new Error(`E_UNKNOWN_FUNC: Noma'lum funksiya '${name}'`);
    }
  }
}

/**
 * Xavfsiz Matematik Formulani Baholash Funksiyasi.
 *
 * @param {string|number} expr — formula ifodasi (masalan: "w - 2 * t", "w > 600 ? 2 : 1")
 * @param {Object} vars — o'zgaruvchilar qiymati: { w, d, h, t, ... }
 * @returns {number} hisoblangan natija
 */
export function evalFormula(expr, vars = {}) {
  if (typeof expr === 'number') return expr;
  const s = String(expr == null ? '' : expr).trim();
  if (s === '') return 0;

  // Agar oddiy butun son bo'lsa darhol qaytarish
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    return parseFloat(s);
  }

  const tokens = tokenize(s);
  const evaluator = new ExprEvaluator(tokens, vars);
  const result = evaluator.evaluate();

  if (typeof result !== 'number' || !isFinite(result)) {
    throw new Error(`E_INVALID_NUM: Formula hisoblashda cheksiz yoki noaniq qiymat chiqdi: ${result}`);
  }

  return result;
}

/** Butun songa yaxlitlash (detallar va o'lchamlar uchun) */
export function roundMm(x) {
  return Math.round(x + 1e-9);
}
