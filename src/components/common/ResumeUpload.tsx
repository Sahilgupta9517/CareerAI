import { useRef, useState } from 'react'
import { CheckCircle2, FileText, Loader2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { resumeAnalysis } from '@/data/mock'
import { cn } from '@/lib/utils'

export type UploadState = 'idle' | 'analyzing' | 'done'

interface ResumeUploadProps {
  state: UploadState
  fileName: string
  onUpload: (file: File) => void
  onReset: () => void
}

export function ResumeUpload({ state, fileName, onUpload, onReset }: ResumeUploadProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const pickFile = () => inputRef.current?.click()

  if (state !== 'idle') {
    return (
      <div className="rounded-xl border border-border bg-card/90 p-6 shadow-soft backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{fileName}</p>
            <p className="text-xs text-muted-foreground">
              {resumeAnalysis.fileSize} ·{' '}
              {state === 'analyzing' ? 'Analyzing with AI…' : 'Analysis complete'}
            </p>
          </div>
          {state === 'analyzing' ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-scale-in" />
          )}
        </div>
        <Progress value={state === 'analyzing' ? 65 : 100} className="mt-4 h-1.5" />
        {state === 'analyzing' ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
            </span>
            Extracting skills, sections and ATS keywords
          </p>
        ) : (
          <div className="mt-4 flex gap-3">
            <Button variant="outline" size="sm" onClick={onReset}>
              Upload another resume
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        const dropped = event.dataTransfer.files?.[0]

if (dropped) {
  onUpload(dropped)
}
      }}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card/70 px-6 py-14 text-center shadow-soft transition-all duration-300 backdrop-blur-sm',
        dragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-border hover:border-primary/40',
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-primary">
        <UploadCloud className="h-8 w-8" />
      </div>
      <h3 className="mt-5 text-lg font-semibold">Drop your resume here</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">Supported format: PDF — up to 5 MB</p>
      <Button className="mt-6" onClick={pickFile}>
        <FileText className="h-4 w-4" />
        Choose Resume
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(event) => {
  const file = event.target.files?.[0]

  if (file) {
    onUpload(file)
  }

  event.target.value = ''
}}
      />
      <p className="mt-4 text-xs text-muted-foreground">Your resume is analysed privately and never shared.</p>
    </div>
  )
}
