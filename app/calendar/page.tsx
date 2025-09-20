"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Settings, Search } from "lucide-react";
import { CalendarGrid } from "../../components/calendar/CalendarGrid";
import { EventModal } from "../../components/calendar/EventModal";
import { CalendarSidebar } from "../../components/calendar/CalendarSidebar";
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<string[] | null>(null);

  // Convex queries and mutations - now use Clerk auth
  const calendars = useQuery(api.calendars.getUserCalendars);
  const stableCalendars = useMemo(() => calendars || [], [calendars]);
  const createDefaultCalendar = useMutation(api.calendars.createDefaultCalendar);
  const updateEvent = useMutation(api.events.updateEvent);

  // Ensure user has a default calendar
  useEffect(() => {
    if (calendars !== undefined && calendars.length === 0) {
      createDefaultCalendar();
    }
  }, [calendars, createDefaultCalendar]);

  // Get date range for current view
  const getDateRange = () => {
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
    setIsEventModalOpen(true);
  };

  const handleEventMove = async (eventId: string, newStartTime: number, newEndTime: number) => {
    try {
      await updateEvent({
        eventId: eventId as any,
        startTime: newStartTime,
        endTime: newEndTime,
      });
    } catch (error) {
      console.error('Failed to move event:', error);
      // You could add a toast notification here
    }
  };

  const handlePreviousPeriod = () => {
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
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 lg:space-x-6 min-w-0">
              <div className="flex items-center space-x-2 lg:space-x-3">
                <Calendar className="h-6 w-6 lg:h-7 lg:w-7 text-blue-600" />
                <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Calendar</h1>
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPeriod}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPeriod}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToday}
                  className="px-3 lg:px-4 h-8 text-sm font-medium hover:bg-gray-100"
                >
                  Today
                </Button>
              </div>
              
              <h2 className="text-sm lg:text-lg font-medium text-gray-700 min-w-0 truncate">
                {formatDateRange()}
              </h2>
            </div>
            
            <div className="flex items-center space-x-2 lg:space-x-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "month" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("month")}
                  className="px-2 lg:px-4 h-8 text-xs lg:text-sm font-medium"
                >
                  <span className="hidden sm:inline">Month</span>
                  <span className="sm:hidden">M</span>
                </Button>
                <Button
                  variant={viewMode === "week" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("week")}
                  className="px-2 lg:px-4 h-8 text-xs lg:text-sm font-medium"
                >
                  <span className="hidden sm:inline">Week</span>
                  <span className="sm:hidden">W</span>
                </Button>
                <Button
                  variant={viewMode === "day" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("day")}
                  className="px-2 lg:px-4 h-8 text-xs lg:text-sm font-medium"
                >
                  <span className="hidden sm:inline">Day</span>
                  <span className="sm:hidden">D</span>
                </Button>
              </div>
              
              {/* Action Buttons */}
              <Button variant="outline" size="sm" className="h-8 px-2 lg:px-3">
                <Search className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Search</span>
              </Button>
              <UserButton afterSignOutUrl="/" />
              <Button 
                onClick={() => setIsEventModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 h-8 px-3 lg:px-4 text-sm font-medium"
              >
                <Plus className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Create</span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Calendar Grid */}
        <div className="flex-1 overflow-hidden">
          <CalendarGrid
            currentDate={currentDate}
            viewMode={viewMode}
            onDateClick={handleDateClick}
            events={filteredEvents}
            calendars={stableCalendars}
          />
        </div>
      </div>
      
      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        selectedDate={selectedDate}
        calendars={calendars || []}
      />
    </div>
  );
}
