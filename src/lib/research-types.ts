import type { ApplianceId, Currency } from './estimator'

export interface ResearchRequest {
  appliance: ApplianceId
  age: number
  symptoms: string
  currency: Currency
  brandModel: string
  location: string
  service: string
}

export interface ResearchCitation {
  start: number
  end: number
  url: string
  title: string
}

export interface ResearchResult {
  status: 'ok'
  text: string
  citations: ResearchCitation[]
  checkedAt: string
}
