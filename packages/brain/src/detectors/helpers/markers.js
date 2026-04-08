// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

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
var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "expr", "symbols": ["orExpr"], "postprocess": id},
    {"name": "orExpr", "symbols": ["andExpr"], "postprocess": id},
    {"name": "orExpr", "symbols": ["orExpr", "_", (lexer.has("or") ? {type: "or"} : or), "_", "andExpr"], "postprocess": ([l,,,,r]) => e => l(e) || r(e)},
    {"name": "andExpr", "symbols": ["notExpr"], "postprocess": id},
    {"name": "andExpr", "symbols": ["andExpr", "_", (lexer.has("and") ? {type: "and"} : and), "_", "notExpr"], "postprocess": ([l,,,,r]) => e => l(e) && r(e)},
    {"name": "notExpr", "symbols": [(lexer.has("not") ? {type: "not"} : not), "_", "notExpr"], "postprocess": ([,,operand]) => e => !operand(e)},
    {"name": "notExpr", "symbols": ["primary"], "postprocess": id},
    {"name": "primary", "symbols": [(lexer.has("lparen") ? {type: "lparen"} : lparen), "_", "expr", "_", (lexer.has("rparen") ? {type: "rparen"} : rparen)], "postprocess": ([,,inner]) => inner},
    {"name": "primary", "symbols": [(lexer.has("atom") ? {type: "atom"} : atom)], "postprocess": ([tok]) => e => matchField(e, tok.value.toLowerCase())},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", (lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"]}
]
  , ParserStart: "expr"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
