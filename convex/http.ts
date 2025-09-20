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
    timeZone: z.string().optional().default('America/New_York'),
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
        timeZone: 'America/New_York',
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

      // Enhanced scheduling with conflict resolution and comprehensive debugging
      const scheduleWithRescheduling = () => {
        console.log('🚀 STARTING SCHEDULING PROCESS');
        console.log('📋 Input tasks:', tasks.map(t => ({ title: t.title, deadline: t.deadline, duration: t.estimatedDuration, priority: t.priority })));
        console.log('📅 Current date:', currentDate.toISOString());
        console.log('🕐 Working hours:', defaultPreferences.workingHours);
        console.log('📆 Working days:', defaultPreferences.workingDays);
        console.log('⏰ Buffer time:', defaultPreferences.breakDuration, 'minutes');
        console.log('🎯 Existing events:', existingEvents.length);

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

        console.log('📊 Sorted tasks by priority/deadline:', sortedTasks.map(t => ({ title: t.title, deadline: t.deadline, priority: t.priority })));

        for (let taskIndex = 0; taskIndex < sortedTasks.length; taskIndex++) {
          const task = sortedTasks[taskIndex];
          console.log(`\n🎯 === SCHEDULING TASK ${taskIndex + 1}: "${task.title}" ===`);

          const taskDuration = task.estimatedDuration || 60;
          const taskDeadline = task.deadline ? new Date(task.deadline) : null;
          const taskStartDate = task.startDate ? new Date(task.startDate) : currentDate;

          console.log('⏱️ Task duration:', taskDuration, 'minutes');
          console.log('📅 Task deadline:', taskDeadline?.toISOString() || 'None');
          console.log('🚀 Task earliest start:', taskStartDate.toISOString());

          // Determine scheduling window - FIXED: Handle after-hours and weekend conflicts
          let schedulingStartDate = new Date(Math.max(taskStartDate.getTime(), currentDate.getTime()));

          // If current time is after working hours, start from next working day
          const currentHour = schedulingStartDate.getHours();
          const workEndHour = parseInt(defaultPreferences.workingHours.end.split(':')[0]);

          if (currentHour >= workEndHour) {
            console.log(`⏰ Current time (${currentHour}:00) is after working hours (ends at ${workEndHour}:00)`);
            // Move to next day at start of working hours
            schedulingStartDate = new Date(schedulingStartDate);
            schedulingStartDate.setDate(schedulingStartDate.getDate() + 1);
            schedulingStartDate.setHours(parseInt(defaultPreferences.workingHours.start.split(':')[0]), 0, 0, 0);
            console.log(`🔄 Adjusted start to next day: ${schedulingStartDate.toISOString()}`);
          }

          // If start lands on a non-working day, push forward to the next working day at working start
          const dayNameAtStart = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][schedulingStartDate.getDay()];
          if (!defaultPreferences.workingDays.includes(dayNameAtStart)) {
            console.log(`⛔ Start date ${schedulingStartDate.toISOString()} falls on ${dayNameAtStart} (non-working day)`);
            while (true) {
              schedulingStartDate.setDate(schedulingStartDate.getDate() + 1);
              const dn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][schedulingStartDate.getDay()];
              if (defaultPreferences.workingDays.includes(dn)) {
                schedulingStartDate.setHours(parseInt(defaultPreferences.workingHours.start.split(':')[0]), 0, 0, 0);
                console.log(`🔄 Moved start to next working day: ${schedulingStartDate.toISOString()}`);
                break;
              }
            }
          }

          // Extend deadline if it falls on non-working days
          let schedulingEndDate = taskDeadline || new Date(schedulingStartDate.getTime() + 30 * 24 * 60 * 60 * 1000);

          if (taskDeadline) {
            const deadlineDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][taskDeadline.getDay()];
            if (!defaultPreferences.workingDays.includes(deadlineDay)) {
              console.log(`⚠️ Deadline ${taskDeadline.toISOString()} falls on ${deadlineDay} (non-working day)`);
              // Extend to next working day after deadline
              let extendedDeadline = new Date(taskDeadline);
              while (true) {
                extendedDeadline.setDate(extendedDeadline.getDate() + 1);
                const extendedDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][extendedDeadline.getDay()];
                if (defaultPreferences.workingDays.includes(extendedDay)) {
                  schedulingEndDate = extendedDeadline;
                  console.log(`🔄 Extended deadline to next working day: ${schedulingEndDate.toISOString()}`);
                  break;
                }
              }
            }
          }

          // Snap end of window to end of working hours on the effective deadline date
          const workEndHourForWindow = parseInt(defaultPreferences.workingHours.end.split(':')[0]);
          schedulingEndDate = new Date(schedulingEndDate);
          schedulingEndDate.setHours(workEndHourForWindow, 0, 0, 0);

          console.log('🪟 Scheduling window:', schedulingStartDate.toISOString(), 'to', schedulingEndDate.toISOString());

          let scheduled = false;

          // Try to schedule on each day within the window
          for (let d = new Date(schedulingStartDate); d <= schedulingEndDate && !scheduled; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            console.log(`\n📆 Trying date: ${dateStr} (${d.toLocaleDateString('en-US', { weekday: 'long' })})`);

            // Skip non-working days
            const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d.getDay()];
            if (!defaultPreferences.workingDays.includes(dayName)) {
              console.log(`❌ Skipping ${dayName} - not a working day`);
              continue;
            }

            console.log(`✅ ${dayName} is a working day, proceeding...`);

            // Get events for this day
            const dayEvents = allEvents.filter(e => e.startTime.startsWith(dateStr));
            console.log(`📅 Events on ${dateStr}:`, dayEvents.length);
            dayEvents.forEach((e, i) => {
              console.log(`  ${i + 1}. "${e.title}" ${e.startTime} - ${e.endTime}`);
            });

            // Find available slots - FIXED: Use local time, not UTC
            const workStart = new Date(`${dateStr}T${defaultPreferences.workingHours.start}:00`);
            const workEnd = new Date(`${dateStr}T${defaultPreferences.workingHours.end}:00`);
            const bufferMs = defaultPreferences.breakDuration * 60 * 1000;

            console.log(`🕐 Working hours: ${workStart.toISOString()} - ${workEnd.toISOString()}`);
            console.log(`⏱️ Buffer time: ${defaultPreferences.breakDuration} minutes (${bufferMs}ms)`);

            // Sort events by start time
            const sortedDayEvents = [...dayEvents].sort((a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );

            // CASE 1: No events - schedule at start of day
            if (sortedDayEvents.length === 0) {
              console.log('🟢 No events today - scheduling at start of working day');
              const taskEnd = new Date(workStart.getTime() + taskDuration * 60000);

              if (taskEnd.getTime() <= workEnd.getTime()) {
                console.log(`✅ SCHEDULED: ${workStart.toISOString()} - ${taskEnd.toISOString()}`);
                scheduledTasks.push({
                  taskId: task.id || `task-${Date.now()}-${taskIndex}`,
                  title: task.title,
                  description: task.description,
                  startTime: workStart.toISOString(),
                  endTime: taskEnd.toISOString(),
                  priority: task.priority || 'medium',
                  reasoning: `Scheduled at start of day (${dateStr}) - no conflicts`,
                });

                // Add to allEvents to block this time for future tasks
                allEvents.push({
                  title: task.title,
                  startTime: workStart.toISOString(),
                  endTime: taskEnd.toISOString(),
                  description: task.description,
                });

                scheduled = true;
                break;
              } else {
                console.log(`❌ Task too long for working day: ${taskDuration} minutes > ${(workEnd.getTime() - workStart.getTime()) / 60000} minutes available`);
              }
            } else {
              // CASE 2: Events exist - find gaps
              console.log('🔍 Looking for gaps between events...');
              let taskStart = workStart;

              for (let eventIndex = 0; eventIndex < sortedDayEvents.length; eventIndex++) {
                const event = sortedDayEvents[eventIndex];
                const eventStart = new Date(event.startTime);
                const eventEnd = new Date(event.endTime);

                console.log(`🎯 Checking gap before event ${eventIndex + 1}: "${event.title}"`);
                console.log(`   Event: ${eventStart.toISOString()} - ${eventEnd.toISOString()}`);
                console.log(`   Available slot: ${taskStart.toISOString()} - ${new Date(eventStart.getTime() - bufferMs).toISOString()}`);

                const gapEndTime = eventStart.getTime() - bufferMs;
                const availableTime = (gapEndTime - taskStart.getTime()) / 60000;

                console.log(`   Available time: ${availableTime} minutes (need ${taskDuration})`);

                if (availableTime >= taskDuration) {
                  // Found a slot!
                  const taskEnd = new Date(taskStart.getTime() + taskDuration * 60000);
                  console.log(`✅ SCHEDULED: ${taskStart.toISOString()} - ${taskEnd.toISOString()}`);

                  scheduledTasks.push({
                    taskId: task.id || `task-${Date.now()}-${taskIndex}`,
                    title: task.title,
                    description: task.description,
                    startTime: taskStart.toISOString(),
                    endTime: taskEnd.toISOString(),
                    priority: task.priority || 'medium',
                    reasoning: `Scheduled in ${Math.floor(availableTime)}-minute gap before "${event.title}" on ${dateStr}`,
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

                // Move to after this event + buffer
                taskStart = new Date(eventEnd.getTime() + bufferMs);
                console.log(`   Next slot starts at: ${taskStart.toISOString()}`);
              }

              // CASE 3: Check if there's room after the last event
              if (!scheduled) {
                console.log('🔍 Checking slot after last event...');
                const lastEvent = sortedDayEvents[sortedDayEvents.length - 1];
                const afterLastEvent = new Date(new Date(lastEvent.endTime).getTime() + bufferMs);
                const availableTimeAfter = (workEnd.getTime() - afterLastEvent.getTime()) / 60000;

                console.log(`   After last event: ${afterLastEvent.toISOString()} - ${workEnd.toISOString()}`);
                console.log(`   Available time: ${availableTimeAfter} minutes (need ${taskDuration})`);

                if (availableTimeAfter >= taskDuration) {
                  const taskEnd = new Date(afterLastEvent.getTime() + taskDuration * 60000);
                  console.log(`✅ SCHEDULED: ${afterLastEvent.toISOString()} - ${taskEnd.toISOString()}`);

                  scheduledTasks.push({
                    taskId: task.id || `task-${Date.now()}-${taskIndex}`,
                    title: task.title,
                    description: task.description,
                    startTime: afterLastEvent.toISOString(),
                    endTime: taskEnd.toISOString(),
                    priority: task.priority || 'medium',
                    reasoning: `Scheduled after last event on ${dateStr}`,
                  });

                  allEvents.push({
                    title: task.title,
                    startTime: afterLastEvent.toISOString(),
                    endTime: taskEnd.toISOString(),
                    description: task.description,
                  });

                  scheduled = true;
                } else {
                  console.log(`❌ Not enough time after last event: ${availableTimeAfter} < ${taskDuration}`);
                }
              }
            }

            if (scheduled) {
              console.log(`🎉 Task "${task.title}" successfully scheduled on ${dateStr}`);
              break;
            } else {
              console.log(`❌ Could not fit task on ${dateStr}`);
            }
          }

          if (!scheduled) {
            console.log(`❌ FAILED TO SCHEDULE: "${task.title}"`);
            const reason = task.deadline
              ? `Could not find a ${taskDuration}-minute slot before effective deadline ${schedulingEndDate.toISOString().split('T')[0]}`
              : `No available ${taskDuration}-minute slot found in 30-day scheduling window`;
            console.log(`   Reason: ${reason}`);

            unscheduledTasks.push({
              taskId: task.id || `task-${Date.now()}-${taskIndex}`,
              title: task.title,
              reason: reason,
            });
          }
        }

        // Calculate metrics and generate summary
        console.log('\n📊 SCHEDULING SUMMARY:');
        console.log(`✅ Successfully scheduled: ${scheduledTasks.length}/${tasks.length} tasks`);
        console.log(`❌ Unscheduled: ${unscheduledTasks.length} tasks`);

        const workloadDistribution: Record<string, number> = {};
        let latestDate: string | null = null;

        for (const task of scheduledTasks) {
          const date = task.startTime.split('T')[0];
          workloadDistribution[date] = (workloadDistribution[date] || 0) + 1;
          if (!latestDate || date > latestDate) {
            latestDate = date;
          }
        }

        console.log('📅 Workload distribution:', workloadDistribution);
        console.log('🏁 Latest completion date:', latestDate);

        const recommendations = [];
        if (unscheduledTasks.length > 0) {
          recommendations.push('Consider extending working hours or adjusting deadlines for unscheduled tasks');
          recommendations.push('Review task durations - some may be overestimated');
        }
        if (scheduledTasks.length > 0) {
          recommendations.push('Schedule looks good! Check the calendar for your new tasks');
        }

        const result = {
          schedule: scheduledTasks,
          summary: {
            totalTasks: tasks.length,
            scheduledTasks: scheduledTasks.length,
            unscheduledTasks: unscheduledTasks,
            estimatedCompletionDate: latestDate,
            workloadDistribution,
            movedTasks: movedTasks.length > 0 ? movedTasks : undefined,
          },
          recommendations,
        };

        console.log('🎯 Final result:', result);
        return result;
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

// Natural Language Task Parser endpoint
const ParseTasksRequestSchema = z.object({
  text: z.string().min(1, "Text cannot be empty"),
  defaultDuration: z.number().optional().default(60), // default task duration in minutes
  workingHours: z.object({
    start: z.string().default('09:00'),
    end: z.string().default('17:00'),
  }).optional(),
});

const ParsedTaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  estimatedDuration: z.number(), // in minutes
  deadline: z.string().optional(), // ISO date string
  startDate: z.string().optional(), // ISO date string
  keywords: z.array(z.string()).optional(), // extracted keywords for context
  confidence: z.number().min(0).max(1), // parsing confidence score
});

const ParseTasksResponseSchema = z.object({
  tasks: z.array(ParsedTaskSchema),
  summary: z.object({
    totalParsed: z.number(),
    averageConfidence: z.number(),
    detectedPatterns: z.array(z.string()),
  }),
  suggestions: z.array(z.string()), // AI suggestions for improvement
});

http.route({
  path: "/api/parse-tasks",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    try {
      const body = await req.json();
      const { text, defaultDuration, workingHours } = ParseTasksRequestSchema.parse(body);

      const cerebras = getCerebrasProvider();
      const model = cerebras('gpt-oss-120b');

      // Build the parsing prompt
      const systemPrompt = `You are an expert task parser. Convert natural language text into structured task objects.

**PARSING RULES:**
- Extract individual tasks from various formats (bullet lists, numbered lists, paragraphs)
- Assign priority based on keywords and position in list (first items = higher priority)
- Estimate duration based on task complexity and keywords
- Extract deadlines from natural language (e.g., "by Friday", "next week", "urgent")
- Detect start date constraints (e.g., "starting Monday", "after vacation")
- Maintain original task ordering for priority assignment

**PRIORITY ASSIGNMENT:**
- HIGH: urgent, asap, critical, deadline, important, first, emergency
- MEDIUM: normal, regular, standard (or no keywords)
- LOW: low priority, later, when time permits, optional

**DURATION ESTIMATION:**
- Quick/simple tasks: 15-30 minutes
- Regular tasks: 30-90 minutes
- Complex/meetings: 60-180 minutes
- Projects/research: 120-240 minutes
- Look for explicit time mentions: "(2 hours)", "30 min", etc.

**DEADLINE DETECTION:**
- "by [date]", "due [date]", "deadline [date]"
- "this week", "next week", "end of month"
- "Friday", "Monday", etc. (interpret as next occurrence)
- "urgent" suggests deadline within 1-2 days

**OUTPUT FORMAT:**
Return valid JSON matching the schema with:
- tasks: Array of parsed task objects
- summary: Parsing statistics and detected patterns
- suggestions: Recommendations for the user

Use high confidence (0.8+) for clear tasks, medium (0.5-0.8) for somewhat ambiguous, low (0.3-0.5) for unclear.`;

      const userPrompt = `Parse this natural language text into structured tasks:

"${text}"

Context:
- Default task duration: ${defaultDuration} minutes
- Working hours: ${workingHours?.start || '09:00'} - ${workingHours?.end || '17:00'}
- Current date: ${new Date().toISOString().split('T')[0]}

Instructions:
1. Identify individual tasks (ignore non-task content)
2. Assign priorities based on position (first = higher priority) and keywords
3. Estimate realistic durations based on task complexity
4. Extract any mentioned deadlines or time constraints
5. Provide confidence scores for each parsed task
6. Return structured JSON exactly matching the schema`;

      const result = await generateObject({
        model,
        schema: ParseTasksResponseSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.3, // Lower temperature for more consistent parsing
      });

      console.log('Successfully parsed natural language tasks');
      console.log('Parsed result:', result.object);

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
      console.error('Task parsing error:', error);

      const errorResponse = {
        error: "Failed to parse tasks",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        details: error instanceof z.ZodError ? error.issues : undefined,
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

// OPTIONS handlers for CORS
http.route({
  path: "/api/parse-tasks",
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

// ============================================================================
// CEREBRAS BACKEND IMPLEMENTATION
// ============================================================================

import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  smoothStream,
  wrapLanguageModel,
  defaultSettingsMiddleware,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
} from "ai";
import type { ModelMessage, TextStreamPart, Tool } from "ai";
import type { LanguageModelV2Middleware, LanguageModelV2StreamPart } from '@ai-sdk/provider';

// Cerebras model constants
const CEREBRAS_MODELS = {
  CHAT: 'qwen-3-coder-480b',
  CODING: 'qwen-3-coder-480b', 
  GENERAL: 'gpt-oss-120b',
  REASONING: 'qwen-3-coder-480b',
} as const;

// Message types for Cerebras chat
type CerebrasChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
};

type CerebrasChatMetadata = {
  model?: string;
  totalTokens?: number;
  reasoningTokens?: number;
  cachedPromptTokens?: number;
};

// Initialize Cerebras provider with caching (renamed to avoid conflict)
let cerebrasChatProvider: ReturnType<typeof createCerebras> | null = null;

function getCerebrasChatProvider() {
  if (!cerebrasChatProvider) {
    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) {
      throw new Error('CEREBRAS_API_KEY is not set in environment variables');
    }
    cerebrasChatProvider = createCerebras({ 
      apiKey,
      // Add any Cerebras-specific configuration here
    });
    console.log('🔐 [CEREBRAS] Initialized Cerebras provider');
  }
  return cerebrasChatProvider;
}

// Simple in-memory cache for Cerebras responses
const cerebrasCache = new Map<string, { data: any; timestamp: number }>();
const CEREBRAS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Cerebras-specific metrics
const cerebrasMetrics = {
  totalRequests: 0,
  totalTokens: 0,
  cacheHits: 0,
  cacheMisses: 0,
  averageLatency: 0,
  requestLatencies: [] as number[],
  modelUsage: {} as Record<string, number>,
};

// Debug logging for Cerebras
const isProduction = process.env.NODE_ENV === 'production';
const cerebrasLog = (...args: unknown[]) => {
  if (!isProduction) {
    console.log('[CEREBRAS]', ...args);
  }
};

// Cerebras middleware stack
const cerebrasLoggingMiddleware: LanguageModelV2Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    const startTime = Date.now();
    cerebrasMetrics.totalRequests++;

    cerebrasLog('🔍 Cerebras Request:', {
      temperature: params.temperature,
      maxOutputTokens: params.maxOutputTokens,
      timestamp: new Date().toISOString(),
    });

    const result = await doGenerate();
    const latency = Date.now() - startTime;

    cerebrasMetrics.requestLatencies.push(latency);
    if (cerebrasMetrics.requestLatencies.length > 100) {
      cerebrasMetrics.requestLatencies.shift();
    }
    cerebrasMetrics.averageLatency = cerebrasMetrics.requestLatencies.reduce((a, b) => a + b, 0) / cerebrasMetrics.requestLatencies.length;

    // Track model usage (using a default since model isn't available in params)
    const modelId = 'cerebras-model';
    cerebrasMetrics.modelUsage[modelId] = (cerebrasMetrics.modelUsage[modelId] || 0) + 1;

    if (result.usage) {
      const promptTokens = (result.usage as any).promptTokens || 0;
      const completionTokens = (result.usage as any).completionTokens || 0;
      cerebrasMetrics.totalTokens += promptTokens + completionTokens;
      cerebrasLog('📊 Token usage:', {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
        latency: `${latency}ms`,
      });
    }

    return result;
  },

  wrapStream: async ({ doStream, params }) => {
    const startTime = Date.now();
    cerebrasMetrics.totalRequests++;

    cerebrasLog('🔍 Cerebras Stream Request:', {
      temperature: params.temperature,
      timestamp: new Date().toISOString(),
    });

    const { stream, ...rest } = await doStream();
    let totalTokens = 0;

    const transformStream = new TransformStream<
      LanguageModelV2StreamPart,
      LanguageModelV2StreamPart
    >({
      transform(chunk, controller) {
        if ('usage' in chunk && chunk.usage) {
          const promptTokens = (chunk.usage as any).promptTokens || 0;
          const completionTokens = (chunk.usage as any).completionTokens || 0;
          totalTokens = promptTokens + completionTokens;
          cerebrasMetrics.totalTokens += totalTokens;
        }
        controller.enqueue(chunk);
      },

      flush() {
        const latency = Date.now() - startTime;
        cerebrasMetrics.requestLatencies.push(latency);
        if (cerebrasMetrics.requestLatencies.length > 100) {
          cerebrasMetrics.requestLatencies.shift();
        }
        cerebrasMetrics.averageLatency = cerebrasMetrics.requestLatencies.reduce((a, b) => a + b, 0) / cerebrasMetrics.requestLatencies.length;

        cerebrasLog('📊 Cerebras Stream completed:', {
          totalTokens,
          latency: `${latency}ms`,
          avgLatency: `${Math.round(cerebrasMetrics.averageLatency)}ms`,
        });
      },
    });

    return {
      stream: stream.pipeThrough(transformStream),
      ...rest,
    };
  },
};

// Cerebras caching middleware
const cerebrasCachingMiddleware: LanguageModelV2Middleware = {
  wrapGenerate: async ({ doGenerate, params }) => {
    cerebrasLog('🔄 Checking Cerebras cache...');
    const cacheKey = JSON.stringify({
      prompt: params.prompt,
      temperature: params.temperature,
      maxOutputTokens: params.maxOutputTokens,
    });

    // Check cache
    const cached = cerebrasCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CEREBRAS_CACHE_TTL) {
      cerebrasMetrics.cacheHits++;
      cerebrasLog('✅ Cerebras cache hit');
      return cached.data;
    }

    cerebrasLog('❌ Cerebras cache miss, generating...');
    cerebrasMetrics.cacheMisses++;
    const result = await doGenerate();
    cerebrasLog('✅ Cerebras generation complete');

    // Store in cache
    cerebrasCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    // Clean up old cache entries
    for (const [key, value] of cerebrasCache.entries()) {
      if (Date.now() - value.timestamp > CEREBRAS_CACHE_TTL) {
        cerebrasCache.delete(key);
      }
    }

    return result;
  },
};

// Default settings for Cerebras
const cerebrasDefaultSettings = defaultSettingsMiddleware({
  settings: {
    maxOutputTokens: 4000,
    temperature: 0.7,
  },
});

// Combine Cerebras middleware
const cerebrasMiddleware = [
  cerebrasDefaultSettings,
  cerebrasLoggingMiddleware,
  cerebrasCachingMiddleware,
];

// Helper function to create wrapped Cerebras model
function createWrappedCerebrasModel(
  cerebras: ReturnType<typeof createCerebras>,
  modelName: string = CEREBRAS_MODELS.CHAT
) {
  cerebrasLog(`🚀 Creating wrapped Cerebras ${modelName} with middleware`);
  return wrapLanguageModel({
    model: cerebras(modelName),
    middleware: cerebrasMiddleware,
  });
}

// Build model messages for Cerebras
const buildCerebrasModelMessages = (messages: CerebrasChatMessage[]): ModelMessage[] => {
  // Convert CerebrasChatMessage directly to ModelMessage format
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  })) as ModelMessage[];
};

// Smooth streaming for Cerebras
const cerebrasSmoothStreaming = smoothStream({
  chunking: 'word',
  delayInMs: 25,
});

// ============================================================================
// CEREBRAS CHAT ENDPOINT
// ============================================================================

http.route({
  path: "/api/cerebras-chat",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { 
      messages, 
      model = CEREBRAS_MODELS.CHAT,
      temperature = 0.7,
      maxTokens = 4000,
      stream = true 
    }: { 
      messages: CerebrasChatMessage[]; 
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = await req.json();

    cerebrasLog('📨 Cerebras chat request:', {
      messageCount: messages.length,
      model,
      temperature,
      maxTokens,
      stream,
    });

    // Validate messages
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages are required" }), {
        status: 400,
        headers: new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }),
      });
    }

    // Get Cerebras provider and create model
    const cerebras = getCerebrasChatProvider();
    const wrappedModel = createWrappedCerebrasModel(cerebras, model);

    // Build system prompt for Cerebras
    const systemPrompt = `You are a helpful AI assistant powered by Cerebras. You provide clear, accurate, and helpful responses.

Guidelines:
- Be concise but comprehensive
- Use clear, professional language
- Provide specific examples when helpful
- If you're unsure about something, say so
- Format responses with proper markdown when appropriate
- Always be helpful and respectful`;

    // Convert messages for the model
    const modelMessages = buildCerebrasModelMessages(messages);

    try {
      if (stream) {
        // Streaming response
        const result = streamText({
          model: wrappedModel,
          system: systemPrompt,
          messages: modelMessages,
          temperature,
          maxOutputTokens: maxTokens,
          experimental_transform: cerebrasSmoothStreaming as any,
          onError(error) {
            console.error("💥 Cerebras streamText error:", error);
          },
          onFinish(event) {
            cerebrasLog('🤖 Cerebras Response completed:', {
              textLength: event.text?.length || 0,
              usage: event.usage,
            });
          },
        });

        return result.toUIMessageStreamResponse({
          headers: new Headers({
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Vary": "origin",
          }),
        });
      } else {
        // Non-streaming response
        const result = await generateText({
          model: wrappedModel,
          system: systemPrompt,
          messages: modelMessages,
          temperature,
          maxOutputTokens: maxTokens,
        });

        return new Response(JSON.stringify({
          text: result.text,
          usage: result.usage,
          finishReason: result.finishReason,
        }), {
          headers: new Headers({
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          }),
        });
      }
    } catch (error) {
      console.error('❌ Cerebras API error:', error);
      return new Response(JSON.stringify({ 
        error: "Failed to generate response",
        details: error instanceof Error ? error.message : "Unknown error"
      }), {
        status: 500,
        headers: new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }),
      });
    }
  }),
});

// ============================================================================
// CEREBRAS CODING ASSISTANT ENDPOINT
// ============================================================================

http.route({
  path: "/api/cerebras-code",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { 
      prompt, 
      language = 'typescript',
      context = '',
      model = CEREBRAS_MODELS.CODING,
      temperature = 0.3 
    }: { 
      prompt: string; 
      language?: string;
      context?: string;
      model?: string;
      temperature?: number;
    } = await req.json();

    cerebrasLog('💻 Cerebras code request:', {
      prompt: prompt.substring(0, 100) + '...',
      language,
      model,
      temperature,
    });

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }),
      });
    }

    // Get Cerebras provider and create model
    const cerebras = getCerebrasChatProvider();
    const wrappedModel = createWrappedCerebrasModel(cerebras, model);

    // Build system prompt for coding
    const systemPrompt = `You are an expert ${language} developer. You write clean, efficient, and well-documented code.

Guidelines:
- Write production-ready code
- Include proper error handling
- Add helpful comments
- Follow best practices for ${language}
- Provide complete, runnable examples
- Use modern syntax and patterns

${context ? `Context: ${context}` : ''}`;

    try {
      const result = await generateText({
        model: wrappedModel,
        system: systemPrompt,
        prompt,
        temperature,
        maxOutputTokens: 6000,
      });

      return new Response(JSON.stringify({
        code: result.text,
        language,
        usage: result.usage,
        finishReason: result.finishReason,
      }), {
        headers: new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }),
      });
    } catch (error) {
      console.error('❌ Cerebras code generation error:', error);
      return new Response(JSON.stringify({ 
        error: "Failed to generate code",
        details: error instanceof Error ? error.message : "Unknown error"
      }), {
        status: 500,
        headers: new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }),
      });
    }
  }),
});

// ============================================================================
// CEREBRAS REASONING ENDPOINT
// ============================================================================

http.route({
  path: "/api/cerebras-reasoning",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const { 
      problem, 
      context = '',
      model = CEREBRAS_MODELS.REASONING,
      temperature = 0.5 
    }: { 
      problem: string; 
      context?: string;
      model?: string;
      temperature?: number;
    } = await req.json();

    cerebrasLog('🧠 Cerebras reasoning request:', {
      problem: problem.substring(0, 100) + '...',
      model,
      temperature,
    });

    if (!problem) {
      return new Response(JSON.stringify({ error: "Problem is required" }), {
        status: 400,
        headers: new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }),
      });
    }

    // Get Cerebras provider and create model
    const cerebras = getCerebrasChatProvider();
    const wrappedModel = createWrappedCerebrasModel(cerebras, model);

    // Build system prompt for reasoning
    const systemPrompt = `You are an expert problem solver and analytical thinker. Break down complex problems into manageable steps and provide clear, logical reasoning.

Guidelines:
- Think step by step
- Show your reasoning process
- Consider multiple perspectives
- Identify assumptions and limitations
- Provide clear conclusions
- Use structured thinking

${context ? `Additional Context: ${context}` : ''}`;

    try {
      const result = await generateText({
        model: wrappedModel,
        system: systemPrompt,
        prompt: problem,
        temperature,
        maxOutputTokens: 5000,
      });

      return new Response(JSON.stringify({
        reasoning: result.text,
        usage: result.usage,
        finishReason: result.finishReason,
      }), {
        headers: new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }),
      });
    } catch (error) {
      console.error('❌ Cerebras reasoning error:', error);
      return new Response(JSON.stringify({ 
        error: "Failed to generate reasoning",
        details: error instanceof Error ? error.message : "Unknown error"
      }), {
        status: 500,
        headers: new Headers({
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }),
      });
    }
  }),
});

// ============================================================================
// CEREBRAS METRICS ENDPOINT
// ============================================================================

http.route({
  path: "/api/cerebras-metrics",
  method: "GET",
  handler: httpAction(async () => {
    const cacheSize = cerebrasCache.size;
    const cacheHitRate = cerebrasMetrics.totalRequests > 0
      ? ((cerebrasMetrics.cacheHits / cerebrasMetrics.totalRequests) * 100).toFixed(2)
      : '0.00';

    const metricsData = {
      totalRequests: cerebrasMetrics.totalRequests,
      totalTokens: cerebrasMetrics.totalTokens,
      cacheHits: cerebrasMetrics.cacheHits,
      cacheMisses: cerebrasMetrics.cacheMisses,
      cacheHitRate: `${cacheHitRate}%`,
      cacheSize,
      averageLatency: Math.round(cerebrasMetrics.averageLatency),
      recentLatencies: cerebrasMetrics.requestLatencies.slice(-10),
      modelUsage: cerebrasMetrics.modelUsage,
      availableModels: Object.keys(CEREBRAS_MODELS),
    };

    return new Response(JSON.stringify(metricsData, null, 2), {
      headers: new Headers({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }),
    });
  }),
});

// ============================================================================
// CEREBRAS OPTIONS HANDLERS
// ============================================================================

// OPTIONS handler for cerebras-chat
http.route({
  path: "/api/cerebras-chat",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      }),
    });
  }),
});

// OPTIONS handler for cerebras-code
http.route({
  path: "/api/cerebras-code",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      }),
    });
  }),
});

// OPTIONS handler for cerebras-reasoning
http.route({
  path: "/api/cerebras-reasoning",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      }),
    });
  }),
});

// OPTIONS handler for cerebras-metrics
http.route({
  path: "/api/cerebras-metrics",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      headers: new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      }),
    });
  }),
});

export default http;