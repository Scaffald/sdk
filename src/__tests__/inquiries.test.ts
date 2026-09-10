import { describe, it, expect } from 'vitest'
import { Scaffald } from '../client.js'
import type {
  CreateInquiryParams,
  RespondToInquiryParams,
} from '../resources/inquiries.js'

describe('Inquiries Resource', () => {
  const client = new Scaffald({
    apiKey: 'sk_test_123',
  })

  // The `list` and `create` suites used to be here, and are gone with the
  // methods they covered (Scaffald/SaaS#476).
  //
  // Worth recording why they were no help: they passed for as long as they
  // existed, against a mock server in this directory that answered
  // /v1/inquiries happily. The real endpoint read core.inquiries, a table that
  // has never existed, and returned 500. A test whose fixture invents the
  // endpoint cannot fail when the endpoint is missing — which is the whole
  // reason the schema guard in the API repo reads the generated types instead.
  describe('getById', () => {
    it('should get inquiry by ID', async () => {
      const result = await client.inquiries.getById('inq_123')

      expect(result.data).toBeDefined()
      expect(result.data.id).toBe('inq_123')
    })

    it('should handle inquiry not found', async () => {
      await expect(client.inquiries.getById('invalid_id')).rejects.toThrow()
    })
  })

  describe('respond', () => {
    it('should respond to an inquiry', async () => {
      const params: RespondToInquiryParams = {
        message: 'Thank you for your interest. Here is more information...',
      }

      const result = await client.inquiries.respond('inq_123', params)

      expect(result.data).toBeDefined()
      expect(result.data.status).toBeDefined()
      expect(result.data.response).toBeDefined()
    })
  })

  describe('templates', () => {
    it('should list inquiry templates', async () => {
      const result = await client.inquiries.templates()

      expect(result).toBeDefined()
      expect(result.data).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data.length).toBeGreaterThanOrEqual(0)
    })

    it('should filter templates by type', async () => {
      const result = await client.inquiries.templates({ inquiry_type: 'job_inquiry' })

      expect(result).toBeDefined()
      expect(result.data).toBeDefined()
      expect(Array.isArray(result.data)).toBe(true)
    })
  })

  describe('bulkMarkAsRead', () => {
    it('should mark multiple inquiries as read', async () => {
      const inquiryIds = ['inq_1', 'inq_2', 'inq_3']

      const result = await client.inquiries.bulkMarkAsRead(inquiryIds)

      expect(result.data).toBeDefined()
      expect(result.data.updated_count).toBeDefined()
    })

    it('should handle empty array', async () => {
      const result = await client.inquiries.bulkMarkAsRead([])

      expect(result.data).toBeDefined()
      expect(result.data.updated_count).toBeDefined()
    })
  })

  describe('bulkArchive', () => {
    it('should archive multiple inquiries', async () => {
      const inquiryIds = ['inq_1', 'inq_2']

      const result = await client.inquiries.bulkArchive(inquiryIds)

      expect(result.data).toBeDefined()
      expect(result.data.archived_count).toBeDefined()
    })
  })
})
