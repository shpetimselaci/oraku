@{%
const moo = require('moo')

const lexer = moo.compile({
  ws:     { match: /\s+/, lineBreaks: true },
  lparen: '(',
  rparen: ')',
  or:     { match: 'or',  longer_alt: 'atom' },
  and:    { match: 'and', longer_alt: 'atom' },
  not:    { match: 'not', longer_alt: 'atom' },
  atom:   /[a-zA-Z0-9_.:\-]+/
})

function matchField(event, value) {
  return Object.values(event).some(v => {
    if (v === null || v === undefined || typeof v === 'object') return false
    return String(v).toLowerCase() === value
  })
}
%}

@lexer lexer

expr    -> orExpr                             {% id %}

orExpr  ->
    andExpr                                   {% id %}
  | orExpr _ %or _ andExpr                   {% ([l,,,,r]) => e => l(e) || r(e) %}

andExpr ->
    notExpr                                   {% id %}
  | andExpr _ %and _ notExpr                 {% ([l,,,,r]) => e => l(e) && r(e) %}

notExpr ->
    %not _ notExpr                            {% ([,,operand]) => e => !operand(e) %}
  | primary                                   {% id %}

primary ->
    %lparen _ expr _ %rparen                 {% ([,,inner]) => inner %}
  | %atom                                    {% ([tok]) => e => matchField(e, tok.value.toLowerCase()) %}

_  -> %ws:*
