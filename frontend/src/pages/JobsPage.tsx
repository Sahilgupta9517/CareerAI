import { useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Progress } from '@/components/ui/progress'
import { AIRecommendationCard } from '@/components/common/AIRecommendationCard'
import { JobCard } from '@/components/common/JobCard'
import { PageHeader } from '@/components/common/PageHeader'
import { useToast } from '@/components/common/Toast'
import { jobs } from '@/data/mock'
import type { JobListing } from '@/data/mock'

export function JobsPage() {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('All modes')
  const [type, setType] = useState('All types')
  const [saved, setSaved] = useState<string[]>(['j1'])
  const [activeJob, setActiveJob] = useState<JobListing | null>(null)

  const filtered = useMemo(
    () =>
      jobs.filter((job) => {
        const matchesQuery =
          !query ||
          job.title.toLowerCase().includes(query.toLowerCase()) ||
          job.company.toLowerCase().includes(query.toLowerCase())
        const matchesMode = mode === 'All modes' || job.mode === mode
        const matchesType = type === 'All types' || job.type === type
        return matchesQuery && matchesMode && matchesType
      }),
    [query, mode, type],
  )

  const toggleSave = (job: JobListing) => {
    setSaved((current) => {
      const next = current.includes(job.id) ? current.filter((id) => id !== job.id) : [...current, job.id]
      toast({
        title: current.includes(job.id) ? 'Removed from saved' : 'Saved job',
        description: `${job.title} · ${job.company}`,
        tone: 'info',
      })
      return next
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Matching"
        description="Roles ranked by how closely they match your skills, goal and preferences."
        eyebrow={
          <Badge variant="outline" className="border-primary/20 text-primary">
            <Sparkles className="h-3.5 w-3.5" /> 3 new matches today
          </Badge>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search role or company"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select value={mode} onChange={(event) => setMode(event.target.value)} aria-label="Work mode">
            {['All modes', 'Remote', 'Hybrid', 'On-site'].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
          <Select value={type} onChange={(event) => setType(event.target.value)} aria-label="Job type">
            {['All types', 'Full-time', 'Internship', 'Contract'].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
        </div>
      </Card>

      <AIRecommendationCard
        message="Nexora Labs is your strongest match at 89%. You meet every requirement except SQL — finishing that module this month would make you a near-perfect fit."
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {jobs.length} roles
        </p>
        <p className="text-sm text-muted-foreground">{saved.length} saved</p>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm font-medium">No roles match those filters</p>
          <p className="mt-1 text-sm text-muted-foreground">Try clearing the search or widening the work mode.</p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => {
              setQuery('')
              setMode('All modes')
              setType('All types')
            }}
          >
            Reset filters
          </Button>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              saved={saved.includes(job.id)}
              onSave={() => toggleSave(job)}
              onView={() => setActiveJob(job)}
            />
          ))}
        </div>
      )}

      <Modal
        open={Boolean(activeJob)}
        onOpenChange={(open) => !open && setActiveJob(null)}
        title={activeJob ? `${activeJob.title} · ${activeJob.company}` : ''}
        description={activeJob ? `${activeJob.location} · ${activeJob.type} · ${activeJob.mode}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setActiveJob(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                toast({ title: 'Application drafted', description: 'CareerAI tailored your resume for this role.', tone: 'ai' })
                setActiveJob(null)
              }}
            >
              Apply with CareerAI
            </Button>
          </>
        }
      >
        {activeJob ? (
          <div className="space-y-5">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">AI match score</span>
                <span className="font-semibold">{activeJob.match}%</span>
              </div>
              <Progress value={activeJob.match} />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{activeJob.description}</p>
            <div>
              <p className="text-sm font-semibold">Skills you already match</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {activeJob.matchedSkills.map((skill) => (
                  <Badge key={skill} variant="success">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold">Skills to close</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {activeJob.missingSkills.map((skill) => (
                  <Badge key={skill} variant="warning">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-muted/60 p-4 text-sm">
              <span className="text-muted-foreground">Compensation</span>
              <p className="mt-0.5 font-semibold">{activeJob.salary}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
