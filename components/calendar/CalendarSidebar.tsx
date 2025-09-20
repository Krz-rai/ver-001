"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, ChevronLeft, ChevronRight, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskList } from "./TaskList";
import { Id } from "@/convex/_generated/dataModel";

interface CalendarSidebarProps {
  calendars?: Array<{
    _id: string;
    name: string;
    color: string;
    isDefault?: boolean;
  }>;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onGoToToday: () => void;
  onCreateCalendar: () => void;
  onVisibleCalendarsChange?: (calendarIds: string[]) => void;
  onCalendarSelect?: (calendarId: string) => void; // backward compat
  onOpenAISchedule?: () => void;
  onTaskClick?: (task: { _id: Id<"tasks">; scheduledEventId?: Id<"events">; title: string; }) => void;
  selectedTaskId?: Id<"tasks"> | null;
  onTaskEdit?: (task: any) => void;
}

export function CalendarSidebar({
  calendars: userCalendars = [],
  currentDate,
  onDateChange,
  onGoToToday,
  onCreateCalendar,
  onVisibleCalendarsChange,
  onCalendarSelect,
  onOpenAISchedule,
  onTaskClick,
  selectedTaskId,
  onTaskEdit,
}: CalendarSidebarProps) {
  // Normalize calendars
  const displayCalendars = useMemo(
    () =>
      (userCalendars || []).map((cal) => ({
        id: cal._id,
        name: cal.name,
        color: cal.color,
      })),
    [userCalendars]
  );

  const [visibleIds, setVisibleIds] = useState<string[]>(() =>
    displayCalendars.map((c) => c.id)
  );

  useEffect(() => {
    // Reset visible ids only when the set of calendar ids actually changes
    const newIds = displayCalendars.map((c) => c.id);
    setVisibleIds((prev) => {
      if (
        prev.length === newIds.length &&
        newIds.every((id) => prev.includes(id))
      ) {
        return prev; // no change
      }
      return newIds;
    });
  }, [displayCalendars]);

  useEffect(() => {
    onVisibleCalendarsChange?.(visibleIds);
  }, [visibleIds, onVisibleCalendarsChange]);

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDayOfWeek = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();

  const miniDays: Array<Date | null> = useMemo(() => {
    const days: Array<Date | null> = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), d));
    }
    // pad to complete weeks (6 rows * 7 days) to keep height stable
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [startDayOfWeek, daysInMonth, currentDate]);

  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(new Date());
  }, []);

  const isToday = (date: Date) => {
    if (!today) return false;
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Action Buttons */}
      <div className="px-6 py-4 border-b border-gray-200 h-20 flex items-center">
        <div className="flex gap-2 w-full">
          <Button onClick={onCreateCalendar} className="flex-1 h-10">
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
          <Button
            variant="outline"
            onClick={onOpenAISchedule}
            className="flex-1 h-10"
          >
            <Brain className="h-4 w-4 mr-2" />
            Add Tasks
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Mini calendar */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-900">
              {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
            <div className="flex items-center gap-1">
          <Button
                variant="outline"
            size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
            </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[11px] text-gray-500 mb-1">
            {"SMTWTFS".split("").map((d, i) => (
              <div key={`${d}-${i}`} className="text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {miniDays.map((d, i) => (
              <button
                key={i}
                className={cn(
                  "h-8 rounded-md text-sm flex items-center justify-center transition-colors",
                  d ? "hover:bg-gray-100" : "",
                  d && isSameDay(d, currentDate) && "bg-gray-900 text-white hover:bg-gray-900",
                  d && isToday(d) && !isSameDay(d, currentDate) && "ring-1 ring-gray-300"
                )}
                disabled={!d}
                onClick={() => d && onDateChange(d)}
              >
                {d ? d.getDate() : ""}
              </button>
            ))}
          </div>
          <div className="mt-2">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onGoToToday}>
              Today
            </Button>
          </div>
        </div>

        <Separator />

        {/* Task List */}
        <TaskList
          onTaskClick={onTaskClick}
          selectedTaskId={selectedTaskId}
          onTaskEdit={onTaskEdit}
        />

        <Separator />

        {/* Calendars toggles */}
        <div className="p-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Calendars</div>
          <div className="space-y-1">
            {displayCalendars.map((calendar) => {
              const isVisible = visibleIds.includes(calendar.id);
              return (
                <button
                  key={calendar.id}
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-50"
                  onClick={() => {
                    setVisibleIds((prev) =>
                      prev.includes(calendar.id)
                        ? prev.filter((id) => id !== calendar.id)
                        : [...prev, calendar.id]
                    );
                    onCalendarSelect?.(calendar.id);
                  }}
                >
                  <span
                    className={cn(
                      "w-3 h-3 rounded-full",
                      // dynamic tailwind class; relies on safelisted colors in config
                      `bg-${calendar.color}`,
                      !isVisible && "opacity-40"
                    )}
                  />
                  <span className={cn("text-sm text-gray-700", !isVisible && "opacity-60")}>{calendar.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
