/**
 * Role normalization and classification service
 * Maps diverse role titles to canonical role families
 * and provides role-specific job filtering
 */

export type RoleFamily = 'Frontend' | 'Backend' | 'Full Stack' | 'Data' | 'AI/ML' | 'DevOps' | 'Java' | 'Python' | 'Testing' | 'UI/UX' | 'Software Development' | 'Cloud' | 'Cybersecurity'

// Map target role variations to canonical role families
const roleFamilyMap: Record<string, RoleFamily> = {
  'frontend developer': 'Frontend',
  'frontend engineer': 'Frontend',
  'react developer': 'Frontend',
  'react.js developer': 'Frontend',
  'vue.js developer': 'Frontend',
  'angular developer': 'Frontend',
  'ui developer': 'Frontend',
  'web developer': 'Frontend',
  'next.js developer': 'Frontend',
  'junior frontend developer': 'Frontend',

  'backend developer': 'Backend',
  'backend engineer': 'Backend',
  'python backend developer': 'Backend',
  'java backend developer': 'Backend',
  'node.js developer': 'Backend',
  'api developer': 'Backend',
  'django developer': 'Backend',
  'fastapi developer': 'Backend',
  'junior backend developer': 'Backend',

  'full stack developer': 'Full Stack',
  'full stack engineer': 'Full Stack',
  'mern stack developer': 'Full Stack',
  'mean stack developer': 'Full Stack',
  'next.js full stack developer': 'Full Stack',
  'junior full stack developer': 'Full Stack',

  'software engineer': 'Software Development',
  'associate software engineer': 'Software Development',
  'junior software engineer': 'Software Development',
  'software developer': 'Software Development',

  'data analyst': 'Data',
  'junior data analyst': 'Data',
  'business data analyst': 'Data',
  'bi analyst': 'Data',
  'product data analyst': 'Data',

  'data scientist': 'AI/ML',
  'machine learning engineer': 'AI/ML',
  'ml engineer': 'AI/ML',
  'ai engineer': 'AI/ML',
  'nlp engineer': 'AI/ML',
  'junior machine learning engineer': 'AI/ML',

  'devops engineer': 'DevOps',
  'junior devops engineer': 'DevOps',
  'cloud engineer': 'DevOps',
  'site reliability engineer': 'DevOps',

  'java developer': 'Java',
  'spring boot developer': 'Java',
  'junior java developer': 'Java',

  'python developer': 'Python',
  'automation developer': 'Python',

  'ui/ux designer': 'UI/UX',
  'product designer': 'UI/UX',
  'ux designer': 'UI/UX',
  'ui designer': 'UI/UX',

  'qa engineer': 'Testing',
  'quality assurance engineer': 'Testing',
  'software testing engineer': 'Testing',
}

/**
 * Get canonical role family for a target role
 */
export function getRoleFamily(targetRole: string): RoleFamily {
  const normalized = targetRole.trim().toLowerCase()
  if (roleFamilyMap[normalized]) return roleFamilyMap[normalized]
  if (normalized.includes('full stack') || normalized.includes('mern') || normalized.includes('mean')) return 'Full Stack'
  if (normalized.includes('front') || normalized.includes('react') || normalized.includes('vue') || normalized.includes('angular')) return 'Frontend'
  if (normalized.includes('back') || normalized.includes('api') || normalized.includes('server')) return 'Backend'
  if (normalized.includes('data analyst') || normalized.includes('business intelligence')) return 'Data'
  if (normalized.includes('data scientist') || normalized.includes('machine learning') || normalized.includes('ai') || normalized.includes('nlp')) return 'AI/ML'
  if (normalized.includes('devops') || normalized.includes('site reliability')) return 'DevOps'
  if (normalized.includes('cloud')) return 'Cloud'
  if (normalized.includes('cyber') || normalized.includes('security')) return 'Cybersecurity'
  if (normalized.includes('java')) return 'Java'
  if (normalized.includes('python')) return 'Python'
  if (normalized.includes('test') || normalized.includes('qa')) return 'Testing'
  if (normalized.includes('design') || normalized.includes('ux') || normalized.includes('ui')) return 'UI/UX'
  return 'Software Development'
}

/**
 * Normalize role name for consistent comparison
 */
export function normalizeRole(role: string): string {
  return role.trim().toLowerCase()
}

/**
 * Check if a job title is relevant to a target role
 */
export function isJobRelevantToRole(jobTitle: string, targetRole: string): boolean {
  const jobTitleLower = jobTitle.toLowerCase()
  const targetRoleLower = normalizeRole(targetRole)
  const sourceFamily = getRoleFamily(targetRole)
  const jobFamily = detectRoleFamilyFromTitle(jobTitleLower)

  return sourceFamily === jobFamily || jobTitleLower.includes(targetRoleLower)
}

export function getRoleTier(jobTitle: string, targetRole: string): 'exact' | 'adjacent' | 'growth' | 'other' {
  const targetFamily = getRoleFamily(targetRole)
  const jobFamily = detectRoleFamilyFromTitle(jobTitle.toLowerCase())
  if (targetFamily === jobFamily) return 'exact'
  const adjacentFamilies: Record<RoleFamily, RoleFamily[]> = {
    Frontend: ['Full Stack', 'UI/UX'], Backend: ['Full Stack', 'DevOps', 'Java', 'Python'],
    'Full Stack': ['Frontend', 'Backend'], Data: ['AI/ML'], 'AI/ML': ['Data'],
    DevOps: ['Cloud', 'Backend'], Java: ['Backend'], Python: ['Backend', 'AI/ML'],
    Testing: ['Frontend', 'Backend'], 'UI/UX': ['Frontend'], 'Software Development': ['Frontend', 'Backend', 'Full Stack'], Cloud: ['DevOps'], Cybersecurity: [],
  }
  if (adjacentFamilies[targetFamily]?.includes(jobFamily)) return 'adjacent'
  return 'growth'
}

/**
 * Detect role family from job title
 */
function detectRoleFamilyFromTitle(jobTitle: string): RoleFamily {
  if (jobTitle.includes('frontend') || jobTitle.includes('react') || jobTitle.includes('vue') || jobTitle.includes('angular') || jobTitle.includes('ui'))
    return 'Frontend'
  if (jobTitle.includes('backend') || jobTitle.includes('api') || jobTitle.includes('server'))
    return 'Backend'
  if (jobTitle.includes('full stack'))
    return 'Full Stack'
  if (jobTitle.includes('data scientist') || jobTitle.includes('machine learning') || jobTitle.includes('ml') || jobTitle.includes('ai') || jobTitle.includes('nlp'))
    return 'AI/ML'
  if (jobTitle.includes('data analyst') || jobTitle.includes('bi analyst'))
    return 'Data'
  if (jobTitle.includes('devops') || jobTitle.includes('cloud') || jobTitle.includes('reliability'))
    return 'DevOps'
  if (jobTitle.includes('java'))
    return 'Java'
  if (jobTitle.includes('python'))
    return 'Python'
  if (jobTitle.includes('qa') || jobTitle.includes('testing'))
    return 'Testing'
  if (jobTitle.includes('ui') || jobTitle.includes('ux') || jobTitle.includes('designer'))
    return 'UI/UX'
  return 'Software Development'
}

/**
 * Get all variations/aliases for a target role
 */
export function getRoleAliases(targetRole: string): string[] {
  const family = getRoleFamily(targetRole)
  return Object.keys(roleFamilyMap).filter(key => roleFamilyMap[key] === family)
}
