"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CalendarGrid } from "../../components/calendar/CalendarGrid";
import { EventModal } from "../../components/calendar/EventModal";
import { CalendarSidebar } from "../../components/calendar/CalendarSidebar";
import AIScheduleModal from "../../components/ai-schedule-modal";
import { Authenticated, Unauthenticated } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { SignInButton, UserButton } from "@clerk/nextjs";

export default function CalendarPage() {
  return (
    <>
      <Authenticated>
        <CalendarContent />
      </Authenticated>
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please sign in to access the calendar</h1>
            <p className="text-gray-600 mb-6">You need to be authenticated to view your calendar.</p>
            <SignInButton mode="modal">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Sign In
              </Button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>
    </>
  );
}

function CalendarContent() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<{ _id: string; title: string; description?: string; startTime: number; endTime: number; calendarId: string; isAllDay?: boolean } | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isAIScheduleModalOpen, setIsAIScheduleModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<string[] | null>(null);

  // Initialize currentDate on client side to prevent hydration mismatch
  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  // Convex queries and mutations - now use Clerk auth
  const calendars = useQuery(api.calendars.getUserCalendars);
  const stableCalendars = useMemo(() => calendars || [], [calendars]);
  const createDefaultCalendar = useMutation(api.calendars.createDefaultCalendar);

  // Ensure user has a default calendar
  useEffect(() => {
    if (calendars !== undefined && calendars.length === 0) {
      createDefaultCalendar();
    }
  }, [calendars, createDefaultCalendar]);

  // Get date range for current view
  const getDateRange = () => {
    if (!currentDate) return { startDate: 0, endDate: 0 };
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return {
      startDate: Math.floor(startOfMonth.getTime() / 1000),
      endDate: Math.floor(endOfMonth.getTime() / 1000),
    };
  };

  const dateRange = getDateRange();
  const monthEvents = useQuery(api.events.getUserEvents, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });

  const filteredEvents = useMemo(() => {
    const events = monthEvents || [];
    if (!visibleCalendarIds || visibleCalendarIds.length === 0) return events;
    return events.filter((e) => visibleCalendarIds.includes(e.calendarId as unknown as string));
  }, [monthEvents, visibleCalendarIds]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEventClick = (event: { _id: string; title: string; description?: string; startTime: number; endTime: number; calendarId: string; isAllDay?: boolean }) => {
    setSelectedEvent(event);
    setSelectedDate(null);
    setIsEventModalOpen(true);
  };

  // Removed unused handleEventMove function

  const handlePreviousPeriod = () => {
    if (!currentDate) return;
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNextPeriod = () => {
    if (!currentDate) return;
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const formatDateRange = () => {
    if (!currentDate) return "Loading...";
    
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("en-US", { 
        month: "long", 
        year: "numeric" 
      });
    } else if (viewMode === "week") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return `${startOfWeek.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric" 
      })} - ${endOfWeek.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric",
        year: "numeric"
      })}`;
    } else {
      return currentDate.toLocaleDateString("en-US", { 
        weekday: "long",
        month: "long", 
        day: "numeric",
        year: "numeric"
      });
    }
  };

  // Show loading state while currentDate is being initialized
  if (!currentDate) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <CalendarSidebar
          onCreateCalendar={() => setIsEventModalOpen(true)}
          calendars={stableCalendars}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onGoToToday={handleToday}
          onVisibleCalendarsChange={setVisibleCalendarIds}
          onOpenAISchedule={() => setIsAIScheduleModalOpen(true)}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 h-20 flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-6">
              <h1 className="text-2xl font-semibold text-gray-900">{formatDateRange()}</h1>

              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePreviousPeriod}
                  className="h-8 w-8 p-0"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextPeriod}
                  className="h-8 w-8 p-0"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Today Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className="px-3 h-8 text-sm"
              >
                Today
              </Button>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "month" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("month")}
                  className="px-3 h-7 text-sm"
                >
                  Month
                </Button>
                <Button
                  variant={viewMode === "week" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("week")}
                  className="px-3 h-7 text-sm"
                >
                  Week
                </Button>
                <Button
                  variant={viewMode === "day" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("day")}
                  className="px-3 h-7 text-sm"
                >
                  Day
                </Button>
              </div>

              {/* User Button - Far Right */}
              <UserButton />
            </div>
          </div>
        </div>
        
        {/* Calendar Grid */}
        <div className="flex-1 overflow-hidden">
          <CalendarGrid
            currentDate={currentDate}
            viewMode={viewMode}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            onViewModeChange={setViewMode}
            onCurrentDateChange={setCurrentDate}
            events={filteredEvents}
            calendars={stableCalendars}
          />
        </div>
      </div>
      
      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
          setSelectedDate(null);
        }}
        selectedDate={selectedDate}
        selectedEvent={selectedEvent}
        calendars={calendars || []}
      />

      {/* AI Schedule Modal */}
      <AIScheduleModal
        isOpen={isAIScheduleModalOpen}
        onClose={() => setIsAIScheduleModalOpen(false)}
        defaultCalendarId={stableCalendars.find(cal => cal.isDefault)?._id || stableCalendars[0]?._id}
      />
    </div>
  );
}
