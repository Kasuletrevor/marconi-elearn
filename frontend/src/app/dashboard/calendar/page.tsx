"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Filter } from "lucide-react";
import { AssignmentCalendar, type AssignmentCalendarEvent } from "@/components/calendar/AssignmentCalendar";
import { ApiError, student, type Course, type StudentCalendarEvent } from "@/lib/api";

type DateRange = { startsAt: string; endsAt: string };

export default function StudentCalendarPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [range, setRange] = useState<DateRange | null>(null);
  const [events, setEvents] = useState<StudentCalendarEvent[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const data = await student.getCourses();
        setCourses(data);
      } catch (err) {
        if (err instanceof ApiError) setError(err.detail);
        else setError("Failed to load courses");
      } finally {
        setIsLoadingCourses(false);
      }
    }
    fetchCourses();
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!range) return;
    setIsLoadingEvents(true);
    setError(null);
    try {
      const data = await student.getCalendarEvents({
        course_id: selectedCourseId ?? undefined,
        starts_at: range.startsAt,
        ends_at: range.endsAt,
        limit: 1000,
      });
      setEvents(data);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to load calendar events");
    } finally {
      setIsLoadingEvents(false);
    }
  }, [range, selectedCourseId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRangeChange = useCallback((nextRange: DateRange) => {
    setRange((current) => {
      if (current?.startsAt === nextRange.startsAt && current?.endsAt === nextRange.endsAt) return current;
      return nextRange;
    });
  }, []);

  const calendarEvents = useMemo<AssignmentCalendarEvent[]>(
    () =>
      events.map((event) => ({
        id: `student-${event.course_id}-${event.assignment_id}`,
        title: event.assignment_title,
        dueDate: event.effective_due_date,
        courseCode: event.course_code,
        courseTitle: event.course_title,
        href: `/dashboard/courses/${event.course_id}/assignments/${event.assignment_id}`,
        hasExtension: event.has_extension,
      })),
    [events]
  );

  const now = Date.now();
  const weekAhead = now + 7 * 24 * 60 * 60 * 1000;
  const dueThisWeek = events.filter((event) => {
    const at = new Date(event.effective_due_date).getTime();
    return at >= now && at <= weekAhead;
  }).length;
  const extensionCount = events.filter((event) => event.has_extension).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--foreground)]">
            My Calendar
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Track assignment deadlines across all your courses.
          </p>
        </div>
        <Link
          href="/dashboard/submissions"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm font-medium hover:bg-[var(--background)] transition-colors"
        >
          View submissions
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Visible deadlines</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{events.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Due in 7 days</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{dueThisWeek}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">With extensions</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{extensionCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--foreground)] mb-2 flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--primary)]" />
            Course filter
          </p>
          <select
            value={selectedCourseId ?? ""}
            onChange={(event) =>
              setSelectedCourseId(event.target.value ? Number(event.target.value) : null)
            }
            disabled={isLoadingCourses}
            className="min-w-[220px] rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            <option value="">All courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} — {course.title}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            Month/Week/Agenda views
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="w-3.5 h-3.5" />
            Click event to open assignment
          </span>
        </div>
      </div>

      <AssignmentCalendar
        events={calendarEvents}
        isLoading={isLoadingEvents}
        error={error}
        onRetry={fetchEvents}
        onVisibleRangeChange={handleRangeChange}
      />
    </div>
  );
}
