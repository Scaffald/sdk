import { describe, it, expect } from 'vitest'
import { Scaffald } from '../client'

describe('Profiles Resource', () => {
  const client = new Scaffald({
    apiKey: 'sk_test_123',
  })

  describe('getUser', () => {
    it('should get a user profile by username', async () => {
      const profile = await client.profiles.getUser('johndoe')

      expect(profile).toHaveProperty('id')
      expect(profile).toHaveProperty('username')
      expect(profile.username).toBe('johndoe')
      expect(profile).toHaveProperty('created_at')
    })

    it('should return profile with skills', async () => {
      const profile = await client.profiles.getUser('janedoe')

      expect(profile.skills).toBeDefined()
      expect(Array.isArray(profile.skills)).toBe(true)
    })

    it('should return profile with certifications', async () => {
      const profile = await client.profiles.getUser('johndoe')

      if (profile.certifications) {
        expect(Array.isArray(profile.certifications)).toBe(true)
        expect(profile.certifications[0]).toHaveProperty('name')
      }
    })
  })

  describe('getOrganization', () => {
    it('should get an organization profile by slug', async () => {
      const { data: org } = await client.profiles.getOrganization('acme-corp')

      expect(org).toHaveProperty('id')
      expect(org.slug).toBe('acme-corp')
      expect(org).toHaveProperty('name')
      expect(org).toHaveProperty('job_count')
    })

    it('should return organization with logo', async () => {
      const { data: org } = await client.profiles.getOrganization('tech-company')

      expect(org.logo_url).toBeDefined()
    })

    // These four are the point of Scaffald/SaaS#482. The old assertions were
    // all `toHaveProperty`, which passes against any shape at all, so the suite
    // could not tell the declared contract from the one the API sends.
    it('should return description as a rich-text document, not a string', async () => {
      const { data: org } = await client.profiles.getOrganization('acme-corp')

      expect(typeof org.description).toBe('object')
      expect(org.description).toHaveProperty('type', 'doc')
    })

    it('should return industry as the embedded row, not a name', async () => {
      const { data: org } = await client.profiles.getOrganization('acme-corp')

      expect(org.industry).toMatchObject({ name: 'Technology', slug: 'technology' })
      expect(org.industry?.id).toEqual(expect.any(String))
    })

    it('should return a structured address', async () => {
      const { data: org } = await client.profiles.getOrganization('acme-corp')

      expect(org.address).toMatchObject({ city: 'San Francisco', state: 'CA' })
    })

    it('should not carry size, location or founded_year', async () => {
      const { data: org } = await client.profiles.getOrganization('acme-corp')

      // No table in any schema has these columns; they were only ever in the
      // type and the mock.
      expect(org).not.toHaveProperty('size')
      expect(org).not.toHaveProperty('location')
      expect(org).not.toHaveProperty('founded_year')
    })
  })
})
