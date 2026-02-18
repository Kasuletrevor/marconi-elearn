import fs from "node:fs";
import path from "node:path";
import { expect, request, test, type APIRequestContext, type Page } from "@playwright/test";

type ApiJson = Record<string, unknown>;

interface SeededCourse {
  orgId: number;
  courseId: number;
  assignmentId: number;
  assignmentTitle: string;
  courseTitle: string;
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

const repoRoot = path.resolve(__dirname, "../..");
const envFromRoot = parseEnvFile(path.join(repoRoot, ".env"));
const envFromBackend = parseEnvFile(path.join(repoRoot, "backend", ".env"));
const mergedEnv = { ...envFromBackend, ...envFromRoot };

const apiBase = process.env.E2E_API_URL ?? "http://localhost:8000/api/v1";
const superadminEmail =
  process.env.E2E_SUPERADMIN_EMAIL ??
  process.env.SMOKE_SUPERADMIN_EMAIL ??
  mergedEnv.SUPERADMIN_EMAILS?.split(",")[0]?.trim();
const superadminPassword =
  process.env.E2E_SUPERADMIN_PASSWORD ??
  process.env.SMOKE_PASSWORD ??
  mergedEnv.SUPERADMIN_PASSWORD;

function uniqueStamp() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function expectOk(response: Awaited<ReturnType<APIRequestContext["fetch"]>>, label: string) {
  const bodyText = await response.text();
  expect(response.ok(), `${label} failed (${response.status()}): ${bodyText}`).toBeTruthy();
  return bodyText;
}

async function apiPost(
  ctx: APIRequestContext,
  url: string,
  data: ApiJson
): Promise<unknown> {
  const response = await ctx.post(url, { data });
  const bodyText = await expectOk(response, `POST ${url}`);
  return JSON.parse(bodyText) as ApiJson;
}

async function apiPatch(
  ctx: APIRequestContext,
  url: string,
  data: ApiJson
): Promise<unknown> {
  const response = await ctx.patch(url, { data });
  const bodyText = await expectOk(response, `PATCH ${url}`);
  return JSON.parse(bodyText) as ApiJson;
}

async function apiGet(
  ctx: APIRequestContext,
  url: string
): Promise<unknown> {
  const response = await ctx.get(url);
  const bodyText = await expectOk(response, `GET ${url}`);
  return JSON.parse(bodyText) as ApiJson;
}

async function createAdminContext(): Promise<APIRequestContext> {
  expect(superadminEmail, "Missing superadmin email for e2e").toBeTruthy();
  expect(superadminPassword, "Missing superadmin password for e2e").toBeTruthy();
  const ctx = await request.newContext({ baseURL: apiBase });
  const loginResponse = await ctx.post("/auth/login", {
    data: { email: superadminEmail, password: superadminPassword },
  });
  await expectOk(loginResponse, "POST /auth/login");
  return ctx;
}

async function loginUi(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/Email address/i).fill(email);
  await page.getByLabel(/^Password$/i).fill(password);
  await page.getByRole("button", { name: /^Sign in$/i }).click();
}

async function seedCourseWithAssignment(
  adminCtx: APIRequestContext,
  suffix: string
): Promise<SeededCourse> {
  const org = (await apiPost(adminCtx, "/orgs", { name: `E2E Org ${suffix}` })) as ApiJson;
  const orgId = Number(org.id);
  const courseTitle = `E2E Course ${suffix}`;
  const course = (await apiPost(adminCtx, `/orgs/${orgId}/courses`, {
    code: `E2E${suffix.slice(-4).replace(/[^0-9]/g, "0")}`,
    title: courseTitle,
  })) as ApiJson;
  const courseId = Number(course.id);
  const moduleRecord = (await apiPost(adminCtx, `/orgs/${orgId}/courses/${courseId}/modules`, {
    title: "Week 1",
    position: 1,
  })) as ApiJson;
  const assignmentTitle = `Assignment ${suffix}`;
  const assignment = (await apiPost(adminCtx, `/orgs/${orgId}/courses/${courseId}/assignments`, {
    title: assignmentTitle,
    module_id: Number(moduleRecord.id),
    max_points: 100,
    due_date: "2035-02-01T12:00:00Z",
  })) as ApiJson;

  return {
    orgId,
    courseId,
    assignmentId: Number(assignment.id),
    assignmentTitle,
    courseTitle,
  };
}

async function createUser(adminCtx: APIRequestContext, email: string, password: string): Promise<number> {
  const user = (await apiPost(adminCtx, "/users", { email, password })) as ApiJson;
  return Number(user.id);
}

async function enrollInCourse(
  adminCtx: APIRequestContext,
  orgId: number,
  courseId: number,
  userId: number,
  role: "student" | "ta"
) {
  await apiPost(adminCtx, `/orgs/${orgId}/courses/${courseId}/memberships`, {
    user_id: userId,
    role,
  });
}

async function addOrgRole(
  adminCtx: APIRequestContext,
  orgId: number,
  userId: number,
  role: "ta" | "lecturer"
) {
  await apiPost(adminCtx, `/orgs/${orgId}/memberships`, {
    user_id: userId,
    role,
  });
}

async function createSubmissionAsStudent(
  studentEmail: string,
  studentPassword: string,
  courseId: number,
  assignmentId: number
): Promise<void> {
  const studentCtx = await request.newContext({ baseURL: apiBase });
  try {
    const login = await studentCtx.post("/auth/login", {
      data: { email: studentEmail, password: studentPassword },
    });
    await expectOk(login, "student login");

    const submit = await studentCtx.post(`/student/courses/${courseId}/assignments/${assignmentId}/submissions`, {
      multipart: {
        file: {
          name: "main.c",
          mimeType: "text/x-c",
          buffer: Buffer.from('#include <stdio.h>\\nint main(){printf("ok\\\\n");return 0;}\\n'),
        },
      },
    });
    await expectOk(submit, "student submission");
  } finally {
    await studentCtx.dispose();
  }
}

test.describe("critical frontend flows", () => {
  test("login -> submit -> view grade", async ({ page }) => {
    const adminCtx = await createAdminContext();
    try {
      const suffix = uniqueStamp();
      const seeded = await seedCourseWithAssignment(adminCtx, suffix);
      const studentEmail = `e2e.student.${suffix}@example.com`;
      const studentPassword = "Password123!";
      const studentId = await createUser(adminCtx, studentEmail, studentPassword);
      await enrollInCourse(adminCtx, seeded.orgId, seeded.courseId, studentId, "student");

      await loginUi(page, studentEmail, studentPassword);
      await expect(page).toHaveURL(/\/dashboard/);

      await page.goto(`/dashboard/courses/${seeded.courseId}/assignments/${seeded.assignmentId}`);
      await page.locator('input[type="file"]').setInputFiles({
        name: "main.c",
        mimeType: "text/x-c",
        buffer: Buffer.from('#include <stdio.h>\\nint main(){printf("hello\\\\n");return 0;}\\n'),
      });
      await page.getByRole("button", { name: /Submit Assignment/i }).click();

      await expect(page.getByText(/Your Submissions/i)).toBeVisible();

      const submissions = (await apiGet(
        adminCtx,
        `/orgs/${seeded.orgId}/courses/${seeded.courseId}/assignments/${seeded.assignmentId}/submissions`
      )) as unknown[];
      expect(submissions.length).toBeGreaterThan(0);
      const submissionId = Number((submissions[0] as ApiJson).id);

      await apiPatch(adminCtx, `/staff/submissions/${submissionId}`, {
        status: "graded",
        score: 100,
        feedback: "Great job from e2e",
      });

      await page.reload();
      await expect(page.getByText("100 / 100")).toBeVisible();
      await expect(page.getByText(/Great job from e2e/i)).toBeVisible();
    } finally {
      await adminCtx.dispose();
    }
  });

  test("staff grade override", async ({ page }) => {
    const adminCtx = await createAdminContext();
    try {
      const suffix = uniqueStamp();
      const seeded = await seedCourseWithAssignment(adminCtx, suffix);

      const staffEmail = `e2e.staff.${suffix}@example.com`;
      const staffPassword = "Password123!";
      const staffId = await createUser(adminCtx, staffEmail, staffPassword);
      await addOrgRole(adminCtx, seeded.orgId, staffId, "ta");
      await enrollInCourse(adminCtx, seeded.orgId, seeded.courseId, staffId, "ta");

      const studentEmail = `e2e.submitter.${suffix}@example.com`;
      const studentPassword = "Password123!";
      const studentId = await createUser(adminCtx, studentEmail, studentPassword);
      await enrollInCourse(adminCtx, seeded.orgId, seeded.courseId, studentId, "student");
      await createSubmissionAsStudent(studentEmail, studentPassword, seeded.courseId, seeded.assignmentId);

      const queue = (await apiGet(
        adminCtx,
        `/staff/submissions?course_id=${seeded.courseId}&status_filter=pending&limit=20`
      )) as unknown[];
      expect(queue.length).toBeGreaterThan(0);
      const submissionId = Number((queue[0] as ApiJson).id);

      await loginUi(page, staffEmail, staffPassword);
      await expect(page).toHaveURL(/\/staff/);

      await page.goto(`/staff/submissions/${submissionId}`);
      await expect(page.getByRole("heading", { name: seeded.assignmentTitle })).toBeVisible();
      await page.getByLabel(/Enable override/i).check();
      await page.getByPlaceholder("e.g. 8").fill("87");
      await page
        .getByPlaceholder(/Write structured feedback: correctness, style, and next steps\./i)
        .fill("Manual override from e2e");
      await page.getByRole("button", { name: /Publish override/i }).click();

      await expect(page.getByText(/^Graded$/).first()).toBeVisible();

      const refreshed = (await apiGet(adminCtx, `/staff/submissions/${submissionId}`)) as ApiJson;
      expect(refreshed.status).toBe("graded");
      expect(refreshed.score).toBe(87);
      expect(refreshed.feedback).toBe("Manual override from e2e");
    } finally {
      await adminCtx.dispose();
    }
  });

  test("invite accept", async ({ page }) => {
    const adminCtx = await createAdminContext();
    try {
      const suffix = uniqueStamp();
      const seeded = await seedCourseWithAssignment(adminCtx, suffix);
      const inviteeEmail = `e2e.invitee.${suffix}@example.com`;

      const inviteResponse = (await apiPost(adminCtx, `/staff/courses/${seeded.courseId}/invites/by-email`, {
        email: inviteeEmail,
        full_name: "E2E Invitee",
        student_number: `SN-${suffix.slice(-6)}`,
        programme: "Computer Science",
      })) as ApiJson;
      const inviteLinks = (inviteResponse.invite_links as unknown[]) ?? [];
      expect(inviteLinks.length).toBeGreaterThan(0);
      const invitePath = String(inviteLinks[0]);

      await page.goto(invitePath);
      await expect(page.getByText(/Invite ready to activate/i)).toBeVisible();
      await page.getByLabel(/^Password$/i).fill("Password123!");
      await page.getByLabel(/Confirm password/i).fill("Password123!");
      await page.getByRole("button", { name: /Complete Setup/i }).click();

      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByText(seeded.courseTitle)).toBeVisible();
    } finally {
      await adminCtx.dispose();
    }
  });
});
