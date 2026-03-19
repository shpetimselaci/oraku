import { createHash } from 'crypto'
import { supabase } from './connection'
import type { Finding, Severity } from '../types'

// generates a deterministic UUID from any string so the same userId always maps to the same UUID
export function toUUID(str: string): string {
  const hash = createHash('sha256').update(str).digest('hex')
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.slice(18, 20),
    hash.slice(20, 32)
  ].join('-')
}

export interface DbFinding {
  id: string
  user_id: string
  detector: string
  severity: Severity
  message: string
  evidence: Record<string, unknown>
  detected_at: string
}

export async function saveFindings(findings: Finding[]): Promise<DbFinding[]> {
  if (!findings.length) return []

  const rows = findings.map(f => ({
    user_id: toUUID(f.groupKey as string),
    detector: f.detector,
    severity: f.severity,
    message: f.message,
    evidence: f.evidence
  }))

  const { data, error } = await supabase
    .from('findings')
    .insert(rows)
    .select()

  if (error) throw new Error(`Failed to save findings: ${error.message}`)
  return data as DbFinding[]
}

export async function getFindings(userId: string): Promise<DbFinding[]> {
  const { data, error } = await supabase
    .from('findings')
    .select('*')
    .eq('user_id', toUUID(userId))
    .order('detected_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch findings: ${error.message}`)
  return data as DbFinding[]
}
