import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Plus, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Logo } from '@/components/common/Logo'
import { SkillBadge } from '@/components/common/SkillBadge'
import { useToast } from '@/components/common/Toast'
import { popularSkills, targetRoles } from '@/data/mock'
import { cn } from '@/lib/utils'

type Proficiency = 'Beginner' | 'Intermediate' | 'Advanced'

const steps = [
  { id: 1, code: '01', title: 'Personal Info' },
  { id: 2, code: '02', title: 'Skills' },
  { id: 3, code: '03', title: 'Career Goal' },
  { id: 4, code: '04', title: 'Preferences' },
]

const proficiencies: Proficiency[] = ['Beginner', 'Intermediate', 'Advanced']

export function OnboardingPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [completed, setCompleted] = useState(false)
  const [customSkill, setCustomSkill] = useState('')
  const [skillOptions, setSkillOptions] = useState(popularSkills)
  const [selectedSkills, setSelectedSkills] = useState<Record<string, Proficiency>>({
    JavaScript: 'Intermediate',
    Python: 'Advanced',
  })
  const [profile, setProfile] = useState({
    fullName: 'Sahil Gupta',
    education: 'B.Tech',
    branch: 'Computer Science Engineering',
    graduationYear: '2026',
    experience: 'Student / Fresher',
    targetRole: 'Software Developer',
    goal: '',
    location: 'Bengaluru',
    workPreference: 'Hybrid',
    industry: 'Product & SaaS',
  })

  const toggleSkill = (skill: string) => {
    setSelectedSkills((current) => {
      const next = { ...current }
      if (next[skill]) delete next[skill]
      else next[skill] = 'Beginner'
      return next
    })
  }

  const addCustomSkill = () => {
    const value = customSkill.trim()
    if (!value) return
    if (!skillOptions.includes(value)) setSkillOptions((current) => [...current, value])
    setSelectedSkills((current) => ({ ...current, [value]: 'Beginner' }))
    setCustomSkill('')
  }

  const finish = () => {
    setCompleted(true)
    toast({ title: 'Career profile built', description: 'Your personalized dashboard is ready.', tone: 'ai' })
    window.setTimeout(() => navigate('/dashboard'), 1900)
  }

  if (completed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="animate-scale-in text-center">
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow">
            <Check className="h-11 w-11" />
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          </div>
          <h1 className="mt-8 text-2xl font-bold sm:text-3xl">Your career profile is ready</h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            CareerAI is generating your readiness score, skill gaps and a 12-week roadmap for{' '}
            {profile.targetRole}.
          </p>
          <div className="mt-6 flex items-center justify-center gap-1.5">
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[900px] items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <Logo />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">Skip for now</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[900px] px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">Step {step} of 4</Badge>
          <span className="text-xs text-muted-foreground">{Math.round((step / 4) * 100)}% complete</span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {steps.map((item) => (
            <div key={item.id} className="space-y-2">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-all duration-500',
                  item.id <= step ? 'bg-brand-gradient' : 'bg-muted',
                )}
              />
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'text-[11px] font-bold',
                    item.id <= step ? 'text-primary' : 'text-muted-foreground/60',
                  )}
                >
                  {item.code}
                </span>
                <span
                  className={cn(
                    'hidden truncate text-xs font-medium sm:block',
                    item.id <= step ? 'text-foreground' : 'text-muted-foreground/60',
                  )}
                >
                  {item.title}
                </span>
              </div>
            </div>
          ))}
        </div>

        <Card key={step} className="mt-8 animate-fade-up p-6 sm:p-8">
          {step === 1 ? (
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Let's get to know you</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We use this to benchmark you against students targeting the same roles.
              </p>
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={profile.fullName}
                    onChange={(event) => setProfile({ ...profile, fullName: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="education">Education</Label>
                  <Select
                    id="education"
                    value={profile.education}
                    onChange={(event) => setProfile({ ...profile, education: event.target.value })}
                  >
                    {['B.Tech', 'B.E.', 'B.Sc', 'BCA', 'M.Tech', 'MCA'].map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="branch">Branch</Label>
                  <Select
                    id="branch"
                    value={profile.branch}
                    onChange={(event) => setProfile({ ...profile, branch: event.target.value })}
                  >
                    {[
                      'Computer Science Engineering',
                      'Information Technology',
                      'Electronics & Communication',
                      'Mechanical Engineering',
                      'Other',
                    ].map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="graduationYear">Graduation year</Label>
                  <Select
                    id="graduationYear"
                    value={profile.graduationYear}
                    onChange={(event) => setProfile({ ...profile, graduationYear: event.target.value })}
                  >
                    {['2025', '2026', '2027', '2028'].map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="experience">Experience level</Label>
                  <Select
                    id="experience"
                    value={profile.experience}
                    onChange={(event) => setProfile({ ...profile, experience: event.target.value })}
                  >
                    {['Student / Fresher', 'Internship experience', '0–1 years', '1–3 years'].map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <h1 className="text-2xl font-bold tracking-tight">What skills do you have?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Select everything you have worked with — you can set proficiency below.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {skillOptions.map((skill) => (
                  <SkillBadge
                    key={skill}
                    name={skill}
                    selected={Boolean(selectedSkills[skill])}
                    onClick={() => toggleSkill(skill)}
                  />
                ))}
              </div>

              <div className="mt-6 flex gap-2">
                <Input
                  value={customSkill}
                  placeholder="Add a custom skill (e.g. Docker)"
                  onChange={(event) => setCustomSkill(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addCustomSkill()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addCustomSkill}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>

              {Object.keys(selectedSkills).length > 0 ? (
                <div className="mt-8">
                  <p className="text-sm font-semibold">Set your proficiency</p>
                  <div className="mt-3 space-y-2">
                    {Object.entries(selectedSkills).map(([skill, level]) => (
                      <div
                        key={skill}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3"
                      >
                        <span className="text-sm font-medium">{skill}</span>
                        <div className="flex gap-1.5">
                          {proficiencies.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setSelectedSkills((current) => ({ ...current, [skill]: option }))}
                              className={cn(
                                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                                level === option
                                  ? 'bg-brand-gradient text-white shadow-sm'
                                  : 'bg-white text-muted-foreground hover:text-foreground',
                              )}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Where do you want your career to go?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your roadmap, job matches and interviews are built around this role.
              </p>
              <div className="mt-8 space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="targetRole">Target role</Label>
                  <Select
                    id="targetRole"
                    value={profile.targetRole}
                    onChange={(event) => setProfile({ ...profile, targetRole: event.target.value })}
                  >
                    {targetRoles.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="goal">Career goal</Label>
                  <Textarea
                    id="goal"
                    value={profile.goal}
                    placeholder="e.g. Land a software developer role at a product company within 6 months."
                    onChange={(event) => setProfile({ ...profile, goal: event.target.value })}
                  />
                </div>
                <div className="rounded-2xl border border-primary/15 bg-brand-soft p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Sparkles className="h-4 w-4" /> CareerAI preview
                  </p>
                  <p className="mt-1.5 text-sm text-foreground/80">
                    For {profile.targetRole}, students typically need strong SQL, DSA and one production-grade project.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <h1 className="text-2xl font-bold tracking-tight">A few preferences</h1>
              <p className="mt-2 text-sm text-muted-foreground">We use these to rank job matches for you.</p>
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="location">Preferred location</Label>
                  <Input
                    id="location"
                    value={profile.location}
                    onChange={(event) => setProfile({ ...profile, location: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="industry">Preferred industry</Label>
                  <Select
                    id="industry"
                    value={profile.industry}
                    onChange={(event) => setProfile({ ...profile, industry: event.target.value })}
                  >
                    {['Product & SaaS', 'Fintech', 'E-commerce', 'Healthcare', 'Consulting', 'Any'].map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Work preference</Label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {['Remote', 'Hybrid', 'On-site'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setProfile({ ...profile, workPreference: option })}
                        className={cn(
                          'rounded-xl border px-4 py-3 text-sm font-medium transition-all',
                          profile.workPreference === option
                            ? 'border-primary/40 bg-brand-soft text-primary shadow-sm'
                            : 'border-border bg-white text-muted-foreground hover:border-primary/25 hover:text-foreground',
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((value) => Math.max(1, value - 1))}
              className={cn(step === 1 && 'invisible')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {step < 4 ? (
              <Button type="button" onClick={() => setStep((value) => Math.min(4, value + 1))}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={finish}>
                Build My Career Profile <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
