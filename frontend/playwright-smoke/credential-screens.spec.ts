import path from 'node:path';
import { expect, test } from '@playwright/test';

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/Email address/i).fill(email);
  await page.getByLabel(/^Password$/i).fill(password);
  await page.getByRole('button', { name: /^Sign in$/i }).click();
}

async function visitAndCapture(
  page: import('@playwright/test').Page,
  pagePath: string,
  screenshotName: string,
) {
  const response = await page.goto(pagePath, { waitUntil: 'domcontentloaded' });
  expect(response, `No response for ${pagePath}`).toBeTruthy();
  expect(response!.status(), `Navigation failed for ${pagePath}`).toBeLessThan(400);
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: path.join('..', 'output', 'playwright', screenshotName),
    fullPage: true,
  });
}

test('credential screens: superadmin + staff', async ({ browser }) => {
  const superadminEmail = process.env.SMOKE_SUPERADMIN_EMAIL;
  const staffEmail = process.env.SMOKE_STAFF_EMAIL;
  const password = process.env.SMOKE_PASSWORD;

  expect(superadminEmail, 'Missing SMOKE_SUPERADMIN_EMAIL').toBeTruthy();
  expect(staffEmail, 'Missing SMOKE_STAFF_EMAIL').toBeTruthy();
  expect(password, 'Missing SMOKE_PASSWORD').toBeTruthy();

  const superadminCtx = await browser.newContext({ baseURL: 'http://localhost:3000' });
  const superadminPage = await superadminCtx.newPage();

  await signIn(superadminPage, superadminEmail!, password!);
  await expect(superadminPage).toHaveURL(/\/superadmin/);

  await visitAndCapture(superadminPage, '/superadmin', 'cred-superadmin-home.png');
  await visitAndCapture(superadminPage, '/superadmin/organizations', 'cred-superadmin-organizations.png');
  await visitAndCapture(superadminPage, '/superadmin/settings', 'cred-superadmin-settings.png');
  await visitAndCapture(superadminPage, '/playground', 'cred-superadmin-playground.png');

  await superadminCtx.close();

  const staffCtx = await browser.newContext({ baseURL: 'http://localhost:3000' });
  const staffPage = await staffCtx.newPage();

  await signIn(staffPage, staffEmail!, password!);
  await expect(staffPage).toHaveURL(/\/staff/);

  await visitAndCapture(staffPage, '/staff', 'cred-staff-home.png');
  await visitAndCapture(staffPage, '/staff/submissions', 'cred-staff-submissions.png');
  await visitAndCapture(staffPage, '/playground', 'cred-staff-playground.png');

  const coursesResponse = await staffCtx.request.get('http://localhost:8000/api/v1/staff/courses');
  expect(coursesResponse.ok(), await coursesResponse.text()).toBeTruthy();
  const courses = await coursesResponse.json();

  if (Array.isArray(courses) && courses.length > 0) {
    const courseId = courses[0].id;
    await visitAndCapture(staffPage, `/staff/courses/${courseId}`, `cred-staff-course-${courseId}.png`);

    const assignmentsResponse = await staffCtx.request.get(
      `http://localhost:8000/api/v1/staff/courses/${courseId}/assignments`,
    );
    expect(assignmentsResponse.ok(), await assignmentsResponse.text()).toBeTruthy();
    const assignments = await assignmentsResponse.json();

    if (Array.isArray(assignments) && assignments.length > 0) {
      const assignmentId = assignments[0].id;
      await visitAndCapture(
        staffPage,
        `/staff/courses/${courseId}/assignments/${assignmentId}`,
        `cred-staff-assignment-${courseId}-${assignmentId}.png`,
      );
    }
  }

  await staffCtx.close();
});
