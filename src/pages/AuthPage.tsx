import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, Mail, Phone, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/common/Logo'
import { useToast } from '@/components/common/Toast'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

interface AuthPageProps {
  mode: 'login' | 'signup'
}

function authErrorMessage(error: { message?: string; status?: number; code?: string } | null) {
  if (!error) return 'Something went wrong. Please try again.'
  const message = error.message?.toLowerCase() ?? ''
  if (message.includes('invalid login credentials') || error.code === 'invalid_credentials') return 'Email or password is incorrect.'
  if (message.includes('email not confirmed')) return 'Please verify your email before signing in.'
  if (error.status === 429 || message.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.'
  if (message.includes('failed to fetch') || message.includes('network') || message.includes('connection')) return 'Unable to connect to the authentication server.'
  return 'We could not complete authentication. Please try again.'
}

const highlights = [
  'AI-powered career analysis',
  'Personalized skill-gap insights',
  'Smart job matching',
  'Practice with AI mock interviews',
]

export function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
  const isSignup = mode === 'signup'
  const redirectPath = typeof location.state?.from?.pathname === 'string' && location.state.from.pathname !== '/login' ? location.state.from.pathname : '/dashboard'

  useEffect(() => {
    setForm({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
    setShowPassword(false)
    setErrorMessage('')
  }, [mode])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage('')

    if (!isSupabaseConfigured) {
      setErrorMessage('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.')
      return
    }

    if (isSignup && form.password !== form.confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { full_name: form.name, phone: form.phone },
          },
        })

        if (import.meta.env.DEV) {
          console.log('Supabase signup response:', {
            data: {
              user: data.user ? { id: data.user.id, email: data.user.email } : null,
              session: data.session ? { userId: data.session.user.id } : null,
            },
            error: error
              ? { name: error.name, message: error.message, status: error.status, code: error.code }
              : null,
          })
        }

        if (error) {
          if (import.meta.env.DEV) console.error('Supabase signup error:', error)
          throw error
        }
        if (import.meta.env.DEV) {
          console.log('Signup successful:', {
            user: data.user ? { id: data.user.id, email: data.user.email } : null,
            hasSession: Boolean(data.session),
          })
        }
        if (!data.user) throw new Error('We could not create your account. Please try again.')

        const profileResponse = await supabase.from('profiles').upsert({ user_id: data.user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
        if (import.meta.env.DEV) {
          console.log('Profile INSERT response:', {
            data: profileResponse.data,
            error: profileResponse.error
              ? {
                  name: profileResponse.error.name,
                  message: profileResponse.error.message,
                  details: profileResponse.error.details,
                  hint: profileResponse.error.hint,
                  code: profileResponse.error.code,
                }
              : null,
          })
        }
        const { error: profileError } = profileResponse
        if (profileError) throw profileError

        if (data.session) {
          toast({ title: 'Account created', description: "Let's build your career profile.", tone: 'ai' })
          navigate('/onboarding')
        } else {
          toast({
            title: 'Check your email',
            description: 'Confirm your email address to finish creating your account.',
            tone: 'info',
          })
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        if (error) throw error
        toast({ title: 'Welcome back', description: 'Your career dashboard is ready.', tone: 'success' })
        navigate(redirectPath)
      }
    } catch (error) {
      setErrorMessage(authErrorMessage(error as { message?: string; status?: number; code?: string }))
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!form.email.trim()) {
      setErrorMessage('Enter your email address first.')
      return
    }
    if (!isSupabaseConfigured) {
      setErrorMessage('Supabase is not configured. Please try again later.')
      return
    }
    setResetting(true)
    setErrorMessage('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), { redirectTo: `${window.location.origin}/login` })
      if (error) throw error
      toast({ title: 'Reset email sent', description: 'Check your inbox for a password reset link.', tone: 'info' })
    } catch (resetError) {
      setErrorMessage(resetError instanceof Error ? 'We could not send a reset email. Please try again.' : 'We could not send a reset email. Please try again.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative hidden overflow-hidden border-r border-border/70 bg-surface-gradient p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="pointer-events-none absolute inset-0 opacity-25 grid-bg" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <Link to="/landing" className="relative"><Logo light tagline /></Link>

        <div className="relative max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">AI-Powered Career Intelligence</p>
          <h2 className="mt-4 max-w-xl text-4xl font-bold leading-[1.08] xl:text-5xl">Turn ambition into your <span className="text-gradient">next best move.</span></h2>
          <p className="mt-4 max-w-lg text-base leading-7 text-white/80">
            Connect your resume, skills and goals in one focused workspace built to help you move toward the right opportunity.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {highlights.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm">
                <Check className="h-4 w-4 shrink-0 text-cyan-200" />
                <p className="text-sm text-white/90">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-white/70">A focused workspace for your next career move.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8 lg:bg-background lg:px-12">
        <div className="w-full max-w-md animate-fade-up rounded-2xl border border-border/70 bg-card/70 p-6 shadow-lift backdrop-blur-sm sm:p-8">
          <div className="mb-8 lg:hidden">
            <Link to="/landing">
              <Logo />
            </Link>
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignup
              ? 'Start building a career plan tailored to your goal.'
              : 'Sign in to continue your career journey.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {isSignup ? (
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    required
                    placeholder="Your full name"
                    className="pl-10"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                  />
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@college.edu"
                  className="pl-10"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </div>
            </div>

            {isSignup ? (
              <div className="space-y-1.5">
                <Label htmlFor="phone">Mobile number</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    className="pl-10"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  />
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="pl-10 pr-11"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isSignup ? (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    className="pl-10"
                    value={form.confirmPassword}
                    onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input type="checkbox" className="h-4 w-4 rounded border-border accent-indigo-600" />
                  Remember me
                </label>
                <button type="button" onClick={() => void handlePasswordReset()} disabled={resetting || submitting} className="font-medium text-primary hover:underline disabled:opacity-60">
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? (isSignup ? 'Creating account...' : 'Signing in...') : isSignup ? 'Create Account' : 'Sign In'}
              {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>

          {errorMessage ? (
            <p role="alert" className="mt-3 text-sm text-rose-600">
              {errorMessage}
            </p>
          ) : null}

          {import.meta.env.VITE_SUPABASE_GOOGLE_ENABLED === 'true' ? <>
            <div className="my-6 flex items-center gap-4">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button
              variant="outline"
              size="lg"
              className="w-full"
              disabled={submitting}
              onClick={async () => {
              setErrorMessage('')
              if (!isSupabaseConfigured) {
                setErrorMessage('Supabase is not configured. Add the required environment variables to .env.')
                return
              }
              setSubmitting(true)
              const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/dashboard` },
              })
              if (error) {
                setErrorMessage(authErrorMessage(error))
                setSubmitting(false)
              }
              }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5H1.2v3.1A12 12 0 0 0 12 24z"
              />
              <path fill="#FBBC05" d="M5.2 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.2a12 12 0 0 0 0 10.8l4-3.1z" />
              <path
                fill="#EA4335"
                d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.2 6.6l4 3.1c1-2.9 3.7-4.9 6.8-4.9z"
              />
              </svg>
              Continue with Google
            </Button>
          </> : null}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <Link to={isSignup ? '/login' : '/signup'} className="font-semibold text-primary hover:underline">
              {isSignup ? 'Sign in' : 'Create account'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
