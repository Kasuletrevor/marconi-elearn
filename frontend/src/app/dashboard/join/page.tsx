"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { student, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

const PROGRAMMES = ["BELE", "BSCE", "BBIO", "BSTE"] as const;

export default function JoinCoursePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [programme, setProgramme] = useState<(typeof PROGRAMMES)[number] | "">(
    ""
  );
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  async function join() {
    setIsJoining(true);
    setError("");
    try {
      const course = await student.joinCourseByCode({
        code: code.trim(),
        full_name: fullName.trim(),
        student_number: studentNumber.trim(),
        programme,
      });
      router.push(`/dashboard/courses/${course.id}`);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to join course");
    } finally {
      setIsJoining(false);
    }
  }

  if (error) {
    return (
      <EmptyState
        icon={Users}
        title="Could not join course"
        description={error}
        action={
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
        }
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>

        <PageHeader
          title="Join a course"
          description="Enter the self-enroll code and your student profile details."
        />
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Self-enroll code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. 4H9Q2KJM"
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Student number
            </label>
            <input
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              placeholder="e.g. 2100714449"
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Full name
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Programme
            </label>
            <select
              value={programme}
              onChange={(e) => setProgramme(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="">Select programme...</option>
              {PROGRAMMES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={join}
            disabled={
              isJoining ||
              !code.trim() ||
              !fullName.trim() ||
              !studentNumber.trim() ||
              !programme
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            Join course
          </button>
        </div>
      </div>
    </div>
  );
}
