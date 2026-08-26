import { useEffect, useState, useRef, useCallback } from 'react'
import { Award, Clock, Play, SkipForward, CheckCircle, AlertCircle, Loader2, Sparkles, TrendingUp } from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { supabase } from '@/lib/supabase'
import {
  startInterviewSession,
  submitAnswer,
  generateAdaptiveQuestion,
  completeInterview,
  getInterviewReport,
  getInterviewDetails,
  type InterviewSetup,
  type InterviewSession,
  type InterviewReport,
} from '@/lib/interviewWorkflow'
import { getCurrentProfile } from '@/lib/persistenceService'
import { loadInterviewContext } from '@/lib/interviewService'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/common/PageHeader'

interface InterviewPageEnhancedProps {
  setupOverride?: Partial<InterviewSetup> | null
  onComplete?: () => void
  initialInterviewId?: number
}

// Interview setup screen
function InterviewSetupScreen({
  onStart,
  isLoading,
  error,
  setupOverride,
}: {
  onStart: (setup: InterviewSetup) => Promise<void>
  isLoading: boolean
  error: string
  setupOverride?: Partial<InterviewSetup> | null
}) {
  const [targetRole, setTargetRole] = useState(setupOverride?.targetRole || 'Frontend Developer')
  const [interviewType, setInterviewType] = useState<InterviewSetup['interviewType']>(setupOverride?.interviewType || 'Technical')
  const [difficulty, setDifficulty] = useState<InterviewSetup['difficulty']>(setupOverride?.difficulty || 'Intermediate')
  const [questionCount, setQuestionCount] = useState<5 | 10 | 15 | 20>(setupOverride?.questionCount || 5)
  const [durationMinutes, setDurationMinutes] = useState<5 | 10 | 15 | 20 | 30>(setupOverride?.durationMinutes || 20)
  const { toast } = useToast()
  const [personalization, setPersonalization] = useState<{ resume: boolean; skills: number; projects: number; careerGoal: boolean; skillGaps: number } | null>(null)

  useEffect(() => {
    if (setupOverride?.targetRole) return
    void getCurrentProfile().then(async (profile) => {
      const { data, error } = await supabase.from('career_goals').select('target_role').eq('profile_id', profile.id).limit(1).maybeSingle()
      if (!error && data?.target_role) setTargetRole(data.target_role)
    }).catch((error) => {
      if (import.meta.env.DEV) console.error('[MockInterview] target role load failed:', error)
    })
  }, [setupOverride?.targetRole])

  useEffect(() => {
    void loadInterviewContext().then(({ context }) => {
      setPersonalization({ resume: Boolean(context.resumeText || context.resume), skills: context.skills.length + context.resumeSkills.length, projects: context.resume?.projects.length ?? context.projects.length, careerGoal: Boolean(context.targetRole), skillGaps: context.skillGaps.length })
    }).catch((error) => {
      if (import.meta.env.DEV) console.error('[MockInterview] personalization load failed:', error)
    })
  }, [])

  const handleStart = async () => {
    if (!targetRole.trim()) {
      toast({ title: 'Error', description: 'Please select a target role', tone: 'error' })
      return
    }

    await onStart({
      targetRole: targetRole.trim(),
      interviewType,
      difficulty,
      questionCount,
      durationMinutes,
    })
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Setup AI Interview</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Target Role *</label>
            <Select
              value={targetRole}
              onChange={(e) => setTargetRole((e.target as HTMLSelectElement).value)}
              className="w-full"
            >
              <option value="">Select a role...</option>
              <option value="Frontend Developer">Frontend Developer</option>
              <option value="Backend Developer">Backend Developer</option>
              <option value="Full Stack Developer">Full Stack Developer</option>
              <option value="Python Developer">Python Developer</option>
              <option value="Java Developer">Java Developer</option>
              <option value="React Developer">React Developer</option>
              <option value="Node.js Developer">Node.js Developer</option>
              <option value="Data Analyst">Data Analyst</option>
              <option value="Data Scientist">Data Scientist</option>
              <option value="AI/ML Engineer">AI/ML Engineer</option>
              <option value="DevOps Engineer">DevOps Engineer</option>
              <option value="Cloud Engineer">Cloud Engineer</option>
              <option value="Mobile Developer">Mobile Developer</option>
              <option value="QA Engineer">QA Engineer</option>
              <option value="Cybersecurity Analyst">Cybersecurity Analyst</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Interview Type</label>
            <Select
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value as any)}
              className="w-full"
            >
              <option value="Technical">Technical</option>
              <option value="Behavioral">Behavioral</option>
              <option value="HR">HR / Career Goals</option>
              <option value="Coding">Coding Challenge</option>
              <option value="System Design">System Design</option>
              <option value="Project-Based">Project-Based</option>
              <option value="Mixed">Mixed (All Types)</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Difficulty Level</label>
            <Select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full"
            >
              <option value="Beginner">Beginner / Fresher</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Number of Questions</label>
              <Select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value) as any)}
                className="w-full"
              >
                <option value={5}>5 questions</option>
                <option value={10}>10 questions</option>
                <option value={15}>15 questions</option>
                <option value={20}>20 questions</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Duration</label>
              <Select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) as any)}
                className="w-full"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">Personalized Interview</h3>
              <p className="mt-1 text-sm text-muted-foreground">Questions use your resume, skills, projects, career goals, and skill gaps.</p>
            </div>
            {personalization && !personalization.resume ? <Button asChild size="sm" variant="outline"><Link to="/resume-analyzer">Analyze Resume</Link></Button> : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge variant={personalization?.resume ? 'success' : 'secondary'}>{personalization?.resume ? 'Resume analysis available' : 'No analyzed resume'}</Badge>
            <Badge variant={personalization?.skills ? 'success' : 'secondary'}>{personalization?.skills ?? 0} skills detected</Badge>
            <Badge variant={personalization?.projects ? 'success' : 'secondary'}>{personalization?.projects ?? 0} projects detected</Badge>
            <Badge variant={personalization?.careerGoal ? 'success' : 'secondary'}>Career goal {personalization?.careerGoal ? 'available' : 'not set'}</Badge>
            <Badge variant={personalization?.skillGaps ? 'success' : 'secondary'}>{personalization?.skillGaps ?? 0} skill gaps available</Badge>
          </div>
          {personalization && !personalization.resume ? <p className="mt-3 text-xs text-amber-700">Resume-based questions are unavailable. You can continue with role-based questions.</p> : null}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <Button
          onClick={handleStart}
          disabled={isLoading || !targetRole.trim()}
          className="w-full mt-6"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating personalized interview...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Start AI Interview
            </>
          )}
        </Button>
      </Card>
    </div>
  )
}

// Interview session screen
function InterviewSessionScreen({
  session,
  onAnswer,
  onSkip,
  onComplete,
  isEvaluating,
  currentEvaluation,
  timeRemaining,
  onTimeExpired,
}: {
  session: InterviewSession
  onAnswer: (questionIndex: number, answer: string) => Promise<void>
  onSkip: (questionIndex: number) => void
  onComplete: () => Promise<void>
  isEvaluating: boolean
  currentEvaluation: any | null
  timeRemaining: number
  onTimeExpired: () => void
}) {
  const [answer, setAnswer] = useState('')
  const { toast } = useToast()
  const currentQuestion = session.questions[session.currentQuestionIndex]
  const progress = ((session.currentQuestionIndex + 1) / session.interview.total_questions) * 100
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60

  // Auto-complete when time expires
  useEffect(() => {
    if (timeRemaining === 0) {
      onTimeExpired()
    }
  }, [timeRemaining, onTimeExpired])

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      toast({ title: 'Error', description: 'Please enter an answer', tone: 'error' })
      return
    }

    await onAnswer(session.currentQuestionIndex, answer)
    setAnswer('')
  }

  const handleSubmitFinal = async () => {
    if (!window.confirm('Are you sure you want to complete this interview?')) return
    if (answer.trim()) await onAnswer(session.currentQuestionIndex, answer)
    await onComplete()
  }

  return (
    <div className="space-y-6">
      {/* Timer and Progress */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-mono font-bold text-blue-900">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
          <Badge className="bg-blue-600">
            Question {session.currentQuestionIndex + 1} of {session.interview.total_questions}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </Card>

      {/* Question Display */}
      <Card className="p-6">
        <div className="mb-4">
          <Badge className="mb-2" variant="outline">
            {session.interview.interview_type} • {session.interview.difficulty}
          </Badge>
          {currentQuestion.basedOnPreviousScore || currentQuestion.based_on_previous_score ? (
            <Badge className="mb-2 ml-2" variant="secondary">
              Adaptive difficulty: {currentQuestion.difficulty}
            </Badge>
          ) : null}
          <h3 className="text-lg font-semibold leading-relaxed">{currentQuestion.question}</h3>
          {currentQuestion.adaptiveReason || currentQuestion.adaptive_reason ? <p className="mt-2 text-sm text-muted-foreground">{currentQuestion.adaptiveReason || currentQuestion.adaptive_reason}</p> : null}
        </div>

        {currentQuestion.expectedTopics && currentQuestion.expectedTopics.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
            <p className="font-medium text-blue-900 mb-1">Topics to cover:</p>
            <div className="flex gap-2 flex-wrap">
              {currentQuestion.expectedTopics.map((topic, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Answer Input */}
      <Card className="p-6">
        <label className="block text-sm font-medium mb-3">Your Answer</label>
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer here. Be as detailed and clear as possible..."
          disabled={isEvaluating}
          className="min-h-[200px] mb-4"
        />

        {currentEvaluation ? (
          <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-medium">AI feedback: {currentEvaluation.feedback?.strengths?.[0] || 'Your answer was evaluated.'}</p>
            {currentEvaluation.feedback?.improvements?.[0] ? <p className="mt-1">Next focus: {currentEvaluation.feedback.improvements[0]}</p> : null}
          </div>
        ) : null}

        <div className="flex gap-3">
          <Button
            onClick={() => onSkip(session.currentQuestionIndex)}
            variant="outline"
            disabled={isEvaluating}
            className="flex-1"
          >
            <SkipForward className="w-4 h-4 mr-2" />
            Skip
          </Button>

          {session.currentQuestionIndex < session.interview.total_questions - 1 ? (
            <Button
              onClick={handleSubmitAnswer}
              disabled={isEvaluating || !answer.trim()}
              className="flex-1"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Next Question
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={() => void handleSubmitFinal()}
              disabled={isEvaluating}
              variant="success"
              className="flex-1"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Interview
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

// Interview report screen
function InterviewReportScreen({ report, onNewInterview }: { report: InterviewReport; onNewInterview: () => void }) {
  const scoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold mb-2">Interview Completed</h2>
            <p className="text-gray-600">
              {report.interview.target_role} • {report.interview.interview_type} • {report.interview.difficulty}
            </p>
          </div>
          <Award className="w-16 h-16 text-green-600 opacity-20" />
        </div>
      </Card>

      {/* Overall Score */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Overall Performance</h3>
        <div className="text-center mb-6">
          <div className={`text-6xl font-bold mb-2 ${scoreColor(report.overallScore)}`}>
            {report.overallScore}%
          </div>
          <Progress value={report.overallScore} className="h-3 mb-2" />
          <p className="text-gray-600">
            {report.overallScore >= 85
              ? 'Excellent performance!'
              : report.overallScore >= 70
                ? 'Good job! Keep practicing.'
                : 'Keep working on these areas.'}
          </p>
        </div>
      </Card>

      {/* Dimension Scores */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Performance by Dimension</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(report.scores).map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className="text-sm font-bold">{value}%</span>
              </div>
              <Progress value={value} className="h-2" />
            </div>
          ))}
        </div>
      </Card>

      {/* Topic Performance */}
      {report.topicPerformance && report.topicPerformance.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Topic-wise Performance</h3>
          <div className="space-y-3">
            {report.topicPerformance.map((topic, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{topic.topic}</span>
                  <span className={`text-sm font-bold ${scoreColor(topic.score)}`}>{topic.score}%</span>
                </div>
                <Progress value={topic.score} className="h-1.5" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {report.questions.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Question-wise Performance</h3>
          <div className="space-y-4">
            {report.questions.map((question, index) => {
              const feedback = question.feedback && typeof question.feedback === 'object' ? question.feedback as Record<string, unknown> : {}
              const feedbackText = typeof feedback.feedback === 'string' ? feedback.feedback : ''
              const improvements = Array.isArray(feedback.improvementTips)
                ? feedback.improvementTips.filter((item): item is string => typeof item === 'string')
                : Array.isArray(feedback.improvements)
                  ? feedback.improvements.filter((item): item is string => typeof item === 'string')
                  : []
              return (
                <div key={question.id ?? index} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{index + 1}. {question.question}</p>
                    <Badge variant="secondary">{question.score ?? 0}/100</Badge>
                  </div>
                  {question.questionSource ? <Badge className="mt-2" variant="outline">Source: {question.questionSource}</Badge> : null}
                  <p className="mt-3 text-sm text-muted-foreground"><strong>Your answer:</strong> {question.user_answer || 'No answer submitted.'}</p>
                  {feedbackText ? <p className="mt-2 text-sm"><strong>AI feedback:</strong> {feedbackText}</p> : null}
                  {question.expected_answer ? <p className="mt-2 text-sm text-muted-foreground"><strong>Ideal answer:</strong> {question.expected_answer}</p> : null}
                  {improvements.length > 0 ? <p className="mt-2 text-sm text-blue-800"><strong>How to improve:</strong> {improvements.join(' ')}</p> : null}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Strengths */}
      {report.strengths && report.strengths.length > 0 && (
        <Card className="p-6 border-green-200 bg-green-50">
          <h3 className="text-lg font-semibold mb-3 text-green-900">Your Strengths</h3>
          <ul className="space-y-2">
            {report.strengths.map((strength, i) => (
              <li key={i} className="flex items-start gap-2 text-green-800">
                <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Areas to Improve */}
      {report.improvementAreas && report.improvementAreas.length > 0 && (
        <Card className="p-6 border-blue-200 bg-blue-50">
          <h3 className="text-lg font-semibold mb-3 text-blue-900">Areas to Improve</h3>
          <ul className="space-y-2">
            {report.improvementAreas.map((area, i) => (
              <li key={i} className="flex items-start gap-2 text-blue-800">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Next Steps */}
      {report.nextSteps && report.nextSteps.length > 0 && (
        <Card className="p-6 border-purple-200 bg-purple-50">
          <h3 className="text-lg font-semibold mb-3 text-purple-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Next Steps for Improvement
          </h3>
          <ol className="space-y-2">
            {report.nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-purple-800">
                <span className="flex-shrink-0 font-bold">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={onNewInterview} className="flex-1">
          <Sparkles className="w-4 h-4 mr-2" />
          Take Another Interview
        </Button>
        <Button variant="outline" className="flex-1">
          View Full Report
        </Button>
      </div>
    </div>
  )
}

// Main Interview Page Component
export function InterviewPageEnhanced({ setupOverride, onComplete, initialInterviewId }: InterviewPageEnhancedProps) {
  const { toast } = useToast()
  const [screen, setScreen] = useState<'setup' | 'session' | 'report'>('setup')
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [report, setReport] = useState<InterviewReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [currentEvaluation, setCurrentEvaluation] = useState<any | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!initialInterviewId) return
    let cancelled = false
    setLoading(true)
    const restore = async () => {
      try {
        const details = await getInterviewDetails(initialInterviewId)
        if (cancelled) return
        const interview = details.interview as InterviewSession['interview']
        const questions = (details.questions ?? []) as InterviewSession['questions']
        const startedAt = new Date(interview.started_at).getTime()
        const duration = Number(interview.duration_minutes ?? 20) * 60
        setSession({
          interview,
          questions,
          currentQuestionIndex: Math.min(Number((interview as InterviewSession['interview'] & { current_question?: number }).current_question ?? 0), Math.max(questions.length - 1, 0)),
          answers: new Map(questions.filter((question) => question.user_answer).map((question) => [Number(question.id), question.user_answer ?? ''])),
          startTime: new Date(interview.started_at),
          isActive: interview.status === 'in_progress',
          timeRemaining: Math.max(0, startedAt + duration * 1000 - Date.now()) / 1000,
        })
        setTimeRemaining(Math.max(0, Math.floor(startedAt + duration * 1000 - Date.now()) / 1000))
        if (interview.status === 'completed') {
          const savedReport = await getInterviewReport(initialInterviewId)
          if (cancelled) return
          setReport(savedReport)
          setScreen('report')
        } else {
          setScreen('session')
        }
      } catch (loadError) {
      if (import.meta.env.DEV) console.error('[MockInterview] session load failed:', loadError)
      if (!cancelled) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load interview data.')
      }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void restore()
    return () => { cancelled = true }
  }, [initialInterviewId])

  // Timer
  useEffect(() => {
    if (screen !== 'session' || !session) return

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [screen, session])

  const handleStartInterview = useCallback(
    async (setup: InterviewSetup) => {
      setLoading(true)
      setError('')

      try {
        const newSession = await startInterviewSession(setup)
        setSession(newSession)
        if (newSession.fallbackUsed) {
          toast({
            title: 'Backup interview generation active',
            description: 'AI provider is temporarily busy. Switching to backup interview generation...',
            tone: 'info',
          })
        }
        setTimeRemaining(setup.durationMinutes * 60)
        setScreen('session')
        setCurrentEvaluation(null)
      } catch (err) {
        if (import.meta.env.DEV) console.error('[MockInterview] generation failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to start interview')
      } finally {
        setLoading(false)
      }
    },
    [toast]
  )

  const handleAnswerQuestion = useCallback(
    async (questionIndex: number, answer: string) => {
      if (!session) return

      setIsEvaluating(true)
      try {
        const question = session.questions[questionIndex]
        const evaluation = await submitAnswer(
          session.interview.id,
          Number(question.id),
          question.question,
          answer
        )

        setCurrentEvaluation(evaluation)
        if (questionIndex < session.interview.total_questions - 1) {
          const nextQuestionResult = await generateAdaptiveQuestion(session.interview.id, Number(question.id), {})
          if (nextQuestionResult.fallbackUsed) {
            toast({ title: 'Backup adaptive question active', description: 'AI quota is unavailable. A personalized local question was selected.', tone: 'info' })
          }
          await supabase
            .from('mock_interviews')
            .update({ current_question: questionIndex + 1, completed_questions: questionIndex + 1, updated_at: new Date().toISOString() })
            .eq('id', session.interview.id)
          setSession((prev) => prev ? { ...prev, questions: [...prev.questions, nextQuestionResult.question], currentQuestionIndex: questionIndex + 1 } : null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to evaluate answer')
      } finally {
        setIsEvaluating(false)
      }
    },
    [session, toast]
  )

  const handleSkipQuestion = useCallback((questionIndex: number) => {
    if (session) {
      void supabase
        .from('mock_interviews')
        .update({ current_question: questionIndex + 1, updated_at: new Date().toISOString() })
        .eq('id', session.interview.id)
    }
    setSession((prev) => {
      if (!prev) return null
      if (questionIndex < prev.questions.length - 1) {
        return {
          ...prev,
          currentQuestionIndex: questionIndex + 1,
        }
      }
      return prev
    })
  }, [session])

  const handleCompleteInterview = useCallback(async () => {
    if (!session) return

    setIsEvaluating(true)
    try {
      const completedReport = await completeInterview(session.interview.id)
      setReport(completedReport)
      setScreen('report')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete interview')
    } finally {
      setIsEvaluating(false)
    }
  }, [session])

  const handleTimeExpired = useCallback(async () => {
    if (session && screen === 'session') {
      await handleCompleteInterview()
    }
  }, [session, screen, handleCompleteInterview])

  const handleNewInterview = () => {
    if (onComplete) {
      onComplete()
    } else {
      setScreen('setup')
      setSession(null)
      setReport(null)
      setError('')
      setCurrentEvaluation(null)
    }
  }

  return (
    <div className="min-h-full bg-transparent py-2 sm:py-4">
      <div className="container mx-auto w-full max-w-6xl px-0">
        <PageHeader
          title={screen === 'setup' ? 'AI Mock Interviews' : screen === 'session' ? 'Interview Session' : 'Interview Report'}
          description={
            screen === 'setup'
              ? 'Practice for your next job interview with AI-powered questions and feedback'
              : screen === 'session'
                ? 'Answer questions thoughtfully and get instant AI feedback'
                : 'Review your interview performance and improvement areas'
          }
        />

        {screen === 'setup' && (
          <InterviewSetupScreen onStart={handleStartInterview} isLoading={loading} error={error} setupOverride={setupOverride} />
        )}

        {screen === 'session' && session && (
          <InterviewSessionScreen
            session={session}
            onAnswer={handleAnswerQuestion}
            onSkip={handleSkipQuestion}
            onComplete={handleCompleteInterview}
            isEvaluating={isEvaluating}
            currentEvaluation={currentEvaluation}
            timeRemaining={timeRemaining}
            onTimeExpired={handleTimeExpired}
          />
        )}

        {screen === 'report' && report && (
          <InterviewReportScreen report={report} onNewInterview={handleNewInterview} />
        )}
      </div>
    </div>
  )
}

export default InterviewPageEnhanced
