"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Brain, Clock, CheckCircle2, Loader2, Calendar } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  duration: number; // minutes
  deadline?: string; // ISO date string
  startDate?: string; // ISO date string - earliest date this task can start
}

interface AIScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCalendarId?: Id<"calendars">;
}

export default function AIScheduleModal({ isOpen, onClose, defaultCalendarId }: AIScheduleModalProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [workingHours, setWorkingHours] = useState({ start: '09:00', end: '17:00' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);

  const createEvent = useMutation(api.events.createEvent);

  // Get existing events for the entire month to show AI what's already scheduled
  const getMonthRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: Math.floor(startOfMonth.getTime() / 1000),
      endDate: Math.floor(endOfMonth.getTime() / 1000),
    };
  };

  const monthRange = getMonthRange();
  const existingEvents = useQuery(api.events.getUserEvents, {
    startDate: monthRange.startDate,
    endDate: monthRange.endDate
  });

  const addTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      priority: 'medium',
      duration: 60,
      deadline: undefined,
      startDate: undefined,
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
  };

  const updateTask = (index: number, field: keyof Task, value: any) => {
    const updatedTasks = [...tasks];
    updatedTasks[index] = { ...updatedTasks[index], [field]: value };
    setTasks(updatedTasks);
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };

  const generateAndSchedule = async () => {
    if (tasks.length === 0 || !defaultCalendarId) return;

    setIsGenerating(true);
    try {
      // Format existing events for AI context
      const formattedExistingEvents = (existingEvents || []).map(event => ({
        title: event.title,
        startTime: new Date(event.startTime * 1000).toISOString(),
        endTime: new Date(event.endTime * 1000).toISOString(),
        description: event.description || '',
        isAllDay: event.isAllDay || false,
      }));

      // Call Convex HTTP action for AI scheduling
      const response = await fetch('https://bright-bass-258.convex.site/api/generate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: tasks.map(task => ({
            id: task.id,
            title: task.title,
            priority: task.priority,
            estimatedDuration: task.duration,
            deadline: task.deadline,
            startDate: task.startDate,
          })),
          preferences: {
            workingHours,
            breakDuration: 15,
            maxTasksPerDay: 8,
          },
          startDate: new Date().toISOString(),
          existingEvents: formattedExistingEvents,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate schedule');

      const { schedule } = await response.json();

      // Create calendar events for each scheduled task
      const eventPromises = schedule.map((scheduledTask: any) =>
        createEvent({
          title: scheduledTask.title,
          description: scheduledTask.reasoning || '',
          startTime: Math.floor(new Date(scheduledTask.startTime).getTime() / 1000),
          endTime: Math.floor(new Date(scheduledTask.endTime).getTime() / 1000),
          calendarId: defaultCalendarId,
        })
      );

      await Promise.all(eventPromises);

      setScheduledCount(schedule.length);
      setIsScheduled(true);

      // Auto-close after showing success
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Failed to generate and schedule:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setTasks([]);
    setNewTaskTitle('');
    setIsScheduled(false);
    setScheduledCount(0);
    onClose();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (isScheduled) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">Tasks Scheduled!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {scheduledCount} task{scheduledCount !== 1 ? 's' : ''} added to your calendar
            </p>
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            AI Schedule
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Task Entry */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Add tasks</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Type a task and press Enter..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={addTask} size="sm" variant="ghost">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Task List */}
          {tasks.length > 0 && (
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <div key={task.id} className="p-3 border rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{task.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${getPriorityColor(task.priority)} text-xs`}>
                          {task.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.duration}m
                        </span>
                        {task.deadline && (
                          <span className="text-xs text-red-600 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Due {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        )}
                        {task.startDate && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Start {new Date(task.startDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTask(index)}
                      className="w-8 h-8 p-0 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Priority</Label>
                      <Select
                        value={task.priority}
                        onValueChange={(value) => updateTask(index, 'priority', value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Duration (min)</Label>
                      <Input
                        type="number"
                        value={task.duration}
                        onChange={(e) => updateTask(index, 'duration', parseInt(e.target.value) || 60)}
                        className="h-8 text-xs"
                        min="15"
                        max="480"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Start Date</Label>
                      <Input
                        type="date"
                        value={task.startDate || ''}
                        onChange={(e) => updateTask(index, 'startDate', e.target.value || undefined)}
                        className="h-8 text-xs"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Deadline</Label>
                      <Input
                        type="date"
                        value={task.deadline || ''}
                        onChange={(e) => updateTask(index, 'deadline', e.target.value || undefined)}
                        className="h-8 text-xs"
                        min={task.startDate || new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Working Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Start time</Label>
              <Input
                type="time"
                value={workingHours.start}
                onChange={(e) => setWorkingHours({ ...workingHours, start: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">End time</Label>
              <Input
                type="time"
                value={workingHours.end}
                onChange={(e) => setWorkingHours({ ...workingHours, end: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={generateAndSchedule}
              disabled={tasks.length === 0 || isGenerating || !defaultCalendarId}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Schedule {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}