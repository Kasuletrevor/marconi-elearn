import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

function parseEnv(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

test('local smoke: landing, auth, staff, playground, student dashboard', async ({ page, context }) => {
  const root = path.resolve(__dirname, '../..');
  const env = parseEnv(path.join(root, '.env'));
  const superadminEmail = process.env.SUPERADMIN_EMAIL ?? env.SUPERADMIN_EMAILS?.split(',')[0]?.trim();
  const superadminPassword = process.env.SUPERADMIN_PASSWORD ?? env.SUPERADMIN_PASSWORD;
  expect(superadminEmail, 'Missing SUPERADMIN email').toBeTruthy();
  expect(superadminPassword, 'Missing SUPERADMIN password').toBeTruthy();

  const stamp = Date.now();
  const studentEmail = `pw.student.${stamp}@example.com`;
  const studentPassword = 'Password123!';

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Where Code Meets/i })).toBeVisible();
  await page.screenshot({ path: '../output/playwright/landing.png', fullPage: true });

  await page.getByRole('link', { name: /^Sign In$/i }).first().click();
  await page.getByLabel(/Email address/i).fill(superadminEmail!);
  await page.getByLabel(/^Password$/i).fill(superadminPassword!);
  await page.getByRole('button', { name: /^Sign in$/i }).click();
  await expect(page).toHaveURL(/\/superadmin/);
  await expect(page.getByText(/Platform Control Deck/i)).toBeVisible();
  await page.screenshot({ path: '../output/playwright/superadmin.png', fullPage: true });

  const api = context.request;
  const apiBase = 'http://localhost:8000/api/v1';

  const orgRes = await api.post(`${apiBase}/orgs`, { data: { name: `PW Smoke ${stamp}` } });
  expect(orgRes.ok(), await orgRes.text()).toBeTruthy();
  const org = await orgRes.json();

  const courseRes = await api.post(`${apiBase}/orgs/${org.id}/courses`, {
    data: { code: `PW${String(stamp).slice(-4)}`, title: 'Playwright Smoke Course' },
  });
  expect(courseRes.ok(), await courseRes.text()).toBeTruthy();
  const course = await courseRes.json();

  const userRes = await api.post(`${apiBase}/users`, {
    data: { email: studentEmail, password: studentPassword },
  });
  expect(userRes.ok(), await userRes.text()).toBeTruthy();
  const studentUser = await userRes.json();

  const enrollRes = await api.post(`${apiBase}/orgs/${org.id}/courses/${course.id}/memberships`, {
    data: { user_id: studentUser.id, role: 'student' },
  });
  expect(enrollRes.ok(), await enrollRes.text()).toBeTruthy();

  await page.goto(`/staff/courses/${course.id}`);
  await expect(page.getByText(/Playwright Smoke Course/i).first()).toBeVisible();
  await page.screenshot({ path: '../output/playwright/staff-course.png', fullPage: true });

  await page.goto('/playground');
  await page.getByRole('button', { name: /Run Code/i }).click();
  await expect(page.getByText(/Outcome:|Error \(/i).first()).toBeVisible({ timeout: 40000 });
  await page.screenshot({ path: '../output/playwright/playground.png', fullPage: true });

  const studentCtx = await context.browser()!.newContext({ baseURL: 'http://localhost:3000' });
  const studentPage = await studentCtx.newPage();

  await studentPage.goto('/login');
  await studentPage.getByLabel(/Email address/i).fill(studentEmail);
  await studentPage.getByLabel(/^Password$/i).fill(studentPassword);
  await studentPage.getByRole('button', { name: /^Sign in$/i }).click();
  await expect(studentPage).toHaveURL(/\/dashboard/);
  await expect(studentPage.getByText(/Dashboard/i).first()).toBeVisible();
  await expect(studentPage.getByText(/Playwright Smoke Course/i).first()).toBeVisible();
  await studentPage.screenshot({ path: '../output/playwright/student-dashboard.png', fullPage: true });

  await studentCtx.close();
});
