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
import { interviewHistory, interviewQuestions, interviewSets, metrics } from '@/data/mock'
import { cn } from '@/lib/utils'

interface Message {
  id: number
  role: 'ai' | 'user'
  text: string
}

const feedback = [
  'Good structure — you covered the situation and the action clearly.',
  'Try quantifying the result. Numbers make your answer memorable.',
  'Strong technical detail. Mention the trade-off you rejected and why.',
  'Solid answer. Close with what you learned to finish on impact.',
]

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, thinking])

  const startSet = (title: string) => {
    setActive(true)
    setStep(0)
    setMessages([
      { id: Date.now(), role: 'ai', text: `Starting "${title}". Take your time — answer as you would in a real round.` },
      { id: Date.now() + 1, role: 'ai', text: interviewQuestions[0] },
    ])
    toast({ title: 'Mock interview started', description: title, tone: 'ai' })
  }

  const submitAnswer = () => {
    const text = answer.trim()
    if (!text) return
    setAnswer('')
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text }])
    setThinking(true)

    window.setTimeout(() => {
      setThinking(false)
      const nextStep = step + 1
      const isLast = !active || nextStep >= interviewQuestions.length
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: 'ai', text: feedback[nextStep % feedback.length] },
        ...(active && !isLast
          ? [{ id: Date.now() + 2, role: 'ai' as const, text: interviewQuestions[nextStep] }]
          : []),
        ...(active && isLast
          ? [
              {
                id: Date.now() + 3,
                role: 'ai' as const,
                text: 'That wraps the round. Your score for this set is 81% — up 5 points from your last attempt.',
              },
            ]
          : []),
      ])
      if (active) {
        setStep(nextStep)
        if (isLast) {
          setActive(false)
          toast({ title: 'Interview complete', description: 'Score 81% — feedback added to your progress.', tone: 'success' })
        }
      }
    }, 1200)
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
            <Button variant="outline" onClick={() => setActive(false)}>
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
            {active ? <Badge variant="gradient">Question {Math.min(step + 1, interviewQuestions.length)} / {interviewQuestions.length}</Badge> : null}
          </div>

          {active ? <Progress value={((step) / interviewQuestions.length) * 100} className="mt-4 h-1.5" /> : null}

          <div className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1" style={{ maxHeight: 420 }}>
            {messages.map((message) => (
              <div key={message.id} className={cn('flex animate-fade-up', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
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
              placeholder={active ? 'Type your answer…' : 'Ask CareerAI anything about your interview prep…'}
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
              <Button size="sm" onClick={submitAnswer} disabled={!answer.trim()}>
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="flex flex-col items-center p-6 text-center">
            <h2 className="self-start text-base font-semibold">Interview Score</h2>
            <ProgressRing value={metrics.interviewScore} size={150} className="my-4" label="average" />
            <Badge variant="success">+12% this month</Badge>
          </Card>

          <Card className="p-6">
            <h2 className="text-base font-semibold">Recent sessions</h2>
            <ul className="mt-4 space-y-3">
              {interviewHistory.map((item) => (
                <li key={`${item.date}-${item.type}`} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.type}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                  <span className="text-sm font-semibold">{item.score}%</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Practice sets</h2>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {interviewSets.map((set) => (
            <InterviewCard key={set.id} {...set} onStart={() => startSet(set.title)} />
          ))}
        </div>
      </div>
    </div>
  )
}
