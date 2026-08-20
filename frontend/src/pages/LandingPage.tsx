import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BriefcaseBusiness,
  FileSearch,
  AtSign,
  Globe,
  LineChart,
  Link2,
  Map,
  Menu,
  MessagesSquare,
  Quote,
  Sparkles,
  Star,
  Target,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { FeatureCard } from '@/components/common/FeatureCard'
import { Logo } from '@/components/common/Logo'
import { ProgressRing } from '@/components/common/ProgressRing'
import { coachConversation, metrics } from '@/data/mock'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'AI Coach', href: '#ai-coach' },
  { label: 'Testimonials', href: '#testimonials' },
]

const features = [
  {
    icon: FileSearch,
    title: 'AI Resume Analyzer',
    description: 'Instant scoring, skill extraction and ATS feedback on every version of your resume.',
    tone: 'from-indigo-500 to-violet-500',
  },
  {
    icon: Target,
    title: 'Skill Gap Analysis',
    description: 'See exactly how your skills compare to the role you want — and what to close first.',
    tone: 'from-sky-500 to-indigo-500',
  },
  {
    icon: Map,
    title: 'Personalized Career Roadmap',
    description: 'A week-by-week plan built around your goal, your hours and your current level.',
    tone: 'from-violet-500 to-fuchsia-500',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Smart Job Matching',
    description: 'Roles ranked by real match percentage, with the skills you are missing for each.',
    tone: 'from-emerald-500 to-teal-500',
  },
  {
    icon: MessagesSquare,
    title: 'AI Mock Interviews',
    description: 'Practice HR, technical and role-specific rounds with instant scored feedback.',
    tone: 'from-amber-500 to-orange-500',
  },
  {
    icon: LineChart,
    title: 'Career Progress Tracking',
    description: 'Track readiness, streaks and skill growth week over week in one dashboard.',
    tone: 'from-rose-500 to-pink-500',
  },
]

const steps = [
  { number: '01', title: 'Upload Resume', description: 'Drop your PDF and let CareerAI read your skills and projects.' },
  { number: '02', title: 'Tell Us Your Goal', description: 'Pick your target role, timeline and work preferences.' },
  { number: '03', title: 'AI Analyzes Your Career', description: 'We score readiness and detect your real skill gaps.' },
  { number: '04', title: 'Follow Your Roadmap', description: 'Study, practise and track progress until you are job-ready.' },
]

const testimonials = [
  {
    name: 'Ananya Rao',
    role: 'B.Tech CSE · Placed at Nexora Labs',
    quote:
      'CareerAI told me exactly which two skills were blocking me. Twelve weeks later I had three interviews and one offer.',
  },
  {
    name: 'Rohit Menon',
    role: 'MCA · SDE Intern at Finlytics',
    quote:
      'The mock interviews were brutally honest. My structure improved so much that the real interview felt like practice.',
  },
  {
    name: 'Priya Sharma',
    role: 'B.Tech IT · Data Analyst at Quantiva',
    quote:
      'I stopped guessing what to learn next. The roadmap adjusted every time I finished a module — it felt personal.',
  },
]

const floatingCards = [
  { label: 'Skill Gap Detected', detail: 'SQL · Data Structures', tone: 'text-amber-600 bg-amber-50', position: 'left-[-8%] top-[18%]' },
  { label: '3 Recommended Jobs', detail: 'Matched today', tone: 'text-emerald-600 bg-emerald-50', position: 'left-[-4%] bottom-[12%]' },
  { label: 'Roadmap Updated', detail: '12-week plan', tone: 'text-primary bg-primary/10', position: 'right-[-6%] bottom-[26%]' },
]

const heroStats = [
  { label: 'Technical Skills', value: 82 },
  { label: 'Resume Score', value: 91 },
  { label: 'Interview Score', value: 76 },
  { label: 'Job Match', value: 89 },
]

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="absolute inset-0 -z-10 rounded-[36px] bg-brand-gradient opacity-20 blur-3xl" />
      <Card className="relative rounded-[28px] border-white/60 bg-white/90 p-6 shadow-glow backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Career Readiness</p>
            <p className="mt-1 text-sm text-muted-foreground">Software Developer track</p>
          </div>
          <Badge variant="gradient">
            <Sparkles className="h-3 w-3" /> Live
          </Badge>
        </div>

        <div className="mt-5 flex items-center gap-6">
          <ProgressRing value={metrics.careerReadiness} size={132} strokeWidth={11} label="Job ready" />
          <div className="flex-1 space-y-3">
            {heroStats.map((stat) => (
              <div key={stat.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{stat.label}</span>
                  <span className="font-semibold">{stat.value}%</span>
                </div>
                <Progress value={stat.value} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-brand-soft p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI insight
          </p>
          <p className="mt-1.5 text-sm text-foreground/80">
            Closing your SQL gap could raise job match to <span className="font-semibold">96%</span>.
          </p>
        </div>
      </Card>

      {floatingCards.map((card, index) => (
        <div
          key={card.label}
          className={cn(
            'absolute hidden animate-float items-center gap-2 rounded-2xl border border-border bg-white px-3.5 py-2.5 shadow-lift lg:flex',
            card.position,
          )}
          style={{ animationDelay: `${index * 1.2}s` }}
        >
          <span className={cn('rounded-lg px-2 py-1 text-[11px] font-semibold', card.tone)}>{card.label}</span>
          <span className="text-[11px] text-muted-foreground">{card.detail}</span>
        </div>
      ))}
    </div>
  )
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          scrolled ? 'border-b border-border bg-white/85 backdrop-blur-xl' : 'bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="CareerAI home">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Log In</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted md:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-border bg-white px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-2">
              <Button asChild variant="outline">
                <Link to="/login">Log In</Link>
              </Button>
              <Button asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </header>

      <section className="relative overflow-hidden pt-28 sm:pt-32">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-70 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-32 h-80 w-80 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-14 px-4 pb-20 sm:px-6 lg:grid-cols-2 lg:pb-28">
          <div className="animate-fade-up">
            <Badge variant="outline" className="border-primary/20 bg-white/80 px-3 py-1.5 text-primary shadow-soft">
              <Sparkles className="h-3.5 w-3.5" /> AI-Powered Career Intelligence
            </Badge>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Build Your Career <span className="text-gradient">With AI</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              CareerAI analyzes your skills, resume, goals and performance to create a personalized path from student to
              job-ready professional.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/onboarding">
                  Start Your Career Journey <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              {[
                { value: '24,000+', label: 'students guided' },
                { value: '89%', label: 'improved job match' },
                { value: '12 weeks', label: 'average to job-ready' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-up [animation-delay:120ms]">
            <HeroPreview />
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-border/70 bg-white py-20 sm:py-24">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary">Platform</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need to Become Job-Ready
            </h2>
            <p className="mt-4 text-muted-foreground">
              Six connected tools that turn scattered preparation into one measurable career plan.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-20 sm:py-24">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary">How it works</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">From resume to offer in four steps</h2>
          </div>
          <div className="relative mt-14 grid gap-8 lg:grid-cols-4">
            <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent lg:block" />
            {steps.map((step) => (
              <div key={step.number} className="relative text-center lg:text-left">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/15 bg-white text-sm font-bold text-primary shadow-soft lg:mx-0">
                  {step.number}
                </div>
                <h3 className="mt-5 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="ai-coach" className="border-y border-border/70 bg-white py-20 sm:py-24">
        <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <Badge variant="outline" className="border-primary/20 text-primary">
              <Sparkles className="h-3.5 w-3.5" /> AI Career Coach
            </Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Meet Your AI Career Coach</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Ask anything about your career — CareerAI knows your resume, your skills and your target role, so the advice
              is specific to you, not generic checklists.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Understands your resume, skills and goal',
                'Explains why a skill matters for your role',
                'Updates your roadmap as you improve',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-foreground/80">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-primary">
                    <Sparkles className="h-3 w-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8" size="lg">
              <Link to="/interview">
                Talk to CareerAI <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <Card className="relative overflow-hidden rounded-[28px] p-6 shadow-glow">
            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-brand-gradient opacity-10 blur-3xl" />
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">CareerAI Coach</p>
                <p className="text-xs text-emerald-600">Online · analyzing your profile</p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {coachConversation.map((message, index) => (
                <div
                  key={message.text}
                  className={cn('flex animate-fade-up', message.role === 'user' ? 'justify-end' : 'justify-start')}
                  style={{ animationDelay: `${index * 140}ms` }}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      message.role === 'user'
                        ? 'rounded-br-md bg-brand-gradient text-white'
                        : 'rounded-bl-md bg-muted text-foreground/85',
                    )}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-muted px-4 py-3 w-fit">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section id="testimonials" className="py-20 sm:py-24">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary">Testimonials</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Students who stopped guessing</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                <Quote className="h-6 w-6 text-primary/30" />
                <p className="mt-4 text-sm leading-relaxed text-foreground/80">“{testimonial.quote}”</p>
                <div className="mt-5 flex items-center gap-3 border-t border-border/70 pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
                    {testimonial.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="relative mx-auto w-full max-w-[1200px] overflow-hidden rounded-[32px] bg-brand-gradient px-6 py-16 text-center text-white shadow-glow sm:px-12">
          <div className="pointer-events-none absolute inset-0 opacity-25 grid-bg" />
          <div className="relative">
            <h2 className="mx-auto max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
              Your Career. Your Goals. Your AI Coach.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85">
              Join thousands of students turning scattered preparation into a measurable, personalized career plan.
            </p>
            <Button asChild size="lg" className="mt-8 bg-white text-primary shadow-none hover:bg-white/90 hover:shadow-none">
              <Link to="/signup">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-white py-14">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <Logo tagline />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                An AI career assistant that turns your resume, skills and goals into a plan you can actually follow.
              </p>
              <div className="mt-5 flex gap-2">
                {[Globe, Link2, AtSign].map((Icon, index) => (
                  <a
                    key={index}
                    href="#features"
                    aria-label="CareerAI social link"
                    className="rounded-xl border border-border p-2 text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: 'Product', links: ['Resume Analyzer', 'Skill Gap', 'Career Roadmap', 'Job Matching'] },
              { title: 'Company', links: ['About', 'Careers', 'Blog', 'Contact'] },
              { title: 'Resources', links: ['Guides', 'Interview Prep', 'Help Center', 'Privacy'] },
            ].map((column) => (
              <div key={column.title}>
                <p className="text-sm font-semibold">{column.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#features"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} CareerAI. All rights reserved.</p>
            <p>Built for students who want a plan, not a guess.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
