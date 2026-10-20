import type { ResearchResult } from './research-types'

export function parseResearchResult(value: unknown): ResearchResult {
  if (!value || typeof value !== 'object') throw new Error('Invalid research response')
  const data = value as Partial<ResearchResult>
  if (
    data.status !== 'ok' ||
    typeof data.text !== 'string' ||
    !data.text.trim() ||
    data.text.length > 50_000 ||
    typeof data.checkedAt !== 'string' ||
    !Number.isFinite(Date.parse(data.checkedAt)) ||
    !Array.isArray(data.citations) ||
    data.citations.length === 0 ||
    data.citations.length > 50
  )
    throw new Error('Invalid research response')
  let previousEnd = 0
  for (const citation of data.citations) {
    if (
      !citation ||
      typeof citation.url !== 'string' ||
      typeof citation.title !== 'string' ||
      !Number.isInteger(citation.start) ||
      !Number.isInteger(citation.end) ||
      citation.start < previousEnd ||
      citation.end <= citation.start ||
      citation.end > data.text.length
    )
      throw new Error('Invalid research citations')
    const url = new URL(citation.url)
    if (url.protocol !== 'https:' || url.username || url.password)
      throw new Error('Invalid source URL')
    previousEnd = citation.end
  }
  return data as ResearchResult
}
