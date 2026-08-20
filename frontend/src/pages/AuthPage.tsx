import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, Sparkles, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/common/Logo'
import { useToast } from '@/components/common/Toast'
import { metrics, student } from '@/data/mock'

interface AuthPageProps {
  mode: 'login' | 'signup'
}

const highlights = [
  { label: 'Career readiness', value: `${metrics.careerReadiness}%`, caption: 'average after 12 weeks' },
  { label: 'Resume score', value: `${metrics.resumeScore}/100`, caption: 'AI-reviewed in seconds' },
  { label: 'Job matches', value: '3 new', caption: 'refreshed every morning' },
]

export function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const isSignup = mode === 'signup'

  useEffect(() => {
    setForm({ name: '', email: '', password: '', confirmPassword: '' })
    setShowPassword(false)
  }, [mode])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    window.setTimeout(() => {
      setSubmitting(false)
      toast({
        title: isSignup ? 'Account created' : 'Welcome back, Sahil',
        description: isSignup ? "Let's build your career profile." : 'Your career dashboard is ready.',
        tone: isSignup ? 'ai' : 'success',
      })
      navigate(isSignup ? '/onboarding' : '/dashboard')
    }, 900)
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand-gradient p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 opacity-25 grid-bg" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Sparkles className="h-[18px] w-[18px]" />
          </div>
          <span className="text-[17px] font-bold">CareerAI</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight">Your personalized career journey starts here.</h2>
          <p className="mt-4 text-white/80">
            Resume analysis, skill gaps, roadmaps, job matches and mock interviews — in one intelligent workspace.
          </p>
          <div className="mt-10 space-y-3">
            {highlights.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm text-white/80">{item.label}</p>
                  <p className="text-lg font-bold">{item.value}</p>
                </div>
                <p className="mt-0.5 text-xs text-white/60">{item.caption}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-white/70">Trusted by 24,000+ students across 180 campuses.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignup
              ? 'Start building a career plan tailored to your goal.'
              : `Sign in to continue your ${student.targetRole} track.`}
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
                    placeholder="Sahil Gupta"
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
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSignup ? 'Create Account' : 'Sign In'}
              {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => {
              toast({ title: 'Google sign-in is mocked', description: 'Continuing to your dashboard.', tone: 'info' })
              navigate('/dashboard')
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
