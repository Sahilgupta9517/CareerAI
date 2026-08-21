import { useEffect, useState } from 'react'
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
import { targetRoles } from '@/data/mock'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

type Proficiency = 'Beginner' | 'Intermediate' | 'Advanced'
type SkillOption = { id: number; name: string; category: string | null }
type SelectedSkill = { id: number; name: string; proficiency: Proficiency }

const steps = [
  { id: 1, code: '01', title: 'Personal Info' },
  { id: 2, code: '02', title: 'Skills' },
  { id: 3, code: '03', title: 'Career Goal' },
  { id: 4, code: '04', title: 'Preferences' },
]

const proficiencies: Proficiency[] = ['Beginner', 'Intermediate', 'Advanced']
const proficiencyValues: Record<Proficiency, number> = { Beginner: 30, Intermediate: 60, Advanced: 90 }

export function OnboardingPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [completed, setCompleted] = useState(false)
  const [savingPersonalInfo, setSavingPersonalInfo] = useState(false)
  const [personalInfoError, setPersonalInfoError] = useState('')
  const [savingSkills, setSavingSkills] = useState(false)
  const [skillsError, setSkillsError] = useState('')
  const [savingCareerGoal, setSavingCareerGoal] = useState(false)
  const [careerGoalError, setCareerGoalError] = useState('')
  const [customSkill, setCustomSkill] = useState('')
  const [skillOptions, setSkillOptions] = useState<SkillOption[]>([])
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [selectedSkills, setSelectedSkills] = useState<Record<number, SelectedSkill>>({})
  const [preferencesLoading, setPreferencesLoading] = useState(false)
  const [preferencesError, setPreferencesError] = useState('')
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

  useEffect(() => {
    const loadSkills = async () => {
      const { data, error } = await supabase.from('skills').select('id, name, category').order('name')
      if (error) {
        if (import.meta.env.DEV) console.error('Supabase skills load error:', error)
        setSkillsError(error.message)
      } else {
        setSkillOptions(data ?? [])
      }
      setSkillsLoading(false)
    }

    void loadSkills()
  }, [])

  useEffect(() => {
    const loadSelectedSkills = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) return

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle()
      if (profileError || !profileData) return

      const { data: savedSkills, error: skillsError } = await supabase
        .from('user_skills')
        .select('skill_id, proficiency, skill:skills(id, name)')
        .eq('profile_id', profileData.id)
      if (skillsError) {
        if (import.meta.env.DEV) console.error('Supabase saved skills load error:', skillsError)
        return
      }

      const proficiencyLabels: Record<number, Proficiency> = { 30: 'Beginner', 60: 'Intermediate', 90: 'Advanced' }
      const savedSelection = (savedSkills ?? []).reduce<Record<number, SelectedSkill>>((selection, row) => {
        const skill = row.skill as unknown as { id: number; name: string } | null
        if (skill) {
          selection[row.skill_id] = {
            id: row.skill_id,
            name: skill.name,
            proficiency: proficiencyLabels[Number(row.proficiency)] ?? 'Beginner',
          }
        }
        return selection
      }, {})
      setSelectedSkills(savedSelection)
    }

    void loadSelectedSkills()
  }, [])

  useEffect(() => {
    const redirectIfOnboardingComplete = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) return

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle()
      if (profileError || !profileData) return

      const [careerGoalResult, preferencesResult] = await Promise.all([
        supabase.from('career_goals').select('id').eq('profile_id', profileData.id).limit(1).maybeSingle(),
        supabase.from('user_preferences').select('id').eq('profile_id', profileData.id).limit(1).maybeSingle(),
      ])

      if (!careerGoalResult.error && !preferencesResult.error && careerGoalResult.data && preferencesResult.data) {
        navigate('/dashboard', { replace: true })
      }
    }

    void redirectIfOnboardingComplete()
  }, [navigate])

  const toggleSkill = (skill: SkillOption) => {
    setSelectedSkills((current) => {
      const next = { ...current }
      if (next[skill.id]) delete next[skill.id]
      else next[skill.id] = { id: skill.id, name: skill.name, proficiency: 'Beginner' }
      return next
    })
  }

  const addCustomSkill = () => {
    const value = customSkill.trim()
    if (!value) return
    const matchingSkill = skillOptions.find((skill) => skill.name.toLowerCase() === value.toLowerCase())
    if (!matchingSkill) {
      setSkillsError('That skill is not available yet. Select a skill from the list.')
      return
    }
    toggleSkill(matchingSkill)
    setSkillsError('')
    setCustomSkill('')
  }

  const saveSkills = async () => {
    setSkillsError('')
    setSavingSkills(true)

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!userData.user) throw new Error('Your session has expired. Please sign in again.')
      if (import.meta.env.DEV) console.log('Onboarding authenticated user ID:', userData.user.id)

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle()
      if (profileError) throw profileError
      if (!profileData) throw new Error('Complete your personal information before saving skills.')
      if (import.meta.env.DEV) console.log('Onboarding profile ID:', profileData.id)

      const selectedSkillSnapshot = Object.values(selectedSkills).map((skill) => ({
        id: skill.id,
        name: skill.name,
        proficiency: skill.proficiency,
        proficiencyValue: proficiencyValues[skill.proficiency],
      }))
      if (import.meta.env.DEV) console.log('Onboarding selected skills:', selectedSkillSnapshot)

      const { error: deleteError } = await supabase.from('user_skills').delete().eq('profile_id', profileData.id)
      if (deleteError) throw deleteError

      const rows = Object.values(selectedSkills).map((skill) => ({
        profile_id: profileData.id,
        skill_id: skill.id,
        proficiency: proficiencyValues[skill.proficiency],
      }))

      if (import.meta.env.DEV) console.log('Onboarding user_skills insert payload:', rows)

      let insertError = null
      if (rows.length > 0) {
        const insertResponse = await supabase.from('user_skills').insert(rows).select('id, profile_id, skill_id, proficiency')
        insertError = insertResponse.error
        if (import.meta.env.DEV) {
          console.log('Onboarding user_skills insert result:', insertResponse.data)
          console.error('Onboarding user_skills insert error:', insertResponse.error)
        }
      }
      if (insertError) throw insertError

      const verificationResponse = await supabase
        .from('user_skills')
        .select('id, profile_id, skill_id, proficiency')
        .eq('profile_id', profileData.id)
      if (import.meta.env.DEV) {
        console.log('Onboarding user_skills verification result:', verificationResponse.data)
        console.error('Onboarding user_skills verification error:', verificationResponse.error)
      }
      if (verificationResponse.error) throw verificationResponse.error
      if ((verificationResponse.data ?? []).length !== rows.length) {
        throw new Error('Your selected skills could not be verified after saving. Please try again.')
      }

      setStep(3)
    } catch (error) {
      if (import.meta.env.DEV) console.error('Supabase skills save error:', error)
      const message = error instanceof Error ? error.message : 'We could not save your skills.'
      setSkillsError(message)
      toast({ title: 'Could not save your skills', description: message, tone: 'info' })
    } finally {
      setSavingSkills(false)
    }
  }

  const saveCareerGoal = async () => {
    setCareerGoalError('')
    setSavingCareerGoal(true)

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!userData.user) throw new Error('Your session has expired. Please sign in again.')

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle()
      if (profileError) throw profileError
      if (!profileData) throw new Error('Complete your personal information before saving your career goal.')

      const careerGoalFields = {
        target_role: profile.targetRole,
        preferred_location: profile.location,
        work_preference: profile.workPreference,
        goal_description: profile.goal,
      }
      const { data: existingGoal, error: goalLookupError } = await supabase
        .from('career_goals')
        .select('id')
        .eq('profile_id', profileData.id)
        .limit(1)
        .maybeSingle()
      if (goalLookupError) throw goalLookupError

      const careerGoalResponse = existingGoal
        ? await supabase.from('career_goals').update(careerGoalFields).eq('id', existingGoal.id).select()
        : await supabase.from('career_goals').insert({ profile_id: profileData.id, ...careerGoalFields }).select()

      if (careerGoalResponse.error) throw careerGoalResponse.error
      setStep(4)
    } catch (error) {
      if (import.meta.env.DEV) console.error('Supabase career goal save error:', error)
      const message = error instanceof Error ? error.message : 'We could not save your career goal.'
      setCareerGoalError(message)
      toast({ title: 'Could not save your career goal', description: message, tone: 'info' })
    } finally {
      setSavingCareerGoal(false)
    }
  }

  const savePreferences = async () => {
    setPreferencesError('')
    setPreferencesLoading(true)

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!userData.user) throw new Error('Your session has expired. Please sign in again.')

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle()
      if (profileError) throw profileError
      if (!profileData) throw new Error('Complete your personal information before saving preferences.')

      const preferenceFields = {
        preferred_job_type: null,
        preferred_work_mode: profile.workPreference,
        preferred_locations: profile.location,
        expected_salary: null,
        preferred_industries: profile.industry,
      }
      const { data: existingPreferences, error: preferencesLookupError } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('profile_id', profileData.id)
        .limit(1)
        .maybeSingle()
      if (preferencesLookupError) throw preferencesLookupError

      const preferencesResponse = existingPreferences
        ? await supabase.from('user_preferences').update(preferenceFields).eq('id', existingPreferences.id).select()
        : await supabase.from('user_preferences').insert({ profile_id: profileData.id, ...preferenceFields }).select()

      if (preferencesResponse.error) throw preferencesResponse.error
      setCompleted(true)
      toast({ title: 'Career profile built', description: 'Your personalized dashboard is ready.', tone: 'ai' })
      window.setTimeout(() => navigate('/dashboard'), 1900)
    } catch (error) {
      if (import.meta.env.DEV) console.error('Supabase preferences save error:', error)
      const message = error instanceof Error ? error.message : 'We could not save your preferences.'
      setPreferencesError(message)
      toast({ title: 'Could not save your preferences', description: message, tone: 'info' })
    } finally {
      setPreferencesLoading(false)
    }
  }

  const savePersonalInfo = async () => {
    setPersonalInfoError('')
    setSavingPersonalInfo(true)

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!userData.user) throw new Error('Your session has expired. Please sign in again.')

      const userId = userData.user.id
      const { data: existingProfile, error: profileLookupError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      if (profileLookupError) throw profileLookupError

      const profileFields = {
        name: profile.fullName,
        education: profile.education,
        branch: profile.branch,
        graduation_year: profile.graduationYear,
        experience: profile.experience,
      }

      const profileResponse = existingProfile
        ? await supabase.from('profiles').update(profileFields).eq('id', existingProfile.id).select()
        : await supabase.from('profiles').insert({ user_id: userId, ...profileFields }).select()

      if (profileResponse.error) throw profileResponse.error

      setStep(2)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not save your personal information.'
      setPersonalInfoError(message)
      toast({ title: 'Could not save your profile', description: message, tone: 'info' })
    } finally {
      setSavingPersonalInfo(false)
    }
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
                    key={skill.id}
                    name={skill.name}
                    selected={Boolean(selectedSkills[skill.id])}
                    onClick={() => toggleSkill(skill)}
                  />
                ))}
              </div>

              {skillsLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading skills…</p> : null}
              {skillsError ? (
                <p role="alert" className="mt-4 text-sm text-rose-600">
                  {skillsError}
                </p>
              ) : null}

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
                    {Object.values(selectedSkills).map((skill) => (
                      <div
                        key={skill.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3"
                      >
                        <span className="text-sm font-medium">{skill.name}</span>
                        <div className="flex gap-1.5">
                          {proficiencies.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() =>
                                setSelectedSkills((current) => ({
                                  ...current,
                                  [skill.id]: { ...current[skill.id], proficiency: option },
                                }))
                              }
                              className={cn(
                                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                                skill.proficiency === option
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

          {step === 1 && personalInfoError ? (
            <p role="alert" className="mt-6 text-sm text-rose-600">
              {personalInfoError}
            </p>
          ) : null}
          {step === 3 && careerGoalError ? (
            <p role="alert" className="mt-6 text-sm text-rose-600">
              {careerGoalError}
            </p>
          ) : null}
          {step === 4 && preferencesError ? (
            <p role="alert" className="mt-6 text-sm text-rose-600">
              {preferencesError}
            </p>
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
              <Button
                type="button"
                onClick={
                  step === 1
                    ? savePersonalInfo
                    : step === 2
                      ? saveSkills
                      : step === 3
                        ? saveCareerGoal
                        : () => setStep((value) => Math.min(4, value + 1))
                }
                disabled={savingPersonalInfo || savingSkills || savingCareerGoal || preferencesLoading || skillsLoading}
              >
                {savingPersonalInfo || savingSkills || savingCareerGoal || preferencesLoading ? 'Saving…' : 'Continue'}
                {!savingPersonalInfo && !savingSkills && !savingCareerGoal && !preferencesLoading ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
            ) : (
              <Button type="button" onClick={savePreferences} disabled={preferencesLoading}>
                {preferencesLoading ? 'Saving…' : 'Build My Career Profile'} {!preferencesLoading ? <ArrowRight className="h-4 w-4" /> : null}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
