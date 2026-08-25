import type { Job, JobMatch, JobSort } from '@/types/jobs'
import { getRoleTier } from './roleNormalization'

const aliases: Record<string, string> = {
  js: 'javascript',
  javascript: 'javascript',
  ts: 'typescript',
  typescript: 'typescript',
  reactjs: 'react',
  react: 'react',
  nodejs: 'node.js',
  'node.js': 'node.js',
  mysql: 'mysql',
  sql: 'sql',
  postgres: 'postgresql',
  postgresql: 'postgresql',
  'scikit learn': 'scikit-learn',
  sklearn: 'scikit-learn',
  'scikit-learn': 'scikit-learn',
  python3: 'python',
  github: 'git',
  git: 'git',
  node: 'node.js',
  'node js': 'node.js',
  'react js': 'react',
  html5: 'html',
  css3: 'css',
  'rest apis': 'rest api',
  database: 'databases',
}

export const normalizeSkill = (skill: string) => {
  const normalized = skill.trim().toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ')
  return aliases[normalized] ?? normalized
}

const skillsEqual = (left: string, right: string) => {
  const a = normalizeSkill(left)
  const b = normalizeSkill(right)
  if (a === b) return true
  if ((a === 'mysql' && b === 'sql') || (a === 'sql' && b === 'mysql')) return true
  return false
}

const relatedSkills: Record<string, string[]> = {
  javascript: ['typescript', 'react', 'node.js'],
  typescript: ['javascript', 'react'],
  python: ['pandas', 'fastapi', 'django'],
  sql: ['mysql', 'postgresql', 'databases'],
  mysql: ['sql', 'databases'],
  postgresql: ['sql', 'databases'],
  react: ['javascript', 'typescript'],
  'node.js': ['javascript'],
  'machine learning': ['scikit-learn', 'python'],
}

const skillsRelated = (left: string, right: string) => {
  const a = normalizeSkill(left)
  const b = normalizeSkill(right)
  return relatedSkills[a]?.includes(b) || relatedSkills[b]?.includes(a)
}

const uniqueSkills = (skills: string[]) => {
  const seen = new Set<string>()
  return skills.filter((skill) => {
    const normalized = normalizeSkill(skill)
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

const parseExperienceYear = (experience: string) => {
  const match = experience.match(/(\d+)\s*[-+]?\s*(\d+)?/i)
  if (!match) return 2
  return Number(match[1] ?? 2)
}

export const calculateRoleRelevance = (job: Job, targetRole: string) => {
  if (!targetRole.trim()) return 0
  const tier = getRoleTier(job.title, targetRole)
  return tier === 'exact' ? 1 : tier === 'adjacent' ? 0.6 : tier === 'growth' ? 0.25 : 0
}

export const calculateJobMatch = (job: Job, userSkills: string[], targetRole = ''): JobMatch => {
  const skills = uniqueSkills(userSkills)
  const matchedSkills = job.requiredSkills.filter((required) => skills.some((skill) => skillsEqual(skill, required)))
  const partialSkills = job.requiredSkills.filter((required) => !matchedSkills.includes(required) && skills.some((skill) => skillsRelated(skill, required)))
  const missingSkills = job.requiredSkills.filter((required) => !matchedSkills.includes(required) && !partialSkills.includes(required))
  const matchedPreferredSkills = job.preferredSkills.filter((preferred) => skills.some((skill) => skillsEqual(skill, preferred)))
  const missingPreferredSkills = job.preferredSkills.filter((preferred) => !matchedPreferredSkills.includes(preferred))
  const requiredCoverage = job.requiredSkills.length ? (matchedSkills.length + partialSkills.length * 0.5) / job.requiredSkills.length : 0
  const preferredCoverage = job.preferredSkills.length ? matchedPreferredSkills.length / job.preferredSkills.length : 0
  const roleRelevance = calculateRoleRelevance(job, targetRole)
  const roleMatch = Math.round(roleRelevance * 100)
  const skillMatch = Math.round((requiredCoverage * 0.7 + preferredCoverage * 0.3) * 100)
  const experienceMatch = Math.min(100, Math.max(45, 100 - Math.abs(parseExperienceYear(job.experience) - 2) * 15))
  const locationMatch = job.location.toLowerCase().includes('remote') ? 92 : 88
  const workModeMatch = job.mode === 'Remote' ? 90 : job.mode === 'Hybrid' ? 85 : 75
  const educationMatch = 82
  const industryMatch = 80
  const careerGoalAlignment = Math.min(100, Math.max(60, Math.round((skillMatch * 0.45) + (roleMatch * 0.55))))
  const aiSkillAlignment = skillMatch

  const overallMatch = Math.round(
    skillMatch * 0.25 +
    roleMatch * 0.25 +
    experienceMatch * 0.15 +
    locationMatch * 0.1 +
    workModeMatch * 0.1 +
    educationMatch * 0.05 +
    industryMatch * 0.05 +
    careerGoalAlignment * 0.05 +
    aiSkillAlignment * 0.05,
  )

  const reasons = [
    matchedSkills.length ? `Strong alignment with ${matchedSkills.slice(0, 3).join(', ')}.` : 'Your current skill profile needs a stronger fit for the core requirements.',
    partialSkills.length ? `Related skills such as ${partialSkills.slice(0, 2).join(', ')} give you a starting point.` : matchedPreferredSkills.length ? `Preferred skills such as ${matchedPreferredSkills.slice(0, 2).join(', ')} are a good fit.` : `Your main gaps are ${missingSkills.slice(0, 2).join(', ') || 'the core role skills'}.`,
    `This role matches your ${targetRole || 'current target role'} focus and career direction.`,
    missingSkills.length ? `The main improvement areas are ${missingSkills.slice(0, 2).join(', ')}.` : partialSkills.length ? `Strengthen ${partialSkills.slice(0, 2).join(', ')} to meet the full requirement.` : 'You already cover the essential responsibilities for this role.',
  ]

  const improvementPlan = [
    missingSkills[0] ? `Learn ${missingSkills[0]} to improve the gap between your current profile and the job requirements.` : 'Keep aligning your portfolio with the role through small project work.',
    'Add a practical project that demonstrates your strength in the key role tasks.',
    'Review the roadmap and prioritize the next highest-value learning task for this role.',
  ]

  return {
    job,
    matchPercentage: Math.max(0, Math.min(100, overallMatch)),
    matchedSkills,
    partialSkills,
    missingSkills,
    matchedPreferredSkills,
    missingPreferredSkills,
    requiredCoverage,
    preferredCoverage,
    roleRelevance,
    reasons,
    improvementPlan,
    roleMatch,
    skillMatch,
    experienceMatch,
    locationMatch,
    workModeMatch,
    educationMatch,
    industryMatch,
    careerGoalAlignment,
    aiSkillAlignment,
    roleTier: getRoleTier(job.title, targetRole),
  }
}

export const matchLabel = (score: number) =>
  score >= 90 ? 'Excellent Match' :
  score >= 80 ? 'Strong Match' :
  score >= 70 ? 'Good Match' :
  score >= 60 ? 'Potential Match' :
  'Skills Needed'

export const filterJobs = (matches: JobMatch[], query: string, mode: string, type: string, minimumMatch: number | null, category = 'All categories') =>
  matches.filter(({ job, matchPercentage }) => {
    const normalizedQuery = query.trim().toLowerCase()
    const matchesQuery = !normalizedQuery || `${job.title} ${job.company} ${job.description}`.toLowerCase().includes(normalizedQuery)
    return matchesQuery &&
      (mode === 'All' || job.mode === mode) &&
      (type === 'All' || job.type === type) &&
      (category === 'All categories' || job.category === category) &&
      (minimumMatch === null || matchPercentage >= minimumMatch)
  })

export const sortJobs = (matches: JobMatch[], sort: JobSort) => [...matches].sort((left, right) => {
  if (sort === 'Highest Match') return right.matchPercentage - left.matchPercentage
  if (sort === 'Recently Posted') return left.job.postedDaysAgo - right.job.postedDaysAgo
  if (sort === 'Role A-Z') return left.job.title.localeCompare(right.job.title)
  if (sort === 'Highest Salary') return (right.job.salaryValue ?? 0) - (left.job.salaryValue ?? 0)
  if (sort === 'Lowest Skill Gap') return left.missingSkills.length - right.missingSkills.length
  return right.matchPercentage - left.matchPercentage
})
