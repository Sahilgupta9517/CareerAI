import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import InterviewPageEnhanced from './InterviewPageEnhanced'
import InterviewDashboard from './InterviewDashboard'
import type { InterviewSetup } from '@/lib/interviewWorkflow'

export function InterviewPage() {
  const [screen, setScreen] = useState<'dashboard' | 'interview'>('dashboard')
  const [setupOverride, setSetupOverride] = useState<Partial<InterviewSetup> | null>(null)

  const handleStartNewInterview = (setup: Partial<InterviewSetup>) => {
    setSetupOverride(setup)
    setScreen('interview')
  }

  if (screen === 'interview') {
    return (
      <InterviewPageEnhanced
        setupOverride={setupOverride}
        onComplete={() => setScreen('dashboard')}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-6xl mx-auto px-4">
        <PageHeader
          title="Interview Preparation"
          description="Practice with AI-powered mock interviews, track your progress, and prepare for real job interviews"
        />
        <InterviewDashboard onStartNewInterview={handleStartNewInterview} />
      </div>
    </div>
  )
}
