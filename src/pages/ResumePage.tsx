import {
  analyzeResumeOnServer,
  extractResumeOnServer,
} from '@/lib/resumeExtract'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, Download, Sparkles } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { AIRecommendationCard } from '@/components/common/AIRecommendationCard'
import { ChartCard } from '@/components/common/ChartCard'
import { PageHeader } from '@/components/common/PageHeader'
import { ProgressRing } from '@/components/common/ProgressRing'
import { ResumeUpload } from '@/components/common/ResumeUpload'
import type { UploadState } from '@/components/common/ResumeUpload'
import { SkillBadge } from '@/components/common/SkillBadge'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/common/Toast'
import { resumeAnalysis } from '@/data/mock'
import type { ResumeAnalyzeResult } from '@/lib/resumeExtract'

export function ResumePage() {
  const { toast } = useToast()
  const [state, setState] = useState<UploadState>('idle')
  const [fileName, setFileName] = useState(resumeAnalysis.fileName)
  const [improveOpen, setImproveOpen] = useState(false)
 const [analysis, setAnalysis] = useState<ResumeAnalyzeResult | null>(null)
 const [errorMessage, setErrorMessage] = useState('')

 

  const startUpload = async (file: File) => {
  setFileName(file.name)
  setState('analyzing')
  setErrorMessage('')
  setAnalysis(null)

  try {
    const extracted = await extractResumeOnServer(file)

    const targetRole = 'Software Developer'

    const result = await analyzeResumeOnServer(
      extracted,
      targetRole
    )

    setAnalysis(result)
    setState('done')

    toast({
      title: 'Resume analyzed successfully',
      description: `AI Resume Score: ${result.overallScore}/100`,
      tone: 'ai',
    })
  } catch (error) {
    console.error('Resume analysis failed:', error)

    setState('idle')

    const message =
      error instanceof Error
        ? error.message
        : 'Resume analysis failed. Please try again.'

    setErrorMessage(message)

    toast({
      title: 'Resume analysis failed',
      description: message,
      tone: 'info',
    })
  }
}
const sectionData = analysis
  ? [
      { name: 'ATS', score: analysis.atsScore },
      { name: 'Keywords', score: analysis.keywordScore },
      { name: 'Formatting', score: analysis.formattingScore },
      { name: 'Overall', score: analysis.overallScore },
    ]
  : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Resume Analyzer"
        description="Upload your resume and let CareerAI identify your strengths, skills and improvement areas."
        eyebrow={
          <Badge variant="outline" className="border-primary/20 text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Powered by CareerAI
          </Badge>
        }
        actions={
          state === 'done' ? (
            <Button variant="outline" onClick={() => toast({ title: 'Report downloaded', tone: 'success' })}>
              <Download className="h-4 w-4" />
              Download report
            </Button>
          ) : null
        }
      />

      <ResumeUpload
        state={state}
        fileName={fileName}
        onUpload={startUpload}
        onReset={() => setState('idle')}
      />
      {errorMessage ? (
  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
    {errorMessage}
  </div>
) : null}

      {state === 'analyzing' ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-1" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      ) : null}

      {state === 'done' ? (
        <div className="space-y-6 animate-fade-up">
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="flex flex-col items-center p-6 text-center">
              <h2 className="self-start text-base font-semibold">Resume Score</h2>
              <ProgressRing
  value={analysis?.overallScore ?? 0}
  size={168}
  className="my-5"
  label="out of 100"
/>
              <Badge variant="success">Top 12% of B.Tech CSE students</Badge>
              <div className="mt-6 w-full space-y-4">
                <div>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">ATS compatibility</span>
                    <span className="font-semibold">{analysis?.atsScore ?? 0}%</span>
                  </div>
                  <Progress value={analysis?.atsScore ?? 0} className="h-1.5" />
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">Keyword coverage</span>
                    <span className="font-semibold">{analysis?.keywordScore ?? 0}%</span>
                  </div>
                  <Progress value={analysis?.keywordScore ?? 0} className="h-1.5" />
                </div>
              </div>
            </Card>

            <ChartCard
              title="Section breakdown"
              description="How each section of your resume scored"
              className="lg:col-span-2"
            >
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectionData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sectionFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a78bfa" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#eef0f5" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(99,102,241,.06)' }}
                      contentStyle={{ borderRadius: 14, border: '1px solid #e6e8ef', fontSize: 12 }}
                      formatter={(value) => [`${value}/100`, 'Score']}
                    />
                    <Bar dataKey="score" fill="url(#sectionFill)" radius={[8, 8, 0, 0]} maxBarSize={54} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <Card className="p-6">
            <h2 className="text-base font-semibold">Detected Skills</h2>
            <p className="mt-1 text-sm text-muted-foreground">Extracted from your projects, experience and skills section.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {analysis?.detectedSkills.map((skill: string) => (
                <SkillBadge key={skill} name={skill} />
              ))}
            </div>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card className="p-6">
              <h2 className="text-base font-semibold">Resume Strengths</h2>
              <ul className="mt-4 space-y-3">{analysis?.strengths.map((item: string) => (
                  <li key={item} className="flex items-start gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/10 px-4 py-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <span className="text-sm text-foreground/80">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6">
              <h2 className="text-base font-semibold">Areas to Improve</h2>
              <ul className="mt-4 space-y-3">
                {analysis?.improvements.map((item: string) => (
                  <li key={item} className="flex items-start gap-3 rounded-xl border border-amber-500/15 bg-amber-500/10 px-4 py-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                    <span className="text-sm text-foreground/80">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <AIRecommendationCard
            title="AI Suggestions"
           message={analysis?.aiSummary ?? 'AI analysis completed.'}
            action={
              <Button onClick={() => setImproveOpen(true)}>
                Improve My Resume <ArrowRight className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      ) : null}

      <Modal
        open={improveOpen}
        onOpenChange={setImproveOpen}
        title="AI resume rewrite plan"
        description="Three edits CareerAI suggests before your next application."
        footer={
          <>
            <Button variant="outline" onClick={() => setImproveOpen(false)}>
              Close
            </Button>
            <Button asChild>
              <Link to="/roadmap">Add to roadmap</Link>
            </Button>
          </>
        }
      >
        <ol className="space-y-3">
          {[
            'Rewrite your summary around the Software Developer role and your two strongest projects.',
            'Quantify outcomes: users served, latency reduced, tests added, marks improved.',
            'Add a SQL project so your resume covers the keyword recruiters filter on most.',
          ].map((item, index) => (
            <li key={item} className="flex gap-3 rounded-xl bg-muted/60 px-4 py-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white">
                {index + 1}
              </span>
              <span className="text-foreground/80">{item}</span>
            </li>
          ))}
        </ol>
      </Modal>
    </div>
  )
}
