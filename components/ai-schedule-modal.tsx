"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Brain, Clock, CheckCircle2, Loader2, Calendar, FileText, Settings, Sparkles } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';

// Types
interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  priorityValue: number;
  duration: number;
  deadline?: string;
  startDate?: string;
  // NEW: Track if this task already exists in the database
  dbTaskId?: string;
  // NEW: Track if this task has an associated event
  eventId?: string;
}

interface AIScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCalendarId?: Id<"calendars">;
}

// Constants
const PRIORITY_MAP = {
  high: { value: 2, color: 'bg-red-100 text-red-700 border-red-200' },
  medium: { value: 5, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  low: { value: 8, color: 'bg-green-100 text-green-700 border-green-200' }
};

const DEFAULT_WORKING_HOURS = { start: '09:00', end: '17:00' };

// Helper functions
const getToday = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

const formatDateTime = (date: Date) => {
  return date.toISOString().slice(0, 19);
};

const createEmptyTask = (): Task => ({
  id: `task-${Date.now()}`,
  title: '',
  priority: 'medium',
  priorityValue: PRIORITY_MAP.medium.value,
  duration: 60,
  deadline: undefined,
  startDate: undefined,
  dbTaskId: undefined,
  eventId: undefined,
});

export default function AIScheduleModal({ isOpen, onClose, defaultCalendarId }: AIScheduleModalProps) {
  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [workingHours, setWorkingHours] = useState(DEFAULT_WORKING_HOURS);
  const [naturalLanguageText, setNaturalLanguageText] = useState('');
  const [activeTab, setActiveTab] = useState('natural');
  const [loading, setLoading] = useState({ parsing: false, scheduling: false });
  const [scheduledCount, setScheduledCount] = useState(0);
  
  // NEW: Track operation mode
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Convex mutations
  const createEvent = useMutation(api.events.createEvent);
  const createTask = useMutation(api.tasks.createTask);
  const updateTask = useMutation(api.tasks.updateTask);
  const deleteEvent = useMutation(api.events.deleteEvent);
  const linkTaskToEvent = useMutation(api.tasks.linkTaskToEvent);

  // Query for existing events
  const existingEvents = useQuery(api.events.getUserEvents, (() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: Math.floor(startOfMonth.getTime() / 1000),
      endDate: Math.floor(endOfMonth.getTime() / 1000),
    };
  })());

  // Task management
  const addTask = (title: string = newTaskTitle) => {
    if (!title.trim()) return;
    
    console.log('🔵 Adding new task:', title);
    const task = createEmptyTask();
    task.title = title.trim();
    setTasks(prev => [...prev, task]);
    setNewTaskTitle('');
  };

  const updateTaskLocal = (index: number, updates: Partial<Task>) => {
    console.log('📝 Updating task at index', index, 'with updates:', updates);
    
    setTasks(prev => prev.map((task, i) => {
      if (i === index) {
        const updatedTask = { ...task, ...updates };
        
        // If this task already exists in DB and we're changing priority, mark for rescheduling
        if (task.dbTaskId && (updates.priority || updates.priorityValue)) {
          console.log('⚠️ Task has dbTaskId, marking for rescheduling:', task.dbTaskId);
          setIsRescheduling(true);
        }
        
        return updatedTask;
      }
      return task;
    }));
  };

  const removeTask = (index: number) => {
    console.log('🗑️ Removing task at index:', index);
    const taskToRemove = tasks[index];
    
    if (taskToRemove.dbTaskId) {
      console.log('⚠️ Warning: Removing task that exists in DB:', taskToRemove.dbTaskId);
      // TODO: Should also delete from database and remove associated event
    }
    
    setTasks(prev => prev.filter((_, i) => i !== index));
  };

  // Priority handling
  const updatePriority = (index: number, priority: Task['priority']) => {
    console.log('🎯 Updating priority for task', index, 'to:', priority);
    updateTaskLocal(index, { 
      priority, 
      priorityValue: PRIORITY_MAP[priority].value 
    });
  };

  // Removed unused updatePriorityValue to satisfy linter

  // Natural language parsing
  const parseNaturalLanguage = async () => {
    if (!naturalLanguageText.trim()) return;

    console.log('🤖 Starting natural language parsing...');
    setLoading(prev => ({ ...prev, parsing: true }));
    try {
      const response = await fetch('https://careful-boar-557.convex.site/api/parse-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: naturalLanguageText,
          defaultDuration: 60,
          workingHours,
        }),
      });

      if (!response.ok) throw new Error('Failed to parse tasks');

      const { tasks: parsedTasks } = await response.json();
      console.log('✅ Parsed tasks:', parsedTasks);
      
      const newTasks = parsedTasks.map((parsed: { title: string; priority: 'low'|'medium'|'high'; estimatedDuration: number; deadline?: string; startDate?: string; priorityValue?: number; }, index: number) => ({
        id: `parsed-${Date.now()}-${index}`,
        title: parsed.title,
        priority: parsed.priority,
        priorityValue: parsed.priorityValue ?? PRIORITY_MAP[parsed.priority].value,
        duration: parsed.estimatedDuration,
        deadline: parsed.deadline,
        startDate: parsed.startDate,
        dbTaskId: undefined,
        eventId: undefined,
      }));

      setTasks(prev => [...prev, ...newTasks]);
      setNaturalLanguageText('');
      setActiveTab('advanced');
    } catch (error) {
      console.error('❌ Failed to parse tasks:', error);
    } finally {
      setLoading(prev => ({ ...prev, parsing: false }));
    }
  };

  // Schedule generation - FIXED VERSION
  const generateSchedule = async () => {
    if (!tasks.length || !defaultCalendarId) {
      console.log('❌ Cannot schedule: no tasks or no calendar ID');
      return;
    }

    console.log('🚀 Starting schedule generation...');
    console.log('📋 Current tasks:', tasks);
    console.log('🔄 Is rescheduling?', isRescheduling);
    
    setLoading(prev => ({ ...prev, scheduling: true }));
    try {
      // Prepare task data for scheduling
      const taskDataForScheduling: Array<{ id: string; title: string; priority: Task['priority']; priorityValue: number; estimatedDuration: number; deadline?: string; startDate?: string; dbTaskId: Id<'tasks'> | string }>= [];
      const taskIdMap = new Map<string, Id<'tasks'> | string>(); // Maps local task ID to database task ID
      
      for (const task of tasks) {
        let dbTaskId = task.dbTaskId as unknown as Id<'tasks'> | string | undefined;
        
        if (!dbTaskId) {
          // NEW TASK: Create it in the database
          console.log('➕ Creating new task in DB:', task.title);
          dbTaskId = await createTask({
            title: task.title,
            description: undefined,
            priority: task.priority,
            priorityValue: task.priorityValue,
            duration: task.duration,
            deadline: task.deadline,
            startDate: task.startDate,
            status: "pending",
          });
          console.log('✅ Created task with ID:', dbTaskId);
        } else {
          // EXISTING TASK: Update it in the database
          console.log('🔄 Updating existing task in DB:', dbTaskId);
          await updateTask({
            taskId: dbTaskId as unknown as Id<'tasks'>,
            title: task.title,
            priority: task.priority,
            priorityValue: task.priorityValue,
            duration: task.duration,
            deadline: task.deadline,
            startDate: task.startDate,
          });
          console.log('✅ Updated task:', dbTaskId);
          
          // If this task has an existing event and we're rescheduling, delete the old event
          if (task.eventId && isRescheduling) {
            console.log('🗑️ Deleting old event for rescheduled task:', task.eventId);
            try {
              await deleteEvent({ eventId: task.eventId as unknown as Id<'events'> });
              console.log('✅ Deleted old event:', task.eventId);
            } catch (error) {
              console.error('⚠️ Failed to delete old event:', error);
            }
          }
        }
        
        taskIdMap.set(task.id, dbTaskId);
        taskDataForScheduling.push({
          id: task.id,
          title: task.title,
          priority: task.priority,
          priorityValue: task.priorityValue,
          estimatedDuration: task.duration,
          deadline: task.deadline,
          startDate: task.startDate,
          dbTaskId: dbTaskId, // Include DB ID for reference
        });
      }
      
      console.log('📊 Task ID mapping:', Array.from(taskIdMap.entries()));

      // Format existing events for AI (exclude events we're rescheduling)
      const eventsToExclude = new Set(
        isRescheduling ? tasks.filter(t => t.eventId).map(t => t.eventId) : []
      );
      
      console.log('🚫 Excluding events from AI consideration:', Array.from(eventsToExclude));
      
      const formattedExistingEvents = (existingEvents || [])
        .filter(event => !eventsToExclude.has(event._id))
        .map(event => ({
          title: event.title,
          startTime: formatDateTime(new Date(event.startTime * 1000)),
          endTime: formatDateTime(new Date(event.endTime * 1000)),
          description: event.description || '',
          isAllDay: event.isAllDay || false,
        }));
      
      console.log('📅 Existing events for AI:', formattedExistingEvents.length, 'events');

      // Generate schedule via AI
      console.log('🤖 Calling AI schedule generation...');
      const response = await fetch('https://careful-boar-557.convex.site/api/generate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: taskDataForScheduling,
          preferences: {
            workingHours,
            breakDuration: 15,
            maxTasksPerDay: 8,
          },
          startDate: formatDateTime(new Date()),
          existingEvents: formattedExistingEvents,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate schedule');

      const { schedule } = await response.json();
      console.log('✅ AI generated schedule:', schedule);

      // Create events and link to tasks using schedule.taskId mapping
      const createdEvents: Array<Id<'events'>> = [];
      for (const scheduled of schedule) {
        const localTaskId = scheduled.taskId as string | undefined;
        const dbTaskId = localTaskId ? taskIdMap.get(localTaskId) : undefined;

        if (!localTaskId || !dbTaskId) {
          console.warn('⚠️ Skipping scheduled item without resolvable task mapping:', scheduled);
          continue;
        }

        console.log('📌 Creating event for task:', scheduled.title, 'localId:', localTaskId, 'dbId:', dbTaskId);

        const eventId = await createEvent({
          title: scheduled.title,
          description: scheduled.reasoning || '',
          startTime: Math.floor(new Date(scheduled.startTime).getTime() / 1000),
          endTime: Math.floor(new Date(scheduled.endTime).getTime() / 1000),
          calendarId: defaultCalendarId,
        });

        console.log('✅ Created event:', eventId);

        console.log('🔗 Linking task to event:', dbTaskId, '<->', eventId);
        await linkTaskToEvent({
          taskId: dbTaskId as Id<'tasks'>,
          eventId: eventId,
        });

        // Update local task entry immutably
        setTasks((prev) => prev.map((t) => t.id === localTaskId ? { ...t, dbTaskId: dbTaskId as unknown as string, eventId } : t));

        createdEvents.push(eventId);
      }

      console.log('🎉 Schedule generation complete!');
      console.log('📊 Created', createdEvents.length, 'events');
      
      setScheduledCount(schedule.length);
      setIsRescheduling(false);
      setTimeout(handleClose, 2000);
    } catch (error) {
      console.error('❌ Failed to generate schedule:', error);
    } finally {
      setLoading(prev => ({ ...prev, scheduling: false }));
    }
  };

  // Reset and close
  const handleClose = () => {
    console.log('👋 Closing modal and resetting state');
    setTasks([]);
    setNewTaskTitle('');
    setNaturalLanguageText('');
    setScheduledCount(0);
    setActiveTab('natural');
    setIsRescheduling(false);
    onClose();
  };

  // Success view
  if (scheduledCount > 0) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">
              {isRescheduling ? 'Tasks Rescheduled!' : 'Tasks Scheduled!'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {scheduledCount} task{scheduledCount !== 1 ? 's' : ''} {isRescheduling ? 'updated' : 'added'} to your calendar
            </p>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            AI Schedule
            {isRescheduling && (
              <Badge variant="secondary" className="ml-2">Rescheduling Mode</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="natural" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Natural Language
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Advanced
              {tasks.length > 0 && (
                <Badge variant="secondary" className="ml-1">{tasks.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="natural" className="space-y-4">
            <div className="space-y-3">
              <Label>Describe your tasks</Label>
              <Textarea
                placeholder="Enter your tasks here... Use bullet points, numbered lists, or write naturally!"
                value={naturalLanguageText}
                onChange={(e) => setNaturalLanguageText(e.target.value)}
                className="min-h-[120px]"
                disabled={loading.parsing}
              />
              <Button
                onClick={parseNaturalLanguage}
                disabled={!naturalLanguageText.trim() || loading.parsing}
                className="w-full"
              >
                {loading.parsing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Parsing tasks...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Parse Tasks with AI
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Type a task and press Enter..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
              />
              <Button onClick={() => addTask()} size="sm" variant="ghost">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {tasks.length > 0 && (
              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    onUpdate={(updates) => updateTaskLocal(index, updates)}
                    onUpdatePriority={(priority) => updatePriority(index, priority)}
                    onRemove={() => removeTask(index)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <WorkingHours 
          workingHours={workingHours}
          onChange={setWorkingHours}
        />

        <div className="flex gap-3 border-t pt-4">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={generateSchedule}
            disabled={tasks.length === 0 || loading.scheduling || !defaultCalendarId}
            className="flex-1"
          >
            {loading.scheduling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isRescheduling ? 'Rescheduling...' : 'Scheduling...'}
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                {isRescheduling ? 'Reschedule' : 'Schedule'} {tasks.length} task{tasks.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Task Card Component
function TaskCard({ task, index, onUpdate, onUpdatePriority, onRemove }: {
  task: Task;
  index: number;
  onUpdate: (updates: Partial<Task>) => void;
  onUpdatePriority: (priority: Task['priority']) => void;
  onRemove: () => void;
}) {
  return (
    <div className="p-3 border rounded-lg space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {task.title}
            {task.dbTaskId && (
              <span className="ml-2 text-xs text-gray-500">[DB: {task.dbTaskId.slice(-6)}]</span>
            )}
            {task.eventId && (
              <span className="ml-2 text-xs text-blue-500">[Event: {task.eventId.slice(-6)}]</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`${PRIORITY_MAP[task.priority].color} text-xs`}>
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
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="w-8 h-8 p-0"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Select 
          value={task.priority} 
          onValueChange={(value) => {
            console.log(`📝 Task ${index}: Priority changed from ${task.priority} to ${value}`);
            onUpdatePriority(value as Task['priority']);
          }}
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

        <Input
          type="number"
          value={task.duration}
          onChange={(e) => {
            console.log(`📝 Task ${index}: Duration changed to ${e.target.value}`);
            onUpdate({ duration: parseInt(e.target.value) || 60 });
          }}
          className="h-8 text-xs"
          min="15"
          max="480"
        />

        <Input
          type="date"
          value={task.deadline || ''}
          onChange={(e) => {
            console.log(`📝 Task ${index}: Deadline changed to ${e.target.value}`);
            onUpdate({ deadline: e.target.value || undefined });
          }}
          className="h-8 text-xs"
          min={getToday()}
        />
      </div>
    </div>
  );
}

// Working Hours Component
function WorkingHours({ workingHours, onChange }: {
  workingHours: { start: string; end: string };
  onChange: (hours: { start: string; end: string }) => void;
}) {
  return (
    <div className="space-y-3 border-t pt-4">
      <Label>Working Hours</Label>
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="time"
          value={workingHours.start}
          onChange={(e) => onChange({ ...workingHours, start: e.target.value })}
        />
        <Input
          type="time"
          value={workingHours.end}
          onChange={(e) => onChange({ ...workingHours, end: e.target.value })}
        />
      </div>
    </div>
  );
}