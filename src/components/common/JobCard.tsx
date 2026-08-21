import { Bookmark, BriefcaseBusiness, MapPin, Sparkles } from 'lucide-react'
import type { JobListing } from '@/data/mock'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface JobCardProps {
  job: JobListing
  saved?: boolean
  onSave?: () => void
  onView?: () => void
}

export function JobCard({ job, saved, onSave, onView }: JobCardProps) {
  return (
    <Card className="group flex h-full flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-sm', job.logoTone)}>
            {job.company.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{job.title}</h3>
            <p className="truncate text-sm text-muted-foreground">{job.company}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSave}
          aria-label={saved ? 'Remove from saved jobs' : 'Save job'}
          className={cn(
            'rounded-full p-2 transition-colors',
            saved ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Bookmark className={cn('h-4 w-4', saved && 'fill-current')} />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {job.location}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BriefcaseBusiness className="h-3.5 w-3.5" />
          {job.type} · {job.mode}
        </span>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{job.description}</p>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 font-medium text-primary">
            <Sparkles className="h-3 w-3" /> AI match
          </span>
          <span className="font-semibold">{job.match}%</span>
        </div>
        <Progress value={job.match} className="h-1.5" />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {job.matchedSkills.slice(0, 3).map((skill) => (
          <Badge key={skill} variant="success">
            {skill}
          </Badge>
        ))}
        {job.missingSkills.slice(0, 2).map((skill) => (
          <Badge key={skill} variant="warning">
            Missing: {skill}
          </Badge>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        <div>
          <p className="text-sm font-semibold">{job.salary}</p>
          <p className="text-xs text-muted-foreground">Posted {job.posted}</p>
        </div>
        <Button size="sm" onClick={onView}>
          View Role
        </Button>
      </div>
    </Card>
  )
}
