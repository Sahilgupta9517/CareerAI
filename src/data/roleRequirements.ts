import type { RoleRequirements } from '@/types/skillGap'

export const roleRequirements: RoleRequirements[] = [
  { id: 'frontend-developer', title: 'Frontend Developer', requiredSkills: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Git'], preferredSkills: ['REST API', 'Testing', 'Responsive Design'] },
  { id: 'backend-developer', title: 'Backend Developer', requiredSkills: ['Python', 'JavaScript', 'Node.js', 'REST API', 'SQL', 'Databases', 'Git'], preferredSkills: ['Authentication', 'Docker', 'Testing', 'System Design'] },
  { id: 'full-stack-developer', title: 'Full Stack Developer', requiredSkills: ['JavaScript', 'React', 'Node.js', 'SQL', 'REST API', 'Git'], preferredSkills: ['TypeScript', 'Docker', 'Testing', 'System Design'] },
  { id: 'python-developer', title: 'Python Developer', requiredSkills: ['Python', 'SQL', 'Git', 'REST API'], preferredSkills: ['FastAPI', 'Django', 'PostgreSQL', 'Testing'] },
  { id: 'java-developer', title: 'Java Developer', requiredSkills: ['Java', 'SQL', 'Git', 'Object-Oriented Programming', 'REST API'], preferredSkills: ['Spring Boot', 'Databases', 'Testing', 'Docker'] },
  { id: 'data-analyst', title: 'Data Analyst', requiredSkills: ['SQL', 'Python', 'Pandas', 'NumPy', 'Data Visualization'], preferredSkills: ['Excel', 'Statistics', 'Jupyter Notebook'] },
  { id: 'data-scientist', title: 'Data Scientist', requiredSkills: ['Python', 'SQL', 'Statistics', 'Pandas', 'NumPy', 'Machine Learning'], preferredSkills: ['Scikit-learn', 'Data Visualization', 'Jupyter Notebook'] },
  { id: 'ai-ml-engineer', title: 'AI/ML Engineer', requiredSkills: ['Python', 'Linear Algebra', 'Statistics', 'Machine Learning', 'Data Structures'], preferredSkills: ['TensorFlow', 'PyTorch', 'Scikit-learn', 'MLOps'] },
  { id: 'software-engineer', title: 'Software Engineer', requiredSkills: ['Programming', 'Data Structures', 'Algorithms', 'SQL', 'Git', 'Problem Solving'], preferredSkills: ['REST API', 'Testing', 'System Design', 'Docker'] },
]
