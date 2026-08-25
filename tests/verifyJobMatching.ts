import { calculateJobMatch, filterJobs, sortJobs } from '../src/lib/jobMatching.ts'
import type { Job } from '../src/types/jobs.ts'

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message)
}

const jobs: Job[] = [
  { id: 'demo-python', title: 'Python Developer', company: 'Demo Company', location: 'Remote, India', mode: 'Remote', type: 'Full-time', category: 'Python', description: 'Build Python services.', requiredSkills: ['Python', 'React', 'SQL'], preferredSkills: ['Docker'], experience: '0-2 years', experienceLevel: 'junior', salary: '₹10 LPA', salaryValue: 10000000, postedAt: '1 day ago', postedDaysAgo: 1, source: 'CareerAI Demo', applicationUrl: '#' },
  { id: 'demo-java', title: 'Java Developer', company: 'Other Company', location: 'Pune, India', mode: 'On-site', type: 'Full-time', category: 'Java Development', description: 'Build Java services.', requiredSkills: ['Java'], preferredSkills: [], experience: '2-4 years', experienceLevel: 'mid', salaryValue: 20000000, postedAt: '5 days ago', postedDaysAgo: 5, source: 'CareerAI Demo', applicationUrl: '#' },
]

const match = calculateJobMatch(jobs[0], ['Python', 'JavaScript', 'SQL'], 'Python Developer')
assert(match.matchedSkills.includes('Python') && match.matchedSkills.includes('SQL'), 'expected exact skill matches')
assert(match.partialSkills.includes('React'), 'expected JavaScript to be a partial React match')
assert(!match.missingSkills.includes('React'), 'partial skills must not also be missing')
assert(match.matchPercentage > 0 && match.matchPercentage <= 100, 'expected bounded match percentage')
assert(filterJobs([match], '', 'Remote', 'Full-time', 0).length === 1, 'expected mode and type filter')
assert(sortJobs([match], 'Highest Match')[0] === match, 'expected best-match sorting')
assert(jobs.every((job) => job.source === 'CareerAI Demo'), 'development roles must be clearly labeled demo data')
console.log('job matching checks passed')
