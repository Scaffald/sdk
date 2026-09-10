import { describe, expect, it } from 'vitest'
import { Scaffald } from '../client.js'

describe('ProfileCompletion Resource', () => {
  const client = new Scaffald({
    apiKey: 'sk_test_123',
  })

  describe('getStatus', () => {
    it('should get profile completion status', async () => {
      const result = await client.profileCompletion.getStatus()

      expect(result).toBeDefined()
      expect(result.completionPercentage).toBeDefined()
      expect(result.sectionProgress).toBeDefined()
      expect(Array.isArray(result.sectionProgress)).toBe(true)
    })
  })

  // The `dismissNudge` suite used to be here. It passed against the mock server
  // for as long as it existed while the real endpoint 500'd on a table that
  // never existed — a fixture that invents the endpoint cannot fail when the
  // endpoint is missing. Retired with the method (Scaffald/SaaS#658).

  describe('getPersonalizedBenefits', () => {
    it('should get personalized benefits messaging', async () => {
      const result = await client.profileCompletion.getPersonalizedBenefits()

      expect(result).toBeDefined()
      expect(result.benefits).toBeDefined()
      expect(Array.isArray(result.benefits)).toBe(true)
    })
  })
})
