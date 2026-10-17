import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { Scaffald } from '../client.js'
import { server } from './mocks/server.js'

describe('Stripe settings resource', () => {
  let client: Scaffald

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  beforeAll(() => {
    client = new Scaffald({ accessToken: 'test_token' })
  })

  describe('getPublicConfig()', () => {
    it('reads the payer-facing config from /v1/stripe-config', async () => {
      const config = await client.stripeSettings.getPublicConfig()
      expect(config).toEqual({ publishableKey: 'pk_test_mock', testMode: true })
    })
  })
})
