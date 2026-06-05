import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '../ui/Input'
import Button from '../ui/Button'

/** Login form — UI only; navigates to dashboard on submit (no backend). */
export default function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})

  function validate() {
    const next = {}
    if (!email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address'
    if (!password) next.password = 'Password is required'
    else if (password.length < 6) next.password = 'Password must be at least 6 characters'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    // UI-only: no API call
    navigate('/dashboard')
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      <Input
        label="Email"
        id="login-email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="name@niat.edu"
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

      <div className="flex items-center justify-end">
        <button
          type="button"
          className="text-xs font-medium text-[var(--grit-cream)]/50 transition-colors hover:text-[var(--grit-gold)]"
          onClick={() => {}}
        >
          Forgot password?
        </button>
      </div>

      <Button type="submit" fullWidth>
        Login
      </Button>
    </form>
  )
}
