"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, Filter } from "lucide-react";
import { AssignmentCalendar, type AssignmentCalendarEvent } from "@/components/calendar/AssignmentCalendar";
import { ApiError, courseStaff, type Course, type StaffCalendarEvent } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";

type DateRange = { startsAt: string; endsAt: string };

export default function StaffCalendarPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [range, setRange] = useState<DateRange | null>(null);
  const [events, setEvents] = useState<StaffCalendarEvent[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const data = await courseStaff.listCourses();
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
      const data = await courseStaff.getCalendarEvents({
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
        id: `staff-${event.course_id}-${event.assignment_id}`,
        title: event.assignment_title,
        dueDate: event.due_date,
        courseCode: event.course_code,
        courseTitle: event.course_title,
        href: `/staff/courses/${event.course_id}/assignments/${event.assignment_id}`,
      })),
    [events]
  );

  const now = Date.now();
  const weekAhead = now + 7 * 24 * 60 * 60 * 1000;
  const dueThisWeek = events.filter((event) => {
    const at = new Date(event.due_date).getTime();
    return at >= now && at <= weekAhead;
  }).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Calendar"
        description="See assignment due dates across your staff courses and jump straight into grading setup."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 min-w-[160px]">
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Visible deadlines</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{events.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 min-w-[160px]">
            <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">Due in 7 days</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{dueThisWeek}</p>
          </div>
        </div>
        <Link
          href="/staff/submissions"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm font-medium hover:bg-[var(--background)] transition-colors"
        >
          Open submissions queue
          <ArrowRight className="w-4 h-4" />
        </Link>
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
            className="min-w-[250px] rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            <option value="">All staff courses</option>
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
