export type ResumeProject = {
  title: string
  description: string
  technologies: string[]
}

export type ResumeEducation = {
  degree: string
  institution: string
  year?: string
  score?: string
}

export type ResumeExperience = {
  role?: string
  company?: string
  duration?: string
  description: string
  responsibilities: string[]
}

export type ResumeSections = {
  skills: string
  education: string
  experience: string
  projects: string
}

export type ParsedResume = {
  skills: string[]
  technicalSkills: string[]
  skillEvidence: Array<{ name: string; category: string; confidence: number; evidence: string }>
  projects: ResumeProject[]
  education: ResumeEducation[]
  experience: ResumeExperience[]
  sections: ResumeSections
}

const KNOWN_SKILLS = [
  'Python',
  'Pandas',
  'NumPy',
  'Scikit-learn',
  'MySQL',
  'VS Code',
  'Jupyter Notebook',
  'Google Colab',
  'React',
  'JavaScript',
  'TypeScript',
  'Node.js',
  'SQL',
  'PostgreSQL',
  'MongoDB',
  'Tailwind',
  'Git',
  'GitHub',
  'Docker',
  'AWS',
  'Linux',
  'Java',
  'C++',
  'HTML',
  'CSS',
  'Machine Learning',
  'Power BI',
  'Data Structures',
  'System Design',
  'Artificial Intelligence',
  'Data Science',
  'Data Preprocessing',
  'Feature Engineering',
  'Model Evaluation',
  'Classification',
  'Regression',
  'Matplotlib',
  'Seaborn',
  'Excel',
  'Statistics',
  'Linear Algebra',
  'Algorithms',
  'Problem Solving',
  'Testing',
  'Authentication',
  'MLOps',
  'PyTorch',
  'TensorFlow',
]

const SKILL_ALIASES: Record<string, string> = {
  js: 'JavaScript',
  ts: 'TypeScript',
  reactjs: 'React',
  'react.js': 'React',
  node: 'Node.js',
  nodejs: 'Node.js',
  mongo: 'MongoDB',
  postgres: 'PostgreSQL',
  'my sql': 'MySQL',
  ml: 'Machine Learning',
  ai: 'Artificial Intelligence',
}

const headingAliases = {
  skills: ['skills', 'technical skills', 'tech stack', 'tools', 'technology', 'technologies'],
  projects: ['projects', 'project work', 'portfolio', 'work samples'],
  education: ['education', 'education & qualifications', 'qualifications', 'academic background'],
  experience: ['experience', 'work experience', 'professional experience', 'internships', 'career experience'],
}

const isHeadingLine = (line: string, aliases: string[]) => {
  const normalized = line.toLowerCase().replace(/[^a-z0-9\s&-]/g, ' ').replace(/\s+/g, ' ').trim()
  return aliases.some((alias) => normalized === alias || normalized.includes(alias))
}

const normalizeText = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .trim()

const normalizeSkill = (value: string) =>
  value
    .trim()
    .replace(/^[•●▪◦*-]\s*/, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const canonicalSkillKey = (value: string) => normalizeSkill(value).toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim()

const canonicalSkill = (value: string) => {
  const key = canonicalSkillKey(value)
  const alias = SKILL_ALIASES[key]
  return alias ?? KNOWN_SKILLS.find((skill) => canonicalSkillKey(skill) === key) ?? null
}

const skillCategory = (skill: string) => {
  if (/^(python|java|javascript|typescript|c\+\+|sql)$/.test(canonicalSkillKey(skill))) return 'programming_language'
  if (/^(react|node|tailwind|fastapi|django|spring boot)$/.test(canonicalSkillKey(skill))) return 'framework'
  if (/^(pandas|numpy|scikit learn|matplotlib|seaborn|tensorflow|pytorch)$/.test(canonicalSkillKey(skill))) return 'library'
  if (/^(mysql|postgresql|mongodb|databases)$/.test(canonicalSkillKey(skill))) return 'database'
  if (/^(git|github|vs code|jupyter notebook|google colab|docker|aws|linux|excel)$/.test(canonicalSkillKey(skill))) return 'tool'
  if (/^(machine learning|artificial intelligence|data science|statistics|linear algebra|data structures|algorithms|problem solving|feature engineering|model evaluation|classification|regression|mlops)$/.test(canonicalSkillKey(skill))) return 'professional_skill'
  return 'technology'
}

const dedupe = (values: string[]) => {
  const seen = new Set<string>()
  const output: string[] = []

  for (const value of values) {
    const cleaned = normalizeText(value)
    if (!cleaned || seen.has(cleaned.toLowerCase())) continue
    seen.add(cleaned.toLowerCase())
    output.push(cleaned)
  }

  return output
}

export const sanitizeSkillList = (values: unknown): string[] => {
  if (!Array.isArray(values)) return []
  const canonical = values.flatMap((value) => {
    if (typeof value !== 'string') return []
    const skill = canonicalSkill(value)
    return skill ? [skill] : []
  })
  return dedupe(canonical)
}

const extractSkillEvidence = (source: string, evidence = 'Resume content') => {
  const text = source || ''
  const lowerText = text.toLowerCase()
  const matches = KNOWN_SKILLS.flatMap((skill) => {
    const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[^a-z0-9+#])${escaped}(?=$|[^a-z0-9+#])`, 'i').test(lowerText)
      ? [{ name: skill, category: skillCategory(skill), confidence: evidence.includes('Skills') ? 0.98 : 0.88, evidence }]
      : []
  })
  return matches
}

const extractSkills = (source: string, evidence?: string): string[] => sanitizeSkillList(extractSkillEvidence(source, evidence).map((item) => item.name))

const extractSections = (text: string) => {
  const lines = text.split(/\r?\n/)
  const sections: Record<string, string[]> = {
    skills: [],
    projects: [],
    education: [],
    experience: [],
  }

  let current: keyof typeof sections | 'general' = 'general'

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (isHeadingLine(line, headingAliases.skills)) {
      current = 'skills'
      continue
    }
    if (isHeadingLine(line, headingAliases.projects)) {
      current = 'projects'
      continue
    }
    if (isHeadingLine(line, headingAliases.education)) {
      current = 'education'
      continue
    }
    if (isHeadingLine(line, headingAliases.experience)) {
      current = 'experience'
      continue
    }

    if (current !== 'general') {
      sections[current].push(line)
    }
  }

  return {
    skills: sections.skills.join('\n'),
    projects: sections.projects.join('\n'),
    education: sections.education.join('\n'),
    experience: sections.experience.join('\n'),
  }
}

const extractProjects = (source: string): ResumeProject[] => {
  const raw = source.trim()
  if (!raw) return []

  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return []

  const projects: ResumeProject[] = []
  let index = -1

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const numberedMatch = line.match(/^\d+[.)-]?\s*(.+)$/)
    const titleCandidate = numberedMatch ? numberedMatch[1] : line

    if (!titleCandidate || /^(skills|education|experience)$/i.test(titleCandidate)) {
      continue
    }

    const looksLikeProject = /project|system|app|portal|dashboard|analysis|platform|website|application|tool|model/i.test(titleCandidate)
    if (looksLikeProject || numberedMatch || /^[-•*]/.test(line) || i === 0) {
      const title = titleCandidate.replace(/^[-•*]\s*/, '').trim()
      const descriptionParts: string[] = []

      for (let j = i + 1; j < lines.length; j += 1) {
        const nextLine = lines[j]
        if (/^\d+[.)-]?\s*/.test(nextLine) || isHeadingLine(nextLine, Object.values(headingAliases).flat())) {
          break
        }
        descriptionParts.push(nextLine)
      }

      const description = descriptionParts.join(' ')
      const technologies = extractSkills(description + ' ' + title)

      projects.push({
        title,
        description: description || 'Project details provided in the resume.',
        technologies,
      })

      index = i
      i = Math.max(i, index)
    }
  }

  return projects
}

const extractEducation = (source: string): ResumeEducation[] => {
  const raw = source.trim()
  if (!raw) return []

  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const entries: ResumeEducation[] = []

  for (const line of lines) {
    const cleaned = line.replace(/^[-•*]\s*/, '')
    const degreeMatch = cleaned.match(/((?:B\.Tech|BTech|B\.E|Bachelor|M\.Tech|MTech|Master|Diploma|MBA|BSc|MSc)[^,\n]+)/i)
    if (!degreeMatch) continue

    const degree = degreeMatch[1].trim()
    const remaining = cleaned.replace(degreeMatch[1], '').replace(/^\s*[,\-–:]\s*/, '')
    const institutionMatch = remaining.match(/^([^,\n]+)(?:,\s*(.*))?$/i)
    const institution = institutionMatch ? institutionMatch[1].trim() : ''
    const rest = institutionMatch?.[2] ?? ''
    const yearMatch = rest.match(/(?:Expected Graduation|Graduation|Year|Class of)\s*(\d{4})/i) || rest.match(/\b(19|20)\d{2}\b/)
    const year = yearMatch ? yearMatch[1] : undefined
    const scoreMatch = rest.match(/(CGPA|GPA|Percentage|Score)\s*[:\-]?\s*([0-9.]+(?:\s*%|\/10)?)?/i)
    const score = scoreMatch?.[2] ? scoreMatch[2].trim() : undefined

    entries.push({ degree, institution, year, score })
  }

  return entries
}

const extractExperience = (source: string): ResumeExperience[] => {
  const raw = source.trim()
  if (!raw) return []

  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return []

  const items: ResumeExperience[] = []
  let current: ResumeExperience | null = null

  const roleKeywords = /(intern|developer|engineer|analyst|designer|scientist|associate|manager|trainee|student)/i

  for (const line of lines) {
    if (isHeadingLine(line, headingAliases.experience)) continue

    if (/^[•●▪◦*-]/.test(line)) {
      const value = line.replace(/^[•●▪◦*-]\s*/, '').trim()
      if (current) current.responsibilities.push(value)
      continue
    }

    if (roleKeywords.test(line) && line.length < 120) {
      if (current) {
        current.description = current.responsibilities.join(' ')
        items.push(current)
      }

      current = {
        role: line,
        company: '',
        duration: '',
        description: '',
        responsibilities: [],
      }
      continue
    }

    if (current && !current.company && line.length < 120) {
      current.company = line
      continue
    }

    if (current) {
      current.responsibilities.push(line)
    }
  }

  if (current) {
    current.description = current.responsibilities.join(' ')
    items.push(current)
  }

  return items
}

export function parseResumeText(text: string): ParsedResume {
  const cleaned = text?.trim() ?? ''

  if (!cleaned) {
    return {
      skills: [],
      technicalSkills: [],
      skillEvidence: [],
      projects: [],
      education: [],
      experience: [],
      sections: {
        skills: '',
        education: '',
        experience: '',
        projects: '',
      },
    }
  }

  const sections = extractSections(cleaned)

  const evidence = [
    ...extractSkillEvidence(sections.skills, 'Technical Skills section'),
    ...extractSkillEvidence(sections.projects, 'Project technologies'),
    ...extractSkillEvidence(sections.experience, 'Work experience'),
  ]
  if (!evidence.length) evidence.push(...extractSkillEvidence(cleaned))
  const skillEvidence = evidence.filter((item, index, values) => values.findIndex((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase()) === index)
  const skills = dedupe(skillEvidence.filter((item) => item.confidence >= 0.8).map((item) => item.name))
  const technicalSkills = [...skills]
  const projects = extractProjects(sections.projects || cleaned)
  const education = extractEducation(sections.education || cleaned)
  const experience = extractExperience(sections.experience || cleaned)

  return {
    skills,
    technicalSkills,
    skillEvidence,
    projects,
    education,
    experience,
    sections: {
      skills: sections.skills,
      education: sections.education,
      experience: sections.experience,
      projects: sections.projects,
    },
  }
}
