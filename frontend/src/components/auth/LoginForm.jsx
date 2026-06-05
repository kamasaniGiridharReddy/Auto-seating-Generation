import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { API_BASE_URL } from '../../utils/constants'

/** Login form — calls backend API for authentication. */
export default function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  function validate() {
    const next = {}
    if (!email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address'
    if (!password) next.password = 'Password is required'
    else if (password.length < 6) next.password = 'Password must be at least 6 characters'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      console.log('[AUTH REQUEST]', {
        apiBaseUrl: API_BASE_URL,
        loginUrl: `${API_BASE_URL}/auth/login`,
        registerUrl: `${API_BASE_URL}/auth/register`
      })
      
      const url = `${API_BASE_URL}/auth/login`
      const payload = { email, password }
      
      console.log('[FETCH START]', url, payload)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      console.log('[FETCH RESPONSE]', response.status)
      const text = await response.text()
      console.log('[FETCH BODY]', text)

      let data = {}
      if (text) {
        try {
          data = JSON.parse(text)
        } catch (e) {
          console.error('Invalid JSON response', text)
        }
      }

      if (response.ok) {
        console.log('[LOGIN SUCCESS]', data)
        // Store user data in localStorage for session management
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user))
        }
        navigate('/dashboard')
      } else {
        console.error('[LOGIN ERROR]', data)
        setErrors({ form: data.error || 'Login failed' })
      }
    } catch (error) {
      console.error('[LOGIN NETWORK ERROR]', error)
      setErrors({ form: 'Network error. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      {location.state?.message && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {location.state.message}
        </div>
      )}

      <Input
        label="Email"
        id="login-email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="name@nxtwave.co.in"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
        }}
        error={errors.email}
      />
      <Input
        label="Password"
        id="login-password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Enter your password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
          if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
        }}
        error={errors.password}
      />

      {errors.form && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {errors.form}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          className="text-xs font-medium text-[var(--grit-cream)]/50 transition-colors hover:text-[var(--grit-gold)]"
          onClick={() => {}}
        >
          Forgot password?
        </button>
      </div>

      <Button type="submit" fullWidth disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  )
}
