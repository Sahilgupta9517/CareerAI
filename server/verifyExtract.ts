import { extractResumePdf, ResumeExtractError } from './extractResumePdf.ts'

const makePdf = (pageStreams: string[]) => {
  const objects: string[] = []
  objects.push('<< /Type /Catalog /Pages 2 0 R >>')
  const kids = pageStreams.map((_, index) => `${3 + index * 2} 0 R`).join(' ')
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pageStreams.length} >>`)
  pageStreams.forEach((stream, index) => {
    const pageNumber = 3 + index * 2
    const contentNumber = pageNumber + 1
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentNumber} 0 R /Resources << /Font << /F1 ${3 + pageStreams.length * 2} 0 R >> >> >>`)
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  })
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')

  let output = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(output))
    output += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefStart = Buffer.byteLength(output)
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => {
    output += `${String(offset).padStart(10, '0')} 00000 n \n`
  })
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  return new Uint8Array(Buffer.from(output))
}

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message)
}

const run = async () => {
  const textPdf = makePdf([
    'BT /F1 18 Tf 72 720 Td (Jane Doe) Tj 0 -28 Td (Software Engineer) Tj 0 -28 Td (React TypeScript Node.js) Tj ET',
    'BT /F1 14 Tf 72 720 Td (Experience at CareerAI) Tj ET',
  ])
  const textResult = await extractResumePdf(textPdf, 'jane-doe.pdf', 'application/pdf')
  assert(textResult.pageCount === 2, 'expected 2 pages')
  assert(textResult.text.includes('Jane Doe'), 'expected extracted name')
  assert(textResult.characterCount > 20, 'expected extracted characters')

  const emptyPdf = makePdf(['BT ET'])
  try {
    await extractResumePdf(emptyPdf, 'empty.pdf', 'application/pdf')
    throw new Error('empty PDF should fail')
  } catch (error) {
    assert(error instanceof ResumeExtractError && error.code === 'scanned_or_empty', `unexpected empty PDF error: ${error}`)
  }

  try {
    await extractResumePdf(new Uint8Array(Buffer.from('not a pdf')), 'bad.txt', 'application/pdf')
    throw new Error('invalid file should fail')
  } catch (error) {
    assert(error instanceof ResumeExtractError && error.code === 'invalid_pdf', `unexpected invalid file error: ${error}`)
  }

  try {
    await extractResumePdf(new Uint8Array(6 * 1024 * 1024), 'large.pdf', 'application/pdf')
    throw new Error('large file should fail')
  } catch (error) {
    assert(error instanceof ResumeExtractError && error.code === 'file_too_large', `unexpected large file error: ${error}`)
  }

  console.log('resume extract checks passed')
}

void run()
