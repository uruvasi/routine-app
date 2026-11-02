import { describe, it, expect } from 'vitest'
import { accountView } from './accountView'

describe('accountView', () => {
  it('logged-in users always see their account/sync state, even offline (loginAvailable unknown)', () => {
    expect(accountView(true, false)).toBe('account')
  })
  it('logged-out on a non-production origin sees the unavailable notice', () => {
    expect(accountView(false, false)).toBe('unavailable')
  })
  it('logged-out on the production origin sees the login form', () => {
    expect(accountView(false, true)).toBe('login')
  })
})
