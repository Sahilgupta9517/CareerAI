import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Shield, Sparkles, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/common/PageHeader'
import { useToast } from '@/components/common/Toast'
import { useAuth } from '@/context/AuthContext'
import { roleRequirements } from '@/data/roleRequirements'
import { getProfile, updateProfile } from '@/lib/profileService'

export function SettingsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { signOut } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [account, setAccount] = useState({ name: '', email: '', role: '' })
  const [accountLoading, setAccountLoading] = useState(true)
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountError, setAccountError] = useState('')
  const [profileDraft, setProfileDraft] = useState({ location: '', graduationYear: '', education: '', branch: '', summary: '', goal: '', workPreference: '', industry: '' })
  const [prefs, setPrefs] = useState({
    weeklyDigest: true,
    jobAlerts: true,
    interviewReminders: false,
    aiTips: true,
    publicProfile: false,
  })

  useEffect(() => {
    const loadAccount = async () => {
      try {
        const data = await getProfile()
        setAccount({ name: data.profile.name ?? '', email: data.email, role: data.goal?.target_role ?? '' })
        setProfileDraft({ location: data.profile.location ?? '', graduationYear: data.profile.graduation_year ?? '', education: data.profile.education ?? '', branch: data.profile.branch ?? '', summary: data.profile.experience ?? '', goal: data.goal?.goal_description ?? '', workPreference: data.goal?.work_preference ?? '', industry: data.preferences?.preferred_industries ?? '' })
      } catch (error) {
        setAccountError(error instanceof Error ? error.message : 'Account data could not be loaded.')
      } finally { setAccountLoading(false) }
    }
    void loadAccount()
  }, [])

  const toggle = (key: keyof typeof prefs) => (value: boolean) => {
    setPrefs((current) => ({ ...current, [key]: value }))
    toast({ title: 'Preference saved', tone: 'success' })
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    const { error } = await signOut()
    if (error) {
      toast({ title: 'Could not log out', description: error.message, tone: 'info' })
      setLoggingOut(false)
      return
    }
    navigate('/login')
  }

  const saveAccount = async () => {
    setAccountSaving(true)
    setAccountError('')
    try {
      await updateProfile({ name: account.name, targetRole: account.role, ...profileDraft })
      toast({ title: 'Account updated', description: 'Your target role is now shared across CareerAI.', tone: 'success' })
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Account details could not be saved.')
    } finally { setAccountSaving(false) }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account, notifications and AI preferences." />

      <Card className="p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-primary">
            <User className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Account</h2>
            <p className="text-sm text-muted-foreground">Basic details used across CareerAI.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-name">Full name</Label>
            <Input
              id="settings-name"
              value={account.name}
              onChange={(event) => setAccount({ ...account, name: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-email">Email</Label>
            <Input
              id="settings-email"
              type="email"
              value={account.email}
              readOnly
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="settings-role">Target role</Label>
            <Select
              id="settings-role"
              value={account.role}
              onChange={(event) => setAccount({ ...account, role: event.target.value })}
            >
              {roleRequirements.map((role) => (
                <option key={role.id}>{role.title}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          {accountError ? <p role="alert" className="mr-auto text-sm text-rose-600">{accountError}</p> : null}
          <Button onClick={() => void saveAccount()} disabled={accountLoading || accountSaving || !account.name.trim() || !account.role}>{accountSaving ? 'Saving...' : 'Save changes'}</Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-primary">
            <Bell className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Notifications</h2>
            <p className="text-sm text-muted-foreground">Choose what CareerAI should tell you about.</p>
          </div>
        </div>
        <div className="mt-6 divide-y divide-border">
          {[
            { key: 'weeklyDigest' as const, title: 'Weekly progress digest', description: 'A Monday summary of readiness and streaks.' },
            { key: 'jobAlerts' as const, title: 'New job matches', description: 'Alert me when a role scores above 80%.' },
            { key: 'interviewReminders' as const, title: 'Interview reminders', description: 'Nudge me to practise twice a week.' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch checked={prefs[item.key]} onCheckedChange={toggle(item.key)} label={item.title} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold">AI & privacy</h2>
            <p className="text-sm text-muted-foreground">Control how CareerAI uses your data.</p>
          </div>
        </div>
        <div className="mt-6 divide-y divide-border">
          {[
            { key: 'aiTips' as const, title: 'Proactive AI tips', description: 'Let CareerAI suggest actions on your dashboard.' },
            { key: 'publicProfile' as const, title: 'Public career profile', description: 'Allow recruiters to discover your profile.' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Switch checked={prefs[item.key]} onCheckedChange={toggle(item.key)} label={item.title} />
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-4">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            Your resume and answers are stored privately for your account only.
          </p>
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={loggingOut}>
            <LogOut className="h-4 w-4" />
            {loggingOut ? 'Logging out…' : 'Log out'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
