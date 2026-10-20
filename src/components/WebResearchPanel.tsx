import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowUpRight, BookOpen, ExternalLink, Info, LoaderCircle, Search } from 'lucide-react'
import { parseResearchResult } from '../lib/research-client'
import type { ResearchRequest, ResearchResult } from '../lib/research-types'
import { buildWebSearchUrl } from '../lib/service-search'

class ResearchError extends Error {}

export default function WebResearchPanel({ request }: { request: ResearchRequest }) {
  const [result, setResult] = useState<ResearchResult | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const controller = useRef<AbortController | null>(null)
  const requestKey = JSON.stringify(request)

  useEffect(() => {
    controller.current?.abort()
    setResult(null)
    setStatus('idle')
    setMessage('')
    return () => controller.current?.abort()
  }, [requestKey])

  const ready = Boolean(request.location.trim() && request.service.trim())
  let searchUrl: string | null = null
  try {
    if (ready) searchUrl = buildWebSearchUrl(request.service, request.brandModel, request.location)
  } catch {
    /* Invalid search inputs are handled before a request. */
  }

  async function research() {
    if (!ready) {
      setMessage('Enter your city or postcode in the nearby-services panel first.')
      document.getElementById('location')?.focus()
      return
    }
    if (!searchUrl) {
      setMessage('Check the service, model, and location for invalid characters.')
      return
    }
    controller.current?.abort()
    const active = new AbortController()
    controller.current = active
    setStatus('loading')
    setMessage('')
    setResult(null)
    const timeout = window.setTimeout(() => active.abort('timeout'), 65_000)
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: active.signal,
      })
      const data: unknown = await response.json()
      if (!response.ok) {
        const errorCode = (data as { error?: { code?: string } } | null)?.error?.code
        if (errorCode === 'not_configured') {
          throw new ResearchError(
            'Web research isn’t enabled yet. You can still search published information directly below.',
          )
        }
        if (response.status === 429)
          throw new ResearchError('Too many research requests. Please wait a minute and try again.')
        throw new ResearchError(
          'We couldn’t find a reliable, sourced answer right now. Try again or open a web search below.',
        )
      }
      const parsed = parseResearchResult(data)
      if (controller.current === active && !active.signal.aborted) {
        setResult(parsed)
        setStatus('idle')
      }
    } catch (error) {
      if (
        controller.current !== active ||
        (active.signal.aborted && active.signal.reason !== 'timeout')
      )
        return
      setStatus('error')
      setMessage(
        active.signal.reason === 'timeout'
          ? 'Research took too long. Try again or search the web directly below.'
          : error instanceof ResearchError
            ? error.message
            : 'The research response couldn’t be verified. Try again or search the web directly below.',
      )
    } finally {
      window.clearTimeout(timeout)
    }
  }

  return (
    <section className="web-research" aria-labelledby="web-research-title">
      <div className="research-heading">
        <span>
          <BookOpen size={18} />
        </span>
        <div>
          <h4 id="web-research-title">What does the web say?</h4>
          <p>Look for repair guidance and published prices for this service.</p>
        </div>
      </div>
      <p className="research-scope">
        <strong>Researching:</strong>{' '}
        {[request.brandModel, request.service, request.location].filter(Boolean).join(' · ')}
      </p>
      <button
        className="button button-secondary research-button"
        onClick={() => void research()}
        disabled={status === 'loading'}
      >
        <span>
          {status === 'loading' ? (
            <LoaderCircle className="spinning" size={16} />
          ) : (
            <Search size={16} />
          )}
          {status === 'loading'
            ? 'Checking published information…'
            : result
              ? 'Refresh web research'
              : 'Research this repair'}
        </span>
        <ArrowUpRight size={16} />
      </button>
      <p className="research-consent">
        Research sends your device details, symptoms, and search area to OpenAI. Your photo stays in
        this browser.
      </p>
      {status === 'loading' && (
        <p className="research-status" role="status">
          Searching for relevant sources. This may take a little while.
        </p>
      )}
      {message && (
        <p className="research-message" role="status">
          <Info size={15} />
          {message}
        </p>
      )}
      {result && (
        <div className="research-result" aria-live="polite">
          <div className="research-result-label">
            <span>WEB-SOURCED INFORMATION</span>
            <time dateTime={result.checkedAt}>
              Checked{' '}
              {new Date(result.checkedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </time>
          </div>
          <CitedAnswer result={result} />
          <p className="research-price-note">
            Published prices may be conditional or out of date. Confirm the model, parts, labor,
            taxes, and final price with the repairer. These sources do not change the illustrative
            estimate above. Web research isn’t included in saved estimates or downloads.
          </p>
        </div>
      )}
      {searchUrl ? (
        <a className="direct-search" href={searchUrl} target="_blank" rel="noreferrer">
          Search the web yourself <ExternalLink size={13} />
        </a>
      ) : (
        <p className="research-location-hint">
          Add a city or postcode in the nearby-services panel to research local information.
        </p>
      )}
    </section>
  )
}

function CitedAnswer({ result }: { result: ResearchResult }) {
  const sources = [
    ...new Map(result.citations.map((citation) => [citation.url, citation])).values(),
  ]
  const content: ReactNode[] = []
  let cursor = 0
  for (const [index, citation] of result.citations.entries()) {
    content.push(result.text.slice(cursor, citation.start))
    const sourceIndex = sources.findIndex((source) => source.url === citation.url) + 1
    content.push(
      <a
        key={index}
        className="inline-citation"
        href={citation.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Source ${sourceIndex}: ${citation.title}`}
      >
        [{sourceIndex}]
      </a>,
    )
    cursor = citation.end
  }
  content.push(result.text.slice(cursor))
  return (
    <>
      <div className="research-answer">{content}</div>
      <ol className="research-sources" aria-label="Research sources">
        {sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer">
              <span>
                {source.title || new URL(source.url).hostname}
                <small>{new URL(source.url).hostname}</small>
              </span>
              <ArrowUpRight size={14} />
            </a>
          </li>
        ))}
      </ol>
    </>
  )
}
