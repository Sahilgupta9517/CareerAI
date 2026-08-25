export type SkillGapStatus = 'Strong' | 'Improving' | 'Missing'
export type SkillGapPriority = 'High' | 'Medium' | 'Low'
export type SkillGapClassification = 'MATCHED' | 'PARTIAL' | 'MISSING'

export interface RoleRequirements {
  id: string
  title: string
  requiredSkills: string[]
  preferredSkills: string[]
}

export interface UserSkill {
  name: string
  proficiency?: number
}

export interface SkillComparison {
  skill: string
  requirement: 'Required' | 'Preferred'
  status: SkillGapStatus
  classification: SkillGapClassification
  priority?: SkillGapPriority
  proficiency?: number
  weight: number
  reason: string
  learningAction: string
  estimatedDifficulty: 'Beginner' | 'Intermediate' | 'Advanced'
}

export type SkillGapCategory = 'Programming' | 'Frontend' | 'Backend' | 'Database' | 'Cloud/DevOps' | 'AI/ML' | 'Data' | 'Tools' | 'Soft Skills' | 'Other'

export interface SkillGapItem {
  skill: string
  category: SkillGapCategory
  current_level: number
  target_level: number
  gap_percentage: number
  priority: SkillGapPriority
  reason: string
  recommended_action: string
  estimated_learning_time: string
  resources: string[]
}

export interface SkillGapAnalysis {
  readiness_score: number
  matched_skills: Array<{ skill: string; category: SkillGapCategory; current_level: number; reason: string }>
  partial_skills: SkillGapItem[]
  missing_skills: SkillGapItem[]
  recommended_skills: string[]
  skill_gaps: string[]
  skill_categories: Record<string, string[]>
  technical_skill_coverage: number
  high_priority_gap_count: number
  medium_priority_gap_count: number
  low_priority_gap_count: number
  learning_sequence: Array<{ step: number; title: string; description: string }>
}
