import nearley from 'nearley'
import type { MarkerPredicate } from '../../types'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const grammar = require('./markers.js')

export type { MarkerPredicate }

export function parseMarker(expression: string): MarkerPredicate {
  if (!expression.trim()) return () => true
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar))
  parser.feed(expression.trim())
  if (!parser.results.length) throw new Error(`[markerParser] No parse result for: ${expression}`)
  return parser.results[0]
}
