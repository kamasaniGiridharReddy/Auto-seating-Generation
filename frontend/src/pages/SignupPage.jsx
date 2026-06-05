import AuthLayout from '../components/auth/AuthLayout'
import SignupForm from '../components/auth/SignupForm'

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join educators using GRIT for fair, skill-balanced seating."
      footerText="Already have an account?"
      footerLinkText="Login"
      footerLinkTo="/login"
    >
      <SignupForm />
    </AuthLayout>
  )
}
