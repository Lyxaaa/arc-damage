// Usage: node scripts/probe.mjs [query] [--snap out.png]
// Starts nothing: expects `npm run dev` at :5173 (or PROBE_URL). Prints window.__arc as JSON, optionally saves a PNG.
import { chromium } from '../web/node_modules/playwright/index.mjs'

const args = process.argv.slice(2)
const snapIdx = args.indexOf('--snap')
const snap = snapIdx >= 0 ? args.splice(snapIdx, 2)[1] : null
const url = (process.env.PROBE_URL ?? 'http://localhost:5173/') + (args[0] ?? '')

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 900, height: 600 } })
const logs = []
page.on('console', (m) => m.type() === 'error' && logs.push(m.text()))
page.on('pageerror', (e) => logs.push(String(e)))
await page.goto(url)
try {
  await page.waitForFunction(() => window.__arc?.ready, null, { timeout: 30000 })
} catch {
  logs.push('timeout waiting for __arc.ready')
}
await page.waitForTimeout(1500)
if (snap) await page.screenshot({ path: snap })
const state = await page.evaluate(() => window.__arc ?? null)
console.log(JSON.stringify({ ...state, bones: state?.bones?.length, meshes: state?.meshes?.length, consoleErrors: logs }, null, 1))
await browser.close()
process.exit(logs.length ? 1 : 0)
