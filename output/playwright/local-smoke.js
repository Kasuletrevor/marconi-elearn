const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function parseDotEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

async function main() {
  const root = process.cwd();
  const env = parseDotEnv(path.join(root, '.env'));
  const superadminEmail = process.env.SUPERADMIN_EMAIL || env.SUPERADMIN_EMAILS?.split(',')[0]?.trim();
  const superadminPassword = process.env.SUPERADMIN_PASSWORD || env.SUPERADMIN_PASSWORD;
  if (!superadminEmail || !superadminPassword) {
    throw new Error('Missing superadmin credentials in environment or .env');
  }

  const uiBase = process.env.UI_BASE || 'http://127.0.0.1:3000';
  const apiBase = process.env.API_BASE || 'http://localhost:8000/api/v1';
  const stamp = Date.now();
  const studentEmail = `pw.student.${stamp}@example.com`;
  const studentPassword = 'Password123!';

  const artifacts = [];
  const findings = [];
  const consoleErrors = [];

  const browser = await chromium.launch({ headless: true });
  try {
    const superCtx = await browser.newContext({ baseURL: uiBase });
    superCtx.on('page', (page) => {
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(`[superadmin] ${msg.text()}`);
      });
      page.on('pageerror', (err) => {
        consoleErrors.push(`[superadmin:pageerror] ${err.message}`);
      });
    });

    const superPage = await superCtx.newPage();
    await superPage.goto('/', { waitUntil: 'domcontentloaded' });
    await superPage.getByRole('heading', { name: /Where Code Meets/i }).waitFor({ timeout: 20000 });
    const landingShot = path.join(root, 'output', 'playwright', 'landing.png');
    await superPage.screenshot({ path: landingShot, fullPage: true });
    artifacts.push(landingShot);

    await superPage.getByRole('link', { name: /^Sign In$/i }).first().click();
    await superPage.getByLabel(/Email address/i).fill(superadminEmail);
    await superPage.getByLabel(/Password/i).fill(superadminPassword);
    await superPage.getByRole('button', { name: /^Sign in$/i }).click();
    await superPage.waitForURL(/\/superadmin/, { timeout: 20000 });
    await superPage.getByText(/Platform Control Deck/i).waitFor({ timeout: 20000 });
    const superShot = path.join(root, 'output', 'playwright', 'superadmin.png');
    await superPage.screenshot({ path: superShot, fullPage: true });
    artifacts.push(superShot);

    const api = superCtx.request;
    const orgRes = await api.post(`${apiBase}/orgs`, { data: { name: `PW Smoke ${stamp}` } });
    if (!orgRes.ok()) throw new Error(`Create org failed: ${orgRes.status()} ${await orgRes.text()}`);
    const org = await orgRes.json();

    const courseRes = await api.post(`${apiBase}/orgs/${org.id}/courses`, {
      data: { code: `PW${String(stamp).slice(-4)}`, title: 'Playwright Smoke Course' },
    });
    if (!courseRes.ok()) throw new Error(`Create course failed: ${courseRes.status()} ${await courseRes.text()}`);
    const course = await courseRes.json();

    const userRes = await api.post(`${apiBase}/users`, {
      data: { email: studentEmail, password: studentPassword },
    });
    if (!userRes.ok()) throw new Error(`Create student user failed: ${userRes.status()} ${await userRes.text()}`);
    const studentUser = await userRes.json();

    const enrollRes = await api.post(`${apiBase}/orgs/${org.id}/courses/${course.id}/memberships`, {
      data: { user_id: studentUser.id, role: 'student' },
    });
    if (!enrollRes.ok()) throw new Error(`Enroll student failed: ${enrollRes.status()} ${await enrollRes.text()}`);

    await superPage.goto(`/staff/courses/${course.id}`, { waitUntil: 'domcontentloaded' });
    await superPage.getByText(/Playwright Smoke Course/i).first().waitFor({ timeout: 20000 });
    const staffCourseShot = path.join(root, 'output', 'playwright', 'staff-course.png');
    await superPage.screenshot({ path: staffCourseShot, fullPage: true });
    artifacts.push(staffCourseShot);

    await superPage.goto('/playground', { waitUntil: 'domcontentloaded' });
    await superPage.getByRole('button', { name: /Run Code/i }).click();
    await superPage.getByText(/Outcome:|Error \(/i).first().waitFor({ timeout: 30000 });
    const playgroundShot = path.join(root, 'output', 'playwright', 'playground.png');
    await superPage.screenshot({ path: playgroundShot, fullPage: true });
    artifacts.push(playgroundShot);

    const studentCtx = await browser.newContext({ baseURL: uiBase });
    studentCtx.on('page', (page) => {
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(`[student] ${msg.text()}`);
      });
      page.on('pageerror', (err) => {
        consoleErrors.push(`[student:pageerror] ${err.message}`);
      });
    });

    const studentPage = await studentCtx.newPage();
    await studentPage.goto('/login', { waitUntil: 'domcontentloaded' });
    await studentPage.getByLabel(/Email address/i).fill(studentEmail);
    await studentPage.getByLabel(/Password/i).fill(studentPassword);
    await studentPage.getByRole('button', { name: /^Sign in$/i }).click();
    await studentPage.waitForURL(/\/dashboard/, { timeout: 20000 });
    await studentPage.getByText(/Dashboard/i).first().waitFor({ timeout: 20000 });
    await studentPage.getByText(/Playwright Smoke Course/i).first().waitFor({ timeout: 20000 });
    const studentDashShot = path.join(root, 'output', 'playwright', 'student-dashboard.png');
    await studentPage.screenshot({ path: studentDashShot, fullPage: true });
    artifacts.push(studentDashShot);

    await studentCtx.close();
    await superCtx.close();

    findings.push(`Smoke flow passed with seeded course id=${course.id}, org id=${org.id}, student id=${studentUser.id}`);
  } finally {
    await browser.close();
  }

  const report = {
    timestamp: new Date().toISOString(),
    findings,
    consoleErrors,
    artifacts,
  };

  const reportPath = path.join(process.cwd(), 'output', 'playwright', 'smoke-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
