import { normalizeSkillGapAnalysisResponse } from '../server/services/aiService.ts'

const base = {
  readiness_score: 72,
  matched_skills: [{ skill: 'TypeScript', category: 'Programming', current_level: 80, reason: 'Resume evidence' }],
  partial_skills: [],
  missing_skills: [],
  recommended_skills: [],
  skill_gaps: [],
  learning_sequence: [],
  skill_categories: {},
  technical_skill_coverage: 72,
  high_priority_gap_count: 0,
  medium_priority_gap_count: 0,
  low_priority_gap_count: 0,
}

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message)
}

const valid = normalizeSkillGapAnalysisResponse(JSON.stringify(base))
assert(valid.readiness_score === 72 && Array.isArray(valid.missing_skills), 'valid JSON failed')

const fenced = normalizeSkillGapAnalysisResponse(`\`\`\`json\n${JSON.stringify(base)}\n\`\`\``)
assert(fenced.learning_sequence.length === 0, 'fenced JSON failed')

const camel = normalizeSkillGapAnalysisResponse(JSON.stringify({ readinessScore: 72, matchedSkills: base.matched_skills, partialSkills: [], missingSkills: [], recommendedSkills: [], skillGaps: [], learningSequence: [], skillCategories: {}, technicalSkillCoverage: 72 }))
assert(camel.readiness_score === 72 && camel.matched_skills.length === 1, 'camelCase normalization failed')

const missingArrays = normalizeSkillGapAnalysisResponse(JSON.stringify({ readiness_score: 50, technical_skill_coverage: 50 }))
assert(missingArrays.missing_skills.length === 0 && missingArrays.recommended_skills.length === 0, 'optional array defaults failed')

const runtimeShape = normalizeSkillGapAnalysisResponse(JSON.stringify({
  readinessScore: 68,
  matchedSkills: ['Python', { skill: 'SQL', currentLevel: 75, reason: 'Resume evidence' }],
  partialSkills: [{ skill: 'REST API', currentLevel: 40, targetLevel: 80, priority: 'High', reason: 'Required for backend delivery', recommendedAction: 'Build a versioned API', estimatedLearningTime: '2 weeks', resources: ['HTTP', 'OpenAPI'] }],
  missingSkills: ['FastAPI'],
  recommendedSkills: [{ skill: 'Docker' }, 'Testing'],
  skillGaps: [{ skill: 'Django', currentLevel: 0, targetLevel: 70, priority: 'Medium', reason: 'Role requirement' }],
  learningSequence: [{ step: 1, title: 'REST API', description: 'Learn API design' }],
  skillCategories: { Python: ['Syntax', 'OOP'], SQL: ['Queries'], 'REST API': ['HTTP'] },
  technicalSkillCoverage: 64,
}))
assert(runtimeShape.matched_skills[0]?.skill === 'Python' && runtimeShape.missing_skills[0]?.skill === 'FastAPI', 'runtime response shape normalization failed')
assert(runtimeShape.skill_categories.Python.length === 2 && runtimeShape.learning_sequence[0]?.title === 'REST API', 'category or sequence normalization failed')

let malformed = false
try { normalizeSkillGapAnalysisResponse('{not-json}') } catch { malformed = true }
assert(malformed, 'malformed response should fail')

console.log('Skill Gap response validation checks passed.')