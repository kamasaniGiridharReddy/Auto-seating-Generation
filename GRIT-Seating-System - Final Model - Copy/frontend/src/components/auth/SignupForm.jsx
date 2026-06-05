import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Input from '../ui/Input'
import Button from '../ui/Button'

/** Signup form — UI-only validation; no backend. */
export default function SignupForm() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})

  function validate() {
    const next = {}
    if (!fullName.trim()) next.fullName = 'Full name is required'
    else if (fullName.trim().length < 2) next.fullName = 'Enter your full name'
    if (!email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email address'
    if (!password) next.password = 'Password is required'
    else if (password.length < 8) next.password = 'Password must be at least 8 characters'
    if (!confirmPassword) next.confirmPassword = 'Please confirm your password'
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    navigate('/login')
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
        placeholder="name@niat.edu"
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

      <p className="text-xs leading-relaxed text-[var(--grit-cream)]/45">
        By signing up, you agree to use this system for authorized classroom seating management at NIAT.
      </p>

      <Button type="submit" fullWidth>
        Signup
      </Button>
    </form>
  )
}
