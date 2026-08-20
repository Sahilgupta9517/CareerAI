export interface Skill {
  name: string
  level: number
  category: 'Programming' | 'Frontend' | 'Backend' | 'Data' | 'Tools' | 'Core CS'
  target: number
}

export interface JobListing {
  id: string
  title: string
  company: string
  logoTone: string
  location: string
  type: 'Full-time' | 'Internship' | 'Contract'
  mode: 'Remote' | 'Hybrid' | 'On-site'
  salary: string
  match: number
  posted: string
  matchedSkills: string[]
  missingSkills: string[]
  description: string
}

export interface RoadmapTask {
  id: string
  title: string
  done: boolean
  hours: number
}

export interface RoadmapWeek {
  id: string
  week: string
  focus: string
  status: 'completed' | 'active' | 'upcoming'
  progress: number
  outcome: string
  tasks: RoadmapTask[]
}

export const student = {
  name: 'Sahil Gupta',
  firstName: 'Sahil',
  initials: 'SG',
  email: 'sahil.gupta@careerai.dev',
  education: 'B.Tech Computer Science Engineering',
  shortEducation: 'B.Tech CSE',
  college: 'Delhi Institute of Technology',
  branch: 'Computer Science Engineering',
  graduationYear: '2026',
  experienceLevel: 'Student / Fresher',
  targetRole: 'Software Developer',
  location: 'Bengaluru, India',
  workPreference: 'Hybrid',
  industry: 'Product & SaaS',
  goal: 'Land a software developer role at a product company within 6 months.',
}

export const metrics = {
  careerReadiness: 78,
  resumeScore: 91,
  skillMatch: 78,
  interviewScore: 76,
  jobMatch: 89,
}

export const skills: Skill[] = [
  { name: 'Python', level: 85, target: 85, category: 'Programming' },
  { name: 'JavaScript', level: 72, target: 85, category: 'Programming' },
  { name: 'React', level: 58, target: 80, category: 'Frontend' },
  { name: 'SQL', level: 42, target: 80, category: 'Data' },
  { name: 'Data Structures', level: 48, target: 85, category: 'Core CS' },
  { name: 'Git', level: 80, target: 80, category: 'Tools' },
  { name: 'Node.js', level: 55, target: 75, category: 'Backend' },
  { name: 'System Design', level: 35, target: 70, category: 'Core CS' },
]

export const skillRadar = [
  { subject: 'Programming', you: 78, role: 85 },
  { subject: 'Frontend', you: 62, role: 80 },
  { subject: 'Backend', you: 55, role: 75 },
  { subject: 'Databases', you: 42, role: 80 },
  { subject: 'DSA', you: 48, role: 85 },
  { subject: 'Tools & Git', you: 80, role: 70 },
]

export const readinessTrend = [
  { week: 'Week 1', readiness: 52, skills: 46 },
  { week: 'Week 2', readiness: 59, skills: 54 },
  { week: 'Week 3', readiness: 65, skills: 61 },
  { week: 'Week 4', readiness: 71, skills: 69 },
  { week: 'Week 5', readiness: 78, skills: 75 },
]

export const activityData = [
  { day: 'Mon', hours: 2.5 },
  { day: 'Tue', hours: 1.8 },
  { day: 'Wed', hours: 3.2 },
  { day: 'Thu', hours: 2.1 },
  { day: 'Fri', hours: 3.8 },
  { day: 'Sat', hours: 4.4 },
  { day: 'Sun', hours: 1.2 },
]

export const recommendedActions = [
  {
    id: 'sql',
    title: 'Complete SQL Module',
    description: 'Joins, aggregations and window functions — the biggest gap in your profile.',
    priority: 'High' as const,
    progress: 35,
    cta: 'Continue Module',
    to: '/roadmap',
    impact: '+9% job match',
  },
  {
    id: 'dsa',
    title: 'Practice 5 DSA Problems',
    description: 'Arrays and hashing set for this week, mapped to your target role.',
    priority: 'High' as const,
    progress: 60,
    cta: 'Start Practice',
    to: '/roadmap',
    impact: '+6% interview score',
  },
  {
    id: 'interview',
    title: 'Take Mock Interview',
    description: 'A technical round focused on JavaScript fundamentals and problem solving.',
    priority: 'Medium' as const,
    progress: 0,
    cta: 'Start Interview',
    to: '/interview',
    impact: '+5% readiness',
  },
  {
    id: 'resume',
    title: 'Improve Resume',
    description: 'Add measurable outcomes to your two strongest projects.',
    priority: 'Low' as const,
    progress: 80,
    cta: 'Open Analyzer',
    to: '/resume',
    impact: '+3% resume score',
  },
]

export const roadmap: RoadmapWeek[] = [
  {
    id: 'w1',
    week: 'Week 1–2',
    focus: 'JavaScript & React Foundations',
    status: 'completed',
    progress: 100,
    outcome: 'Shipped a component-driven dashboard UI',
    tasks: [
      { id: 'w1t1', title: 'JavaScript Advanced — closures, async, modules', done: true, hours: 6 },
      { id: 'w1t2', title: 'React Components & Hooks deep dive', done: true, hours: 8 },
      { id: 'w1t3', title: 'Build a reusable component library', done: true, hours: 5 },
    ],
  },
  {
    id: 'w2',
    week: 'Week 3–4',
    focus: 'SQL & Data Fundamentals',
    status: 'active',
    progress: 45,
    outcome: 'Query a real dataset and ship an analytics API',
    tasks: [
      { id: 'w2t1', title: 'SQL Joins & subqueries', done: true, hours: 4 },
      { id: 'w2t2', title: 'Aggregations and window functions', done: false, hours: 5 },
      { id: 'w2t3', title: 'Database design & normalization', done: false, hours: 4 },
    ],
  },
  {
    id: 'w3',
    week: 'Week 5–8',
    focus: 'Data Structures & Algorithms',
    status: 'upcoming',
    progress: 0,
    outcome: 'Solve 120 curated problems with pattern notes',
    tasks: [
      { id: 'w3t1', title: 'Arrays, hashing & two pointers', done: false, hours: 10 },
      { id: 'w3t2', title: 'Trees, graphs & recursion', done: false, hours: 12 },
      { id: 'w3t3', title: 'Dynamic programming patterns', done: false, hours: 10 },
    ],
  },
  {
    id: 'w4',
    week: 'Week 9–12',
    focus: 'System Design & Interview Prep',
    status: 'upcoming',
    progress: 0,
    outcome: 'Interview-ready with 3 portfolio projects',
    tasks: [
      { id: 'w4t1', title: 'Scalability & caching basics', done: false, hours: 8 },
      { id: 'w4t2', title: 'Capstone full-stack project', done: false, hours: 16 },
      { id: 'w4t3', title: 'Weekly mock interviews', done: false, hours: 6 },
    ],
  },
]

export const thisWeekTasks: RoadmapTask[] = [
  { id: 't1', title: 'JavaScript Advanced', done: true, hours: 3 },
  { id: 't2', title: 'React Components', done: true, hours: 2 },
  { id: 't3', title: 'SQL Joins', done: false, hours: 3 },
  { id: 't4', title: 'DSA Arrays', done: false, hours: 4 },
]

export const jobs: JobListing[] = [
  {
    id: 'j1',
    title: 'Software Developer',
    company: 'Nexora Labs',
    logoTone: 'from-indigo-500 to-violet-500',
    location: 'Bengaluru, India',
    type: 'Full-time',
    mode: 'Hybrid',
    salary: '₹12 – 18 LPA',
    match: 89,
    posted: '2 days ago',
    matchedSkills: ['JavaScript', 'React', 'Git', 'Python'],
    missingSkills: ['SQL'],
    description:
      'Build and ship product features across a modern React and Node.js stack alongside senior engineers.',
  },
  {
    id: 'j2',
    title: 'Frontend Engineer (Fresher)',
    company: 'Brightwave',
    logoTone: 'from-sky-500 to-indigo-500',
    location: 'Remote, India',
    type: 'Full-time',
    mode: 'Remote',
    salary: '₹9 – 14 LPA',
    match: 84,
    posted: '4 days ago',
    matchedSkills: ['React', 'JavaScript', 'HTML', 'CSS'],
    missingSkills: ['TypeScript', 'Testing'],
    description: 'Craft polished interfaces for a design-led analytics product used by 40k teams.',
  },
  {
    id: 'j3',
    title: 'Backend Developer Intern',
    company: 'Finlytics',
    logoTone: 'from-emerald-500 to-teal-500',
    location: 'Hyderabad, India',
    type: 'Internship',
    mode: 'On-site',
    salary: '₹40k / month',
    match: 76,
    posted: '1 week ago',
    matchedSkills: ['Python', 'Git'],
    missingSkills: ['SQL', 'System Design'],
    description: 'Work on payment APIs and data pipelines with a small, fast-moving platform team.',
  },
  {
    id: 'j4',
    title: 'Associate Data Analyst',
    company: 'Quantiva',
    logoTone: 'from-amber-500 to-orange-500',
    location: 'Pune, India',
    type: 'Full-time',
    mode: 'Hybrid',
    salary: '₹8 – 11 LPA',
    match: 68,
    posted: '3 days ago',
    matchedSkills: ['Python', 'Excel'],
    missingSkills: ['SQL', 'Power BI', 'Statistics'],
    description: 'Turn product and revenue data into dashboards that drive weekly leadership decisions.',
  },
  {
    id: 'j5',
    title: 'Full Stack Developer',
    company: 'Orbit Systems',
    logoTone: 'from-fuchsia-500 to-purple-500',
    location: 'Gurugram, India',
    type: 'Full-time',
    mode: 'On-site',
    salary: '₹10 – 16 LPA',
    match: 81,
    posted: '5 days ago',
    matchedSkills: ['React', 'Node.js', 'JavaScript'],
    missingSkills: ['SQL', 'Docker'],
    description: 'Own features end to end, from database schema to production release.',
  },
  {
    id: 'j6',
    title: 'Graduate Engineer Trainee',
    company: 'Helios Tech',
    logoTone: 'from-rose-500 to-pink-500',
    location: 'Chennai, India',
    type: 'Full-time',
    mode: 'On-site',
    salary: '₹7 – 9 LPA',
    match: 72,
    posted: '1 day ago',
    matchedSkills: ['Python', 'Data Structures'],
    missingSkills: ['Java', 'SQL'],
    description: 'A structured 6-month engineering program with rotations across product teams.',
  },
]

export const resumeAnalysis = {
  fileName: 'Sahil_Gupta_Resume.pdf',
  fileSize: '284 KB',
  score: 91,
  atsScore: 84,
  keywordScore: 79,
  detectedSkills: ['Python', 'JavaScript', 'React', 'HTML', 'CSS', 'Git', 'SQL'],
  strengths: [
    'Strong technical skill section',
    'Good project descriptions',
    'Clear education section',
    'Clean, ATS-friendly single-column layout',
  ],
  improvements: [
    'Add measurable project achievements',
    'Improve resume summary',
    'Add more relevant keywords',
  ],
  sections: [
    { name: 'Contact & Links', score: 96 },
    { name: 'Summary', score: 68 },
    { name: 'Skills', score: 94 },
    { name: 'Projects', score: 88 },
    { name: 'Education', score: 92 },
    { name: 'Experience', score: 74 },
  ],
  aiSummary:
    'Your resume is strong for entry-level software development roles, but adding SQL projects and measurable project outcomes could improve your ATS compatibility.',
}

export const interviewSets = [
  {
    id: 'i1',
    title: 'Technical — JavaScript & React',
    description: 'Core language concepts, component design and state management.',
    questions: 8,
    duration: '25 min',
    difficulty: 'Intermediate' as const,
    lastScore: 78,
  },
  {
    id: 'i2',
    title: 'Data Structures & Algorithms',
    description: 'Arrays, hashing, complexity analysis and problem walkthroughs.',
    questions: 6,
    duration: '30 min',
    difficulty: 'Advanced' as const,
    lastScore: 64,
  },
  {
    id: 'i3',
    title: 'HR & Behavioural',
    description: 'STAR-method answers on teamwork, ownership and conflict.',
    questions: 10,
    duration: '20 min',
    difficulty: 'Beginner' as const,
    lastScore: 86,
  },
  {
    id: 'i4',
    title: 'System Design Basics',
    description: 'Caching, scaling and designing simple production systems.',
    questions: 5,
    duration: '35 min',
    difficulty: 'Advanced' as const,
    lastScore: 0,
  },
]

export const interviewQuestions = [
  'Tell me about yourself and what draws you to software development.',
  'Explain the difference between let, const and var in JavaScript.',
  'How does React decide when to re-render a component?',
  'Describe a project where you had to debug a difficult issue.',
  'How would you optimise a slow database query?',
]

export const interviewHistory = [
  { date: 'Aug 2', type: 'HR & Behavioural', score: 86 },
  { date: 'Aug 8', type: 'Technical — JS', score: 72 },
  { date: 'Aug 14', type: 'DSA', score: 64 },
  { date: 'Aug 18', type: 'Technical — React', score: 78 },
]

export const achievements = [
  { id: 'a1', title: 'First Resume Analysis', description: 'Analysed your resume with CareerAI', unlocked: true },
  { id: 'a2', title: '7-Day Streak', description: 'Studied every day for a week', unlocked: true },
  { id: 'a3', title: 'Interview Rookie', description: 'Completed 3 mock interviews', unlocked: true },
  { id: 'a4', title: 'Skill Climber', description: 'Raised any skill by 20 points', unlocked: true },
  { id: 'a5', title: 'SQL Specialist', description: 'Reach 80 in SQL proficiency', unlocked: false },
  { id: 'a6', title: 'Job Ready', description: 'Hit 90% career readiness', unlocked: false },
]

export const notifications = [
  { id: 'n1', title: 'Roadmap updated', body: 'SQL window functions added to this week.', time: '12m ago' },
  { id: 'n2', title: '3 new job matches', body: 'Nexora Labs and 2 others match your profile.', time: '2h ago' },
  { id: 'n3', title: 'Skill gap detected', body: 'Data Structures is below your target role level.', time: 'Yesterday' },
]

export const coachConversation = [
  { role: 'ai' as const, text: 'Based on your current skills, you are 78% ready for a Software Developer role.' },
  { role: 'user' as const, text: 'What should I learn next?' },
  {
    role: 'ai' as const,
    text: "I recommend focusing on SQL, DSA and advanced React. I've updated your 12-week roadmap.",
  },
]

export const popularSkills = [
  'Python', 'Java', 'JavaScript', 'React', 'SQL', 'C++',
  'Git', 'HTML', 'CSS', 'Node.js', 'Machine Learning', 'Data Structures',
]

export const targetRoles = [
  'Software Developer',
  'Frontend Developer',
  'Backend Developer',
  'Data Analyst',
  'Data Scientist',
  'AI/ML Engineer',
  'Cloud Engineer',
]
