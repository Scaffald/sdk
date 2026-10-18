import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { Scaffald } from '../client.js'
import { server } from './mocks/server.js'

describe('Account deletion resource', () => {
  let client: Scaffald

  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  beforeAll(() => {
    client = new Scaffald({ accessToken: 'test_token' })
  })

  it('getStatus() reads the open request from /v1/account-deletion/status', async () => {
    const status = await client.accountDeletion.getStatus()
    expect(status.request?.scheduledFor).toBe('2026-11-01T00:00:00.000Z')
    expect(status.request?.canCancel).toBe(true)
  })

  it('cancel() posts to /v1/account-deletion/cancel', async () => {
    const result = await client.accountDeletion.cancel()
    expect(result).toEqual({
      id: 'del_1',
      status: 'cancelled',
      cancelledAt: '2026-10-19T00:00:00.000Z',
    })
  })

  it('listForOffice() passes the filter through', async () => {
    const attention = await client.accountDeletion.listForOffice()
    expect(attention.requests[0].status).toBe('failed')
    const all = await client.accountDeletion.listForOffice({ filter: 'all' })
    expect(all.requests[0].status).toBe('completed')
  })
})
