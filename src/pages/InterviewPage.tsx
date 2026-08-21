import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, Square } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { InterviewCard } from '@/components/common/InterviewCard'
import { PageHeader } from '@/components/common/PageHeader'
import { ProgressRing } from '@/components/common/ProgressRing'
import { useToast } from '@/components/common/Toast'
import { interviewSets } from '@/data/mock'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface Message {
  id: number
  role: 'ai' | 'user'
  text: string
}

export function InterviewPage() {
  const { toast } = useToast()
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [answer, setAnswer] = useState('')
  const [thinking, setThinking] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'ai',
      text: "Hi Sahil — I'm your CareerAI interviewer. Pick a set below, or ask me anything about your preparation.",
    },
  ])
  const endRef = useRef<HTMLDivElement>(null)

  const [profile, setProfile] = useState<any>(null)
  const [latestSessions, setLatestSessions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [questions, setQuestions] = useState<string[]>([])
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [currentSetType, setCurrentSetType] = useState<string>('')

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, thinking])

  useEffect(() => {
    const loadProfileAndHistory = async () => {
      try {
        const sessionRes = await supabase.auth.getSession()
        const token = sessionRes.data.session?.access_token
        if (!token) return

        const response = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.ok) {
          const profileData = await response.json()
          setProfile(profileData)
        }

        const statsRes = await fetch('/api/dashboard-stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
          setLatestSessions(statsData.interviewHistory || [])
        }
      } catch (err) {
        console.error('Error loading profile/history:', err)
      }
    }
    void loadProfileAndHistory()
  }, [])

  const startSet = async (setId: string, title: string) => {
    const typeMap: Record<string, string> = {
      'i1': 'Technical — JavaScript & React',
      'i2': 'Data Structures & Algorithms',
      'i3': 'HR & Behavioural',
      'i4': 'System Design Basics'
    }
    const type = typeMap[setId] || 'Technical'
    setCurrentSetType(type)
    
    setMessages([
      { id: Date.now(), role: 'ai', text: `Setting up your "${title}" interview set with CareerAI...` }
    ])
    setActive(true)
    setStep(0)
    setThinking(true)
    setEvaluations([])
    
    try {
      const sessionRes = await supabase.auth.getSession()
      const token = sessionRes.data.session?.access_token
      if (!token) throw new Error('Session expired.')

      const role = profile?.goal?.target_role || 'Software Developer'
      const exp = profile?.profile?.experience || 'Student / Fresher'

      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jobRole: role,
          experienceLevel: exp,
          interviewType: type
        })
      })

      if (!response.ok) throw new Error('Could not fetch questions.')
      const data = await response.json()
      
      setQuestions(data.questions)
      setMessages([
        { id: Date.now(), role: 'ai', text: `Starting "${title}". Take your time — answer as you would in a real round.` },
        { id: Date.now() + 1, role: 'ai', text: data.questions[0] }
      ])
      toast({ title: 'Mock interview started', description: title, tone: 'ai' })
    } catch (err) {
      console.error(err)
      toast({ title: 'Error starting interview', description: 'Could not connect to AI service.', tone: 'info' })
      setActive(false)
      setMessages([
        { id: Date.now(), role: 'ai', text: 'Oops! Something went wrong while starting the interview. Pick a set to try again.' }
      ])
    } finally {
      setThinking(false)
    }
  }

  const submitAnswer = async () => {
    const text = answer.trim()
    if (!text) return
    setAnswer('')
    
    const userMsgId = Date.now()
    setMessages((current) => [...current, { id: userMsgId, role: 'user', text }])
    setThinking(true)
    
    try {
      const sessionRes = await supabase.auth.getSession()
      const token = sessionRes.data.session?.access_token
      if (!token) throw new Error('Session expired.')

      const currentQuestion = questions[step] || 'Describe your experience.'
      const role = profile?.goal?.target_role || 'Software Developer'

      const response = await fetch('/api/interview/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          question: currentQuestion,
          answer: text,
          jobRole: role
        })
      })

      if (!response.ok) throw new Error('Evaluation failed.')
      const evalResult = await response.json()

      const evaluation = {
        question: currentQuestion,
        answer: text,
        score: evalResult.score,
        feedback: evalResult
      }
      
      const newEvaluations = [...evaluations, evaluation]
      setEvaluations(newEvaluations)

      const nextStep = step + 1
      const isLast = nextStep >= questions.length

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'ai',
          text: `Score: ${evalResult.score}/100\n\nStrengths:\n${evalResult.strengths.map((s: string) => `• ${s}`).join('\n')}\n\nSuggestions:\n${evalResult.improvements.map((i: string) => `• ${i}`).join('\n')}`
        },
        ...(isLast ? [] : [{ id: Date.now() + 2, role: 'ai' as const, text: questions[nextStep] }])
      ])

      if (isLast) {
        const totalScore = newEvaluations.reduce((sum, item) => sum + item.score, 0)
        const finalScore = Math.round(totalScore / questions.length)

        // Save session to database
        const saveRes = await fetch('/api/interview/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            jobRole: role,
            experienceLevel: profile?.profile?.experience || 'Student / Fresher',
            interviewType: currentSetType,
            score: finalScore,
            messages: [...messages, { id: userMsgId, role: 'user' as const, text }],
            feedback: newEvaluations
          })
        })

        setActive(false)
        setEvaluations([])
        setQuestions([])
        
        if (saveRes.ok) {
          const insertedSession = await saveRes.json()
          setLatestSessions((prev) => [insertedSession, ...prev])
          const statsRes = await fetch('/api/dashboard-stats', {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (statsRes.ok) {
            const statsData = await statsRes.json()
            setStats(statsData)
          }
        }
        
        toast({ title: 'Interview complete', description: `Final Score: ${finalScore}% — saved to progress.`, tone: 'success' })
      } else {
        setStep(nextStep)
      }
    } catch (err) {
      console.error(err)
      toast({ title: 'Evaluation failed', description: 'Could not fetch review. Moving to next question...', tone: 'info' })
      const nextStep = step + 1
      const isLast = nextStep >= questions.length
      if (isLast) {
        setActive(false)
        setQuestions([])
        toast({ title: 'Interview finished', description: 'Session completed.', tone: 'success' })
      } else {
        setStep(nextStep)
        setMessages((current) => [...current, { id: Date.now() + 1, role: 'ai' as const, text: questions[nextStep] }])
      }
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Mock Interview"
        description="Practise real interview rounds and get instant, structured feedback from CareerAI."
        eyebrow={
          <Badge variant="outline" className="border-primary/20 text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Adaptive questions
          </Badge>
        }
        actions={
          active ? (
            <Button variant="outline" onClick={() => { setActive(false); setQuestions([]); setEvaluations([]) }}>
              <Square className="h-4 w-4" />
              End session
            </Button>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="flex flex-col p-6 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">CareerAI Interviewer</p>
                <p className="text-xs text-emerald-600">{active ? 'Interview in progress' : 'Ready when you are'}</p>
              </div>
            </div>
            {active && questions.length > 0 ? (
              <Badge variant="gradient">Question {Math.min(step + 1, questions.length)} / {questions.length}</Badge>
            ) : null}
          </div>

          {active && questions.length > 0 ? (
            <Progress value={((step) / questions.length) * 100} className="mt-4 h-1.5" />
          ) : null}

          <div className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1" style={{ minHeight: 300, maxHeight: 420 }}>
            {messages.map((message) => (
              <div key={message.id} className={cn('flex animate-fade-up', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    message.role === 'user'
                      ? 'rounded-br-md bg-brand-gradient text-white'
                      : 'rounded-bl-md bg-muted text-foreground/85',
                  )}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {thinking ? (
              <div className="flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <div className="mt-5 border-t border-border pt-4">
            <Textarea
              value={answer}
              disabled={!active || thinking}
              placeholder={active ? 'Type your answer…' : 'Select a practice set below to start an interactive mock interview.'}
              onChange={(event) => setAnswer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submitAnswer()
                }
              }}
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Press Enter to send · Shift + Enter for a new line</p>
              <Button size="sm" onClick={submitAnswer} disabled={!active || thinking || !answer.trim()}>
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="flex flex-col items-center p-6 text-center">
            <h2 className="self-start text-base font-semibold">Interview Score</h2>
            <ProgressRing value={stats?.interviewScore ?? 0} size={150} className="my-4" label="average" />
            <Badge variant="success">Active preparation</Badge>
          </Card>

          <Card className="p-6">
            <h2 className="text-base font-semibold">Recent sessions</h2>
            <ul className="mt-4 space-y-3">
              {latestSessions.map((item, idx) => (
                <li key={idx} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.interview_type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-sm font-semibold">{item.score}%</span>
                </li>
              ))}
              {latestSessions.length === 0 ? (
                <li className="text-sm text-muted-foreground">No sessions completed yet.</li>
              ) : null}
            </ul>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Practice sets</h2>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {interviewSets.map((set) => (
            <InterviewCard key={set.id} {...set} onStart={() => startSet(set.id, set.title)} />
          ))}
        </div>
      </div>
    </div>
  )
}
