export type JobMode = 'Remote' | 'Hybrid' | 'On-site'
export type JobType = 'Full-time' | 'Internship' | 'Contract' | 'Part-time'
export type JobCategory = 'Software Development' | 'Frontend' | 'Backend' | 'Full Stack' | 'Data' | 'AI/ML' | 'Testing' | 'Java Development' | 'Python' | 'DevOps' | 'Cloud' | 'Cybersecurity' | 'UI/UX'
export type ApplicationStatus = 'Saved' | 'Applied' | 'Assessment' | 'Interview' | 'Rejected' | 'Offer'

export interface Job {
  id: string
  title: string
  company: string
  location: string
  mode: JobMode
  type: JobType
  category: JobCategory
  description: string
  requiredSkills: string[]
  preferredSkills: string[]
  experience: string
  experienceLevel?: 'intern' | 'junior' | 'mid' | 'senior'
  salary?: string
  salaryValue?: number
  postedAt: string
  postedDaysAgo: number
  source?: string
  externalId?: string
  country?: string
  companyDescription?: string
  industry?: string
  applicationUrl?: string
  companyLogo?: string
  skills?: string[]
  responsibilities?: string[]
  qualifications?: string[]
  benefits?: string[]
}

export interface JobMatch {
  job: Job
  matchPercentage: number
  matchedSkills: string[]
  partialSkills: string[]
  missingSkills: string[]
  matchedPreferredSkills: string[]
  missingPreferredSkills: string[]
  requiredCoverage: number
  preferredCoverage: number
  roleRelevance: number
  reasons: string[]
  improvementPlan: string[]
  roleMatch: number
  skillMatch: number
  experienceMatch: number
  locationMatch: number
  workModeMatch: number
  educationMatch: number
  industryMatch: number
  careerGoalAlignment: number
  aiSkillAlignment: number
  roleTier: 'exact' | 'adjacent' | 'growth' | 'other'
}

export type JobSort = 'Best Match' | 'Highest Match' | 'Recently Posted' | 'Role A-Z' | 'Highest Salary' | 'Lowest Skill Gap'
