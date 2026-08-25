import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as pdfjsLib from 'https://esm.sh/pdfjs-dist@4.8.69/legacy/build/pdf.mjs'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-filename',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_RESUME_BYTES = 5 * 1024 * 1024

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
})

const pageTextFromContent = (items: unknown[]) => {
  const lines: string[] = []
  let current = ''
  let lastY: number | null = null
  for (const item of items) {
    if (!item || typeof item !== 'object' || !('str' in item)) continue
    const record = item as { str?: unknown; transform?: unknown }
    const text = typeof record.str === 'string' ? record.str : ''
    if (!text) continue
    const transform = Array.isArray(record.transform) ? record.transform : []
    const y = typeof transform[5] === 'number' ? transform[5] : null
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
      if (current.trim()) lines.push(current.trim())
      current = text
    } else {
      const needsSpace = Boolean(current) && !current.endsWith(' ') && !text.startsWith(' ')
      current += `${needsSpace ? ' ' : ''}${text}`
    }
    lastY = y ?? lastY
  }
  if (current.trim()) lines.push(current.trim())
  return lines.join('\n').trim()
}

const mapPdfError = (error: unknown) => {
  const combined = `${error instanceof Error ? error.name : ''} ${error instanceof Error ? error.message : ''}`.toLowerCase()
  if (combined.includes('password')) return json({ error: 'This PDF is password-protected. Remove the password and try again.', code: 'password_protected' }, 400)
  if (combined.includes('invalidpdf') || combined.includes('invalid pdf') || combined.includes('corrupt')) return json({ error: 'This PDF appears to be corrupted and could not be processed.', code: 'corrupted_pdf' }, 400)
  return json({ error: 'This PDF uses an unsupported structure. Please upload a standard text-based resume PDF.', code: 'unsupported_pdf' }, 400)
}

const readPdfBytes = async (request: Request) => {
  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) throw new Error('Please upload a PDF resume.')
    return { bytes: new Uint8Array(await file.arrayBuffer()), filename: file.name, type: file.type || contentType }
  }
  const filenameHeader = request.headers.get('x-filename')
  return {
    bytes: new Uint8Array(await request.arrayBuffer()),
    filename: filenameHeader ? decodeURIComponent(filenameHeader) : 'resume.pdf',
    type: contentType,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed', code: 'method_not_allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Missing authorization', code: 'unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) return json({ error: 'Resume processing is not configured on the server.', code: 'not_configured' }, 500)

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Your session is invalid or expired.', code: 'unauthorized' }, 401)

  let upload: { bytes: Uint8Array; filename: string; type: string }
  try {
    upload = await readPdfBytes(request)
  } catch {
    return json({ error: 'Please upload a PDF resume. Other file types are not supported.', code: 'invalid_type' }, 400)
  }

  if (!upload.bytes.byteLength) return json({ error: 'This PDF is empty. Please upload a resume that contains readable text.', code: 'empty_pdf' }, 400)
  if (upload.bytes.byteLength > MAX_RESUME_BYTES) return json({ error: 'This PDF is larger than 5 MB. Choose a smaller resume file.', code: 'file_too_large' }, 413)
  const type = upload.type.split(';')[0].trim().toLowerCase()
  if (type && type !== 'application/pdf' && type !== 'application/octet-stream' && !type.includes('multipart/form-data')) {
    return json({ error: 'Please upload a PDF resume. Other file types are not supported.', code: 'invalid_type' }, 400)
  }
  const header = new TextDecoder('latin1').decode(upload.bytes.slice(0, 8))
  if (!header.startsWith('%PDF')) return json({ error: 'This file is not a valid PDF. Please upload a PDF resume.', code: 'invalid_pdf' }, 400)

  try {
    const document = await pdfjsLib.getDocument({ data: upload.bytes, isEvalSupported: false }).promise
    const pages: string[] = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      const pageText = pageTextFromContent(content.items)
      if (pageText) pages.push(pageText)
    }
    const text = pages.join('\n\n').trim()
    if (!text) return json({ error: 'This PDF contains no readable text. It may be scanned or image-only.', code: 'scanned_or_empty' }, 422)
    return json({
      filename: upload.filename || 'resume.pdf',
      fileSize: upload.bytes.byteLength,
      pageCount: document.numPages,
      characterCount: text.length,
      text,
    })
  } catch (error) {
    return mapPdfError(error)
  }
})
