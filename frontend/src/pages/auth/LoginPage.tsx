import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import logo from '@/assets/logo.png'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const login = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/api/v1/auth/login', { user: data }),
    onSuccess: (res) => {
      const token = res.headers['authorization']?.replace('Bearer ', '')
      setAuth(token, res.data.user)
      navigate('/')
    },
    onError: () => setError('Invalid email or password'),
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="w-full max-w-sm bg-card rounded-xl shadow-sm p-8 space-y-6">
        <img src={logo} alt="Inertia" className="w-14 h-14 rounded-xl mx-auto" />
        <h1 className="text-2xl font-semibold tracking-tight text-center">Sign in to Inertia</h1>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); login.mutate(form) }}
        >
          <input
            type="email"
            placeholder="Email"
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button
            type="submit"
            disabled={login.isPending}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-sm text-muted-foreground text-center">
          No account? <Link to="/signup" className="underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
