import type { Event, MarkerPredicate, AtomToken, OpToken, ParenToken, Token } from '../../types'

export type { MarkerPredicate }

// ─── Tokenizer ────────────────────────────────────────────────────────────────

function tokenize(expression: string): Token[] {
  const raw = expression.trim().match(/[a-zA-Z0-9_.\-:]+|[()]/g) ?? []
  return raw.map(w => {
    if (w === 'or' || w === 'and' || w === 'not') return { type: 'op', value: w } as OpToken
    if (w === '(' || w === ')')                   return { type: 'paren', value: w as '(' | ')' } as ParenToken
    return { type: 'atom', value: w.toLowerCase() } as AtomToken
  })
}

// ─── Recursive descent parser ─────────────────────────────────────────────────
// Grammar:
//   expr    = orExpr
//   orExpr  = andExpr  ('or'  andExpr)*
//   andExpr = notExpr  ('and' notExpr)*
//   notExpr = 'not' notExpr | primary
//   primary = '(' expr ')' | atom

class Parser {
  private pos = 0
  constructor(private tokens: Token[]) {}

  parse(): MarkerPredicate {
    const pred = this.parseOr()
    if (this.pos < this.tokens.length)
      throw new Error(`[markerParser] Unexpected token: ${this.tokens[this.pos].value}`)
    return pred
  }

  private parseOr(): MarkerPredicate {
    let left = this.parseAnd()
    while (this.peek('op', 'or')) {
      this.consume()
      const right = this.parseAnd()
      const l = left, r = right
      left = e => l(e) || r(e)
    }
    return left
  }

  private parseAnd(): MarkerPredicate {
    let left = this.parseNot()
    while (this.peek('op', 'and')) {
      this.consume()
      const right = this.parseNot()
      const l = left, r = right
      left = e => l(e) && r(e)
    }
    return left
  }

  private parseNot(): MarkerPredicate {
    if (this.peek('op', 'not')) {
      this.consume()
      const operand = this.parseNot()
      return e => !operand(e)
    }
    return this.parsePrimary()
  }

  private parsePrimary(): MarkerPredicate {
    const tok = this.tokens[this.pos]
    if (!tok) throw new Error('[markerParser] Unexpected end of expression')

    if (tok.type === 'paren' && tok.value === '(') {
      this.consume()
      const inner = this.parseOr()
      if (!this.peek('paren', ')'))
        throw new Error('[markerParser] Expected closing parenthesis')
      this.consume()
      return inner
    }

    if (tok.type === 'atom') {
      this.consume()
      const value = tok.value
      return e => matchField(e, value)
    }

    throw new Error(`[markerParser] Unexpected token: ${tok.value}`)
  }

  private peek(type: string, value?: string): boolean {
    const tok = this.tokens[this.pos]
    if (!tok || tok.type !== type) return false
    return value === undefined || tok.value === value
  }

  private consume(): Token {
    return this.tokens[this.pos++]
  }
}

// ─── Field matching ───────────────────────────────────────────────────────────
// A token matches an event if any of its text fields equal the token value.

function matchField(event: Event, value: string): boolean {
  return Object.values(event).some(fieldValue =>
    typeof fieldValue === 'string' && fieldValue.toLowerCase() === value
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function parseMarker(expression: string): MarkerPredicate {
  const tokens = tokenize(expression)
  if (!tokens.length) return () => true
  return new Parser(tokens).parse()
}
