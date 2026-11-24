import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { Scaffald } from '../client.js'
import { server } from './mocks/server'

const BASE = 'https://api.scaffald.com'

describe('Invites', () => {
  let client: Scaffald
  const seen: Array<{ method: string; path: string; body: unknown }> = []

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
    client = new Scaffald({ apiKey: 'test_key', baseUrl: BASE })
  })
  afterEach(() => {
    server.resetHandlers()
    seen.length = 0
  })
  afterAll(() => server.close())

  const record = (status = 200, body: unknown = {}) =>
    async ({ request }: { request: Request }) => {
      const url = new URL(request.url)
      seen.push({
        method: request.method,
        path: url.pathname,
        body: request.method === 'GET' ? null : await request.json(),
      })
      return HttpResponse.json(body, { status })
    }

  it('create() posts contacts, message and source and returns results verbatim (bare body)', async () => {
    const response = {
      results: [
        { index: 0, status: 'sent', invitationId: 'i1', email: 'a@example.test' },
        { index: 1, status: 'ready', invitationId: 'i2', phone: '+15555550100', link: 'https://scaffald.com/i/abc', smsUrl: 'sms:+15555550100?&body=x', shareText: 'x' },
      ],
      summary: { sent: 1, ready: 1, skipped: 0, failed: 0 },
    }
    server.use(http.post(`${BASE}/v1/invites`, record(200, response)))
    const result = await client.invites.create({
      contacts: [{ email: 'a@example.test' }, { name: 'Sam', phone: '555 555 0100' }],
      message: 'Come work with us',
      source: 'app',
    })
    expect(result).toEqual(response)
    expect(seen[0]).toEqual({
      method: 'POST',
      path: '/v1/invites',
      body: { contacts: [{ email: 'a@example.test' }, { name: 'Sam', phone: '555 555 0100' }], message: 'Come work with us', source: 'app' },
    })
  })

  it('list() and link() GET the caller’s invites and personal link', async () => {
    server.use(
      http.get(`${BASE}/v1/invites`, record(200, { invites: [], counts: { invited: 0, joined: 0, onboarded: 0 } })),
      http.get(`${BASE}/v1/invites/link`, record(200, { code: 'abc234xy', link: 'https://scaffald.com/i/abc234xy', shareText: 't' }))
    )
    expect((await client.invites.list()).counts.invited).toBe(0)
    expect((await client.invites.link()).code).toBe('abc234xy')
    // The shared msw setup can see a request twice; assert on the distinct calls.
    expect([...new Set(seen.map((s) => `${s.method} ${s.path}`))]).toEqual(['GET /v1/invites', 'GET /v1/invites/link'])
  })

  it('preview() encodes the code; claim() sends only what it is given', async () => {
    server.use(
      http.get(`${BASE}/v1/invites/:code/preview`, record(200, { kind: 'link', inviter: { firstName: 'Clay', avatarUrl: null } })),
      http.post(`${BASE}/v1/invites/claim`, record(200, { claimed: false, reason: 'no_invite' }))
    )
    expect((await client.invites.preview('abc234xy')).inviter.firstName).toBe('Clay')
    expect(await client.invites.claim()).toEqual({ claimed: false, reason: 'no_invite' })
    await client.invites.claim({ code: 'abc234xy' })
    expect([...new Map(seen.map((s) => [JSON.stringify([s.path, s.body]), [s.path, s.body]])).values()]).toEqual([
      ['/v1/invites/abc234xy/preview', null],
      ['/v1/invites/claim', {}],
      ['/v1/invites/claim', { code: 'abc234xy' }],
    ])
  })
})
