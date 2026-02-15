"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg, EventContentArg, EventInput } from "@fullcalendar/core";
import { Calendar, Loader2, RotateCcw } from "lucide-react";

export interface AssignmentCalendarEvent {
  id: string;
  title: string;
  dueDate: string;
  courseCode: string;
  courseTitle: string;
  href: string;
  hasExtension?: boolean;
}

interface AssignmentCalendarProps {
  events: AssignmentCalendarEvent[];
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRetry?: () => void;
  onVisibleRangeChange?: (range: { startsAt: string; endsAt: string }) => void;
}

export function AssignmentCalendar({
  events,
  isLoading = false,
  error,
  emptyMessage = "No assignment deadlines in this range.",
  onRetry,
  onVisibleRangeChange,
}: AssignmentCalendarProps) {
  const router = useRouter();

  const calendarEvents = useMemo<EventInput[]>(
    () =>
      events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.dueDate,
        allDay: false,
        extendedProps: {
          href: event.href,
          courseCode: event.courseCode,
          courseTitle: event.courseTitle,
          hasExtension: Boolean(event.hasExtension),
        },
      })),
    [events]
  );

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      arg.jsEvent.preventDefault();
      const href = arg.event.extendedProps?.href as string | undefined;
      if (href) router.push(href);
    },
    [router]
  );

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      if (!onVisibleRangeChange) return;
      onVisibleRangeChange({
        startsAt: arg.start.toISOString(),
        endsAt: arg.end.toISOString(),
      });
    },
    [onVisibleRangeChange]
  );

  const renderEventContent = useCallback((arg: EventContentArg) => {
    const courseCode = (arg.event.extendedProps?.courseCode as string | undefined) ?? "";
    const hasExtension = Boolean(arg.event.extendedProps?.hasExtension);
    return (
      <div className="marconi-fc-event">
        <span className="marconi-fc-course">{courseCode}</span>
        <span className="marconi-fc-title">{arg.event.title}</span>
        {hasExtension && <span className="marconi-fc-extension">EXT</span>}
      </div>
    );
  }, []);

  if (isLoading) {
    return (
      <div className="p-10 rounded-2xl border border-[var(--border)] bg-[var(--card)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-center">
        <p className="text-sm text-[var(--secondary)] mb-4">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="marconi-calendar rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 lg:p-6">
      {events.length === 0 ? (
        <div className="p-12 text-center">
          <Calendar className="w-8 h-8 mx-auto text-[var(--muted-foreground)] mb-3" />
          <p className="text-sm text-[var(--muted-foreground)]">{emptyMessage}</p>
        </div>
      ) : (
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height="auto"
          events={calendarEvents}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          eventContent={renderEventContent}
          dayMaxEvents={3}
          fixedWeekCount={false}
          nowIndicator
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,listWeek",
          }}
          buttonText={{
            today: "Today",
            month: "Month",
            week: "Week",
            list: "Agenda",
          }}
        />
      )}
    </div>
  );
}
