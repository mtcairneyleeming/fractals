// Browser smoke test: loads the page from a running server, clicks Preview with the default settings
// and checks that /api/stl answers with a binary STL and the page shows no error.
//   node e2e/smoke.mjs [url]            (default http://127.0.0.1:8000/)
// Needs a Chrome/Chromium: set CHROME=/path/to/chrome (defaults to the first of a few known places).
// Writes e2e/smoke.png (git-ignored).
import puppeteer from "puppeteer-core"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const url = process.argv[2] ?? "http://127.0.0.1:8000/"
const candidates = [
    process.env.CHROME,
    ...fs.globSync(path.join(os.homedir(), ".cache/ms-playwright/chromium-*/chrome-linux64/chrome")),
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
].filter(Boolean)
const executablePath = candidates.find((p) => fs.existsSync(p))
if (!executablePath) throw new Error("No Chrome found; set CHROME=/path/to/chrome")

const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
})
const problems = []
try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1300, height: 1000 })
    page.on("pageerror", (e) => problems.push(`page error: ${e.message}`))
    page.on("console", (m) => {
        // The MathJax CDN script is blocked when offline; that is not a failure of the app.
        if (m.type() === "error" && !/jsdelivr|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/.test(m.text())) {
            problems.push(`console error: ${m.text()}`)
        }
    })
    page.on("requestfailed", (r) => {
        if (new URL(r.url()).origin === new URL(url).origin) problems.push(`request failed: ${r.url()}`)
    })
    const bad = []
    page.on("response", (r) => {
        if (new URL(r.url()).origin === new URL(url).origin && r.status() >= 400) bad.push(`${r.status()} ${r.url()}`)
    })

    // Puppeteer can't read the body of a large response the page consumes itself, so record it in the page.
    await page.evaluateOnNewDocument(() => {
        const orig = window.fetch
        window.fetch = async (...args) => {
            const res = await orig(...args)
            if (String(args[0]).includes("/api/stl")) {
                res.clone().arrayBuffer().then((b) => {
                    const dv = new DataView(b)
                    window.__stl = { length: b.byteLength, tris: b.byteLength >= 84 ? dv.getUint32(80, true) : -1 }
                })
            }
            return res
        }
    })

    await page.goto(url, { waitUntil: "load" })
    const title = await page.title()
    console.log("title:", title)

    const apiResponse = page.waitForResponse((r) => r.url().includes("/api/stl"), { timeout: 20000 })
    await page.click("#preview")
    const r = await apiResponse.catch(async (e) => {
        const shown = await page.$eval("#gen-error-body", (el) => el.textContent).catch(() => "")
        problems.push(`no /api/stl request: ${e.message}; error box says: ${shown}`)
        return null
    })
    if (!r) throw new Error("no API response")
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 30000 })
    await page.waitForFunction(() => window.__stl, { timeout: 30000 }).catch(() => {})
    const stl = (await page.evaluate(() => window.__stl)) ?? { length: 0, tris: -1 }
    console.log(`api/stl: ${r.status()} ${r.headers()["content-type"]} ${stl.length} bytes, ${stl.tris} triangles`)
    if (r.status() !== 200) problems.push(`api/stl returned ${r.status()}`)
    if (stl.tris <= 0 || stl.length !== 84 + 50 * stl.tris) problems.push("api/stl did not return a valid binary STL")

    await new Promise((res) => setTimeout(res, 1500)) // let three.js draw
    const err = await page.$eval("#gen-error", (el) => getComputedStyle(el).display)
    if (err !== "none") problems.push("page shows an error: " + (await page.$eval("#gen-error-body", (el) => el.textContent)))
    const canvases = await page.$$eval("#viewer canvas", (cs) => cs.length)
    console.log("viewer canvases:", canvases)
    if (canvases < 1) problems.push("no 3D viewer canvas")
    await page.screenshot({ path: new URL("./smoke.png", import.meta.url).pathname })
    problems.push(...bad.map((b) => `HTTP error for ${b}`))
} catch (e) {
    problems.push(String(e.message))
} finally {
    await browser.close()
}
if (problems.length) {
    console.error("FAILED:\n  " + problems.join("\n  "))
    process.exit(1)
}
console.log("OK")
