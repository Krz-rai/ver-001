import {
  generateObject,
  generateText,
  tool,
} from "ai";
import { httpRouter } from "convex/server";
import { z } from "zod";
import { httpAction } from "./_generated/server";
import { createCerebras } from '@ai-sdk/cerebras';
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

const http = httpRouter();

// Initialize Cerebras provider
let cerebrasProvider: ReturnType<typeof createCerebras> | null = null;

function getCerebrasProvider() {
  if (!cerebrasProvider) {
    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) {
      throw new Error('CEREBRAS_API_KEY is not set in environment variables');
    }
    cerebrasProvider = createCerebras({ apiKey });
  }
  return cerebrasProvider;
}

// Input schema for task list
const TaskSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  estimatedDuration: z.number().optional(), // in minutes
  deadline: z.string().optional(), // ISO date string
  startDate: z.string().optional(), // ISO date string - earliest date this task can start
  dependencies: z.array(z.string()).optional().default([]), // task IDs this depends on
});

const ExistingEventSchema = z.object({
  title: z.string(),
  startTime: z.string(), // ISO datetime string
  endTime: z.string(),   // ISO datetime string
  description: z.string().optional(),
  isAllDay: z.boolean().optional(),
});

const ScheduleRequestSchema = z.object({
  tasks: z.array(TaskSchema),
  preferences: z.object({
    workingHours: z.object({
      start: z.string().default('09:00'), // HH:MM format
      end: z.string().default('17:00'),   // HH:MM format
    }).optional(),
    workingDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional().default(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
    timeZone: z.string().optional().default('UTC'),
    breakDuration: z.number().optional().default(15), // minutes between tasks
    maxTasksPerDay: z.number().optional().default(8),
  }).optional(),
  startDate: z.string().optional(), // ISO date string, defaults to today
  existingEvents: z.array(ExistingEventSchema).optional().default([]), // existing calendar events
});

// Output schema for generated schedule
const ScheduledTaskSchema = z.object({
  taskId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  startTime: z.string(), // ISO datetime string
  endTime: z.string(),   // ISO datetime string
  priority: z.enum(['low', 'medium', 'high']),
  reasoning: z.string(), // AI's reasoning for this scheduling decision
});

const ScheduleResponseSchema = z.object({
  schedule: z.array(ScheduledTaskSchema),
  summary: z.object({
    totalTasks: z.number(),
    scheduledTasks: z.number(),
    unscheduledTasks: z.array(z.object({
      taskId: z.string(),
      title: z.string(),
      reason: z.string(), // why it couldn't be scheduled
    })),
    estimatedCompletionDate: z.string().nullable(), // ISO date string or null
    workloadDistribution: z.record(z.string(), z.number()), // date -> number of tasks
    movedTasks: z.array(z.object({
      title: z.string(),
      fromDate: z.string(),
      toDate: z.string(),
      reason: z.string(),
    })).optional(),
  }),
  recommendations: z.array(z.string()), // AI suggestions for optimization
});

// Schedule Generation endpoint with intelligent rescheduling
http.route({
  path: "/api/generate-schedule",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      // Parse and validate input
      const body = await req.json();
      const { tasks, preferences = {}, startDate, existingEvents = [] } = ScheduleRequestSchema.parse(body);

      // Initialize Cerebras model
      const cerebras = getCerebrasProvider();
      const model = cerebras('gpt-oss-120b'); // Using GPT-OSS-120B for complex scheduling

      // Prepare the scheduling prompt
      const defaultPreferences = {
        workingHours: { start: '09:00', end: '17:00' },
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        timeZone: 'UTC',
        breakDuration: 15,
        maxTasksPerDay: 8,
        ...preferences,
      };

      const currentDate = startDate ? new Date(startDate) : new Date();
      const tasksContext = tasks.map((task, index) => {
        const hasDeadline = task.deadline;
        const hasStartDate = task.startDate;

        const deadlineUrgency = hasDeadline && task.deadline ?
          `⚠️ DEADLINE: ${task.deadline} (${Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining)` :
          'No deadline';

        const startConstraint = hasStartDate && task.startDate ?
          `🚀 EARLIEST START: ${task.startDate} (cannot schedule before this date)` :
          'Can start immediately';

        return `Task ${index + 1} (ID: ${task.id || `task-${index}`}):
- Title: ${task.title}
- Description: ${task.description || 'No description'}
- Priority: ${task.priority || 'medium'}
- Estimated Duration: ${task.estimatedDuration || 60} minutes
- ${startConstraint}
- ${deadlineUrgency}
- Dependencies: ${task.dependencies?.join(', ') || 'None'}`;
      }).join('\n\n');

      const existingEventsContext = existingEvents.length > 0
        ? existingEvents.map((event, index) =>
            `Existing Event ${index + 1}:
- Title: ${event.title}
- Start: ${event.startTime}
- End: ${event.endTime}
- All Day: ${event.isAllDay ? 'Yes' : 'No'}
- Description: ${event.description || 'None'}`
          ).join('\n\n')
        : 'No existing events in calendar';

      const systemPrompt = `You are an AI scheduling agent. Create optimal schedules respecting all constraints.

**SCHEDULING RULES:**
- Start Date Constraints: Tasks with start dates CANNOT be scheduled before their earliest start date
- Deadline Priority: Tasks with deadlines MUST be scheduled before their deadline date  
- Working Hours: ${defaultPreferences.workingHours.start} - ${defaultPreferences.workingHours.end} (24-hour format)
- Working Days: ${defaultPreferences.workingDays.join(', ')}
- Buffer Time: ${defaultPreferences.breakDuration} minutes between tasks
- Daily Limits: Maximum ${defaultPreferences.maxTasksPerDay} tasks per day
- NEVER overlap with existing events

**Context:**
- Start Date: ${currentDate.toISOString().split('T')[0]}
- Working Hours: ${defaultPreferences.workingHours.start} - ${defaultPreferences.workingHours.end}
- Working Days: ${defaultPreferences.workingDays.join(', ')}

**Tasks to Schedule:**
${tasksContext}

**Existing Events:**
${existingEventsContext}

**REQUIRED OUTPUT FORMAT:**
Return a JSON object with:
- schedule: Array of scheduled tasks with taskId, title, startTime, endTime, priority, reasoning
- summary: Object with totalTasks, scheduledTasks, unscheduledTasks, estimatedCompletionDate, workloadDistribution  
- recommendations: Array of optimization suggestions

Use ISO datetime format for times (YYYY-MM-DDTHH:mm:ss.000Z). Generate taskIds as "task-0", "task-1", etc. if not provided.`;

      // Helper function to determine event priority
      const getEventPriority = (title: string): 'low' | 'medium' | 'high' => {
        const lowPriorityKeywords = ['running', 'gym', 'workout', 'exercise', 'break', 'coffee'];
        const highPriorityKeywords = ['meeting', 'interview', 'presentation', 'deadline', 'exam'];
        
        const titleLower = title.toLowerCase();
        if (lowPriorityKeywords.some(keyword => titleLower.includes(keyword))) return 'low';
        if (highPriorityKeywords.some(keyword => titleLower.includes(keyword))) return 'high';
        return 'medium';
      };

      // Enhanced scheduling with conflict resolution
      const scheduleWithRescheduling = () => {
        const allEvents = [...existingEvents];
        const scheduledTasks: any[] = [];
        const unscheduledTasks: any[] = [];
        const movedTasks: any[] = [];
        
        // Process tasks by priority and deadline
        const sortedTasks = [...tasks].sort((a, b) => {
          // Deadline tasks first
          if (a.deadline && !b.deadline) return -1;
          if (!a.deadline && b.deadline) return 1;
          if (a.deadline && b.deadline) {
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          }
          // Then by priority
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium'];
        });
        
        for (const task of sortedTasks) {
          const taskDuration = task.estimatedDuration || 60;
          const taskDeadline = task.deadline ? new Date(task.deadline) : null;
          const taskStartDate = task.startDate ? new Date(task.startDate) : currentDate;
          
          // Determine scheduling window
          const schedulingStartDate = new Date(Math.max(taskStartDate.getTime(), currentDate.getTime()));
          const schedulingEndDate = taskDeadline || new Date(schedulingStartDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
          
          let scheduled = false;
          
          // Try to schedule on each day within the window
          for (let d = new Date(schedulingStartDate); d <= schedulingEndDate && !scheduled; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            
            // Skip non-working days
            const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d.getDay()];
            if (!defaultPreferences.workingDays.includes(dayName)) continue;
            
            // Get events for this day
            const dayEvents = allEvents.filter(e => e.startTime.startsWith(dateStr));
            
            // Find available slots
            const workStart = new Date(`${dateStr}T${defaultPreferences.workingHours.start}:00.000Z`);
            const workEnd = new Date(`${dateStr}T${defaultPreferences.workingHours.end}:00.000Z`);
            const bufferMs = defaultPreferences.breakDuration * 60 * 1000;
            
            // Sort events by start time
            const sortedDayEvents = [...dayEvents].sort((a, b) => 
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
            
            // Find a slot for the task
            let taskStart = workStart;
            
            for (const event of sortedDayEvents) {
              const eventStart = new Date(event.startTime);
              const eventEnd = new Date(event.endTime);
              const availableTime = (eventStart.getTime() - taskStart.getTime() - bufferMs) / 60000;
              
              if (availableTime >= taskDuration) {
                // Found a slot!
                const taskEnd = new Date(taskStart.getTime() + taskDuration * 60000);
                scheduledTasks.push({
                  taskId: task.id || `task-${Date.now()}`,
                  title: task.title,
                  description: task.description,
                  startTime: taskStart.toISOString(),
                  endTime: taskEnd.toISOString(),
                  priority: task.priority || 'medium',
                  reasoning: `Scheduled in available ${availableTime}-minute slot on ${dateStr}`,
                });
                
                // Add to allEvents to block this time
                allEvents.push({
                  title: task.title,
                  startTime: taskStart.toISOString(),
                  endTime: taskEnd.toISOString(),
                  description: task.description,
                });
                
                scheduled = true;
                break;
              }
              
              taskStart = new Date(eventEnd.getTime() + bufferMs);
            }
            
            // Check if there's room after the last event
            if (!scheduled && taskStart.getTime() + taskDuration * 60000 <= workEnd.getTime()) {
              const taskEnd = new Date(taskStart.getTime() + taskDuration * 60000);
              
              // If this is a deadline task and we need to move something
              if (task.deadline && sortedDayEvents.length > 0) {
                // Find moveable lower-priority events
                const moveableEvents = sortedDayEvents.filter(e => {
                  const eventPriority = getEventPriority(e.title);
                  const taskPriority = task.priority || 'high';
                  const priorityOrder = { high: 0, medium: 1, low: 2 };
                  return priorityOrder[eventPriority] > priorityOrder[taskPriority];
                });
                
                if (moveableEvents.length > 0) {
                  // Move the lowest priority event that conflicts
                  const eventToMove = moveableEvents[moveableEvents.length - 1];
                  const eventDuration = (new Date(eventToMove.endTime).getTime() - new Date(eventToMove.startTime).getTime()) / 60000;
                  
                  // Find a new slot for the moved event (next available day)
                  const nextDay = new Date(d);
                  nextDay.setDate(nextDay.getDate() + 1);
                  const nextDateStr = nextDay.toISOString().split('T')[0];
                  const nextWorkStart = new Date(`${nextDateStr}T${defaultPreferences.workingHours.start}:00.000Z`);
                  const nextWorkEnd = new Date(`${nextDateStr}T${defaultPreferences.workingHours.end}:00.000Z`);
                  
                  // Schedule the deadline task in place of the moved event
                  const movedEventStart = new Date(eventToMove.startTime);
                  const taskEndTime = new Date(movedEventStart.getTime() + taskDuration * 60000);
                  
                  scheduledTasks.push({
                    taskId: task.id || `task-${Date.now()}`,
                    title: task.title,
                    description: task.description,
                    startTime: movedEventStart.toISOString(),
                    endTime: taskEndTime.toISOString(),
                    priority: task.priority || 'high',
                    reasoning: `High-priority deadline task. Moved '${eventToMove.title}' to make room.`,
                  });
                  
                  // Record the move
                  movedTasks.push({
                    title: eventToMove.title,
                    fromDate: dateStr,
                    toDate: nextDateStr,
                    reason: `Moved to accommodate high-priority deadline task '${task.title}'`,
                  });
                  
                  // Update allEvents to reflect the change
                  const eventIndex = allEvents.findIndex(e => 
                    e.title === eventToMove.title && e.startTime === eventToMove.startTime
                  );
                  if (eventIndex !== -1) {
                    allEvents[eventIndex] = {
                      ...eventToMove,
                      startTime: nextWorkStart.toISOString(),
                      endTime: new Date(nextWorkStart.getTime() + eventDuration * 60000).toISOString(),
                    };
                  }
                  
                  // Add the new task to allEvents
                  allEvents.push({
                    title: task.title,
                    startTime: movedEventStart.toISOString(),
                    endTime: taskEndTime.toISOString(),
                    description: task.description,
                  });
                  
                  scheduled = true;
                  break;
                }
              }
              
              if (!scheduled) {
                // Normal scheduling without conflict
                scheduledTasks.push({
                  taskId: task.id || `task-${Date.now()}`,
                  title: task.title,
                  description: task.description,
                  startTime: taskStart.toISOString(),
                  endTime: taskEnd.toISOString(),
                  priority: task.priority || 'medium',
                  reasoning: `Scheduled at end of day on ${dateStr}`,
                });
                
                allEvents.push({
                  title: task.title,
                  startTime: taskStart.toISOString(),
                  endTime: taskEnd.toISOString(),
                  description: task.description,
                });
                
                scheduled = true;
              }
            }
          }
          
          if (!scheduled) {
            unscheduledTasks.push({
              taskId: task.id || `task-${Date.now()}`,
              title: task.title,
              reason: task.deadline 
                ? `Could not find or create a ${taskDuration}-minute slot before deadline ${task.deadline}` 
                : `No available ${taskDuration}-minute slot found in scheduling window`,
            });
          }
        }
        
        // Calculate metrics
        const workloadDistribution: Record<string, number> = {};
        let latestDate: string | null = null;
        
        for (const task of scheduledTasks) {
          const date = task.startTime.split('T')[0];
          workloadDistribution[date] = (workloadDistribution[date] || 0) + 1;
          if (!latestDate || date > latestDate) {
            latestDate = date;
          }
        }
        
        return {
          schedule: scheduledTasks,
          summary: {
            totalTasks: tasks.length,
            scheduledTasks: scheduledTasks.length,
            unscheduledTasks: unscheduledTasks,
            estimatedCompletionDate: latestDate,
            workloadDistribution,
            movedTasks: movedTasks.length > 0 ? movedTasks : undefined,
          },
          recommendations: [
            ...movedTasks.map(m => `Moved '${m.title}' from ${m.fromDate} to ${m.toDate} to accommodate deadline tasks`),
            ...(unscheduledTasks.length > 0 ? ['Consider extending working hours or deadline flexibility for unscheduled tasks'] : []),
            'Review moved tasks to ensure the new schedule works for you',
          ],
        };
      };

      // Execute the intelligent scheduling
      const scheduleData = scheduleWithRescheduling();
      
      console.log('Successfully generated intelligent schedule');
      console.log('Generated schedule:', scheduleData);

      return new Response(JSON.stringify(scheduleData), {
        status: 200,
        headers: new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        }),
      });

    } catch (error) {
      console.error('Schedule generation error:', error);

      // Return structured error response with detailed logging
      const errorResponse = {
        error: "Failed to generate schedule",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        details: error instanceof z.ZodError ? error.issues : undefined,
      };

      console.error('Error response:', errorResponse);

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }),
      });
    }
  }),
});

// Simple schedule optimization endpoint
http.route({
  path: "/api/optimize-schedule",
  method: "POST",
  handler: httpAction(async (_ctx, req) => {
    try {
      const body = await req.json();
      const { currentSchedule, optimization_goal = "efficiency" } = body;

      if (!currentSchedule || !Array.isArray(currentSchedule)) {
        throw new Error("Current schedule is required and must be an array");
      }

      const cerebras = getCerebrasProvider();
      const model = cerebras('llama3.1-70b');

      const OptimizationSchema = z.object({
        optimizedSchedule: z.array(ScheduledTaskSchema),
        changes: z.array(z.object({
          taskId: z.string(),
          change: z.string(),
          reasoning: z.string(),
        })),
        efficiency_gain: z.number(), // percentage improvement
        recommendations: z.array(z.string()),
      });

      const scheduleText = currentSchedule.map((task: any) =>
        `- ${task.title}: ${task.startTime} to ${task.endTime} (Priority: ${task.priority})`
      ).join('\n');

      const systemPrompt = `You are a schedule optimization expert. Analyze the current schedule and suggest improvements based on the optimization goal: "${optimization_goal}".

Current Schedule:
${scheduleText}

Optimization Goals:
- efficiency: Minimize gaps, group similar tasks, optimize for productivity
- balance: Ensure good work-life balance, distribute workload evenly
- deadline: Prioritize meeting deadlines and critical dates
- energy: Schedule demanding tasks when energy levels are typically higher

Provide specific changes with clear reasoning for each modification.`;

      const result = await generateObject({
        model,
        schema: OptimizationSchema,
        system: systemPrompt,
        prompt: `Optimize this schedule for ${optimization_goal}. Make specific, actionable recommendations.`,
        temperature: 0.4,
      });

      return new Response(JSON.stringify(result.object), {
        status: 200,
        headers: new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }),
      });

    } catch (error) {
      console.error('Schedule optimization error:', error);

      const errorResponse = {
        error: "Failed to optimize schedule",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }),
      });
    }
  }),
});

// Smart rescheduler with tools (industry-standard approach)
const RescheduleRequestSchema = z.object({
  calendarId: z.string().describe("Target calendar id"),
  window: z.object({
    startDate: z.string().describe("ISO date string (YYYY-MM-DD) inclusive"),
    endDate: z.string().describe("ISO date string (YYYY-MM-DD) inclusive"),
  }),
  workingHours: z.object({ start: z.string(), end: z.string() }).optional().default({ start: "09:00", end: "17:00" }),
  bufferMinutes: z.number().optional().default(15),
  targetTask: z.object({
    title: z.string(),
    durationMinutes: z.number(),
    earliestStart: z.string().optional(),
    deadline: z.string().optional(),
    priority: z.enum(['low','medium','high']).optional().default('high'),
  }).optional(),
  policy: z.object({
    allowSplits: z.boolean().optional().default(false),
    onlyMoveLowPriority: z.boolean().optional().default(false),
  }).optional().default(() => ({ allowSplits: false, onlyMoveLowPriority: false })),
  applyChanges: z.boolean().optional().default(false),
});

const RescheduleChangeSchema = z.object({
  action: z.enum(['move','create','delete']).describe('The change to apply'),
  eventId: z.string().optional(),
  title: z.string().optional(),
  startTime: z.string().describe('ISO datetime'),
  endTime: z.string().describe('ISO datetime'),
  reason: z.string().optional(),
});

const ReschedulePlanSchema = z.object({
  plan: z.array(RescheduleChangeSchema),
  summary: z.object({
    moved: z.number(),
    created: z.number(),
    deleted: z.number(),
    totalAffected: z.number(),
  }),
  recommendations: z.array(z.string()).optional().default([]),
});

function toEpochSeconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

http.route({
  path: "/api/smart-reschedule",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json();
      const args = RescheduleRequestSchema.parse(body);

      // Define tools the model can use
      const list_events = tool({
        description: "List user events within a date range (inclusive)",
        inputSchema: z.object({
          startDate: z.string(),
          endDate: z.string(),
        }),
        execute: async ({ startDate, endDate }) => {
          const startEpoch = Math.floor(new Date(startDate + 'T00:00:00.000Z').getTime() / 1000);
          const endEpoch = Math.floor(new Date(endDate + 'T23:59:59.999Z').getTime() / 1000);
          const events = await ctx.runQuery(api.events.getUserEvents, { startDate: startEpoch, endDate: endEpoch });
          return events.map((e: any) => ({
            eventId: e._id,
            title: e.title,
            startTime: new Date(e.startTime * 1000).toISOString(),
            endTime: new Date(e.endTime * 1000).toISOString(),
            calendarId: e.calendarId,
            isAllDay: e.isAllDay ?? false,
            location: e.location ?? null,
          }));
        },
      });

      const find_free_windows = tool({
        description: "Compute free windows on a given date given existing events, working hours, and buffer",
        inputSchema: z.object({
          date: z.string().describe('YYYY-MM-DD'),
          workingStart: z.string().describe('HH:MM 24h'),
          workingEnd: z.string().describe('HH:MM 24h'),
          bufferMinutes: z.number().default(15),
          events: z.array(z.object({ startTime: z.string(), endTime: z.string() })).default([]),
        }),
        execute: async ({ date, workingStart, workingEnd, bufferMinutes, events }) => {
          const dayStart = new Date(`${date}T${workingStart}:00.000Z`).getTime();
          const dayEnd = new Date(`${date}T${workingEnd}:00.000Z`).getTime();
          const bufferMs = bufferMinutes * 60 * 1000;
          const busy = events
            .map((e) => ({ s: new Date(e.startTime).getTime(), e: new Date(e.endTime).getTime() }))
            .filter((r) => r.s < dayEnd && r.e > dayStart)
            .sort((a, b) => a.s - b.s);
          const merged: Array<{ s: number; e: number }> = [];
          for (const r of busy) {
            if (!merged.length || r.s > merged[merged.length - 1].e) merged.push({ ...r });
            else merged[merged.length - 1].e = Math.max(merged[merged.length - 1].e, r.e);
          }
          const windows: Array<{ startTime: string; endTime: string; durationMinutes: number }> = [];
          let cursor = dayStart;
          for (const b of merged) {
            const freeStart = cursor;
            const freeEnd = b.s - bufferMs;
            if (freeEnd - freeStart >= 5 * 60 * 1000) {
              windows.push({ startTime: new Date(freeStart).toISOString(), endTime: new Date(freeEnd).toISOString(), durationMinutes: Math.floor((freeEnd - freeStart) / 60000) });
            }
            cursor = Math.max(cursor, b.e + bufferMs);
          }
          if (dayEnd - cursor >= 5 * 60 * 1000) {
            windows.push({ startTime: new Date(cursor).toISOString(), endTime: new Date(dayEnd).toISOString(), durationMinutes: Math.floor((dayEnd - cursor) / 60000) });
          }
          return windows;
        },
      });

      const move_event = tool({
        description: "Move an existing event to a new time range",
        inputSchema: z.object({
          eventId: z.string(),
          newStartTime: z.string(),
          newEndTime: z.string(),
        }),
        execute: async ({ eventId, newStartTime, newEndTime }) => {
          await ctx.runMutation(api.events.updateEvent, {
            eventId: eventId as unknown as Id<'events'>,
            startTime: toEpochSeconds(newStartTime),
            endTime: toEpochSeconds(newEndTime),
          });
          return { ok: true };
        },
      });

      const create_event = tool({
        description: "Create a new event in the calendar",
        inputSchema: z.object({
          title: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          description: z.string().optional(),
          calendarId: z.string(),
        }),
        execute: async ({ title, startTime, endTime, description, calendarId }) => {
          const id = await ctx.runMutation(api.events.createEvent, {
            title,
            description,
            startTime: toEpochSeconds(startTime),
            endTime: toEpochSeconds(endTime),
            calendarId: calendarId as unknown as Id<'calendars'>,
          });
          return { createdEventId: id };
        },
      });

      const delete_event = tool({
        description: "Delete an event by id",
        inputSchema: z.object({ eventId: z.string() }),
        execute: async ({ eventId }) => {
          await ctx.runMutation(api.events.deleteEvent, { eventId: eventId as unknown as Id<'events'> });
          return { ok: true };
        },
      });

      const cerebras = getCerebrasProvider();
      const model = cerebras('gpt-oss-120b');

      const systemPrompt = `You are a senior scheduling optimizer. Use tools to:
1) load events, 2) detect conflicts, 3) find free windows, 4) propose a minimal-change plan, and 5) optionally apply it when applyChanges=true.
Rules:
- Respect working hours and buffers.
- Prefer moving low priority or flexible items first when policy.onlyMoveLowPriority=true.
- Never create overlaps.
- If targetTask is provided, try to fit it before its deadline.
Return only JSON matching the schema with a precise plan.`;

      const userPrompt = `Reschedule window: ${args.window.startDate}..${args.window.endDate}, working hours ${args.workingHours.start}-${args.workingHours.end}, buffer ${args.bufferMinutes} minutes.
Policy: ${JSON.stringify(args.policy)}. Apply: ${args.applyChanges}.
Calendar: ${args.calendarId}.
Target task: ${args.targetTask ? JSON.stringify(args.targetTask) : 'none'}.
Steps you should take:
1. Call list_events for the date window.
2. For each date, call find_free_windows with returned events.
3. If needed, propose moving events via move_event (only execute when applyChanges=true).
4. If targetTask cannot fit, propose create_event (execute if applyChanges=true) or return recommendations.
Output strictly as compact JSON per schema.`;

      // Use tools-capable text generation
      const result = await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.2,
        maxRetries: 2,
        tools: {
          list_events,
          find_free_windows,
          move_event,
          create_event,
          delete_event,
        },
        toolChoice: 'auto' as any,
      } as any);

      // Parse and validate plan JSON from the model
      let text = (result as any).text?.trim() || '';
      const jsonMatch = text.match(/\{[\s\S]*\}$/);
      if (jsonMatch) text = jsonMatch[0];
      let plan;
      try {
        plan = ReschedulePlanSchema.parse(JSON.parse(text));
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Failed to parse plan', raw: text }), {
          status: 200,
          headers: new Headers({
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          }),
        });
      }

      return new Response(JSON.stringify(plan), {
        status: 200,
        headers: new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }),
      });
    } catch (error) {
      console.error('Smart reschedule error:', error);
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 500,
        headers: new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }),
      });
    }
  }),
});

// OPTIONS handler for smart-reschedule
http.route({
  path: "/api/smart-reschedule",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      }),
    });
  }),
});

// OPTIONS handlers for CORS
http.route({
  path: "/api/generate-schedule",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      }),
    });
  }),
});

http.route({
  path: "/api/optimize-schedule",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      }),
    });
  }),
});

export default http;