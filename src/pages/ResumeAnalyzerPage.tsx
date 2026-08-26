import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  FileCheck2,
  FileText,
  GraduationCap,
  Loader2,
  Sparkles,
  UploadCloud,
  Wrench,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/common/PageHeader'

import {
  analyzeResumeOnServer,
  extractResumeOnServer,
  persistResumeExtraction,
  type PersistedResume,
  type ResumeAnalyzeResult,
} from '@/lib/resumeExtract'

import { parseResumeText, type ParsedResume } from '@/lib/resumeParser'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

type ResumeState =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'failed'

type AtsCheck = {
  label: string
  passed: boolean
  detail: string
}

type Insight = ParsedResume & {
  completeness: number
  checks: AtsCheck[]
}

type InsightCardProps = {
  title: string
  icon: typeof Code2
  items: string[]
  description: string
}

const MAX_RESUME_BYTES = 5 * 1024 * 1024
const RESUME_SKILLS_KEY = 'careerai.resumeTechnicalSkills'

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const hasContactInformation = (text: string) => {
  const emailPattern = /[\w.+-]+@[\w-]+\.[\w.-]+/
  const phonePattern = /(?:\+?\d[\d\s().-]{8,}\d)/

  return emailPattern.test(text) || phonePattern.test(text)
}

const buildInsight = (text: string): Insight => {
  const parsed = parseResumeText(text)
  const invalidSkillPatterns = [
  'passionate about',
  'seeking opportunities',
  'building intelligent',
  'data-driven solutions',
  'b.tech',
  'computer science and engineering',
  'looking for',
  'experience in',
  'responsible for',
  'worked on',
]

const cleanSkills = (skills: string[]) => {
  return skills
    .map((skill) => skill.trim())
    .filter((skill) => {
      const normalizedSkill = skill.toLowerCase()

      if (!skill) return false
      if (skill.length > 40) return false
      if (skill.split(/\s+/).length > 4) return false

      return !invalidSkillPatterns.some((pattern) =>
        normalizedSkill.includes(pattern),
      )
    })
    .filter(
      (skill, index, array) =>
        array.findIndex(
          (item) => item.toLowerCase() === skill.toLowerCase(),
        ) === index,
    )
}

  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const educationSignals = [
    'education',
    'qualification',
    'academic qualification',
    'educational qualification',
    'academic background',
    'b tech',
    'btech',
    'bachelor',
    'master',
    'university',
    'college',
    'institute',
    'expected graduation',
  ]

  const experienceSignals = [
    'experience',
    'work experience',
    'professional experience',
    'employment history',
    'work history',
    'internship',
    'internships',
    'intern',
  ]

  const hasEducation =
    parsed.education.length > 0 ||
    Boolean(parsed.sections.education) ||
    educationSignals.some((signal) => normalized.includes(signal))

  const hasExperience =
    parsed.experience.length > 0 ||
    Boolean(parsed.sections.experience) ||
    experienceSignals.some((signal) => normalized.includes(signal))

  const hasSkills =
    parsed.technicalSkills.length > 0 ||
    Boolean(parsed.sections.skills)

  const hasProjects =
    parsed.projects.length > 0 ||
    Boolean(parsed.sections.projects)

  const checks: AtsCheck[] = [
    {
      label: 'PDF format',
      passed: true,
      detail: 'Validated PDF upload',
    },
    {
      label: 'Contact information detected',
      passed: hasContactInformation(text),
      detail: 'Email address or phone number',
    },
    {
      label: 'Skills section detected',
      passed: hasSkills,
      detail: 'Skills or tools heading',
    },
    {
      label: 'Education section detected',
      passed: hasEducation,
      detail: 'Education or qualification details',
    },
    {
      label: 'Experience section detected',
      passed: hasExperience,
      detail: 'Work or internship experience detected',
    },
    {
      label: 'Projects section detected',
      passed: hasProjects,
      detail: 'Projects or portfolio terms',
    },
    {
      label: 'Readable text detected',
      passed: text.trim().length > 0,
      detail: `${text.trim().length.toLocaleString()} characters extracted`,
    },
  ]

  const completeness = Math.round(
    (checks.filter((check) => check.passed).length /
      checks.length) *
      100,
  )
  const cleanedTechnicalSkills = cleanSkills(
  parsed.technicalSkills,
)

 return {
  ...parsed,
  technicalSkills: cleanedTechnicalSkills,
  completeness,
  checks,
}
}

const InsightCard = ({
  title,
  icon: Icon,
  items,
  description,
}: InsightCardProps) => (
  <Card className="p-5">
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary">
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>

        <p className="mt-1 text-xs text-muted-foreground">
          {description}
        </p>
      </div>
    </div>

    {items.length > 0 ? (
      <div className="mt-4 flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <Badge key={`${item}-${index}`} variant="secondary">
            {item}
          </Badge>
        ))}
      </div>
    ) : (
      <p className="mt-4 text-sm text-muted-foreground">
        Not detected from resume
      </p>
    )}
  </Card>
)

export function ResumeAnalyzerPage() {
  const inputRef = useRef<HTMLInputElement>(null)

  const [dragging, setDragging] = useState(false)

  const [file, setFile] = useState<File | null>(null)

  const [persistedResume, setPersistedResume] =
    useState<PersistedResume | null>(null)

  const [state, setState] =
    useState<ResumeState>('idle')

  const [uploadProgress, setUploadProgress] =
    useState(0)

  const [errorMessage, setErrorMessage] =
    useState('')

  const [extractedText, setExtractedText] =
    useState('')

  const [pageCount, setPageCount] =
    useState<number | null>(null)

  const [textCharacterCount, setTextCharacterCount] =
    useState<number | null>(null)

  const [showText, setShowText] =
    useState(false)

  const [copied, setCopied] =
    useState(false)

  const [insight, setInsight] =
    useState<Insight>(() => buildInsight(''))

  // -----------------------------
  // AI ANALYSIS STATE
  // -----------------------------

  const [targetRole, setTargetRole] =
    useState('Software Engineer')

  const [aiLoading, setAiLoading] =
    useState(false)

  const [aiError, setAiError] =
    useState('')

  const [aiResult, setAiResult] =
    useState<ResumeAnalyzeResult | null>(null)

  // -----------------------------
  // LOAD LATEST RESUME
  // -----------------------------

  useEffect(() => {
    const loadLatestResume = async () => {
      try {
        const { data, error } = await supabase
          .from('resume_analyses')
          .select(
            'id, filename, file_size, page_count, character_count, extracted_text, structured_resume, created_at, overall_score, ats_score, keyword_score, formatting_score, detected_skills, strengths, improvements, projects, education_experience, certifications, missing_skills, ats_recommendations, ai_summary',
          )
          .order('created_at', {
            ascending: false,
          })
          .limit(1)
          .maybeSingle()

        if (
          error ||
          !data ||
          typeof data.extracted_text !== 'string'
        ) {
          return
        }

        const structuredResume = parseResumeText(data.extracted_text)

        const result: PersistedResume = {
          id: data.id,
          filename: data.filename,
          fileSize: data.file_size,
          pageCount: data.page_count,
          characterCount: data.character_count,
          text: data.extracted_text,
          extractedText: data.extracted_text,
          structuredResume,
          createdAt: data.created_at,
          overallScore: data.overall_score,
        }

        setPersistedResume(result)
        setExtractedText(result.text)
        setPageCount(result.pageCount)
        setTextCharacterCount(result.characterCount)
        setInsight(buildInsight(result.text))

        if (typeof data.overall_score === 'number') {
          setAiResult({
            overallScore: data.overall_score,
            atsScore: typeof data.ats_score === 'number' ? data.ats_score : 0,
            keywordScore: typeof data.keyword_score === 'number' ? data.keyword_score : 0,
            formattingScore: typeof data.formatting_score === 'number' ? data.formatting_score : 0,
            detectedSkills: Array.isArray(data.detected_skills) ? data.detected_skills.filter((item): item is string => typeof item === 'string') : [],
            strengths: Array.isArray(data.strengths) ? data.strengths.filter((item): item is string => typeof item === 'string') : [],
            improvements: Array.isArray(data.improvements) ? data.improvements.filter((item): item is string => typeof item === 'string') : [],
            projects: Array.isArray(data.projects) ? data.projects as Array<{ title: string; outcome: string }> : [],
            educationExperience: Array.isArray(data.education_experience) ? data.education_experience.filter((item): item is string => typeof item === 'string') : [],
            certifications: Array.isArray(data.certifications) ? data.certifications.filter((item): item is string => typeof item === 'string') : [],
            missingSkills: Array.isArray(data.missing_skills) ? data.missing_skills.filter((item): item is string => typeof item === 'string') : [],
            atsRecommendations: Array.isArray(data.ats_recommendations) ? data.ats_recommendations.filter((item): item is string => typeof item === 'string') : [],
            aiSummary: typeof data.ai_summary === 'string' ? data.ai_summary : '',
          })
        }
        setState('ready')

        window.localStorage.setItem(
          RESUME_SKILLS_KEY,
          JSON.stringify(
            structuredResume.technicalSkills,
          ),
        )
      } catch (loadError) {
        console.error(
          'Could not load latest resume:',
          loadError,
        )
      }
    }

    void loadLatestResume()
  }, [])

  // -----------------------------
  // RESET
  // -----------------------------

  const reset = () => {
    setFile(null)
    setPersistedResume(null)

    setState('idle')
    setUploadProgress(0)

    setErrorMessage('')
    setAiError('')

    setExtractedText('')
    setPageCount(null)
    setTextCharacterCount(null)

    setShowText(false)
    setCopied(false)

    setAiResult(null)

    setInsight(buildInsight(''))

    window.localStorage.removeItem(
      RESUME_SKILLS_KEY,
    )

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  // -----------------------------
  // PROCESS PDF
  // -----------------------------

  const processPdf = async (candidate: File) => {
    setState('processing')
    setUploadProgress(55)
    setErrorMessage('')
    setAiError('')
    setAiResult(null)

    try {
      const result =
        await extractResumeOnServer(candidate)

      try {
        const persistedExtraction =
          await persistResumeExtraction(result)

        const parsedInsight =
          buildInsight(result.text)

        const persisted: PersistedResume = {
          id: persistedExtraction.id,
          ...result,
          extractedText: result.text,
          structuredResume: persistedExtraction.structuredResume,
          createdAt:
            new Date().toISOString(),
          overallScore: null,
        }

        setPersistedResume(persisted)

        setExtractedText(result.text)
        setPageCount(result.pageCount)
        setTextCharacterCount(
          result.characterCount,
        )

        setInsight(parsedInsight)

        window.localStorage.setItem(
          RESUME_SKILLS_KEY,
          JSON.stringify(
            parsedInsight.technicalSkills,
          ),
        )

        setUploadProgress(100)
        setState('ready')
        setErrorMessage('')
      } catch (persistError) {
        const persistMessage =
          persistError instanceof Error
            ? persistError.message
            : 'Resume extracted successfully, but saving your resume data failed. Please try again.'

        const parsedInsight =
          buildInsight(result.text)

        setPersistedResume(null)

        setExtractedText(result.text)
        setPageCount(result.pageCount)
        setTextCharacterCount(
          result.characterCount,
        )

        setInsight(parsedInsight)

        window.localStorage.setItem(
          RESUME_SKILLS_KEY,
          JSON.stringify(
            parsedInsight.technicalSkills,
          ),
        )

        setUploadProgress(0)
        setState('failed')
        setErrorMessage(persistMessage)
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Processing failed. Please try another PDF resume.'

      setState('failed')
      setUploadProgress(0)

      setExtractedText('')
      setInsight(buildInsight(''))

      window.localStorage.removeItem(
        RESUME_SKILLS_KEY,
      )

      setErrorMessage(message)
    }
  }

  // -----------------------------
  // SELECT FILE
  // -----------------------------

  const selectFile = (
    candidate: File | undefined,
  ) => {
    setErrorMessage('')
    setAiError('')
    setAiResult(null)

    if (!candidate) return

    if (
      candidate.type !== 'application/pdf'
    ) {
      reset()
      setErrorMessage(
        'Please upload a PDF resume. Other file types are not supported.',
      )
      return
    }

    if (
      candidate.size > MAX_RESUME_BYTES
    ) {
      reset()
      setErrorMessage(
        'This PDF is larger than 5 MB. Choose a smaller resume file.',
      )
      return
    }

    setFile(candidate)

    setPageCount(null)
    setTextCharacterCount(null)

    setExtractedText('')
    setInsight(buildInsight(''))

    setUploadProgress(20)
    setState('uploading')

    void processPdf(candidate)
  }

  // -----------------------------
  // COPY TEXT
  // -----------------------------

  const copyText = async () => {
    if (!extractedText) return

    try {
      await navigator.clipboard.writeText(
        extractedText,
      )

      setCopied(true)

      window.setTimeout(
        () => setCopied(false),
        1800,
      )
    } catch (copyError) {
      console.error(
        'Copy failed:',
        copyError,
      )
    }
  }

  // -----------------------------
  // AI ANALYSIS
  // -----------------------------
const cleanAiSkills = (skills: string[]): string[] => {
  const invalidPatterns = [
    'passionate about',
    'seeking opportunities',
    'building intelligent',
    'data-driven',
    'data driven',
    'b.tech',
    'computer science',
    'engineering 2024',
    'engineering 2025',
    'engineering 2026',
    'engineering 2027',
    'engineering 2028',
    'opportunities to grow',
    'technical:',
    'looking for',
  ]

  return skills
    .map((skill) => skill.trim())
    .filter((skill) => {
      const normalized = skill.toLowerCase()

      // Empty value
      if (!skill) return false

      // A skill should not be a long sentence
      if (skill.length > 35) return false

      // Remove sentence-like values
      if (skill.split(/\s+/).length > 4) return false

      // Remove known non-skill content
      if (
        invalidPatterns.some((pattern) =>
          normalized.includes(pattern),
        )
      ) {
        return false
      }

      return true
    })
    .filter(
      (skill, index, array) =>
        array.findIndex(
          (item) =>
            item.toLowerCase() === skill.toLowerCase(),
        ) === index,
    )
}
  const runAiAnalysis = async () => {
    if (!extractedText.trim()) {
      setAiError(
        'Please upload and extract a resume first.',
      )
      return
    }

    if (!targetRole.trim()) {
      setAiError(
        'Please enter your target job role.',
      )
      return
    }

    setAiLoading(true)
    setAiError('')
    setAiResult(null)

    try {
      const resumeResult = {
        filename:
          file?.name ||
          persistedResume?.filename ||
          'resume.pdf',

        fileSize:
          file?.size ||
          persistedResume?.fileSize ||
          0,

        pageCount:
          pageCount ||
          persistedResume?.pageCount ||
          0,

        characterCount:
          textCharacterCount ||
          extractedText.length,

        text: extractedText,
      }

      const result =
        await analyzeResumeOnServer(
          resumeResult,
          targetRole,
          persistedResume?.id,
        )

     const cleanedResult: ResumeAnalyzeResult = {
  ...result,
  detectedSkills: cleanAiSkills(result.detectedSkills),
}

setAiResult(cleanedResult)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'AI resume analysis failed. Please try again.'

      setAiError(message)
    } finally {
      setAiLoading(false)
    }
  }

  const ready =
    state === 'ready' &&
    Boolean(extractedText)

  const currentResume = file
    ? {
        filename: file.name,
        fileSize: file.size,
      }
    : persistedResume

  const statusLabel =
    state === 'uploading'
      ? 'Uploading'
      : state === 'processing'
        ? 'Processing'
        : state === 'failed'
          ? 'Processing failed'
          : 'Text extracted successfully'

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}

      <PageHeader
        title="Resume Analyzer"
        description="Upload your resume, extract structured information and get AI-powered career insights."
        eyebrow={
          <Badge
            variant="outline"
            className="border-primary/20 text-primary"
          >
            <FileText className="h-3.5 w-3.5" />
            Resume workspace
          </Badge>
        }
        actions={
          <Button
            asChild
            variant="outline"
          >
            <Link to="/career-analysis">
              Career analysis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {/* UPLOAD */}

      <Card
        className={cn(
          'flex flex-col items-center justify-center border-2 border-dashed px-6 py-12 text-center transition-all duration-200',
          dragging
            ? 'border-primary bg-primary/10 shadow-glow-cyan'
            : 'border-border/60 bg-muted/5 hover:border-primary/40 hover:bg-muted/10',
        )}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() =>
          setDragging(false)
        }
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)

          selectFile(
            event.dataTransfer.files?.[0],
          )
        }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-soft text-primary">
          <UploadCloud className="h-7 w-7" />
        </div>

        <h2 className="mt-4 text-lg font-semibold">
          Drop your PDF resume here
        </h2>

        <p className="mt-1.5 text-sm text-muted-foreground">
          PDF only · maximum 5 MB
        </p>

        <Button
          type="button"
          className="mt-5"
          onClick={() =>
            inputRef.current?.click()
          }
        >
          <FileText className="h-4 w-4" />
          Choose PDF
        </Button>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => {
            selectFile(
              event.target.files?.[0],
            )

            event.target.value = ''
          }}
        />

        <p className="mt-4 text-xs text-muted-foreground">
          Your resume is processed securely for extraction and analysis.
        </p>
      </Card>

      {/* ERROR */}

      {errorMessage ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

          <span>{errorMessage}</span>
        </div>
      ) : null}

      {/* CURRENT RESUME */}

      {currentResume ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-soft text-primary">
              <FileText className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {currentResume.filename}
              </p>

              <p className="text-xs text-muted-foreground">
                {formatFileSize(
                  currentResume.fileSize,
                )}{' '}
                · PDF
                {pageCount
                  ? ` · ${pageCount} ${
                      pageCount === 1
                        ? 'page'
                        : 'pages'
                    }`
                  : ''}
              </p>

              {textCharacterCount !== null ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {textCharacterCount.toLocaleString()}{' '}
                  readable characters extracted
                </p>
              ) : null}
            </div>

            {ready ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : state === 'uploading' ||
              state === 'processing' ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : null}
          </div>

          {(
            state === 'uploading' ||
            state === 'processing'
          ) ? (
            <>
              <Progress
                value={uploadProgress}
                className="mt-4 h-1.5"
              />

              <p className="mt-2 text-xs text-muted-foreground">
                {statusLabel}
              </p>
            </>
          ) : null}

          {ready ? (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0" />

              <div>
                <p className="font-semibold">
                  Resume extracted successfully.
                </p>

                <p className="mt-1 text-xs text-emerald-300/80">
                  Your resume is ready for AI analysis.
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              disabled={
                state === 'uploading' ||
                state === 'processing'
              }
            >
              <X className="h-4 w-4" />
              Remove / Replace
            </Button>
          </div>
        </Card>
      ) : null}

      {extractedText ? (
        <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  Extracted resume text
                </p>
                <p className="text-xs text-muted-foreground">
                  Review or copy the parsed content.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowText((current) => !current)}
                >
                  {showText ? 'Hide text' : 'Show text'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyText}
                  disabled={!extractedText}
                >
                  <Copy className="h-4 w-4" />
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            {showText ? (
              <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl bg-muted/40 p-4 text-xs leading-6 text-foreground">
                {extractedText}
              </pre>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Your resume text is ready. Show it to review the raw extraction and confirm quality before AI analysis.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  Resume insight
                </p>
                <p className="text-xs text-muted-foreground">
                  ATS-style quality checks
                </p>
              </div>

              <div className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {insight.completeness}%
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {insight.checks.map((check) => (
                <div key={check.label} className="rounded-xl border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{check.label}</span>
                    {check.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {check.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <InsightCard
                title="Top skills"
                icon={Code2}
                items={insight.technicalSkills.slice(0, 8)}
                description="Technical strengths detected from the resume"
              />

              <InsightCard
                title="Education"
                icon={GraduationCap}
                items={insight.education.map((item) => item.degree || item.institution).slice(0, 6)}
                description="Academic background and qualifications"
              />

              <InsightCard
                title="Projects"
                icon={BriefcaseBusiness}
                items={insight.projects.map((project) => project.title).slice(0, 6)}
                description="Project work captured from the resume"
              />

              <InsightCard
                title="Tools"
                icon={Wrench}
                items={insight.skills.slice(0, 8)}
                description="Relevant tools and technologies mentioned"
              />
            </div>
          </Card>
        </div>
      ) : null}

      {extractedText ? (
        <Card className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold">
                AI resume analysis
              </p>
              <p className="text-xs text-muted-foreground">
                Tailor the analysis to your target role.
              </p>
            </div>

            <Button
              type="button"
              onClick={runAiAnalysis}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analysing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Run AI analysis
                </>
              )}
            </Button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label className="space-y-2 text-sm font-medium text-foreground">
              Target role
              <input
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-primary"
                placeholder="Software Engineer"
              />
            </label>
          </div>

          {aiError ? (
            <div
              role="alert"
              className="mt-4 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{aiError}</span>
            </div>
          ) : null}

          {aiResult ? (
            <div className="mt-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">Overall score</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{aiResult.overallScore}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">ATS score</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{aiResult.atsScore}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">Keyword score</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{aiResult.keywordScore}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">Formatting score</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{aiResult.formattingScore}</p>
                </Card>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Card className="p-4">
                  <p className="text-sm font-semibold text-foreground">Detected skills</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {aiResult.detectedSkills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <p className="text-sm font-semibold text-foreground">AI summary</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {aiResult.aiSummary}
                  </p>
                </Card>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Card className="p-4">
                  <p className="text-sm font-semibold text-foreground">Resume strengths</p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {aiResult.strengths.map((strength) => (
                      <li key={strength} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-4">
                  <p className="text-sm font-semibold text-foreground">Improvement areas</p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {aiResult.improvements.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <Card className="p-4">
                  <p className="text-sm font-semibold text-foreground">Missing skills</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {aiResult.missingSkills.length > 0 ? aiResult.missingSkills.map((skill) => <Badge key={skill} variant="outline">{skill}</Badge>) : <p className="text-sm text-muted-foreground">No gaps identified.</p>}
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="text-sm font-semibold text-foreground">Certifications</p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {aiResult.certifications.length > 0 ? aiResult.certifications.map((item) => <li key={item}>{item}</li>) : <li>None listed in the resume.</li>}
                  </ul>
                </Card>
                <Card className="p-4">
                  <p className="text-sm font-semibold text-foreground">ATS recommendations</p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {aiResult.atsRecommendations.length > 0 ? aiResult.atsRecommendations.map((item) => <li key={item}>{item}</li>) : <li>No additional recommendations.</li>}
                  </ul>
                </Card>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
}