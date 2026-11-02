export type AccountView = 'account' | 'login' | 'unavailable'

/** loginAvailable is not persisted (unknown while offline), so a logged-in user always gets the account view. */
export function accountView(loggedIn: boolean, loginAvailable: boolean): AccountView {
  if (loggedIn) return 'account'
  return loginAvailable ? 'login' : 'unavailable'
}
