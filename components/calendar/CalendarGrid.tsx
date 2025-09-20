"use client";

import { cn } from "@/lib/utils";

interface CalendarGridProps {
  currentDate: Date;
  viewMode: "month" | "week" | "day";
  onDateClick: (date: Date) => void;
  events?: Array<{
    _id: string;
    title: string;
    startTime: number;
    endTime: number;
    calendarId: string;
    isAllDay?: boolean;
    location?: string;
  }>;
  calendars?: Array<{
    _id: string;
    name: string;
    color: string;
  }>;
}



export function CalendarGrid({ currentDate, viewMode, onDateClick, events = [], calendars = [] }: CalendarGridProps) {

  // Create a map of calendar colors
  const calendarColorMap = calendars.reduce((acc, cal) => {
    acc[cal._id] = cal.color;
    return acc;
  }, {} as Record<string, string>);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

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

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      // Convert Unix timestamp to Date
      const eventDate = new Date(event.startTime * 1000);
      return eventDate.toDateString() === date.toDateString();
    }).map(event => ({
      id: event._id,
      title: event.title,
      startTime: new Date(event.startTime * 1000), // Convert from Unix timestamp
      endTime: new Date(event.endTime * 1000),     // Convert from Unix timestamp
      color: `bg-${calendarColorMap[event.calendarId] || 'blue-500'}`,
      isAllDay: event.isAllDay,
      location: event.location,
    }));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <div className="h-full flex flex-col bg-white">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {dayNames.map((day) => (
            <div key={day} className="p-2 lg:p-3 text-center text-xs lg:text-sm font-medium text-gray-500 border-r border-gray-200 last:border-r-0">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6">
          {days.map((day, index) => (
            <div
              key={index}
              className={cn(
                "border-r border-b border-gray-200 p-1 lg:p-2 min-h-[80px] lg:min-h-[120px] cursor-pointer hover:bg-gray-50 transition-colors relative",
                !day && "bg-gray-50",
                day && isToday(day) && "bg-blue-50",
                day && !isCurrentMonth(day) && "text-gray-400 bg-gray-50"
              )}
              onClick={() => day && onDateClick(day)}
            >
              {day && (
                <>
                  {/* Date number */}
                  <div className={cn(
                    "text-xs lg:text-sm font-medium mb-1 lg:mb-2 flex items-center justify-between",
                    isToday(day) && "text-blue-600",
                    !isCurrentMonth(day) && "text-gray-400"
                  )}>
                    <span>{day.getDate()}</span>
                    {isToday(day) && (
                      <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-600 rounded-full"></div>
                    )}
                  </div>
                  
                  {/* Events for this day */}
                  <div className="space-y-0.5">
                    {getEventsForDate(day).slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded-sm cursor-pointer hover:opacity-90 transition-opacity truncate",
                          event.color,
                          "text-white font-medium"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle event click
                        }}
                      >
                        <div className="truncate">{event.title}</div>
                        {!event.isAllDay && (
                          <div className="text-xs opacity-75 truncate mt-0.5 hidden lg:block">
                            {event.startTime.toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                    {getEventsForDate(day).length > 3 && (
                      <div className="text-xs text-gray-500 font-medium cursor-pointer hover:text-gray-700 px-1">
                        +{getEventsForDate(day).length - 3} more
                      </div>
                    )}
                  </div>
                  
                  {/* Add event button (appears on hover) */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      +
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const now = new Date();
    const isCurrentWeek = weekDays.some((d) => d.toDateString() === now.toDateString());
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    return (
      <div className="h-full flex flex-col bg-white">
        {/* Day headers */}
        <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
          <div className="w-16 border-r border-gray-200"></div>
          {dayNames.map((day, index) => (
            <div key={day} className="p-3 text-center border-r border-gray-200">
              <div className="text-sm font-medium text-gray-500">{day}</div>
              <div className={cn(
                "text-lg font-semibold mt-1",
                isToday(weekDays[index]) && "text-blue-600 bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mx-auto"
              )}>
                {weekDays[index].getDate()}
              </div>
            </div>
          ))}
        </div>
        
        {/* Week grid with time slots */}
        <div className="flex-1 flex relative">
          {/* Time column */}
          <div className="w-16 border-r border-gray-200 bg-gray-50">
            {hours.map((hour) => (
              <div key={hour} className="h-12 border-b border-gray-100 flex items-start justify-end pr-2 pt-1">
                <span className="text-xs text-gray-500">
                  {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
                </span>
              </div>
            ))}
          </div>
          
          {/* Day columns */}
          <div className="flex-1 grid grid-cols-7">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="border-r border-gray-200 relative">
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-12 border-b border-gray-100 relative cursor-pointer hover:bg-gray-50 group"
                    onClick={() => {
                      const date = new Date(day);
                      date.setHours(hour, 0, 0, 0);
                      onDateClick(date);
                    }}
                  >
                    {/* Hour line indicator */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gray-200 group-hover:bg-blue-200"></div>
                    
                    {/* Events for this hour */}
                    {getEventsForDate(day)
                      .filter(event => {
                        const eventStartHour = event.startTime.getHours();
                        const eventEndHour = event.endTime.getHours();
                        return eventStartHour <= hour && eventEndHour >= hour;
                      })
                      .map((event) => {
                        const eventStartHour = event.startTime.getHours();
                        const eventEndHour = event.endTime.getHours();
                        const eventDuration = eventEndHour - eventStartHour;
                        const topOffset = eventStartHour === hour ? 0 : 0;
                        const height = eventDuration > 0 ? `${eventDuration * 48}px` : '24px';
                        
                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "absolute left-1 right-1 rounded-md text-xs px-2 py-1 text-white cursor-pointer hover:opacity-90 transition-opacity",
                              event.color,
                              eventStartHour === hour ? "top-1" : "top-0"
                            )}
                            style={{
                              height: eventStartHour === hour ? height : 'auto',
                              zIndex: 10
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle event click
                            }}
                          >
                            <div className="font-medium truncate">{event.title}</div>
                            {!event.isAllDay && eventStartHour === hour && (
                              <div className="text-xs opacity-75 truncate mt-0.5">
                                {event.startTime.toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Current time line across week */}
          {isCurrentWeek && (
            <div
              className="pointer-events-none absolute left-16 right-0"
              style={{
                top: `${currentHour * 48 + (currentMinutes / 60) * 48}px`,
              }}
            >
              <div className="relative">
                <div className="absolute -left-1 w-2 h-2 bg-red-500 rounded-full" />
                <div className="h-0.5 bg-red-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const now = new Date();
    const isCurrentDay = isToday(currentDate);
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    return (
      <div className="h-full flex bg-white">
        {/* Time column */}
        <div className="w-20 border-r border-gray-200 bg-gray-50">
          {hours.map((hour) => (
            <div key={hour} className="h-12 border-b border-gray-100 flex items-start justify-end pr-3 pt-1">
              <span className="text-xs text-gray-500 font-medium">
                {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
              </span>
            </div>
          ))}
        </div>
        
        {/* Day column */}
        <div className="flex-1">
          {/* Day header */}
          <div className="h-16 border-b border-gray-200 bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {currentDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {isToday(currentDate) ? "Today" : ""}
              </div>
            </div>
          </div>
          
          {/* Time slots */}
          <div className="relative">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-12 border-b border-gray-100 relative cursor-pointer hover:bg-gray-50 group"
                onClick={() => {
                  const date = new Date(currentDate);
                  date.setHours(hour, 0, 0, 0);
                  onDateClick(date);
                }}
              >
                {/* Hour line indicator */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gray-200 group-hover:bg-blue-200"></div>
                
                {/* Current time indicator */}
                {isCurrentDay && currentHour === hour && (
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-red-500 z-20"
                    style={{ top: `${(currentMinutes / 60) * 48}px` }}
                  >
                    <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
                  </div>
                )}
                
                {/* Events for this hour */}
                {getEventsForDate(currentDate)
                  .filter(event => {
                    const eventStartHour = event.startTime.getHours();
                    const eventEndHour = event.endTime.getHours();
                    return eventStartHour <= hour && eventEndHour >= hour;
                  })
                  .map((event) => {
                    const eventStartHour = event.startTime.getHours();
                    const eventEndHour = event.endTime.getHours();
                    const eventDuration = eventEndHour - eventStartHour;
                    const height = eventDuration > 0 ? `${eventDuration * 48}px` : '24px';
                    
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "absolute left-2 right-2 rounded-md text-xs px-3 py-2 text-white cursor-pointer hover:opacity-90 transition-opacity",
                          event.color,
                          eventStartHour === hour ? "top-1" : "top-0"
                        )}
                        style={{
                          height: eventStartHour === hour ? height : 'auto',
                          zIndex: 10
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle event click
                        }}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        {!event.isAllDay && eventStartHour === hour && (
                          <div className="text-xs opacity-75 truncate mt-1">
                            {event.startTime.toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })} - {event.endTime.toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </div>
                        )}
                        {event.location && eventStartHour === hour && (
                          <div className="text-xs opacity-75 truncate mt-1">
                            📍 {event.location}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-white">
      {viewMode === "month" && renderMonthView()}
      {viewMode === "week" && renderWeekView()}
      {viewMode === "day" && renderDayView()}
    </div>
  );
}
