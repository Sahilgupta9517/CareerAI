import { useState } from 'react'
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
import { metrics, skills, student } from '@/data/mock'

export function ProfilePage() {
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState({
    name: student.name,
    email: student.email,
    location: student.location,
    targetRole: student.targetRole,
  })
  const [draft, setDraft] = useState(profile)

  const save = () => {
    setProfile(draft)
    setEditing(false)
    toast({ title: 'Profile updated', description: 'Your matches will refresh shortly.', tone: 'success' })
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

      <Card className="relative overflow-hidden">
        <div className="h-28 bg-brand-gradient" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <ProfileAvatar initials={student.initials} size="xl" />
              <div className="pb-1">
                <h2 className="text-xl font-bold">{profile.name}</h2>
                <p className="text-sm text-muted-foreground">{student.education}</p>
              </div>
            </div>
            <Badge variant="gradient" className="w-fit px-3 py-1.5">
              {metrics.careerReadiness}% career ready
            </Badge>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Mail, label: 'Email', value: profile.email },
              { icon: MapPin, label: 'Location', value: profile.location },
              { icon: GraduationCap, label: 'Graduating', value: student.graduationYear },
              { icon: Target, label: 'Target role', value: profile.targetRole },
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
          <p className="mt-1 text-sm text-muted-foreground">Proficiency scored from your resume, roadmap and interviews.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <SkillBadge key={skill.name} name={skill.name} level={skill.level} />
            ))}
          </div>
          <div className="mt-7 space-y-4">
            {skills.slice(0, 4).map((skill) => (
              <div key={skill.name}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-muted-foreground">{skill.name}</span>
                  <span className="font-semibold">{skill.level}%</span>
                </div>
                <Progress value={skill.level} className="h-1.5" />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <h2 className="text-base font-semibold">Career goal</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{student.goal}</p>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                {student.workPreference} · {student.industry}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                {student.college}
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
                { label: 'Resume uploaded', value: 100 },
                { label: 'Skills added', value: 85 },
                { label: 'Mock interviews', value: 60 },
                { label: 'Projects linked', value: 40 },
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
        <div className="space-y-4">
          {[
            { id: 'name', label: 'Full name' },
            { id: 'email', label: 'Email' },
            { id: 'location', label: 'Location' },
            { id: 'targetRole', label: 'Target role' },
          ].map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label htmlFor={field.id}>{field.label}</Label>
              <Input
                id={field.id}
                value={draft[field.id as keyof typeof draft]}
                onChange={(event) => setDraft({ ...draft, [field.id]: event.target.value })}
              />
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
