"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, MapPin } from "lucide-react";
// import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date | null;
  selectedEvent?: {
    _id: string;
    title: string;
    description?: string;
    startTime: number;
    endTime: number;
    isAllDay?: boolean;
    location?: string;
    calendarId: string;
  } | null;
  calendars?: Array<{
    _id: string;
    name: string;
    color: string;
  }>;
}


export function EventModal({ isOpen, onClose, selectedDate, selectedEvent, calendars = [] }: EventModalProps) {
  const createEvent = useMutation(api.events.createEvent);
  const updateEvent = useMutation(api.events.updateEvent);
  const deleteEvent = useMutation(api.events.deleteEvent);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: selectedDate || new Date(),
    endDate: selectedDate || new Date(),
    startTime: "09:00",
    endTime: "10:00",
    isAllDay: false,
    location: "",
    calendarId: "",
  });

  // Initialize dates on client side to prevent hydration issues
  useEffect(() => {
    if (!selectedDate && !selectedEvent) {
      const now = new Date();
      setFormData(prev => ({
        ...prev,
        startDate: now,
        endDate: now,
      }));
    }
  }, [selectedDate, selectedEvent]);

  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);

  useEffect(() => {
    if (selectedEvent) {
      const startDate = new Date(selectedEvent.startTime * 1000);
      const endDate = new Date(selectedEvent.endTime * 1000);
      setFormData({
        title: selectedEvent.title,
        description: selectedEvent.description || "",
        startDate: startDate,
        endDate: endDate,
        startTime: `${String(startDate.getUTCHours()).padStart(2, '0')}:${String(startDate.getUTCMinutes()).padStart(2, '0')}`,
        endTime: `${String(endDate.getUTCHours()).padStart(2, '0')}:${String(endDate.getUTCMinutes()).padStart(2, '0')}`,
        isAllDay: selectedEvent.isAllDay || false,
        location: selectedEvent.location || "",
        calendarId: selectedEvent.calendarId,
      });
    } else if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        startDate: selectedDate,
        endDate: selectedDate,
        calendarId: calendars[0]?._id || "",
      }));
    }
  }, [selectedEvent, selectedDate, calendars]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.calendarId) {
      console.error("Missing calendarId - Please select a calendar");
      return;
    }

    if (!formData.title.trim()) {
      console.error("Missing event title");
      return;
    }
    
    // Create start and end datetime
    const startDateTime = new Date(formData.startDate);
    const endDateTime = new Date(formData.endDate);
    
    if (!formData.isAllDay) {
      const [startHour, startMinute] = formData.startTime.split(':').map(Number);
      const [endHour, endMinute] = formData.endTime.split(':').map(Number);
      
      startDateTime.setHours(startHour, startMinute, 0, 0);
      endDateTime.setHours(endHour, endMinute, 0, 0);
    } else {
      // For all-day events, set to start of day and end of day
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime.setHours(23, 59, 59, 999);
    }

    try {
      if (selectedEvent) {
        // Update existing event
        await updateEvent({
          eventId: selectedEvent._id as Id<"events">,
          title: formData.title,
          description: formData.description || undefined,
          startTime: Math.floor(startDateTime.getTime() / 1000),
          endTime: Math.floor(endDateTime.getTime() / 1000),
          isAllDay: formData.isAllDay,
          location: formData.location || undefined,
          calendarId: formData.calendarId as Id<"calendars">,
        });
      } else {
        // Create new event
        await createEvent({
          title: formData.title,
          description: formData.description || undefined,
          startTime: Math.floor(startDateTime.getTime() / 1000),
          endTime: Math.floor(endDateTime.getTime() / 1000),
          isAllDay: formData.isAllDay,
          location: formData.location || undefined,
          calendarId: formData.calendarId as Id<"calendars">,
        });
      }

      // Reset form and close modal
      setFormData({
        title: "",
        description: "",
        startDate: new Date(),
        endDate: new Date(),
        startTime: "09:00",
        endTime: "10:00",
        isAllDay: false,
        location: "",
        calendarId: calendars[0]?._id || "",
      });

      onClose();
    } catch (error) {
      console.error("Error saving event:", error);
    }
  };

  const handleDelete = async () => {
    if (selectedEvent) {
      try {
        await deleteEvent({ eventId: selectedEvent._id as Id<"events"> });
        onClose();
      } catch (error) {
        console.error("Error deleting event:", error);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedEvent ? "Edit Event" : "Create Event"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Add title"
              required
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isAllDay"
              checked={formData.isAllDay}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAllDay: !!checked }))}
            />
            <Label htmlFor="isAllDay">All day</Label>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start</Label>
              <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? formData.startDate.toLocaleDateString("en-US", {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 min-w-[320px]" align="start" sideOffset={4}>
                  <Calendar
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) => {
                      if (date) {
                        setFormData(prev => ({ ...prev, startDate: date }));
                        setIsStartDateOpen(false);
                      }
                    }}
                    initialFocus
                    className="[--cell-size:3.5rem] p-4 [&_.rdp-day]:m-1 [&_.rdp-button]:w-10 [&_.rdp-button]:h-10"
                    classNames={{
                      week: "flex w-full mt-3 gap-2 justify-between",
                      weekdays: "flex gap-2 justify-between mb-2",
                      day: "relative text-center flex-1 min-w-[2.5rem]",
                      table: "w-full"
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>End</Label>
              <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.endDate ? formData.endDate.toLocaleDateString("en-US", {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 min-w-[320px]" align="start" sideOffset={4}>
                  <Calendar
                    mode="single"
                    selected={formData.endDate}
                    onSelect={(date) => {
                      if (date) {
                        setFormData(prev => ({ ...prev, endDate: date }));
                        setIsEndDateOpen(false);
                      }
                    }}
                    initialFocus
                    className="[--cell-size:3.5rem] p-4 [&_.rdp-day]:m-1 [&_.rdp-button]:w-10 [&_.rdp-button]:h-10"
                    classNames={{
                      week: "flex w-full mt-3 gap-2 justify-between",
                      weekdays: "flex gap-2 justify-between mb-2",
                      day: "relative text-center flex-1 min-w-[2.5rem]",
                      table: "w-full"
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Time (if not all day) */}
          {!formData.isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Calendar Selection */}
          <div className="space-y-2">
            <Label htmlFor="calendar">Calendar</Label>
            <Select
              value={formData.calendarId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, calendarId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select calendar" />
              </SelectTrigger>
              <SelectContent>
                {calendars.length > 0 ? (
                  calendars.map((calendar) => (
                    <SelectItem key={calendar._id} value={calendar._id}>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full bg-${calendar.color}`} />
                        <span>{calendar.name}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    No calendars available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Add location"
                className="pl-10"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add description"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            {selectedEvent && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="mr-auto"
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {selectedEvent ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
