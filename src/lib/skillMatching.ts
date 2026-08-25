import { normalizeSkill } from '@/lib/jobMatching'
import type { RoleRequirements, SkillComparison, UserSkill } from '@/types/skillGap'

const findUserSkill = (skills: UserSkill[], required: string) => skills.find((skill) => normalizeSkill(skill.name) === normalizeSkill(required))
const skillDetails: Record<string, { reason: string; action: string; difficulty: 'Beginner' | 'Intermediate' | 'Advanced' }> = {
  'rest api': { reason: 'Role services depend on reliable API contracts and integration.', action: 'Build and document a versioned CRUD API with validation and error handling.', difficulty: 'Intermediate' },
  testing: { reason: 'Testing protects production behavior and makes changes safer.', action: 'Add unit, integration, and regression tests to a current project.', difficulty: 'Intermediate' },
  docker: { reason: 'Containers make development and deployment reproducible.', action: 'Containerize a project and run it with environment-based configuration.', difficulty: 'Intermediate' },
  'system design': { reason: 'System thinking is required to reason about scale and reliability.', action: 'Practice designing a service with storage, caching, failure handling, and observability.', difficulty: 'Advanced' },
}

const detailsFor = (skill: string, requirement: 'Required' | 'Preferred') => skillDetails[normalizeSkill(skill)] ?? {
  reason: `${skill} is ${requirement.toLowerCase()} for the target role and supports day-to-day delivery.`,
  action: `Learn the fundamentals of ${skill} and apply them in a small role-relevant project.`,
  difficulty: requirement === 'Required' ? 'Intermediate' as const : 'Beginner' as const,
}

export const getMatchedSkills = (role: RoleRequirements, userSkills: UserSkill[]) => role.requiredSkills.filter((skill) => findUserSkill(userSkills, skill))
export const getMissingSkills = (role: RoleRequirements, userSkills: UserSkill[]) => role.requiredSkills.filter((skill) => !findUserSkill(userSkills, skill))
export const calculateRoleReadiness = (role: RoleRequirements, userSkills: UserSkill[]) => {
  if (!role.requiredSkills.length) return 0
  const score = role.requiredSkills.reduce((total, skill) => {
    const userSkill = findUserSkill(userSkills, skill)
    return total + (userSkill ? userSkill.proficiency !== undefined && userSkill.proficiency < 70 ? 0.5 : 1 : 0)
  }, 0)
  return Math.round((score / role.requiredSkills.length) * 100)
}

export const getSkillPriority = (requirement: 'Required' | 'Preferred') => requirement === 'Required' ? 'High' as const : 'Medium' as const

export const compareRoleSkills = (role: RoleRequirements, userSkills: UserSkill[]): SkillComparison[] => [
  ...role.requiredSkills.map((skill) => {
    const userSkill = findUserSkill(userSkills, skill)
    const classification = !userSkill ? 'MISSING' as const : userSkill.proficiency !== undefined && userSkill.proficiency < 70 ? 'PARTIAL' as const : 'MATCHED' as const
    const details = detailsFor(skill, 'Required')
    return { skill, requirement: 'Required' as const, status: classification === 'MATCHED' ? 'Strong' as const : classification === 'PARTIAL' ? 'Improving' as const : 'Missing' as const, classification, ...(userSkill?.proficiency !== undefined ? { proficiency: userSkill.proficiency } : {}), weight: 1, ...(classification !== 'MATCHED' ? { priority: classification === 'MISSING' ? 'High' as const : 'Medium' as const } : {}), reason: details.reason, learningAction: details.action, estimatedDifficulty: details.difficulty }
  }),
  ...role.preferredSkills.map((skill) => {
    const userSkill = findUserSkill(userSkills, skill)
    const classification = !userSkill ? 'MISSING' as const : userSkill.proficiency !== undefined && userSkill.proficiency < 70 ? 'PARTIAL' as const : 'MATCHED' as const
    const details = detailsFor(skill, 'Preferred')
    return { skill, requirement: 'Preferred' as const, status: classification === 'MATCHED' ? 'Strong' as const : classification === 'PARTIAL' ? 'Improving' as const : 'Missing' as const, classification, ...(userSkill?.proficiency !== undefined ? { proficiency: userSkill.proficiency } : {}), weight: 0.5, ...(classification !== 'MATCHED' ? { priority: classification === 'PARTIAL' ? 'Low' as const : 'Medium' as const } : {}), reason: details.reason, learningAction: details.action, estimatedDifficulty: details.difficulty }
  }),
]
