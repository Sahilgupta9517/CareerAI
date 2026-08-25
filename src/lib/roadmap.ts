import type { RoleRequirements, SkillComparison, UserSkill } from '@/types/skillGap'
import { compareRoleSkills } from '@/lib/skillMatching'

export type RoadmapPhaseName = 'Phase 1 - Foundation' | 'Phase 2 - Core Skills' | 'Phase 3 - Advanced Skills' | 'Phase 4 - Projects & Practice' | 'Phase 5 - Interview & Job Readiness'
export type RoadmapStatus = 'Not Started' | 'In Progress' | 'Completed'

export interface RoadmapItem {
  id: string
  skill: string
  phase: RoadmapPhaseName
  why: string
  outcome: string
  task: string
  duration: string
  status: RoadmapStatus
  requirement: 'Required' | 'Preferred' | 'Practice'
  priority: 'High' | 'Medium' | 'Low'
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  prerequisites: string[]
  comparison?: SkillComparison
}

export interface RoadmapPhase {
  name: RoadmapPhaseName
  description: string
  items: RoadmapItem[]
}

const phaseNames: RoadmapPhaseName[] = ['Phase 1 - Foundation', 'Phase 2 - Core Skills', 'Phase 3 - Advanced Skills', 'Phase 4 - Projects & Practice', 'Phase 5 - Interview & Job Readiness']
const phaseDescriptions: Record<RoadmapPhaseName, string> = {
  'Phase 1 - Foundation': 'Build the fundamentals needed to work confidently in the target role.',
  'Phase 2 - Core Skills': 'Strengthen the role-specific skills that appear in everyday work.',
  'Phase 3 - Advanced Skills': 'Extend your toolkit with preferred skills and deeper practice.',
  'Phase 4 - Projects & Practice': 'Turn important gaps into demonstrable, portfolio-ready work.',
  'Phase 5 - Interview & Job Readiness': 'Practice explaining your work and applying the skills in realistic scenarios.',
}

const learningDetails = (skill: string) => {
  const name = skill.toLowerCase()
  if (name.includes('sql')) return ['Write reliable joins, aggregations, and subqueries.', 'Build a small reporting database with queries and documented assumptions.', 'Create a schema and answer five business questions with SQL.', '2-3 weeks']
  if (name.includes('react')) return ['Compose reusable components and manage UI state clearly.', 'Build a production-style React application with accessible states.', 'Create a dashboard with reusable components and responsive layouts.', '2-3 weeks']
  if (name.includes('javascript')) return ['Use modern JavaScript, async flows, modules, and testing patterns.', 'Ship a small browser feature with clear error and loading states.', 'Build an interactive application using modules and an API boundary.', '2 weeks']
  if (name.includes('python')) return ['Write maintainable Python with functions, modules, and tests.', 'Automate a useful workflow or service task with documented code.', 'Build a tested Python utility that reads input and produces a useful result.', '2 weeks']
  if (name.includes('data')) return ['Apply structured problem-solving patterns to common data tasks.', 'Explain trade-offs and validate results with small examples.', 'Solve a set of representative problems and record your reasoning.', '2 weeks']
  if (name.includes('git')) return ['Use branches, commits, reviews, and recovery workflows.', 'Maintain a clean public repository with meaningful history.', 'Use a feature branch, pull request, and release tag on a project.', '1 week']
  if (name.includes('rest')) return ['Design clear resources, status codes, and error responses.', 'Connect a client to a documented service endpoint.', 'Add a REST API to one portfolio project and document it.', '1-2 weeks']
  return [`Learn the core concepts and vocabulary of ${skill}.`, `Apply ${skill} in a small role-relevant exercise.`, `Build a focused ${skill} exercise and explain the implementation.`, '1-2 weeks']
}

const phaseFor = (comparison: SkillComparison): RoadmapPhaseName => {
  if (comparison.status === 'Missing' && comparison.requirement === 'Required') return 'Phase 1 - Foundation'
  if (comparison.status === 'Improving' || comparison.requirement === 'Required') return 'Phase 2 - Core Skills'
  return 'Phase 3 - Advanced Skills'
}

const projectFor = (skill: string, role: string) => {
  const normalized = skill.toLowerCase()
  if (normalized.includes('sql')) return `Build a database-backed ${role} project with a schema, queries, and README.`
  if (normalized.includes('react') || normalized.includes('javascript')) return `Build a responsive ${role} dashboard using ${skill} and document the key decisions.`
  if (normalized.includes('python') || normalized.includes('pandas') || normalized.includes('scikit')) return `Build a ${role} data project using ${skill}, with a reproducible README and results.`
  return `Build a small ${role} project that demonstrates ${skill} and includes tests or usage notes.`
}

export const generateRoadmap = (role: RoleRequirements, userSkills: UserSkill[]): RoadmapPhase[] => {
  const comparisons = compareRoleSkills(role, userSkills)
  const learningItems = comparisons.filter((comparison) => comparison.status !== 'Strong').map((comparison): RoadmapItem => {
    const [outcome, task, , duration] = learningDetails(comparison.skill)
    return { id: `${role.id}-${comparison.requirement.toLowerCase()}-${comparison.skill.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, skill: comparison.skill, phase: phaseFor(comparison), why: comparison.reason, outcome, task: comparison.learningAction || task, duration, status: 'Not Started', requirement: comparison.requirement, priority: comparison.priority ?? (comparison.requirement === 'Required' ? 'High' : 'Medium'), difficulty: comparison.estimatedDifficulty, prerequisites: comparison.skill === 'REST API' ? ['Programming fundamentals'] : [], comparison }
  })
  const projectItems = comparisons.filter((comparison) => comparison.status !== 'Strong').slice(0, 4).map((comparison): RoadmapItem => ({
    id: `${role.id}-project-${comparison.skill.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    skill: comparison.skill,
    phase: 'Phase 4 - Projects & Practice',
    why: `A project makes ${comparison.skill} visible in your ${role.title} portfolio.`,
    outcome: `Demonstrate ${comparison.skill} through a complete, reviewable deliverable.`,
    task: projectFor(comparison.skill, role.title),
    duration: '2-4 weeks',
    status: 'Not Started',
    requirement: 'Practice',
    priority: comparison.priority ?? 'Medium',
    difficulty: 'Intermediate',
    prerequisites: [comparison.skill],
    comparison,
  }))
  const readinessItems: RoadmapItem[] = [
    { id: `${role.id}-interview-explanation`, skill: 'Role explanation', phase: 'Phase 5 - Interview & Job Readiness', why: `Explain how your skills support ${role.title} work.`, outcome: 'Give a clear walkthrough of one project and its trade-offs.', task: `Practice a five-minute walkthrough of your strongest ${role.title} project.`, duration: '1 week', status: 'Not Started', requirement: 'Practice', priority: 'Medium', difficulty: 'Intermediate', prerequisites: ['One completed project'] },
    { id: `${role.id}-readiness-review`, skill: 'Readiness review', phase: 'Phase 5 - Interview & Job Readiness', why: 'Check that your evidence matches the role requirements.', outcome: 'Identify remaining gaps before applying.', task: `Review each ${role.title} requirement and link it to a project, exercise, or study note.`, duration: '1 week', status: 'Not Started', requirement: 'Practice', priority: 'Low', difficulty: 'Beginner', prerequisites: [] },
  ]
  return phaseNames.map((name) => ({ name, description: phaseDescriptions[name], items: [...learningItems, ...projectItems, ...readinessItems].filter((item) => item.phase === name) }))
}
