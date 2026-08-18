import { useAuthStore } from './auth'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null })
  })

  it('starts logged out', () => {
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setAuth stores the token and user', () => {
    const user = { id: 1, name: 'Ada', email: 'ada@example.com' }
    useAuthStore.getState().setAuth('abc123', user)
    expect(useAuthStore.getState().token).toBe('abc123')
    expect(useAuthStore.getState().user).toEqual(user)
  })

  it('logout clears the token and user', () => {
    useAuthStore.getState().setAuth('abc123', { id: 1, name: 'Ada', email: 'ada@example.com' })
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })
})
