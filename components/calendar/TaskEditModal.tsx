"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface Task {
  _id: Id<"tasks">;
  _creationTime: number;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  priorityValue: number;
  duration: number;
  deadline?: string;
  startDate?: string;
  userId: string;
  status: "pending" | "scheduled" | "completed";
  scheduledEventId?: Id<"events">;
}

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onTaskUpdated?: () => void;
}

export function TaskEditModal({ isOpen, onClose, task, onTaskUpdated }: TaskEditModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [priorityValue, setPriorityValue] = useState(5);
  const [duration, setDuration] = useState(60);
  const [deadline, setDeadline] = useState("");
  const [startDate, setStartDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updateTask = useMutation(api.tasks.updateTask);
  const updateEvent = useMutation(api.events.updateEvent);
  const createEvent = useMutation(api.events.createEvent);
  const linkTaskToEvent = useMutation(api.tasks.linkTaskToEvent);
  const calendars = useQuery(api.calendars.getUserCalendars);

  // Initialize form with task data
  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setPriority(task.priority);
      setPriorityValue(task.priorityValue);
      setDuration(task.duration);
      setDeadline(task.deadline || "");
      setStartDate(task.startDate || "");
      setHasChanges(false);
    }
  }, [task, isOpen]);

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm("You have unsaved changes. Are you sure you want to close?");
      if (!confirmClose) return;
    }
    onClose();
  };

  const handlePriorityChange = (newPriority: "low" | "medium" | "high") => {
    console.log("🎯 handlePriorityChange called", {
      taskId: task?._id,
      taskTitle: task?.title,
      oldPriority: priority,
      newPriority,
      oldPriorityValue: priorityValue
    });
    setPriority(newPriority);
    // Auto-update priorityValue based on priority
    const value = newPriority === "high" ? 2 : newPriority === "medium" ? 5 : 8;
    console.log("🎯 Setting new priorityValue:", value);
    setPriorityValue(value);
    setHasChanges(true);
  };

  const handlePriorityValueChange = (value: number) => {
    console.log("🔢 handlePriorityValueChange called", {
      taskId: task?._id,
      taskTitle: task?.title,
      oldValue: priorityValue,
      newValue: value,
      oldPriority: priority
    });
    setPriorityValue(value);
    // Auto-update priority string based on number
    const priorityString = value <= 3 ? "high" : value <= 6 ? "medium" : "low";
    console.log("🔢 Setting new priority string:", priorityString);
    setPriority(priorityString);
    setHasChanges(true);
  };

  const handleInputChange = (setter: (value: string | number) => void) => (value: string | number) => {
    setter(value);
    setHasChanges(true);
  };

  const triggerRescheduling = async (updatedTask: Task) => {
    try {
      console.log("🔄 Triggering re-scheduling for updated task...", {
        taskId: updatedTask._id,
        taskTitle: updatedTask.title,
        taskPriority: updatedTask.priority,
        taskPriorityValue: updatedTask.priorityValue,
        scheduledEventId: updatedTask.scheduledEventId
      });

      // Get the default calendar ID
      const defaultCalendar = calendars?.find(cal => cal.isDefault) || calendars?.[0];
      if (!defaultCalendar) {
        console.warn("⚠️ No calendar found, cannot reschedule");
        return;
      }

      // If the task has an existing scheduled event, update it directly
      if (updatedTask.scheduledEventId) {
        console.log("📝 Task has existing event, updating it directly...", {
          eventId: updatedTask.scheduledEventId,
          newTitle: updatedTask.title,
          newDescription: updatedTask.description
        });

        // Calculate new timing based on task changes
        // For now, we'll use a simple heuristic: start from current time + 1 hour
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        const endTime = new Date(startTime.getTime() + updatedTask.duration * 60 * 1000);

        // If deadline exists, ensure we don't schedule after deadline
        if (updatedTask.deadline) {
          const deadlineDate = new Date(updatedTask.deadline);
          if (endTime > deadlineDate) {
            // Schedule earlier to meet deadline
            const newEndTime = new Date(deadlineDate.getTime() - 60 * 60 * 1000); // 1 hour before deadline
            const newStartTime = new Date(newEndTime.getTime() - updatedTask.duration * 60 * 1000);

            console.log("⏰ Updating event with deadline constraints:", {
              eventId: updatedTask.scheduledEventId,
              title: updatedTask.title,
              description: updatedTask.description,
              startTime: Math.floor(newStartTime.getTime() / 1000),
              endTime: Math.floor(newEndTime.getTime() / 1000),
            });
            await updateEvent({
              eventId: updatedTask.scheduledEventId,
              title: updatedTask.title,
              description: updatedTask.description,
              startTime: Math.floor(newStartTime.getTime() / 1000),
              endTime: Math.floor(newEndTime.getTime() / 1000),
            });
          } else {
            console.log("📅 Updating event with normal timing:", {
              eventId: updatedTask.scheduledEventId,
              title: updatedTask.title,
              description: updatedTask.description,
              startTime: Math.floor(startTime.getTime() / 1000),
              endTime: Math.floor(endTime.getTime() / 1000),
            });
            await updateEvent({
              eventId: updatedTask.scheduledEventId,
              title: updatedTask.title,
              description: updatedTask.description,
              startTime: Math.floor(startTime.getTime() / 1000),
              endTime: Math.floor(endTime.getTime() / 1000),
            });
          }
        } else {
          console.log("📅 Updating event without deadline:", {
            eventId: updatedTask.scheduledEventId,
            title: updatedTask.title,
            description: updatedTask.description,
            startTime: Math.floor(startTime.getTime() / 1000),
            endTime: Math.floor(endTime.getTime() / 1000),
          });
          await updateEvent({
            eventId: updatedTask.scheduledEventId,
            title: updatedTask.title,
            description: updatedTask.description,
            startTime: Math.floor(startTime.getTime() / 1000),
            endTime: Math.floor(endTime.getTime() / 1000),
          });
        }

        console.log("✅ Event updated successfully");
      } else if (updatedTask.status === "scheduled") {
        // If task is marked as scheduled but has no event, create one
        console.log("🆕 Creating new event for scheduled task...");

        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        const endTime = new Date(startTime.getTime() + updatedTask.duration * 60 * 1000);

        // If deadline exists, ensure we don't schedule after deadline
        let finalStartTime = startTime;
        let finalEndTime = endTime;

        if (updatedTask.deadline) {
          const deadlineDate = new Date(updatedTask.deadline);
          if (endTime > deadlineDate) {
            finalEndTime = new Date(deadlineDate.getTime() - 60 * 60 * 1000); // 1 hour before deadline
            finalStartTime = new Date(finalEndTime.getTime() - updatedTask.duration * 60 * 1000);
          }
        }

        const newEventId = await createEvent({
          title: updatedTask.title,
          description: updatedTask.description,
          startTime: Math.floor(finalStartTime.getTime() / 1000),
          endTime: Math.floor(finalEndTime.getTime() / 1000),
          calendarId: defaultCalendar._id,
        });

        // Link the task to the new event
        await linkTaskToEvent({
          taskId: updatedTask._id,
          eventId: newEventId,
        });

        console.log("✅ New event created and linked successfully");
      }
    } catch (error) {
      console.error("❌ Re-scheduling error:", error);
    }
  };

  const handleSave = async () => {
    if (!task) return;

    console.log("💾 handleSave called for task:", {
      taskId: task._id,
      taskTitle: task.title,
      currentStatus: task.status
    });

    setIsLoading(true);
    try {
      // Check if priority, deadline, or duration changed (these trigger re-scheduling)
      const shouldReschedule = (
        task.priority !== priority ||
        task.priorityValue !== priorityValue ||
        task.duration !== duration ||
        task.deadline !== deadline ||
        task.startDate !== startDate
      );

      console.log("🔍 Checking if rescheduling needed:", {
        shouldReschedule,
        taskStatus: task.status,
        priorityChanged: task.priority !== priority,
        priorityValueChanged: task.priorityValue !== priorityValue,
        durationChanged: task.duration !== duration,
        deadlineChanged: task.deadline !== deadline,
        startDateChanged: task.startDate !== startDate,
        oldData: {
          priority: task.priority,
          priorityValue: task.priorityValue,
          duration: task.duration,
          deadline: task.deadline,
          startDate: task.startDate
        },
        newData: { priority, priorityValue, duration, deadline, startDate }
      });

      // Update the task
      console.log("📝 Updating task with data:", {
        taskId: task._id,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        priority,
        priorityValue,
        duration,
        deadline: deadline || undefined,
        startDate: startDate || undefined,
      });
      await updateTask({
        taskId: task._id,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        priority,
        priorityValue,
        duration,
        deadline: deadline || undefined,
        startDate: startDate || undefined,
      });

      console.log("✅ Task updated successfully");

      // Trigger re-scheduling if scheduling-related fields changed
      if (shouldReschedule && task.status === "scheduled") {
        console.log("🔄 About to trigger rescheduling...");
        await triggerRescheduling({
          ...task,
          title: title.trim(),
          description: description.trim(),
          priority,
          priorityValue,
          duration,
          deadline: deadline || undefined,
          startDate: startDate || undefined,
        });
      } else {
        console.log("⏭️ Skipping rescheduling:", { shouldReschedule, taskStatus: task.status });
      }

      onTaskUpdated?.();
      onClose();
    } catch (error) {
      console.error("❌ Failed to update task:", error);
      alert("Failed to update task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: string, priorityValue: number) => {
    if (priority === "high" || priorityValue <= 3) {
      return "bg-red-100 text-red-700 border-red-200";
    } else if (priority === "medium" || (priorityValue >= 4 && priorityValue <= 6)) {
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    } else {
      return "bg-green-100 text-green-700 border-green-200";
    }
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Task
            {hasChanges && (
              <Badge variant="secondary" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Unsaved changes
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => handleInputChange(setTitle)(e.target.value)}
              placeholder="Enter task title..."
              className="font-medium"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => handleInputChange(setDescription)(e.target.value)}
              placeholder="Add task description..."
              rows={3}
            />
          </div>

          {/* Priority Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={handlePriorityChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority Number (1-10)</Label>
              <Input
                type="number"
                value={priorityValue}
                onChange={(e) => handlePriorityValueChange(parseInt(e.target.value) || 5)}
                min="1"
                max="10"
              />
            </div>
          </div>

          {/* Current Priority Display */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Current Priority:</span>
            <Badge className={cn("text-xs", getPriorityColor(priority, priorityValue))}>
              {priority} ({priorityValue})
            </Badge>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Duration (minutes)
            </Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => handleInputChange(setDuration)(parseInt(e.target.value) || 60)}
              min="15"
              max="480"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Earliest Start Date
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleInputChange(setStartDate)(e.target.value)}
                min={(() => {
                  const today = new Date();
                  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                })()}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Deadline
              </Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => handleInputChange(setDeadline)(e.target.value)}
                min={startDate || (() => {
                  const today = new Date();
                  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                })()}
              />
            </div>
          </div>

          {/* Re-scheduling Notice */}
          {hasChanges && task.status === "scheduled" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-800 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">Re-scheduling Notice</span>
              </div>
              <p className="text-blue-700 text-xs mt-1">
                Changes to priority, duration, or dates will trigger automatic re-scheduling of this task.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={isLoading || !hasChanges}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}