"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, MoreHorizontal, CheckCircle2, Circle, Eye, Edit3, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "convex/react";
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

interface TaskListProps {
  onTaskClick?: (task: Task) => void;
  selectedTaskId?: Id<"tasks"> | null;
  onTaskEdit?: (task: Task) => void;
}

export function TaskList({ onTaskClick, selectedTaskId, onTaskEdit }: TaskListProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "scheduled" | "completed">("all");
  const [loadingTaskId, setLoadingTaskId] = useState<Id<"tasks"> | null>(null);

  // Query tasks based on filter
  const allTasks = useQuery(api.tasks.getUserTasks, {});
  const pendingTasks = useQuery(api.tasks.getUserTasks, { status: "pending" });
  const scheduledTasks = useQuery(api.tasks.getUserTasks, { status: "scheduled" });
  const completedTasks = useQuery(api.tasks.getUserTasks, { status: "completed" });

  const updateTaskStatus = useMutation(api.tasks.updateTaskStatus);
  const deleteEvent = useMutation(api.events.deleteEvent);

  // Select the appropriate task list based on filter
  const tasks = statusFilter === "pending" ? pendingTasks
    : statusFilter === "scheduled" ? scheduledTasks
    : statusFilter === "completed" ? completedTasks
    : allTasks;

  const getPriorityColor = (priority: string, priorityValue: number) => {
    if (priority === "high" || priorityValue <= 3) {
      return "bg-red-100 text-red-700 border-red-200";
    } else if (priority === "medium" || (priorityValue >= 4 && priorityValue <= 6)) {
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    } else {
      return "bg-green-100 text-green-700 border-green-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-3 h-3 text-green-600" />;
      case "scheduled":
        return <Calendar className="w-3 h-3 text-blue-600" />;
      default:
        return <Circle className="w-3 h-3 text-gray-400" />;
    }
  };

  const handleStatusToggle = async (task: Task) => {
    if (loadingTaskId === task._id) return; // Prevent double-clicks

    setLoadingTaskId(task._id);
    try {
      const isCompletingTask = task.status !== "completed";
      const newStatus = isCompletingTask ? "completed" : "pending";

      console.log(`${isCompletingTask ? '✅' : '🔄'} ${isCompletingTask ? 'Completing' : 'Uncompleting'} task:`, task.title);

      // If completing the task and it has a scheduled event, delete the event
      if (isCompletingTask && task.scheduledEventId) {
        console.log('🗑️ Deleting associated calendar event:', task.scheduledEventId);
        await deleteEvent({
          eventId: task.scheduledEventId,
        });
        console.log('✅ Calendar event deleted successfully');
      }

      // Update task status
      await updateTaskStatus({
        taskId: task._id,
        status: newStatus,
        scheduledEventId: isCompletingTask ? undefined : task.scheduledEventId,
      });

      console.log(`✅ Task status updated to: ${newStatus}`);
    } catch (error) {
      console.error('❌ Failed to toggle task status:', error);
      alert('Failed to update task. Please try again.');
    } finally {
      setLoadingTaskId(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    // Parse date as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day); // month is 0-indexed
    return localDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = (deadline?: string) => {
    if (!deadline) return false;
    // Parse deadline as local date to avoid timezone issues
    const [year, month, day] = deadline.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare dates only, not times
    return deadlineDate < today;
  };

  if (!tasks) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse text-sm text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200">
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900">Tasks</h3>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>

        {/* Status Filter */}
        <div className="flex gap-1">
          {[
            { key: "all", label: "All" },
            { key: "pending", label: "Pending" },
            { key: "scheduled", label: "Scheduled" },
            { key: "completed", label: "Done" },
          ].map((filter) => (
            <Button
              key={filter.key}
              variant={statusFilter === filter.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(filter.key as any)}
              className="px-2 h-6 text-xs"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <ScrollArea className="max-h-64">
        <div className="px-2 pb-2">
          {tasks.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500">
              {statusFilter === "all" ? "No tasks yet" : `No ${statusFilter} tasks`}
            </div>
          ) : (
            <div className="space-y-1">
              {tasks.map((task) => (
                <div
                  key={task._id}
                  className={cn(
                    "p-2 rounded-md border transition-colors cursor-pointer group",
                    selectedTaskId === task._id
                      ? "bg-blue-50 border-blue-200 ring-1 ring-blue-300"
                      : "bg-white hover:bg-gray-50 border-gray-200",
                    task.status === "completed" && "opacity-60"
                  )}
                  onClick={() => onTaskClick?.(task)}
                >
                  {/* Task Header */}
                  <div className="flex items-start gap-2 mb-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusToggle(task);
                      }}
                      className="mt-0.5 hover:scale-110 transition-transform"
                      disabled={loadingTaskId === task._id}
                    >
                      {loadingTaskId === task._id ? (
                        <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                      ) : (
                        getStatusIcon(task.status)
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-sm font-medium truncate",
                          task.status === "completed" && "line-through"
                        )}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {task.scheduledEventId && (
                            <Eye className="w-3 h-3 text-blue-500" title="Linked to calendar event" />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTaskEdit?.(task);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                            title="Edit task"
                          >
                            <Edit3 className="w-3 h-3 text-gray-500 hover:text-blue-500" />
                          </button>
                        </div>
                      </div>

                      {/* Task Metadata */}
                      <div className="flex items-center gap-2 text-xs">
                        <Badge
                          className={cn(
                            "text-xs px-1.5 py-0",
                            getPriorityColor(task.priority, task.priorityValue)
                          )}
                        >
                          {task.priority} ({task.priorityValue})
                        </Badge>

                        <span className="text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.duration}m
                        </span>

                        {task.deadline && (
                          <span className={cn(
                            "flex items-center gap-1",
                            isOverdue(task.deadline) ? "text-red-600" : "text-gray-500"
                          )}>
                            <Calendar className="w-3 h-3" />
                            {formatDate(task.deadline)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Task Description */}
                  {task.description && (
                    <div className="text-xs text-gray-600 mt-1 pl-5 truncate">
                      {task.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}