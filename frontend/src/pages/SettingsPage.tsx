import { useState } from 'react'
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
import { student, targetRoles } from '@/data/mock'

export function SettingsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [account, setAccount] = useState({ name: student.name, email: student.email, role: student.targetRole })
  const [prefs, setPrefs] = useState({
    weeklyDigest: true,
    jobAlerts: true,
    interviewReminders: false,
    aiTips: true,
    publicProfile: false,
  })

  const toggle = (key: keyof typeof prefs) => (value: boolean) => {
    setPrefs((current) => ({ ...current, [key]: value }))
    toast({ title: 'Preference saved', tone: 'success' })
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
              onChange={(event) => setAccount({ ...account, email: event.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="settings-role">Target role</Label>
            <Select
              id="settings-role"
              value={account.role}
              onChange={(event) => setAccount({ ...account, role: event.target.value })}
            >
              {targetRoles.map((role) => (
                <option key={role}>{role}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => toast({ title: 'Account updated', tone: 'success' })}>Save changes</Button>
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
          <Button variant="outline" size="sm" onClick={() => navigate('/')}>
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </Card>
    </div>
  )
}
