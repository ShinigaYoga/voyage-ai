// scripts/check-code.mjs
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

const SRC = 'src'

function walk(dir, acc = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, acc)
    else acc.push(p)
  }
  return acc
}

const files = walk(SRC).filter((f) => ['.ts', '.tsx'].includes(extname(f)))
const results = []
const read = (f) => readFileSync(f, 'utf8')

// 1. Stage-2 placeholder reply removed
{
  const hits = files.filter((f) =>
    read(f).includes("Full AI reasoning arrives in Stage 3"),
  )
  results.push({
    check: 'Stage-2 placeholder reply removed',
    pass: hits.length === 0,
    detail: hits.join(', ') || 'clean',
  })
}

// 2. No keyword-matching chatbot logic
{
  const patterns = [
    /message\.includes\(['"]/,
    /\.includes\(['"](goa|hotel|train|flight)['"]\)/i,
  ]
  const hits = files.filter((f) => patterns.some((p) => p.test(read(f))))
  results.push({
    check: 'No keyword-matching chatbot logic',
    pass: hits.length === 0,
    detail: hits.join(', ') || 'clean',
  })
}

// 3. AI config not imported in client components
{
  const hits = files.filter((f) => {
    const c = read(f)
    const isClient = /^['"]use client['"]/m.test(c)
    return isClient && /lib\/ai\/config/.test(c)
  })
  results.push({
    check: 'AI config not imported in client components',
    pass: hits.length === 0,
    detail: hits.join(', ') || 'clean',
  })
}

// 4. GEMINI_API_KEY not in client files
{
  const hits = files.filter((f) => {
    const c = read(f)
    const isClient = /^['"]use client['"]/m.test(c)
    return isClient && /GEMINI_API_KEY/.test(c)
  })
  results.push({
    check: 'GEMINI_API_KEY not in client bundle',
    pass: hits.length === 0,
    detail: hits.join(', ') || 'clean',
  })
}

// 5. MessageRenderer covers all 9 types
{
  const path = 'src/components/chat/MessageRenderer.tsx'
  try {
    const c = read(path)
    const types = ['text','trip','transport','hotel','itinerary','activity','booking','food','weather']
    const missing = types.filter((t) => !c.includes(`'${t}'`) && !c.includes(`"${t}"`))
    results.push({
      check: 'MessageRenderer covers all 9 message types',
      pass: missing.length === 0,
      detail: missing.length ? `missing: ${missing.join(', ')}` : 'ok',
    })
  } catch {
    results.push({ check: 'MessageRenderer exists', pass: false, detail: `${path} not found` })
  }
}

// 6. Persistence repositories present
{
  const required = [
    'src/lib/repositories/interfaces.ts',
    'src/lib/repositories/indexeddb/IndexedDbTripRepository.ts',
    'src/lib/repositories/indexeddb/IndexedDbMessageRepository.ts',
  ]
  const missing = required.filter((f) => {
    try { statSync(f); return false } catch { return true }
  })
  results.push({
    check: 'Persistence repositories present',
    pass: missing.length === 0,
    detail: missing.join(', ') || 'ok',
  })
}

// 7. .env.local.example exists
{
  const exampleExists = (() => {
    try { statSync('.env.local.example'); return true } catch { return false }
  })()
  results.push({
    check: '.env.local.example exists',
    pass: exampleExists,
    detail: exampleExists ? 'ok' : 'missing',
  })
}

// 8. No default Tailwind palette colors
{
  const banned = /(bg|text|border)-(blue|gray|zinc|slate)-\d{2,3}/
  const hits = files.filter((f) => banned.test(read(f)))
  results.push({
    check: 'No default Tailwind palette colors',
    pass: hits.length === 0,
    detail: hits.slice(0, 5).join(', ') || 'clean',
  })
}

console.log('\n===== STATIC CODE CHECKS =====\n')
let fails = 0
for (const r of results) {
  if (!r.pass) fails++
  console.log(`${r.pass ? '✅' : '❌'} ${r.check}  [${r.detail}]`)
}
console.log(`\n${results.length - fails}/${results.length} passed\n`)
process.exit(fails > 0 ? 1 : 0)
