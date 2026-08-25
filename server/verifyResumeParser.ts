import { parseResumeText } from '../src/lib/resumeParser.ts'

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message)
}

const parsed = parseResumeText(`
Jane Doe
SKILLS & TECHNOLOGIES
Python, Pandas, NumPy, Scikit-learn, MySQL, VS Code, Jupyter Notebook, Google Colab
PROJECTS
1. Student Performance Prediction System
Built a prediction system using Python, Pandas, NumPy and Scikit-learn.
EDUCATION & QUALIFICATIONS
B.Tech Computer Science Engineering, AKTU University, Expected Graduation 2028
`)

assert(parsed.skills.includes('Python'), 'expected Python skill')
assert(parsed.skills.includes('Pandas'), 'expected Pandas skill')
assert(parsed.skills.includes('NumPy'), 'expected NumPy skill')
assert(parsed.skills.includes('Scikit-learn'), 'expected Scikit-learn skill')
assert(parsed.skills.includes('MySQL'), 'expected MySQL skill')
assert(parsed.skills.includes('VS Code'), 'expected VS Code skill')
assert(parsed.skills.includes('Jupyter Notebook'), 'expected Jupyter Notebook skill')
assert(parsed.skills.includes('Google Colab'), 'expected Google Colab skill')
assert(parsed.projects[0]?.title === 'Student Performance Prediction System', 'expected project title')
assert(parsed.projects[0]?.technologies.includes('Python'), 'expected project technology')
assert(parsed.education[0]?.degree.includes('B.Tech'), 'expected degree')
assert(parsed.education[0]?.institution.includes('AKTU University'), 'expected institution')
assert(parsed.education[0]?.year === '2028', 'expected graduation year')
for (const invalid of ['AKTU University', 'Expected Graduation: 2028', 'Intermediate UP Board', '84.4%', '2024', 'Programming Languages', 'Libraries & Frameworks', 'Databases', 'Web Development', 'Machine Learning Fundamentals', 'Intelligence', 'and Data Science.']) {
  assert(!parsed.skills.includes(invalid), `unexpected polluted skill: ${invalid}`)
}
assert(parsed.skillEvidence.every((skill) => skill.confidence >= 0.8 && skill.evidence), 'expected confidence and evidence for skills')
console.log('resume parser checks passed')
