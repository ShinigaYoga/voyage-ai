// scripts/verify-stage2.mjs
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    try {
      browser = await chromium.launch({ headless: true, channel: 'chrome' });
    } catch (e2) {
      browser = await chromium.launch({ headless: true, channel: 'msedge' });
    }
  }

  const results = []

  // CHECK 1: Chat persistence across refresh
  {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(`${BASE}/chat`)
    await page.waitForLoadState('networkidle')

    const msg = `test-persistence-${Date.now()}`
    const input = page.locator('input, textarea').first()
    await input.fill(msg)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1500)

    const before = await page.locator(`text=${msg}`).count()
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
    const after = await page.locator(`text=${msg}`).count()

    results.push({
      check: 'Chat persistence across refresh',
      pass: before > 0 && after > 0,
      detail: `before=${before} after=${after}`,
    })
    await ctx.close()
  }

  // CHECK 2: Trips screen renders
  {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(`${BASE}/trips`)
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    const hasContent = body.length > 50
    results.push({
      check: 'Trips screen renders content',
      pass: hasContent,
      detail: `bodyLen=${body.length}`,
    })
    await ctx.close()
  }

  // CHECK 3: Mobile 375px no horizontal scroll
  {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
    })
    const page = await ctx.newPage()
    const routes = ['/', '/home', '/chat', '/trips', '/explore', '/profile']
    for (const r of routes) {
      await page.goto(`${BASE}${r}`)
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 2
      )
      results.push({
        check: `No horizontal scroll @375px on ${r}`,
        pass: !overflow,
        detail: overflow ? 'overflow detected' : 'ok',
      })
    }
    await ctx.close()
  }

  // CHECK 4: Bottom nav present on mobile
  {
    const ctx = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
    })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/home`)
    await page.waitForLoadState('networkidle')
    const navLinks = await page.locator('nav a, nav button').count()
    results.push({
      check: 'Bottom nav present on mobile',
      pass: navLinks >= 4,
      detail: `links=${navLinks}`,
    })
    await ctx.close()
  }

  // CHECK 5: All routes respond < 400
  {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const routes = [
      '/', '/home', '/chat', '/trips', '/explore', '/profile',
      '/destination/goa', '/trip/demo', '/guide',
    ]
    for (const r of routes) {
      const resp = await page.goto(`${BASE}${r}`)
      results.push({
        check: `Route ${r} responds`,
        pass: (resp?.status() ?? 999) < 400,
        detail: `status=${resp?.status()}`,
      })
    }
    await ctx.close()
  }

  console.log('\n===== STAGE 2 BROWSER CHECKS =====\n')
  let fails = 0
  for (const r of results) {
    if (!r.pass) fails++
    console.log(`${r.pass ? '✅' : '❌'} ${r.check}  [${r.detail}]`)
  }
  console.log(`\n${results.length - fails}/${results.length} passed\n`)

  await browser.close()
  process.exit(fails > 0 ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
