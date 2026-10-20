import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import type { ResearchRequest } from '../src/lib/research-types'
import { createResearchHandler, extractResearchResult, parseResearchRequest } from './research'

const input: ResearchRequest = {
  appliance: 'washing-machine',
  age: 4,
  symptoms: 'Not draining',
  currency: 'INR',
  brandModel: 'Example washer 100',
  location: 'Bengaluru',
  service: 'washing machine drain pump repair',
}

function citedPart(text = 'Check the external hose. [1]', url = 'https://www.example.com/service') {
  return {
    type: 'output_text',
    text,
    annotations: [
      {
        type: 'url_citation',
        start_index: text.indexOf('[1]'),
        end_index: text.indexOf('[1]') + 3,
        url,
        title: 'Manufacturer service guide',
      },
    ],
  }
}

function providerResult(parts = [citedPart()]) {
  return {
    status: 'completed',
    output: [
      { type: 'web_search_call', status: 'completed' },
      { type: 'message', role: 'assistant', status: 'completed', content: parts },
    ],
  }
}

type HttpOptions = {
  method?: string
  headers?: Record<string, string>
  raw?: string
  preParsed?: unknown
  remoteAddress?: string
}

async function callHandler(
  handler: ReturnType<typeof createResearchHandler>,
  options: HttpOptions = {},
) {
  const request = Readable.from(
    options.raw === undefined ? [] : [options.raw],
  ) as IncomingMessage & { body?: unknown }
  request.method = options.method ?? 'POST'
  request.headers = {
    host: 'localhost:5173',
    'content-type': 'application/json',
    ...options.headers,
  }
  Object.defineProperty(request, 'socket', {
    value: { remoteAddress: options.remoteAddress ?? '127.0.0.1' },
  })
  if (options.raw === undefined)
    request.body = options.preParsed === undefined ? input : options.preParsed
  const headers: Record<string, string | number> = {}
  let body = ''
  const response = Object.assign(new EventEmitter(), {
    statusCode: 200,
    setHeader(name: string, value: string | number) {
      headers[name.toLowerCase()] = value
    },
    end(value: string) {
      body = value
    },
  }) as unknown as ServerResponse
  await handler(request, response)
  return {
    status: response.statusCode,
    headers,
    body: JSON.parse(body) as Record<string, unknown>,
    rawBody: body,
  }
}

function successfulFetch() {
  return vi.fn<typeof fetch>().mockImplementation(async () => Response.json(providerResult()))
}

describe('research input validation', () => {
  it('keeps only bounded, supported research fields', () => {
    expect(
      parseResearchRequest({ ...input, location: ' Bengaluru ', arbitraryField: 'ignored' }),
    ).toEqual(input)
  })

  it.each([
    null,
    [],
    { ...input, appliance: '__proto__' },
    { ...input, age: '4' },
    { ...input, currency: 'EUR' },
    { ...input, symptoms: '' },
    { ...input, symptoms: 'x'.repeat(2001) },
    { ...input, brandModel: 'x'.repeat(121) },
    { ...input, location: ' ' },
    { ...input, location: 'x'.repeat(121) },
    { ...input, service: 'x'.repeat(121) },
  ])('rejects invalid research input: %j', (value) => {
    expect(() => parseResearchRequest(value)).toThrow()
  })
})

describe('source-backed research output', () => {
  it('preserves source offsets across separate output text blocks', () => {
    const first = citedPart('The manual gives a check. [1]')
    const second = citedPart(
      'Published labor is not listed. [1]',
      'https://repairs.example.com/prices',
    )
    const result = extractResearchResult(
      providerResult([first, second]),
      '2026-10-20T00:00:00.000Z',
    )
    expect(result.text).toBe(`${first.text}\n\n${second.text}`)
    expect(result.citations[0].start).toBe(first.text.indexOf('[1]'))
    expect(result.citations[1].start).toBe(first.text.length + 2 + second.text.indexOf('[1]'))
    expect(result.citations[1].url).toBe('https://repairs.example.com/prices')
    expect(result.checkedAt).toBe('2026-10-20T00:00:00.000Z')
  })

  it.each([
    'http://www.example.com/service',
    'javascript:alert(1)',
    'https://localhost/service',
    'https://127.0.0.1/service',
    'https://169.254.169.254/latest/meta-data/',
    'https://[::1]/service',
    'https://service.internal/details',
    'https://user:secret@example.com/service',
    'https://example.com:444/service',
  ])('does not return unsafe source link %s', (url) => {
    expect(() => extractResearchResult(providerResult([citedPart(undefined, url)]), '')).toThrow()
  })

  it('requires a completed search and completed response', () => {
    const noSearch = providerResult()
    noSearch.output.shift()
    expect(() => extractResearchResult(noSearch, '')).toThrow()
    expect(() => extractResearchResult({ ...providerResult(), status: 'incomplete' }, '')).toThrow()
  })

  it('requires citations rather than trusting plausible model text', () => {
    const part = citedPart()
    part.annotations = []
    expect(() => extractResearchResult(providerResult([part]), '')).toThrow()
  })

  it.each([
    { start_index: -1 },
    { start_index: 1.5 },
    { end_index: 99999 },
    { end_index: 0 },
    { title: '' },
  ])('rejects invalid citation metadata: %j', (patch) => {
    const part = citedPart()
    Object.assign(part.annotations[0], patch)
    expect(() => extractResearchResult(providerResult([part]), '')).toThrow()
  })

  it('rejects overlapping citation spans', () => {
    const part = citedPart()
    part.annotations.push({ ...part.annotations[0] })
    expect(() => extractResearchResult(providerResult([part]), '')).toThrow()
  })
})

describe('research HTTP handler', () => {
  it('reports unavailable configuration without making an API call', async () => {
    const fetcher = successfulFetch()
    const result = await callHandler(createResearchHandler({ env: {}, fetcher }))
    expect(result.status).toBe(503)
    expect(result.body.error).toMatchObject({ code: 'not_configured' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('executes one bounded web search request and returns cited information', async () => {
    const fetcher = successfulFetch()
    const handler = createResearchHandler({
      env: { REPAIR_AI_API_KEY: 'test-key' },
      fetcher,
      now: () => 0,
    })
    const result = await callHandler(handler, {
      raw: JSON.stringify(input),
      headers: { origin: 'http://localhost:5173' },
    })
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ status: 'ok', checkedAt: '1970-01-01T00:00:00.000Z' })
    expect(result.headers['cache-control']).toBe('no-store')
    expect(fetcher).toHaveBeenCalledTimes(1)
    const [url, options] = fetcher.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/responses')
    const sent = JSON.parse(options!.body as string)
    expect(sent).toMatchObject({
      model: 'gpt-4.1',
      store: false,
      max_output_tokens: 1800,
      tool_choice: 'required',
      parallel_tool_calls: false,
    })
    expect(sent.tools).toEqual([
      {
        type: 'web_search',
        external_web_access: true,
        search_context_size: 'low',
        user_location: { type: 'approximate', city: 'Bengaluru' },
      },
    ])
    expect(sent.input).toContain('Bengaluru')
    expect(sent.input).not.toContain('test-key')
    expect(result.rawBody).not.toContain('test-key')
  })

  it('can reuse an existing server key and configurable model', async () => {
    const fetcher = successfulFetch()
    const handler = createResearchHandler({
      env: { OPENAI_API_KEY: 'existing-test-key', REPAIR_AI_MODEL: 'configured-model' },
      fetcher,
    })
    await callHandler(handler)
    const options = fetcher.mock.calls[0][1]!
    expect(options.headers).toMatchObject({ Authorization: 'Bearer existing-test-key' })
    expect(JSON.parse(options.body as string).model).toBe('configured-model')
  })

  it.each(['https://another-site.example', 'null', 'not a url'])(
    'rejects cross-origin or invalid browser Origin %s',
    async (origin) => {
      const fetcher = successfulFetch()
      const result = await callHandler(
        createResearchHandler({ env: { REPAIR_AI_API_KEY: 'test-key' }, fetcher }),
        { headers: { origin } },
      )
      expect(result.status).toBe(403)
      expect(fetcher).not.toHaveBeenCalled()
    },
  )

  it('accepts the matching deployed HTTPS origin', async () => {
    const result = await callHandler(createResearchHandler({ env: {} }), {
      headers: { host: 'second-life.vercel.app', origin: 'https://second-life.vercel.app' },
    })
    expect(result.status).toBe(503)
    expect(result.body.error).toMatchObject({ code: 'not_configured' })
  })

  it('rejects unsupported methods and media types', async () => {
    const handler = createResearchHandler({ env: {} })
    const get = await callHandler(handler, { method: 'GET' })
    expect(get.status).toBe(405)
    expect(get.headers.allow).toBe('POST')
    const text = await callHandler(handler, { headers: { 'content-type': 'text/plain' } })
    expect(text.status).toBe(415)
  })

  it('rejects malformed JSON', async () => {
    const result = await callHandler(createResearchHandler({ env: {} }), { raw: '{bad json' })
    expect(result.status).toBe(400)
  })

  it.each([
    { raw: 'x'.repeat(17000) },
    { preParsed: { ...input, symptoms: 'x'.repeat(17000) } },
    { headers: { 'content-length': '17000' } },
  ])('rejects oversized requests before calling the provider', async (options) => {
    const fetcher = successfulFetch()
    const result = await callHandler(
      createResearchHandler({ env: { REPAIR_AI_API_KEY: 'test-key' }, fetcher }),
      options,
    )
    expect(result.status).toBe(413)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('does not relay provider errors or credentials to clients', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('internal details and credentials', { status: 401 }))
    const result = await callHandler(
      createResearchHandler({ env: { REPAIR_AI_API_KEY: 'test-key' }, fetcher }),
    )
    expect(result.status).toBe(502)
    expect(result.body.error).toMatchObject({ code: 'provider_unavailable' })
    expect(result.rawBody).not.toContain('internal details')
    expect(result.rawBody).not.toContain('test-key')
  })

  it('handles provider network failures', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('provider network failed'))
    const result = await callHandler(
      createResearchHandler({ env: { REPAIR_AI_API_KEY: 'test-key' }, fetcher }),
    )
    expect(result.status).toBe(502)
    expect(result.body.error).toMatchObject({ code: 'provider_unavailable' })
  })

  it('does not return uncited or incomplete provider answers as web evidence', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ status: 'completed', output: [] }))
    const result = await callHandler(
      createResearchHandler({ env: { REPAIR_AI_API_KEY: 'test-key' }, fetcher }),
    )
    expect(result.status).toBe(502)
    expect(result.body.error).toMatchObject({ code: 'unverified_sources' })
  })

  it('limits the size of provider output', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('x'.repeat(600000)))
    const result = await callHandler(
      createResearchHandler({ env: { REPAIR_AI_API_KEY: 'test-key' }, fetcher }),
    )
    expect(result.status).toBe(502)
    expect(result.body.error).toMatchObject({ code: 'unverified_sources' })
  })

  it('aborts a stalled provider request', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )
    const result = await callHandler(
      createResearchHandler({ env: { REPAIR_AI_API_KEY: 'test-key' }, fetcher, timeoutMs: 10 }),
    )
    expect(result.status).toBe(504)
    expect(result.body.error).toMatchObject({ code: 'research_timeout' })
  })

  it('applies and expires the process-local burst limit', async () => {
    let timestamp = 1000
    const fetcher = successfulFetch()
    const handler = createResearchHandler({
      env: { REPAIR_AI_API_KEY: 'test-key' },
      fetcher,
      now: () => timestamp,
      rateLimit: { requests: 1, windowMs: 60_000 },
    })
    expect((await callHandler(handler)).status).toBe(200)
    const limited = await callHandler(handler)
    expect(limited.status).toBe(429)
    expect(limited.headers['retry-after']).toBe(60)
    expect(fetcher).toHaveBeenCalledTimes(1)
    timestamp += 60_000
    expect((await callHandler(handler)).status).toBe(200)
  })
})
