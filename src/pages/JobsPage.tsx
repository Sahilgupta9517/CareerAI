import { useEffect, useMemo, useState } from 'react'
import { Bookmark, BriefcaseBusiness, Check, ChevronRight, CircleDot, Loader2, MapPin, Search, SlidersHorizontal, Star, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Progress } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { useToast } from '@/components/common/Toast'
import { demoJobs } from '@/data/jobs'
import { calculateJobMatch, filterJobs, matchLabel, sortJobs } from '@/lib/jobMatching'
import type { Job, JobCategory, JobMatch, JobSort } from '@/types/jobs'
import { getCurrentProfile, getJobApplications, getLatestCareerAnalysis, loadUserJobMatchingData, saveJob, unsaveJob, updateJobApplication, JobMatchingError, type ApplicationStatus, type CareerAnalysis, type JobApplication } from '@/lib/persistenceService'
import { supabase } from '@/lib/supabase'
import { fetchApi } from '@/lib/apiClient'

const categoryOptions: JobCategory[] = ['Software Development', 'Frontend', 'Backend', 'Full Stack', 'Data', 'AI/ML', 'Testing', 'Java Development', 'Python', 'DevOps', 'Cloud', 'Cybersecurity', 'UI/UX']
const applicationStatuses: ApplicationStatus[] = ['saved', 'applied', 'interview', 'rejected', 'offer']

type ProviderJob = { id: string; title: string; company: string; location: string; remote: boolean; employmentType: string; experienceLevel: string; salary?: string; description: string; skills: string[]; postedAt: string; applyUrl?: string; source: string }

const providerJobToJob = (job: ProviderJob): Job => ({
  id: job.id,
  title: job.title,
  company: job.company,
  location: job.location,
  country: job.location.split(',').pop()?.trim(),
  mode: job.remote ? 'Remote' : 'On-site',
  type: ['Full-time', 'Internship', 'Contract', 'Part-time'].includes(job.employmentType) ? job.employmentType as Job['type'] : 'Full-time',
  category: 'Software Development',
  description: job.description,
  requiredSkills: job.skills,
  preferredSkills: [],
  experience: job.experienceLevel,
  experienceLevel: ['intern', 'junior', 'mid', 'senior'].includes(job.experienceLevel.toLowerCase()) ? job.experienceLevel.toLowerCase() as Job['experienceLevel'] : 'mid',
  salary: job.salary,
  postedAt: job.postedAt,
  postedDaysAgo: 0,
  source: job.source,
  applicationUrl: job.applyUrl,
})

export function JobsPage() {
  const { toast } = useToast()
  const [userSkills, setUserSkills] = useState<string[]>([])
  const [targetRole, setTargetRole] = useState('')
  const [skillsLoading, setSkillsLoading] = useState(true)
  const [skillError, setSkillError] = useState('')
  const [analysisNotice, setAnalysisNotice] = useState('')
  const [applicationNotice, setApplicationNotice] = useState('')
  const [profileId, setProfileId] = useState<number | null>(null)
  const [careerAnalysis, setCareerAnalysis] = useState<CareerAnalysis | null>(null)
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('All')
  const [mode, setMode] = useState('All')
  const [type, setType] = useState('All')
  const [experience, setExperience] = useState('All')
  const [salary, setSalary] = useState('All')
  const [industry, setIndustry] = useState('All')
  const [requiredSkill, setRequiredSkill] = useState('All')
  const [category, setCategory] = useState('All categories')
  const [minimumMatch, setMinimumMatch] = useState('All')
  const [sort, setSort] = useState<JobSort>('Best Match')
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [activeMatch, setActiveMatch] = useState<JobMatch | null>(null)
  const [jobs, setJobs] = useState<Job[]>(demoJobs)
  const [liveProviderAvailable, setLiveProviderAvailable] = useState(false)
  const [providerNotice, setProviderNotice] = useState('')
  const [providerLoading, setProviderLoading] = useState(false)
  const [providerPage, setProviderPage] = useState(1)
  const [providerHasMore, setProviderHasMore] = useState(false)

  const loadProviderJobs = async (page = 1, append = false) => {
    setProviderLoading(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      const payload = await fetchApi<{ jobs?: ProviderJob[]; liveAvailable?: boolean; hasMore?: boolean; providerStatus?: string }>(`/api/jobs?page=${page}&pageSize=24`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }, 'Job provider')
      const normalized = (payload?.jobs ?? []).map(providerJobToJob)
      if (payload?.liveAvailable && normalized.length) {
        setJobs((current) => append ? [...current, ...normalized.filter((job) => !current.some((existing) => existing.id === job.id))] : normalized)
        setLiveProviderAvailable(true)
        setProviderNotice('')
      } else {
        setJobs(demoJobs)
        setLiveProviderAvailable(false)
        setProviderNotice('Live jobs unavailable. Showing clearly labeled CareerAI Demo Data.')
      }
      setProviderPage(page)
      setProviderHasMore(Boolean(payload?.liveAvailable && payload.hasMore))
    } catch (error) {
      setJobs(demoJobs)
      setLiveProviderAvailable(false)
      setProviderNotice('Live jobs unavailable. Showing clearly labeled CareerAI Demo Data.')
      if (import.meta.env.DEV) console.error('[JobMatching] provider unavailable:', error)
    } finally { setProviderLoading(false) }
  }

  useEffect(() => {
    void loadProviderJobs()
    const loadProfileData = async () => {
      try {
        const profile = await getCurrentProfile()
        if (!profile) {
          setUserSkills([])
          setTargetRole('')
          return
        }
        setProfileId(profile.id)
        const matchingData = await loadUserJobMatchingData(profile.id)
        setTargetRole(matchingData.targetRole)
        setUserSkills(matchingData.userSkills)
        setSavedIds(matchingData.savedJobIds)
        let loadedAnalysis: CareerAnalysis | null = null
        if (matchingData.targetRole) {
          try {
            loadedAnalysis = await getLatestCareerAnalysis(profile.id, matchingData.targetRole)
            setCareerAnalysis(loadedAnalysis)
          } catch (error) {
            if (import.meta.env.DEV) console.error('[JobMatching] AI_ANALYSIS load failed:', error)
            setAnalysisNotice('AI personalization unavailable. Showing skill-based matches.')
          }
        }
        try {
          setApplications(await getJobApplications(profile.id))
          setApplicationNotice('')
        } catch (error) {
          if (import.meta.env.DEV) console.error('[JobMatching][Applications]', error)
          setApplicationNotice('Application tracking is temporarily unavailable.')
        }
        if (import.meta.env.DEV) console.info('[JobMatching] health:', { authenticated: true, hasProfile: true, hasTargetRole: Boolean(matchingData.targetRole), skills: matchingData.userSkills.length, jobs: jobs.length, analysis: Boolean(loadedAnalysis), savedJobs: matchingData.savedJobIds.length })
      } catch (error) {
        const message = error instanceof JobMatchingError ? error.message : error instanceof Error ? error.message : 'Job Matching data could not be loaded.'
        if (import.meta.env.DEV) console.error('[JobMatching] core load failed:', error)
        setSkillError(message)
      } finally {
        setSkillsLoading(false)
      }
    }

    void loadProfileData()
  }, [])

  const matches = useMemo(() => targetRole.trim()
    ? jobs.map((job) => calculateJobMatch(job, userSkills, targetRole)).filter((match) => match.roleTier !== 'growth')
    : [], [jobs, targetRole, userSkills])
  const filteredMatches = useMemo(() => {
    const base = filterJobs(matches, query, mode, type, minimumMatch === 'All' ? null : Number(minimumMatch), category)
    return sortJobs(base.filter(({ job }) =>
      (location === 'All' || job.location.includes(location)) &&
      (experience === 'All' || job.experienceLevel === experience) &&
      (industry === 'All' || (job.industry ?? 'Technology') === industry) &&
      (requiredSkill === 'All' || job.requiredSkills.includes(requiredSkill)) &&
      (salary === 'All' || (salary === '0-10' ? (job.salaryValue ?? 0) <= 10000000 : salary === '10-20' ? (job.salaryValue ?? 0) > 10000000 && (job.salaryValue ?? 0) <= 20000000 : (job.salaryValue ?? 0) > 20000000)),
    ), sort)
  }, [category, experience, industry, location, matches, minimumMatch, mode, query, requiredSkill, salary, sort, type])

  const strongestMatch = matches.length ? [...matches].sort((left, right) => right.matchPercentage - left.matchPercentage)[0] : null
  const averageMatch = matches.length ? Math.round(matches.reduce((total, match) => total + match.matchPercentage, 0) / matches.length) : 0

  const rankedMatches = useMemo(() => sortJobs(matches, 'Best Match'), [matches])
  const bestMatches = rankedMatches.filter((match) => match.roleTier === 'exact').slice(0, 3)
  const bestIds = new Set(bestMatches.map((match) => match.job.id))
  const recommendedForYou = rankedMatches.filter((match) => !bestIds.has(match.job.id) && match.roleTier === 'adjacent' && match.matchPercentage >= 50).slice(0, 3)
  const unlockMatches = rankedMatches.filter((match) => !bestIds.has(match.job.id) && match.roleTier === 'exact' && match.missingSkills.length >= 1).slice(0, 3)
  const exploreMatches = rankedMatches
    .filter((match) => !bestIds.has(match.job.id) && !recommendedForYou.some((item) => item.job.id === match.job.id) && !unlockMatches.some((item) => item.job.id === match.job.id))
    .slice(0, 3)

  const hasActiveFilters = Boolean(query.trim()) || location !== 'All' || mode !== 'All' || type !== 'All' || experience !== 'All' || salary !== 'All' || industry !== 'All' || requiredSkill !== 'All' || category !== 'All categories' || minimumMatch !== 'All' || sort !== 'Best Match'

  const toggleSave = async (jobId: string) => {
    if (!profileId) return
    const wasSaved = savedIds.includes(jobId)
    setSavedIds((current) => wasSaved ? current.filter((id) => id !== jobId) : [...current, jobId])
    try {
      if (wasSaved) await unsaveJob(profileId, jobId)
      else await saveJob(profileId, jobId)
      toast({ title: wasSaved ? 'Removed from saved jobs' : 'Job saved', description: 'Saved to your profile.', tone: 'info' })
    } catch (error) {
      setSavedIds((current) => wasSaved ? [...current, jobId] : current.filter((id) => id !== jobId))
      toast({ title: 'Could not update saved job', description: error instanceof Error ? error.message : 'Please try again.', tone: 'info' })
    }
  }

  const trackApplication = async (jobId: string, status: ApplicationStatus) => {
    if (!profileId) return
    const previous = applications.find((application) => application.job_id === jobId)
    try {
      const updated = await updateJobApplication(profileId, jobId, status)
      setApplications((current) => [...current.filter((application) => application.job_id !== jobId), updated])
      toast({ title: 'Application updated', description: `Status changed to ${status}.`, tone: 'info' })
      setApplicationNotice('')
    } catch (error) {
      if (previous) setApplications((current) => [...current.filter((application) => application.job_id !== jobId), previous])
      if (import.meta.env.DEV) console.error('[JobMatching][Applications]', error)
      toast({ title: 'Could not update application', description: error instanceof Error ? error.message : 'Please try again.', tone: 'info' })
    }
  }

  const applyNow = async (jobId: string, applicationUrl?: string) => {
    if (applicationUrl && applicationUrl !== '#') window.open(applicationUrl, '_blank', 'noopener,noreferrer')
    await trackApplication(jobId, 'applied')
  }

  const resetFilters = () => {
    setQuery('')
    setLocation('All')
    setMode('All')
    setType('All')
    setExperience('All')
    setSalary('All')
    setIndustry('All')
    setRequiredSkill('All')
    setCategory('All categories')
    setMinimumMatch('All')
    setSort('Best Match')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Matching"
        description={targetRole ? `Personalized opportunities for ${targetRole}.` : 'Find roles that match your skills, goals and preferences.'}
        eyebrow={
          <Badge variant="outline" className="border-primary/20 text-primary">
            <BriefcaseBusiness className="h-3.5 w-3.5" /> Deterministic matching
          </Badge>
        }
      />

      {skillsLoading ? <Card className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading job recommendations" /></Card> : null}

      <Card className="border-primary/10 bg-brand-soft p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Authenticated target role</p>
            <p className="mt-1 text-sm text-foreground/75">
              {targetRole || 'Set your target role after onboarding to get role-aware recommendations.'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-4 w-4" />
            {userSkills.length} skills used for matching
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-primary/10 pt-3 text-xs text-muted-foreground">
          <Badge variant="secondary">{liveProviderAvailable ? 'Live provider' : 'CareerAI Demo Data'}</Badge>
          <span>{liveProviderAvailable ? 'Jobs are normalized and scored locally against your canonical skills.' : 'Live jobs unavailable. Demo roles are clearly labeled.'}</span>
          {providerNotice ? <Button type="button" variant="outline" size="sm" onClick={() => void loadProviderJobs()} disabled={providerLoading}>{providerLoading ? 'Retrying...' : 'Retry'}</Button> : null}
        </div>
      </Card>

      {skillError ? (
        <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          {skillError}
        </div>
      ) : null}

      {analysisNotice ? <div role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">{analysisNotice}</div> : null}
      {applicationNotice ? <div role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-300">{applicationNotice}</div> : null}

      {!skillsLoading && !skillError && !targetRole ? (
        <Card className="p-8 text-center">
          <BriefcaseBusiness className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 text-base font-semibold">Set your target role to get personalized job recommendations.</h2>
          <Button asChild className="mt-5"><Link to="/skills">Set Target Role</Link></Button>
        </Card>
      ) : null}

      {!skillsLoading && userSkills.length === 0 ? (
        <Card className="p-8 text-center">
          <SlidersHorizontal className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 text-base font-semibold">No skills available for matching.</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add your skills to get personalized job recommendations.</p>
          <Button asChild className="mt-5">
            <Link to="/profile">Update Profile</Link>
          </Button>
        </Card>
      ) : null}

      {userSkills.length > 0 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Matching roles</p>
              <p className="mt-1 text-2xl font-bold">{filteredMatches.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Strongest match</p>
              <p className="mt-1 truncate text-lg font-bold">{strongestMatch ? `${strongestMatch.matchPercentage}%` : '—'}</p>
              <p className="text-xs text-muted-foreground">{strongestMatch?.job.title ?? 'No matches yet'}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Average match</p>
              <p className="mt-1 text-2xl font-bold">{averageMatch}%</p>
            </Card>
          </div>

          {strongestMatch ? (
            <Card className="border-primary/15 p-5">
              <p className="text-sm font-semibold text-primary">CareerAI Recommendation</p>
              <p className="mt-1 text-sm leading-relaxed">
                Your strongest fit is {strongestMatch.job.title} at {strongestMatch.job.company} with a {strongestMatch.matchPercentage}%
                match. You already have {strongestMatch.matchedSkills.slice(0, 3).join(', ') || 'relevant skills'}.
              </p>
            </Card>
          ) : null}

          {careerAnalysis ? (
            <Card className="border-primary/15 p-5">
              <p className="text-sm font-semibold text-primary">AI skill alignment for {targetRole}</p>
              <p className="mt-1 text-sm text-muted-foreground">{careerAnalysis.skill_gaps?.length ? `Prioritize ${careerAnalysis.skill_gaps.slice(0, 3).map((gap) => gap.skill).join(', ')} to improve your strongest matches.` : 'Your current career analysis aligns well with these recommendations.'}</p>
            </Card>
          ) : null}

          {!hasActiveFilters ? (
            <div className="space-y-5">
              <RecommendationSection title="Best Matches" matches={bestMatches} savedIds={savedIds} onSave={toggleSave} onView={setActiveMatch} onApply={applyNow} onTrack={trackApplication} applications={applications} />
              <RecommendationSection title="Adjacent Roles" matches={recommendedForYou} savedIds={savedIds} onSave={toggleSave} onView={setActiveMatch} onApply={applyNow} onTrack={trackApplication} applications={applications} />
              <RecommendationSection title="Skill Growth Opportunities" matches={unlockMatches} savedIds={savedIds} onSave={toggleSave} onView={setActiveMatch} onApply={applyNow} onTrack={trackApplication} applications={applications} />
              <RecommendationSection title="Explore Roles" matches={exploreMatches} savedIds={savedIds} onSave={toggleSave} onView={setActiveMatch} onApply={applyNow} onTrack={trackApplication} applications={applications} />
            </div>
          ) : null}

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Search className="h-4 w-4 text-muted-foreground" /> Filter roles
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Input placeholder="Search jobs, companies or skills..." value={query} onChange={(event) => setQuery(event.target.value)} />
              <Select value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Location"><option>All</option>{['Bengaluru', 'Hyderabad', 'Pune', 'Mumbai', 'Chennai', 'Remote'].map((item) => <option key={item}>{item}</option>)}</Select>
              <Select value={mode} onChange={(event) => setMode(event.target.value)} aria-label="Work mode">
                <option>All</option>
                <option>Remote</option>
                <option>Hybrid</option>
                <option>On-site</option>
              </Select>
              <Select value={type} onChange={(event) => setType(event.target.value)} aria-label="Job type">
                <option>All</option>
                <option>Full-time</option>
                <option>Internship</option>
              </Select>
              <Select value={experience} onChange={(event) => setExperience(event.target.value)} aria-label="Experience"><option>All</option><option value="intern">Intern</option><option value="junior">Junior</option><option value="mid">Mid</option><option value="senior">Senior</option></Select>
              <Select value={salary} onChange={(event) => setSalary(event.target.value)} aria-label="Salary"><option>All</option><option value="0-10">Up to ₹10 LPA</option><option value="10-20">₹10-20 LPA</option><option value="20+">₹20 LPA+</option></Select>
              <Select value={industry} onChange={(event) => setIndustry(event.target.value)} aria-label="Industry"><option>All</option><option>Technology</option><option>Infrastructure</option></Select>
              <Select value={requiredSkill} onChange={(event) => setRequiredSkill(event.target.value)} aria-label="Required skill"><option>All</option>{[...new Set(jobs.flatMap((job) => job.requiredSkills))].sort().map((skill) => <option key={skill}>{skill}</option>)}</Select>
              <Select value={minimumMatch} onChange={(event) => setMinimumMatch(event.target.value)} aria-label="Minimum match">
                <option value="All">All matches</option>
                <option value="50">50%+</option>
                <option value="70">70%+</option>
                <option value="80">80%+</option>
                <option value="90">90%+</option>
              </Select>
              <Select value={sort} onChange={(event) => setSort(event.target.value as JobSort)} aria-label="Sort jobs">
                <option>Best Match</option>
                <option>Highest Match</option>
                <option>Recently Posted</option>
                <option>Role A-Z</option>
                <option>Highest Salary</option>
                <option>Lowest Skill Gap</option>
              </Select>
              <Select aria-label="Role category" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option>All categories</option>
                {categoryOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </Select>
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredMatches.length}</span> of {matches.length} demo roles
            </p>
            <p className="text-sm text-muted-foreground">{savedIds.length} saved jobs · {applications.length} tracked</p>
          </div>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div><h2 className="text-base font-semibold">Application Tracker</h2><p className="text-xs text-muted-foreground">Track every application from saved to offer.</p></div>
              <div className="flex flex-wrap justify-end gap-1.5">{applicationStatuses.map((status) => <Badge key={status} variant="outline">{status}: {applications.filter((item) => item.status === status).length}</Badge>)}</div>
            </div>
            {applications.length ? <div className="space-y-2">{applications.map((application) => {
              const job = jobs.find((item) => item.id === application.job_id)
              return job ? <div key={application.job_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"><span><strong>{job.company}</strong><span className="ml-2 text-muted-foreground">{job.title}</span>{application.applied_at ? <span className="ml-2 text-xs text-muted-foreground">Applied {new Date(application.applied_at).toLocaleDateString()}</span> : null}</span><Select value={application.status} onChange={(event) => void trackApplication(application.job_id, event.target.value as ApplicationStatus)} aria-label={`Status for ${job.title}`} className="w-36">{applicationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</Select></div> : null
            })}</div> : <p className="text-sm text-muted-foreground">No applications yet.</p>}
          </Card>

          {hasActiveFilters ? (
            filteredMatches.length === 0 ? (
              <Card className="p-12 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground" />
                <h2 className="mt-3 text-base font-semibold">No roles match your current filters.</h2>
                <p className="mt-1 text-sm text-muted-foreground">Try clearing filters or updating your skills.</p>
                <div className="mt-5 flex justify-center gap-3">
                  <Button variant="outline" onClick={resetFilters}>Clear Filters</Button>
                  <Button asChild>
                    <Link to="/profile">Update Skills</Link>
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredMatches.map((match) => (
                  <JobMatchCard
                    key={match.job.id}
                    match={match}
                    saved={savedIds.includes(match.job.id)}
                    onSave={() => toggleSave(match.job.id)}
                    onView={() => setActiveMatch(match)}
                    onApply={applyNow}
                    onTrack={trackApplication}
                    applicationStatus={applications.find((item) => item.job_id === match.job.id)?.status}
                  />
                ))}
              </div>
            )
          ) : null}

          {liveProviderAvailable && providerHasMore ? <div className="flex justify-center"><Button type="button" variant="outline" onClick={() => void loadProviderJobs(providerPage + 1, true)} disabled={providerLoading}>{providerLoading ? 'Loading jobs...' : 'Load more jobs'}</Button></div> : null}
        </>
      ) : null}

      <Modal
        open={Boolean(activeMatch)}
        onOpenChange={(open) => !open && setActiveMatch(null)}
        title={activeMatch?.job.title ?? 'Job details'}
        description={activeMatch ? `${activeMatch.job.company} · ${activeMatch.job.location}` : undefined}
        footer={<Button variant="outline" onClick={() => setActiveMatch(null)}>Back to Jobs</Button>}
      >
        {activeMatch ? <JobDetails match={activeMatch} saved={savedIds.includes(activeMatch.job.id)} onSave={() => void toggleSave(activeMatch.job.id)} onApply={applyNow} onTrack={trackApplication} status={applications.find((item) => item.job_id === activeMatch.job.id)?.status} /> : null}
      </Modal>
    </div>
  )
}

function RecommendationSection({ title, matches, savedIds, onSave, onView, onApply, onTrack, applications }: { title: string; matches: JobMatch[]; savedIds: string[]; onSave: (id: string) => void; onView: (match: JobMatch) => void; onApply: (id: string, url?: string) => Promise<void>; onTrack: (id: string, status: ApplicationStatus) => Promise<void>; applications: JobApplication[] }) {
  if (!matches.length) return null

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">{matches.length} roles</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {matches.map((match) => (
          <JobMatchCard
            key={`${title}-${match.job.id}`}
            match={match}
            saved={savedIds.includes(match.job.id)}
            onSave={() => onSave(match.job.id)}
            onView={() => onView(match)}
            onApply={onApply}
            onTrack={onTrack}
            applicationStatus={applications.find((item) => item.job_id === match.job.id)?.status}
          />
        ))}
      </div>
    </section>
  )
}

function JobMatchCard({ match, saved, onSave, onView, onApply, onTrack, applicationStatus }: { match: JobMatch; saved: boolean; onSave: () => void; onView: () => void; onApply?: (id: string, url?: string) => Promise<void>; onTrack?: (id: string, status: ApplicationStatus) => Promise<void>; applicationStatus?: string }) {
  const initials = match.job.company
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Card className="flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{match.job.title}</h2>
            <p className="truncate text-sm text-muted-foreground">{match.job.company}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSave}
          aria-label={saved ? 'Remove saved job' : 'Save job'}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
        >
          <Bookmark className={saved ? 'h-4 w-4 fill-current text-primary' : 'h-4 w-4'} />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {match.job.location}
        </span>
        <span>
          {match.job.mode} · {match.job.type}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div>
          <span className="text-lg font-bold text-primary">{match.matchPercentage}%</span>
          <span className="ml-2 text-xs font-semibold text-muted-foreground">{matchLabel(match.matchPercentage)}</span>
        </div>
        <span className="text-xs text-muted-foreground">{match.job.postedAt}</span>
      </div>

      <Progress value={match.matchPercentage} className="mt-2 h-1.5" />
      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{match.job.description}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {match.matchedSkills.slice(0, 4).map((skill) => (
          <Badge key={skill} variant="success">
            <Check className="h-3 w-3" />
            {skill}
          </Badge>
        ))}
        {match.partialSkills.slice(0, 2).map((skill) => (
          <Badge key={`partial-${skill}`} variant="warning">
            <CircleDot className="h-3 w-3" />
            Related: {skill}
          </Badge>
        ))}
        {match.missingSkills.slice(0, 2).map((skill) => (
          <Badge key={skill} variant="warning">
            Missing: {skill}
          </Badge>
        ))}
      </div>

      <div className="mt-auto space-y-3 border-t border-border/70 pt-4">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Role fit</span>
          <span className="font-semibold">{match.roleMatch}%</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Skill fit</span>
          <span className="font-semibold">{match.skillMatch}%</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Career goal</span>
          <span className="font-semibold">{match.careerGoalAlignment}%</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onView}>
            View Details
          </Button>
          {onApply ? <Button size="sm" variant="outline" onClick={() => void onApply(match.job.id, match.job.applicationUrl)}>{applicationStatus === 'applied' ? 'Applied' : 'Apply Now'}</Button> : null}
          {onTrack ? <Select value={applicationStatus ?? 'saved'} onChange={(event) => void onTrack(match.job.id, event.target.value as ApplicationStatus)} aria-label={`Application status for ${match.job.title}`} className="min-w-28"><option value="saved">Track</option>{applicationStatuses.filter((status) => status !== 'saved').map((status) => <option key={status} value={status}>{status}</option>)}</Select> : null}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ChevronRight className="h-3.5 w-3.5" />
          {match.missingSkills.length ? `${match.missingSkills.length} skill gaps to close` : 'Skill profile is well aligned'}
        </div>
      </div>
    </Card>
  )
}

function JobDetails({ match, saved, onSave, onApply, onTrack, status }: { match: JobMatch; saved: boolean; onSave: () => void; onApply: (id: string, url?: string) => Promise<void>; onTrack: (id: string, status: ApplicationStatus) => Promise<void>; status?: string }) {
  const { job } = match

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-primary">Why this matches you</span>
          <span className="font-bold">{match.matchPercentage}% Match</span>
        </div>
        <Progress value={match.matchPercentage} className="mt-2" />
      </div>

      <div className="space-y-3">
        {([['Required skills', match.skillMatch], ['Preferred skills', Math.round(match.preferredCoverage * 100)], ['Target role relevance', match.roleMatch], ['Experience fit', match.experienceMatch], ['Location / work mode', Math.round((match.locationMatch + match.workModeMatch) / 2)], ['AI skill alignment', match.aiSkillAlignment]] as const).map(([label, value]) => <div key={label}><div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><strong>{value}%</strong></div><Progress value={value} className="mt-1.5 h-1.5" /></div>)}
      </div>

      <div>
        <p className="text-sm font-semibold">Why this role fits</p>
        <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
          {match.reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <Star className="mt-0.5 h-4 w-4 text-primary" />
              {reason}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-sm font-semibold">Improvement plan</p>
        <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
          {match.improvementPlan.map((step) => (
            <li key={step} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 text-primary" />
              {step}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-sm font-semibold">Matched skills</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {match.matchedSkills.length ? (
            match.matchedSkills.map((skill) => <Badge key={skill} variant="success">{skill}</Badge>)
          ) : (
            <Badge variant="secondary">No direct matches yet</Badge>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">Partial / related skills</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {match.partialSkills.length ? match.partialSkills.map((skill) => <Badge key={skill} variant="warning"><CircleDot className="h-3 w-3" />{skill}</Badge>) : <Badge variant="secondary">No related skills</Badge>}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">Missing skills</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {match.missingSkills.length ? (
            match.missingSkills.map((skill) => <Badge key={skill} variant="warning">{skill}</Badge>)
          ) : (
            <Badge variant="secondary">No missing skills</Badge>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">Role requirements</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {job.requiredSkills.map((skill) => (
            <Badge key={skill} variant="outline">
              {skill}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">Preferred skills</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {job.preferredSkills.map((skill) => (
            <Badge key={skill} variant="secondary">
              {skill}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div><p className="text-sm font-semibold">Job information</p><p className="mt-2 text-sm text-muted-foreground">{job.companyLogo ?? job.company.slice(0, 2).toUpperCase()} · {job.location} · {job.mode} · {job.type}</p><p className="text-sm text-muted-foreground">{job.experience} · {job.industry ?? 'Technology'} · Posted {job.postedAt}</p></div>
        <div><p className="text-sm font-semibold">Responsibilities</p><ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">{(job.responsibilities ?? [job.description]).map((item) => <li key={item}>{item}</li>)}</ul></div>
      </div>
      <div><p className="text-sm font-semibold">Qualifications and benefits</p><p className="mt-2 text-sm text-muted-foreground">{(job.qualifications ?? job.requiredSkills).join(' · ')}</p><p className="mt-1 text-sm text-muted-foreground">{(job.benefits ?? ['Learning support', 'Flexible collaboration']).join(' · ')}</p></div>

      <div className="flex items-center justify-between rounded-lg bg-muted/60 p-4">
        <span className="text-sm text-muted-foreground">Salary</span>
        <span className="text-sm font-semibold">{job.salary ?? 'Not listed'}</span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={onSave}>{saved ? 'Saved Job' : 'Save Job'}</Button>
        <Button variant="outline" onClick={() => void onApply(job.id, job.applicationUrl)}>Apply Now</Button>
        <Button variant="outline" asChild><Link to="/skills">Skill Gap for this Job</Link></Button>
        <Button variant="outline" asChild><Link to="/roadmap">Learn Missing Skills</Link></Button>
        <Button variant="outline" asChild><Link to={`/interview?jobRole=${encodeURIComponent(job.title)}`}>Practice for this Job</Link></Button>
        <Select value={status ?? 'saved'} onChange={(event) => void onTrack(job.id, event.target.value as ApplicationStatus)} aria-label="Track application status"><option value="saved">Track Application</option>{applicationStatuses.filter((item) => item !== 'saved').map((item) => <option key={item} value={item}>{item}</option>)}</Select>
      </div>
    </div>
  )
}
