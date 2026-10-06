/**
 * API keys round trip against the real local `api` function: create, list,
 * revoke. Pins the response contract the unit tests' mocks only describe —
 * those mocks returned a bare array for months while the route wrapped it in
 * `{ data }`, and /office/api-keys crashed on `.map` (#1015).
 *
 * Creating and revoking keys needs an organization admin (`team_admin`), which
 * the default integration user is not. Defaults to the seeded boris@unicorn.love,
 * whose memberships are all `team_admin`; override with SCAFFALD_ADMIN_EMAIL /
 * SCAFFALD_ADMIN_PASSWORD. Not clay@unicorn.love: the route resolves the
 * caller's role from one arbitrary team membership, so an admin who is also a
 * plain member elsewhere in the org can be refused (filed separately).
 *
 * Run with: SCAFFALD_INTEGRATION=1 pnpm test:integration
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { Scaffald } from '../../client'
import { isIntegrationEnabled, getIntegrationConfig } from './integration.setup'

const describeIfIntegration = isIntegrationEnabled() ? describe : describe.skip

describeIfIntegration('Integration: API keys round trip', () => {
  let client: Scaffald

  beforeAll(async () => {
    const config = getIntegrationConfig()
    const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: process.env.SCAFFALD_ADMIN_EMAIL || 'boris@unicorn.love',
      password: process.env.SCAFFALD_ADMIN_PASSWORD || 'password123',
    })
    if (error || !data.session?.access_token) {
      throw new Error(`Integration setup: admin sign-in failed. ${error?.message ?? 'no session'}`)
    }
    client = new Scaffald({ baseUrl: config.baseUrl, supabaseToken: data.session.access_token })
  })

  it('create() returns the key with its one-time secret, list() returns it, revoke() deactivates it', async () => {
    const name = `integration-${Date.now()}`
    const created = await client.apiKeys.create({ name, scopes: ['read:jobs'] })
    expect(created.id).toEqual(expect.any(String))
    expect(created.name).toBe(name)
    expect(created.key).toEqual(expect.any(String))

    const listed = await client.apiKeys.list()
    expect(Array.isArray(listed)).toBe(true)
    const found = listed.find((k) => k.id === created.id)
    expect(found?.is_active).toBe(true)
    // The full secret is shown once, at creation, and never listed.
    expect(found).not.toHaveProperty('key')

    const revoked = await client.apiKeys.revoke(created.id)
    expect(revoked.id).toBe(created.id)
    expect(revoked.message).toMatch(/revoked/i)

    const after = await client.apiKeys.list()
    expect(after.find((k) => k.id === created.id)?.is_active).toBe(false)
  })
})
