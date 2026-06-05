import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { API_BASE_URL } from '../../utils/constants'

/** Signup form — calls backend API with email domain validation. */
export default function SignupForm() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  // Allowed email domains
  const ALLOWED_DOMAINS = ['@nxtwave.co.in', '@nxtwave.tech', '@nxtwave.com']

  function validate() {
    const next = {}
    if (!fullName.trim()) next.fullName = 'Full name is required'
    else if (fullName.trim().length < 2) next.fullName = 'Enter your full name'
    if (!email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address'
    else {
      // Email domain validation
      const emailDomain = email.toLowerCase().split('@')[1]
      const isValidDomain = ALLOWED_DOMAINS.some(domain => emailDomain === domain.substring(1))
      if (!isValidDomain) {
        next.email = 'Only @nxtwave.co.in, @nxtwave.tech, and @nxtwave.com email addresses are allowed'
      }
    }
    if (!password) next.password = 'Password is required'
    else if (password.length < 8) next.password = 'Password must be at least 8 characters'
    if (!confirmPassword) next.confirmPassword = 'Please confirm your password'
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match'
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
      
      const url = `${API_BASE_URL}/auth/register`
      const payload = { name: fullName, email, password }
      
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
        console.log('[SIGNUP SUCCESS]', data)
        navigate('/login', { state: { message: 'Registration successful! Please login.' } })
      } else {
        console.error('[SIGNUP ERROR]', data)
        setErrors({ form: data.error || 'Registration failed' })
      }
    } catch (error) {
      console.error('[SIGNUP NETWORK ERROR]', error)
      setErrors({ form: 'Network error. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  function clearError(field) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      <Input
        label="Full Name"
        id="signup-name"
        name="fullName"
        type="text"
        autoComplete="name"
        placeholder="John Doe"
        value={fullName}
        onChange={(e) => {
          setFullName(e.target.value)
          clearError('fullName')
        }}
        error={errors.fullName}
      />
      <Input
        label="Email"
        id="signup-email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="name@nxtwave.co.in"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          clearError('email')
        }}
        error={errors.email}
      />
      <Input
        label="Password"
        id="signup-password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
          clearError('password')
        }}
        error={errors.password}
      />
      <Input
        label="Confirm Password"
        id="signup-confirm"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        placeholder="Re-enter your password"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value)
          clearError('confirmPassword')
        }}
        error={errors.confirmPassword}
      />

      {errors.form && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {errors.form}
        </div>
      )}

      <p className="text-xs leading-relaxed text-[var(--grit-cream)]/45">
        Only @nxtwave.co.in, @nxtwave.tech, and @nxtwave.com email addresses are allowed.
      </p>

      <p className="text-xs leading-relaxed text-[var(--grit-cream)]/45">
        By signing up, you agree to use this system for authorized classroom seating management at NIAT.
      </p>

      <Button type="submit" fullWidth disabled={isLoading}>
        {isLoading ? 'Signing up...' : 'Signup'}
      </Button>
    </form>
  )
}
