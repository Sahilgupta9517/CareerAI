import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import InterviewPageEnhanced from './InterviewPageEnhanced'
import InterviewDashboard from './InterviewDashboard'
import type { InterviewSetup } from '@/lib/interviewWorkflow'

export function InterviewPage() {
  const location = useLocation()
  const interviewId = location.pathname.match(/^\/interview\/(\d+)$/)?.[1]
  const [screen, setScreen] = useState<'dashboard' | 'interview'>(interviewId ? 'interview' : 'dashboard')
  const [setupOverride, setSetupOverride] = useState<Partial<InterviewSetup> | null>(null)

  const handleStartNewInterview = (setup: Partial<InterviewSetup>) => {
    setSetupOverride(setup)
    setScreen('interview')
  }

  if (screen === 'interview') {
    return (
      <InterviewPageEnhanced
        key={interviewId ?? 'new-interview'}
        setupOverride={setupOverride}
        onComplete={() => setScreen('dashboard')}
        initialInterviewId={interviewId ? Number(interviewId) : undefined}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interview Preparation"
        description="Practice with AI-powered mock interviews, track your progress, and prepare for real job interviews"
      />
      <InterviewDashboard onStartNewInterview={handleStartNewInterview} />
    </div>
  )
}
