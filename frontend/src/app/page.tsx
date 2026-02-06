"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Code2,
  FileCode2,
  GraduationCap,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
};

const studentHighlights = [
  {
    title: "Submit code with confidence",
    description:
      "Upload C/C++ work, track each attempt, and understand compile vs runtime outcomes.",
    icon: FileCode2,
  },
  {
    title: "Know deadlines and penalties",
    description:
      "See due dates, late windows, and policy impact before you click submit.",
    icon: CalendarClock,
  },
  {
    title: "Readable grading feedback",
    description:
      "Test-case results are grouped clearly so you know what failed and why.",
    icon: CheckCircle2,
  },
];

const staffHighlights = [
  {
    title: "Assignment-level autograding",
    description:
      "Define tests once, then apply consistently across every student submission.",
    icon: BookOpen,
  },
  {
    title: "Roster and role control",
    description:
      "Manage course staff and students with clear, scoped permissions per course.",
    icon: Users,
  },
  {
    title: "Safe execution pipeline",
    description:
      "Untrusted code runs through isolated grading workers with predictable limits.",
    icon: ShieldCheck,
  },
];

const workflow = [
  {
    title: "Staff publish assignment",
    note: "Instructions, tests, due date, and grading mode are configured once.",
  },
  {
    title: "Students submit C/C++",
    note: "The queue receives each submission with full attempt history retained.",
  },
  {
    title: "Autograder runs tests",
    note: "Compile and runtime results are separated for actionable debugging.",
  },
  {
    title: "Feedback and review",
    note: "Students iterate faster while staff review edge cases and overrides.",
  },
];

const codeLines = [
  "#include <iostream>",
  "#include <vector>",
  "using namespace std;",
  "",
  "int sum_even(const vector<int>& values) {",
  "  int total = 0;",
  "  for (int v : values) {",
  "    if (v % 2 == 0) total += v;",
  "  }",
  "  return total;",
  "}",
];

function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--foreground)]">
            Marconi<span className="text-[var(--primary)]">.</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 text-sm md:flex">
          <a href="#students" className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
            Students
          </a>
          <a href="#staff" className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
            Staff
          </a>
          <a href="#workflow" className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
            Workflow
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-bold text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]">
            Sign In
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--primary-hover)]"
          >
            Open Platform
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

function EngineeringPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.15 }}
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_24px_60px_-42px_rgba(14,58,102,0.55)]"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/65 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-[var(--secondary)]/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-[var(--warning)]/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-[var(--success)]/80" />
        </div>
        <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-[11px] font-semibold text-[var(--muted-foreground)]">
          <Code2 className="h-3.5 w-3.5" />
          grader/session.cpp
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.45fr_1fr]">
        <div className="border-b border-[var(--border)] p-4 lg:border-b-0 lg:border-r">
          <pre className="overflow-x-auto rounded-lg bg-[var(--code-surface)] p-4 text-[12px] leading-6 text-[var(--code-foreground)]">
            {codeLines.map((line, idx) => (
              <motion.div
                key={`${line}-${idx}`}
                initial={{ opacity: 0.25 }}
                animate={{ opacity: [0.25, 1, 0.7] }}
                transition={{ delay: 0.08 * idx, duration: 2.8, repeat: Infinity, repeatDelay: 1.8 }}
                className="font-[family-name:var(--font-mono)]"
              >
                <span className="mr-3 select-none text-[var(--code-line-number)]">{String(idx + 1).padStart(2, "0")}</span>
                {line || " "}
              </motion.div>
            ))}
          </pre>
        </div>

        <div className="space-y-4 p-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              <Clock3 className="h-3.5 w-3.5" />
              Queue
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center justify-between">
                <span>SUB-4821</span>
                <span className="rounded bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--primary)]">grading</span>
              </p>
              <p className="flex items-center justify-between">
                <span>SUB-4822</span>
                <span className="rounded bg-[var(--muted)] px-2 py-0.5 text-xs font-semibold text-[var(--muted-foreground)]">pending</span>
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Test Results
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  test_even_sum
                </span>
                <span className="font-semibold text-emerald-700">PASS</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-[var(--secondary)]" />
                  test_negative_range
                </span>
                <span className="font-semibold text-[var(--secondary)]">FAIL</span>
              </p>
              <p className="rounded bg-[var(--secondary)]/10 px-2 py-1 text-xs text-[var(--secondary)]">
                Runtime mismatch at case #2: expected 12, received 10
              </p>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--primary)]/10 blur-3xl"
        animate={{ scale: [1, 1.16, 1] }}
        transition={{ duration: 5.4, repeat: Infinity }}
      />
    </motion.div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            "linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />
      <motion.div
        className="pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-[var(--primary)]/10 blur-3xl"
        animate={{ x: [0, 26, 0], y: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div
        className="pointer-events-none absolute -right-24 bottom-16 h-72 w-72 rounded-full bg-[var(--secondary)]/10 blur-3xl"
        animate={{ x: [0, -24, 0], y: [0, 18, 0] }}
        transition={{ duration: 11, repeat: Infinity }}
      />

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.08fr_1fr] lg:items-center">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-2xl">
          <motion.p
            variants={fadeInUp}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--primary)]"
          >
            C/C++ coursework platform
          </motion.p>
          <motion.h1
            variants={fadeInUp}
            className="font-[family-name:var(--font-display)] text-5xl font-bold leading-[1.04] tracking-tight text-[var(--foreground)] md:text-7xl"
          >
            Built for students
            <br />
            <span className="text-[var(--primary)]">ready to ship working code.</span>
          </motion.h1>
          <motion.p variants={fadeInUp} className="mt-6 text-lg leading-relaxed text-[var(--muted-foreground)] md:text-xl">
            Marconi keeps the student path fast and clear, while giving staff the controls needed to run serious programming courses.
            Submissions, autograding, modules, and roster operations all live in one engineering workflow.
          </motion.p>
          <motion.div variants={fadeInUp} className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--primary-hover)]"
            >
              Student Login
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-sm font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
            >
              Staff Console
            </Link>
          </motion.div>
          <motion.div variants={fadeInUp} className="mt-12 grid grid-cols-3 gap-5">
            <div>
              <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--primary)]">C/C++</p>
              <p className="text-sm text-[var(--muted-foreground)]">Native assignment support</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--primary)]">Queue</p>
              <p className="text-sm text-[var(--muted-foreground)]">Reliable grading pipeline</p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--primary)]">Tests</p>
              <p className="text-sm text-[var(--muted-foreground)]">Assignment-level consistency</p>
            </div>
          </motion.div>
        </motion.div>

        <EngineeringPanel />
      </div>
    </section>
  );
}

function AudienceSection() {
  return (
    <section className="py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <motion.div
            id="students"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8"
          >
            <motion.p variants={fadeInUp} className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
              Student First
            </motion.p>
            <motion.h2 variants={fadeInUp} className="mt-2 text-3xl font-bold text-[var(--foreground)] md:text-4xl">
              The daily experience is built around student momentum.
            </motion.h2>
            <motion.div variants={stagger} className="mt-7 grid gap-4">
              {studentHighlights.map((item) => (
                <motion.div
                  key={item.title}
                  variants={fadeInUp}
                  className="flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/12 text-[var(--primary)]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-[var(--foreground)]">{item.title}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            id="staff"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-8"
          >
            <motion.p variants={fadeInUp} className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--secondary)]">
              Staff Control
            </motion.p>
            <motion.h3 variants={fadeInUp} className="mt-2 text-2xl font-bold text-[var(--foreground)]">
              Staff tools stay focused and production-safe.
            </motion.h3>
            <motion.div variants={stagger} className="mt-6 space-y-3">
              {staffHighlights.map((item) => (
                <motion.div
                  key={item.title}
                  variants={fadeInUp}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
                >
                  <div className="mb-2 flex items-center gap-2 text-[var(--foreground)]">
                    <item.icon className="h-4 w-4 text-[var(--secondary)]" />
                    <p className="font-semibold">{item.title}</p>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">{item.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="border-y border-[var(--border)] bg-[var(--card)] py-24">
      <div className="mx-auto w-full max-w-6xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="mb-12"
        >
          <motion.p variants={fadeInUp} className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
            Engineering Workflow
          </motion.p>
          <motion.h2 variants={fadeInUp} className="mt-2 text-3xl font-bold text-[var(--foreground)] md:text-5xl">
            One path from assignment design to learner feedback.
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          className="grid gap-4 md:grid-cols-2"
        >
          {workflow.map((item, idx) => (
            <motion.div
              key={item.title}
              variants={fadeInUp}
              className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6"
            >
              <motion.div
                className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--primary)]"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 5.2, repeat: Infinity, delay: idx * 0.45 }}
              />
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Step {String(idx + 1).padStart(2, "0")}
              </p>
              <p className="text-xl font-bold text-[var(--foreground)]">{item.title}</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{item.note}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-24">
      <div className="mx-auto w-full max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--primary)] p-10 text-center md:p-14"
        >
          <motion.div
            className="pointer-events-none absolute -left-12 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 7.4, repeat: Infinity }}
          />
          <h2 className="relative z-10 text-3xl font-bold text-white md:text-4xl">
            Build stronger coding outcomes this semester.
          </h2>
          <p className="relative z-10 mx-auto mt-4 max-w-2xl text-white/80">
            Students get fast, understandable feedback. Staff get a reliable grading and course-operations surface.
          </p>
          <Link
            href="/login"
            className="relative z-10 mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-[var(--primary)] transition-colors hover:bg-white/90"
          >
            Launch Marconi
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-5 px-6 text-sm text-[var(--muted-foreground)] md:flex-row">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary)] text-white">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--foreground)]">Marconi</span>
        </div>
        <p>Built for programming courses at university scale.</p>
        <p>&copy; {new Date().getFullYear()} Makerere University</p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Navbar />
      <HeroSection />
      <AudienceSection />
      <WorkflowSection />
      <CTASection />
      <Footer />
    </main>
  );
}
