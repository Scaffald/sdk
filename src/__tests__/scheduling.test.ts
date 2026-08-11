import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'
import { Scaffald } from '../client'

const BASE = 'https://api.scaffald.com'

const SLOT = {
  id: 'slot_1',
  application_id: 'app_1',
  organization_id: 'org_1',
  proposed_by: 'user_1',
  slot_start: '2026-09-01T10:00:00Z',
  slot_end: '2026-09-01T11:00:00Z',
  timezone: 'UTC',
  location_type: 'video',
  location_details: null,
  meeting_link: null,
  status: 'proposed',
  notes: null,
  created_at: '2026-08-11T00:00:00Z',
}

const LINK = {
  id: 'link_1',
  application_id: 'app_1',
  organization_id: 'org_1',
  token: 'abc123',
  expires_at: '2026-09-30T00:00:00Z',
  max_bookings: 1,
  current_bookings: 0,
  is_active: true,
  created_at: '2026-08-11T00:00:00Z',
}

describe('Scheduling Resource — employer side', () => {
  const client = new Scaffald({ apiKey: 'sk_test_123' })

  describe('listSlots', () => {
    it('unwraps the data envelope rather than returning it', async () => {
      server.use(
        http.get(`${BASE}/v1/employer/scheduling/slots`, () =>
          HttpResponse.json({ data: [SLOT] }),
        ),
      )

      const slots = await client.scheduling.listSlots()

      // The route returns `{ data: [...] }`. Returning that object rather than
      // the array is the failure the office screen cannot detect — it would
      // just render an empty list.
      expect(Array.isArray(slots)).toBe(true)
      expect(slots).toHaveLength(1)
      expect(slots[0]?.id).toBe('slot_1')
    })

    it('omits application_id entirely when unscoped, for the org-wide schedule', async () => {
      let seen: string | null = null
      server.use(
        http.get(`${BASE}/v1/employer/scheduling/slots`, ({ request }) => {
          seen = new URL(request.url).search
          return HttpResponse.json({ data: [] })
        }),
      )

      await client.scheduling.listSlots()

      // Sending `application_id=undefined` would 400 against the uuid schema.
      expect(seen).toBe('')
    })

    it('scopes to one application when asked', async () => {
      let seen: string | null = null
      server.use(
        http.get(`${BASE}/v1/employer/scheduling/slots`, ({ request }) => {
          seen = new URL(request.url).searchParams.get('application_id')
          return HttpResponse.json({ data: [SLOT] })
        }),
      )

      await client.scheduling.listSlots({ application_id: 'app_1' })

      expect(seen).toBe('app_1')
    })
  })

  describe('createSlot', () => {
    it('posts the proposal and returns the created slot', async () => {
      let body: Record<string, unknown> | null = null
      server.use(
        http.post(`${BASE}/v1/employer/scheduling/slots`, async ({ request }) => {
          body = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(SLOT, { status: 201 })
        }),
      )

      const slot = await client.scheduling.createSlot({
        application_id: 'app_1',
        slot_start: '2026-09-01T10:00:00Z',
        slot_end: '2026-09-01T11:00:00Z',
        timezone: 'UTC',
        location_type: 'video',
      })

      expect(slot.id).toBe('slot_1')
      expect(slot.status).toBe('proposed')
      expect(body).toMatchObject({ application_id: 'app_1', timezone: 'UTC' })
    })
  })

  describe('listLinks', () => {
    it('unwraps the data envelope', async () => {
      server.use(
        http.get(`${BASE}/v1/employer/scheduling/links`, () =>
          HttpResponse.json({ data: [LINK] }),
        ),
      )

      const links = await client.scheduling.listLinks()

      expect(Array.isArray(links)).toBe(true)
      expect(links[0]?.token).toBe('abc123')
    })
  })

  describe('createLink', () => {
    it('does not send a caller-supplied token', async () => {
      let body: Record<string, unknown> | null = null
      server.use(
        http.post(`${BASE}/v1/employer/scheduling/links`, async ({ request }) => {
          body = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(LINK, { status: 201 })
        }),
      )

      const link = await client.scheduling.createLink({
        application_id: 'app_1',
        expires_at: '2026-09-30T00:00:00Z',
      })

      // The token is generated server-side. A client-chosen token would be a
      // guessable-URL vulnerability, so the params type must not carry one.
      expect(body).not.toHaveProperty('token')
      expect(link.token).toBe('abc123')
    })
  })
})
