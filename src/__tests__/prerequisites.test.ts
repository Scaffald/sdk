import { describe, it, expect } from 'vitest'
import { Scaffald } from '../client.js'

describe('Prerequisites Resource', () => {
  const client = new Scaffald({
    apiKey: 'sk_test_123',
  })

  describe('check', () => {
    it('should return the completion status with legal state', async () => {
      const result = await client.prerequisites.check()

      expect(result.isComplete).toBe(true)
      expect(result.hasName).toBe(true)
      expect(result.hasAcceptedTerms).toBe(true)
      expect(result.hasAcceptedPrivacy).toBe(true)
      expect(result.needsOnboarding).toBe(false)
      expect(result.needsLegalAcceptance).toBe(false)
      expect(result.legal.needsAcceptance).toBe(false)
      expect(result.legal.documents.terms_of_service.requiredVersion).toBe('v1.0')
      expect(result.legal.documents.terms_of_service.needsAcceptance).toBe(false)
      expect(result.legal.documents.privacy_policy.url).toBe('/auth/privacy')
      expect(result.data.first_name).toBe('John')
    })
  })

  describe('complete', () => {
    it('should complete prerequisites', async () => {
      const result = await client.prerequisites.complete({
        first_name: 'John',
        last_name: 'Doe',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zip: '94102',
          country: 'US',
        },
        user_types: ['worker'],
        industry_id: 'ind_tech',
        accepts_privacy_policy: true,
        accepts_terms_of_service: true,
      })

      expect(result.success).toBe(true)
    })
  })

  describe('acceptLegal', () => {
    it('should accept the current legal versions', async () => {
      const result = await client.prerequisites.acceptLegal({
        accepts_terms_of_service: true,
        accepts_privacy_policy: true,
      })

      expect(result.success).toBe(true)
    })

    it('should reject when an acceptance is missing', async () => {
      await expect(
        client.prerequisites.acceptLegal({
          accepts_terms_of_service: true,
          accepts_privacy_policy: false,
        })
      ).rejects.toThrow()
    })
  })
})

describe('Legal Resource', () => {
  const client = new Scaffald({
    apiKey: 'sk_test_123',
  })

  describe('getCurrent', () => {
    it('should return the current legal documents', async () => {
      const result = await client.legal.getCurrent()

      expect(result.documents).toHaveLength(2)
      const terms = result.documents.find((d) => d.doc_type === 'terms_of_service')
      expect(terms?.version).toBe('v1.0')
      expect(terms?.url).toBe('/auth/terms')
    })
  })
})
