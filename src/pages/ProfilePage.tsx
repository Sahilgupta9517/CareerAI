import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Briefcase, GraduationCap, Mail, MapPin, Pencil, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/common/PageHeader'
import { ProfileAvatar } from '@/components/common/ProfileAvatar'
import { SkillBadge } from '@/components/common/SkillBadge'
import { useToast } from '@/components/common/Toast'
import { supabase } from '@/lib/supabase'

export function ProfilePage() {
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>({
    name: '',
    email: '',
    location: '',
    targetRole: '',
    education: '',
    branch: '',
    graduationYear: '',
    experience: '',
    workPreference: '',
    industry: '',
    goal: ''
  })
  const [skills, setSkills] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [draft, setDraft] = useState(profile)

  const loadProfileData = async () => {
    try {
      const sessionRes = await supabase.auth.getSession()
      const token = sessionRes.data.session?.access_token
      if (!token) return

      const response = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        const userEmail = sessionRes.data.session?.user?.email || ''
        const loadedProfile = {
          name: data.profile?.name || '',
          email: userEmail,
          location: data.profile?.location || '',
          targetRole: data.goal?.target_role || '',
          education: data.profile?.education || '',
          branch: data.profile?.branch || '',
          graduationYear: data.profile?.graduation_year || '',
          experience: data.profile?.experience || '',
          workPreference: data.goal?.work_preference || '',
          industry: data.preferences?.preferred_industries || '',
          goal: data.goal?.goal_description || ''
        }
        setProfile(loadedProfile)
        setDraft(loadedProfile)
        setSkills(data.skills || [])
      }

      const statsRes = await fetch('/api/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProfileData()
  }, [])

  const save = async () => {
    try {
      const sessionRes = await supabase.auth.getSession()
      const token = sessionRes.data.session?.access_token
      if (!token) throw new Error('Session expired.')

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(draft)
      })

      if (!response.ok) throw new Error('Failed to update profile.')
      
      setProfile(draft)
      setEditing(false)
      toast({ title: 'Profile updated', description: 'Your matches will refresh shortly.', tone: 'success' })
      void loadProfileData()
    } catch (err) {
      console.error(err)
      toast({ title: 'Update failed', description: 'Could not save profile details.', tone: 'info' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="The details CareerAI uses to personalize your roadmap and job matches."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              setDraft(profile)
              setEditing(true)
            }}
          >
            <Pencil className="h-4 w-4" />
            Edit profile
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading profile details...</p>
      ) : (
        <>
          <Card className="relative overflow-hidden">
            <div className="h-28 bg-brand-gradient" />
            <div className="px-6 pb-6">
              <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-4">
                  <ProfileAvatar initials={profile.name ? profile.name.split(' ').map((n: string) => n[0]).join('') : 'U'} size="xl" />
                  <div className="pb-1">
                    <h2 className="text-xl font-bold">{profile.name || 'Anonymous User'}</h2>
                    <p className="text-sm text-muted-foreground">{profile.education || 'Student'} {profile.branch ? `· ${profile.branch}` : ''}</p>
                  </div>
                </div>
                <Badge variant="gradient" className="w-fit px-3 py-1.5">
                  {stats?.resumeScore ? `${stats.resumeScore}% resume ready` : 'No resume uploaded'}
                </Badge>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: Mail, label: 'Email', value: profile.email || '—' },
                  { icon: MapPin, label: 'Location', value: profile.location || '—' },
                  { icon: GraduationCap, label: 'Graduating', value: profile.graduationYear || '—' },
                  { icon: Target, label: 'Target role', value: profile.targetRole || '—' },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </p>
                    <p className="mt-1 truncate text-sm font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="p-6 lg:col-span-2">
              <h2 className="text-base font-semibold">Skills</h2>
              <p className="mt-1 text-sm text-muted-foreground">Proficiency scored from your profile, roadmap and interviews.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <SkillBadge key={skill.id || skill.name} name={skill.name} level={skill.proficiency} />
                ))}
                {skills.length === 0 ? <p className="text-sm text-muted-foreground">No skills saved yet.</p> : null}
              </div>
              <div className="mt-7 space-y-4">
                {skills.slice(0, 4).map((skill) => (
                  <div key={skill.id || skill.name}>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-muted-foreground">{skill.name}</span>
                      <span className="font-semibold">{skill.proficiency}%</span>
                    </div>
                    <Progress value={skill.proficiency} className="h-1.5" />
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-5">
              <Card className="p-6">
                <h2 className="text-base font-semibold">Career goal</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{profile.goal || 'Land a target developer role within 6 months.'}</p>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    {profile.workPreference || 'Hybrid'} · {profile.industry || 'Tech'}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    {profile.education || 'B.Tech'} {profile.branch ? `in ${profile.branch}` : ''}
                  </div>
                </div>
                <Button asChild variant="outline" className="mt-5 w-full">
                  <Link to="/roadmap">
                    View roadmap <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </Card>

              <Card className="p-6">
                <h2 className="text-base font-semibold">Profile strength</h2>
                <div className="mt-4 space-y-4">
                  {[
                    { label: 'Resume uploaded', value: stats?.latestResumeAnalysis ? 100 : 0 },
                    { label: 'Skills added', value: skills.length > 0 ? 100 : 0 },
                    { label: 'Mock interviews', value: stats?.interviewHistory?.length ? 100 : 0 },
                    { label: 'Projects linked', value: stats?.latestResumeAnalysis?.projects?.length ? 100 : 0 },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-semibold">{item.value}%</span>
                      </div>
                      <Progress value={item.value} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      <Modal
        open={editing}
        onOpenChange={setEditing}
        title="Edit profile"
        description="Changes apply to your matches and roadmap immediately."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save changes</Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {[
            { id: 'name', label: 'Full name' },
            { id: 'location', label: 'Location' },
            { id: 'targetRole', label: 'Target role' },
            { id: 'education', label: 'Degree (e.g. B.Tech)' },
            { id: 'branch', label: 'Branch / Specialization' },
            { id: 'graduationYear', label: 'Graduation Year' },
            { id: 'goal', label: 'Career goal description' },
            { id: 'workPreference', label: 'Work preference (Remote/Hybrid/On-site)' },
            { id: 'industry', label: 'Preferred industry' }
          ].map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label htmlFor={field.id}>{field.label}</Label>
              <Input
                id={field.id}
                value={draft[field.id as keyof typeof draft] || ''}
                onChange={(event) => setDraft({ ...draft, [field.id]: event.target.value })}
              />
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
