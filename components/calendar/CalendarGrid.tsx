"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CalendarEvent {
  _id: string;
  title: string;
  startTime: number;
  endTime: number;
  calendarId: string;
  isAllDay?: boolean;
  location?: string;
  description?: string;
}

interface Calendar {
  _id: string;
  name: string;
  color: string;
}

interface CalendarGridProps {
  currentDate: Date;
  viewMode: "month" | "week" | "day";
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onViewModeChange?: (mode: "month" | "week" | "day") => void;
  onCurrentDateChange?: (date: Date) => void;
  events?: CalendarEvent[];
  calendars?: Calendar[];
  highlightedEventId?: Id<"events"> | null;
}

export function CalendarGrid({ currentDate, viewMode, onDateClick, onEventClick, onViewModeChange, onCurrentDateChange, events = [], calendars = [], highlightedEventId }: CalendarGridProps) {
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [showAllEventsDate, setShowAllEventsDate] = useState<Date | null>(null);
  const updateEvent = useMutation(api.events.updateEvent);

  const getColorClass = (calendarId: string, eventId?: string) => {
    const calendar = calendars.find(cal => cal._id === calendarId);
    const colorName = calendar?.color || 'blue';

    // Check if this event is highlighted
    const isHighlighted = highlightedEventId && eventId === highlightedEventId;

    const colorMap: Record<string, string> = {
      'red': isHighlighted ? 'bg-red-600 border-red-700 ring-2 ring-blue-400 ring-offset-1' : 'bg-red-500 border-red-600',
      'blue': isHighlighted ? 'bg-blue-600 border-blue-700 ring-2 ring-blue-400 ring-offset-1' : 'bg-blue-500 border-blue-600',
      'green': isHighlighted ? 'bg-green-600 border-green-700 ring-2 ring-blue-400 ring-offset-1' : 'bg-green-500 border-green-600',
      'yellow': isHighlighted ? 'bg-yellow-600 border-yellow-700 ring-2 ring-blue-400 ring-offset-1' : 'bg-yellow-500 border-yellow-600',
      'purple': isHighlighted ? 'bg-purple-600 border-purple-700 ring-2 ring-blue-400 ring-offset-1' : 'bg-purple-500 border-purple-600',
      'pink': isHighlighted ? 'bg-pink-600 border-pink-700 ring-2 ring-blue-400 ring-offset-1' : 'bg-pink-500 border-pink-600',
      'indigo': isHighlighted ? 'bg-indigo-600 border-indigo-700 ring-2 ring-blue-400 ring-offset-1' : 'bg-indigo-500 border-indigo-600',
      'orange': isHighlighted ? 'bg-orange-600 border-orange-700 ring-2 ring-blue-400 ring-offset-1' : 'bg-orange-500 border-orange-600',
      'teal': isHighlighted ? 'bg-teal-600 border-teal-700 ring-2 ring-blue-400 ring-offset-1' : 'bg-teal-500 border-teal-600',
      'cyan': isHighlighted ? 'bg-cyan-600 border-cyan-700 ring-2 ring-blue-400 ring-offset-1' : 'bg-cyan-500 border-cyan-600',
    };
    return colorMap[colorName] || (isHighlighted ? 'bg-blue-600 border-blue-700 ring-2 ring-blue-400 ring-offset-1' : 'bg-blue-500 border-blue-600');
  };

  const formatTime = (date: Date) => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime * 1000);
      const eventDateLocal = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      const targetDateLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return eventDateLocal.getTime() === targetDateLocal.getTime();
    });
  };

  const handleEventDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    setDraggedEvent(event);
  };

  const handleEventDrop = async (e: React.DragEvent, newStartHour: number, date?: Date) => {
    e.preventDefault();
    if (!draggedEvent) return;

    const targetDate = date || currentDate;
    const newStart = new Date(targetDate);
    newStart.setHours(newStartHour, 0, 0, 0);

    const duration = draggedEvent.endTime - draggedEvent.startTime;
    const newStartTime = Math.floor(newStart.getTime() / 1000);
    const newEndTime = newStartTime + duration;

    try {
      await updateEvent({
        eventId: draggedEvent._id as Id<"events">,
        startTime: newStartTime,
        endTime: newEndTime,
      });
    } catch (error) {
      console.error('Failed to update event:', error);
    }

    setDraggedEvent(null);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Month View
  if (viewMode === "month") {
    const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      const days = [];
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
      }
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(new Date(year, month, day));
      }
      return days;
    };

    const days = getDaysInMonth(currentDate);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <div className="h-full flex flex-col bg-white">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {dayNames.map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-600">{day}</div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 auto-rows-fr">
          {days.map((day, index) => (
            <div
              key={index}
              className={cn(
                "border-r border-b border-gray-50 p-2 min-h-[100px] cursor-pointer hover:bg-gray-25 transition-colors",
                !day && "bg-gray-25",
                day && isToday(day) && "bg-blue-25",
                day && !isCurrentMonth(day) && "text-gray-300"
              )}
              onClick={() => {
                if (day && onViewModeChange && onCurrentDateChange) {
                  onCurrentDateChange(day);
                  onViewModeChange("day");
                }
              }}
            >
              {day && (
                <>
                  <div className={cn(
                    "text-sm font-medium mb-2 flex items-center justify-between",
                    isToday(day) && "text-blue-600",
                    !isCurrentMonth(day) && "text-gray-300"
                  )}>
                    <span>{day.getDate()}</span>
                    {isToday(day) && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>}
                  </div>
                  <div className="space-y-1">
                    {getEventsForDate(day).slice(0, 3).map((event) => (
                      <div
                        key={event._id}
                        className={cn(
                          "text-xs px-2 py-1 rounded cursor-pointer hover:opacity-90 text-white font-medium",
                          getColorClass(event.calendarId, event._id)
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {getEventsForDate(day).length > 3 && (
                      <div
                        className="text-xs text-blue-500 hover:text-blue-700 px-2 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAllEventsDate(day);
                        }}
                      >
                        +{getEventsForDate(day).length - 3} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* All Events Modal */}
        <Dialog open={!!showAllEventsDate} onOpenChange={() => setShowAllEventsDate(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {showAllEventsDate?.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {showAllEventsDate && getEventsForDate(showAllEventsDate).map((event) => (
                <div
                  key={event._id}
                  className={cn(
                    "p-3 rounded cursor-pointer hover:opacity-90 text-white font-medium",
                    getColorClass(event.calendarId, event._id)
                  )}
                  onClick={() => {
                    onEventClick(event);
                    setShowAllEventsDate(null);
                  }}
                >
                  <div className="font-medium">{event.title}</div>
                  {!event.isAllDay && (
                    <div className="text-xs opacity-75 mt-1">
                      {formatTime(new Date(event.startTime * 1000))} - {formatTime(new Date(event.endTime * 1000))}
                    </div>
                  )}
                  {event.location && (
                    <div className="text-xs opacity-75">📍 {event.location}</div>
                  )}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Week View
  if (viewMode === "week") {
    const getWeekDays = (date: Date) => {
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        weekDays.push(day);
      }
      return weekDays;
    };

    const weekDays = getWeekDays(currentDate);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex border-b border-gray-100">
          <div className="w-12"></div>
          <div className="flex-1 grid grid-cols-7">
            {weekDays.map((day, index) => (
              <div key={index} className="p-3 text-center border-l border-gray-50">
                <div className="text-sm font-medium text-gray-600">{dayNames[index]}</div>
                <div className={cn(
                  "text-lg font-semibold",
                  isToday(day) && "text-blue-600 bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                )}>
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            <div className="w-12">
              {hours.map((hour) => (
                <div key={hour} className="h-12 flex items-center justify-end pr-1 text-xs text-gray-500 border-b border-gray-50">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7">
              {weekDays.map((day, dayIndex) => (
              <div key={dayIndex} className="border-l border-gray-50">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-12 border-b border-gray-50 relative cursor-pointer hover:bg-blue-25 transition-colors"
                    onClick={() => onDateClick(day)}
                    onDrop={(e) => handleEventDrop(e, hour, day)}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {getEventsForDate(day)
                      .filter((event) => {
                        const eventDate = new Date(event.startTime * 1000);
                        return eventDate.getHours() === hour;
                      })
                      .map((event) => {
                        const startTime = new Date(event.startTime * 1000);
                        const endTime = new Date(event.endTime * 1000);
                        const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                        const height = Math.max(duration * 48, 24);

                        return (
                          <div
                            key={event._id}
                            draggable
                            onDragStart={(e) => handleEventDragStart(e, event)}
                            className={cn(
                              "absolute left-1 right-1 rounded px-2 py-1 text-xs text-white font-medium cursor-pointer hover:opacity-90",
                              getColorClass(event.calendarId, event._id)
                            )}
                            style={{ height: `${height}px`, zIndex: 10 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(event);
                            }}
                          >
                            <div className="truncate">{event.title}</div>
                            <div className="text-xs opacity-75">{formatTime(startTime)} - {formatTime(endTime)}</div>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Day View
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const now = new Date();
  const isCurrentDay = isToday(currentDate);
  const currentHour = now.getHours();

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="flex">
          <div className="w-20 border-r border-gray-100">
            {hours.map((hour) => (
              <div key={hour} className="h-16 flex items-center justify-end pr-4 text-sm text-gray-500 border-b border-gray-50">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>
          <div className="flex-1">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-16 border-b border-gray-50 relative cursor-pointer hover:bg-blue-25 transition-colors"
                onClick={() => onDateClick(currentDate)}
                onDrop={(e) => handleEventDrop(e, hour)}
                onDragOver={(e) => e.preventDefault()}
              >
                {isCurrentDay && currentHour === hour && (
                  <div className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 top-4">
                    <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
                  </div>
                )}
                {getEventsForDate(currentDate)
                  .filter((event) => {
                    const eventDate = new Date(event.startTime * 1000);
                    return eventDate.getHours() === hour;
                  })
                  .map((event) => {
                    const startTime = new Date(event.startTime * 1000);
                    const endTime = new Date(event.endTime * 1000);
                    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
                    const height = Math.max(duration * 64, 32);

                    return (
                      <div
                        key={event._id}
                        draggable
                        onDragStart={(e) => handleEventDragStart(e, event)}
                        className={cn(
                          "absolute left-2 right-2 rounded-lg px-3 py-2 text-sm text-white font-medium cursor-pointer hover:opacity-90 shadow-sm",
                          getColorClass(event.calendarId, event._id)
                        )}
                        style={{ height: `${height}px`, zIndex: 10 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="text-xs opacity-90 mt-1">{formatTime(startTime)} - {formatTime(endTime)}</div>
                        {event.location && <div className="text-xs opacity-75 truncate">📍 {event.location}</div>}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}