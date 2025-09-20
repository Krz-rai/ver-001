import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get user tasks sorted by priority (1=highest, 10=lowest) and creation time
 */
export const getUserTasks = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("scheduled"), v.literal("completed"))),
  },
  returns: v.array(v.object({
    _id: v.id("tasks"),
    _creationTime: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    priorityValue: v.number(),
    duration: v.number(),
    deadline: v.optional(v.string()),
    startDate: v.optional(v.string()),
    userId: v.string(),
    status: v.union(v.literal("pending"), v.literal("scheduled"), v.literal("completed")),
    scheduledEventId: v.optional(v.id("events")),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Gracefully return empty list when unauthenticated to avoid UI crashes
      return [];
    }

    // Use appropriate index based on whether status filter is provided
    let taskQuery;
    if (args.status !== undefined) {
      taskQuery = ctx.db
        .query("tasks")
        .withIndex("by_user_and_status", (q) =>
          q.eq("userId", identity.subject).eq("status", args.status!)
        );
    } else {
      // Broader query by user; we will sort client-side by priority
      taskQuery = ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", identity.subject));
    }

    const rawTasks = await taskQuery.collect();

    // Sanitize documents to ensure they conform to the return validator
    const tasks = rawTasks.map((t) => {
      const priority = t.priority === "low" || t.priority === "medium" || t.priority === "high" ? t.priority : "medium" as const;
      const derivedPriorityValue =
        typeof (t as any).priorityValue === "number"
          ? (t as any).priorityValue
          : priority === "high"
            ? 2
            : priority === "low"
              ? 8
              : 5;
      const status = t.status === "pending" || t.status === "scheduled" || t.status === "completed" ? t.status : ("pending" as const);
      return {
        _id: t._id,
        _creationTime: t._creationTime,
        title: t.title ?? "",
        description: t.description ?? undefined,
        priority,
        priorityValue: derivedPriorityValue,
        duration: typeof t.duration === "number" ? t.duration : 60,
        deadline: t.deadline ?? undefined,
        startDate: t.startDate ?? undefined,
        userId: t.userId,
        status,
        scheduledEventId: t.scheduledEventId ?? undefined,
      };
    });

    // Sort by priority value (1=highest) then by creation time (older first for ties)
    tasks.sort((a, b) => {
      if (a.priorityValue !== b.priorityValue) {
        return a.priorityValue - b.priorityValue;
      }
      return a._creationTime - b._creationTime;
    });

    return tasks;
  },
});

/**
 * Create a new task
 */
export const createTask = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    priorityValue: v.optional(v.number()), // If not provided, will derive from priority
    duration: v.number(),
    deadline: v.optional(v.string()),
    startDate: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("scheduled"), v.literal("completed"))),
  },
  returns: v.id("tasks"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Derive priorityValue from priority string if not provided
    let priorityValue = args.priorityValue;
    if (!priorityValue) {
      switch (args.priority) {
        case "high":
          priorityValue = 2; // 1-3 range
          break;
        case "medium":
          priorityValue = 5; // 4-6 range
          break;
        case "low":
          priorityValue = 8; // 7-10 range
          break;
      }
    }

    // Validate priorityValue is in range
    if (priorityValue < 1 || priorityValue > 10) {
      throw new Error("Priority value must be between 1 and 10");
    }

    return await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      priority: args.priority,
      priorityValue: priorityValue,
      duration: args.duration,
      deadline: args.deadline,
      startDate: args.startDate,
      userId: identity.subject,
      status: args.status || "pending",
    });
  },
});

/**
 * Update task status and link to scheduled event
 */
export const updateTaskStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(v.literal("pending"), v.literal("scheduled"), v.literal("completed")),
    scheduledEventId: v.optional(v.id("events")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Task not found or access denied");
    }

    const updates: any = {
      status: args.status,
    };

    if (args.scheduledEventId !== undefined) {
      updates.scheduledEventId = args.scheduledEventId;
    }

    await ctx.db.patch(args.taskId, updates);
    return null;
  },
});

/**
 * Update a task's properties
 */
export const updateTask = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    priorityValue: v.optional(v.number()),
    duration: v.optional(v.number()),
    deadline: v.optional(v.string()),
    startDate: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Task not found or access denied");
    }

    console.log("🔧 updateTask mutation called", {
      taskId: args.taskId,
      currentTask: {
        title: task.title,
        priority: task.priority,
        priorityValue: task.priorityValue,
        duration: task.duration,
        deadline: task.deadline,
        startDate: task.startDate
      },
      args: args
    });

    // Build update object with only provided fields
    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.duration !== undefined) updates.duration = args.duration;
    if (args.deadline !== undefined) updates.deadline = args.deadline;
    if (args.startDate !== undefined) updates.startDate = args.startDate;

    // Handle priority value updates
    if (args.priorityValue !== undefined) {
      if (args.priorityValue < 1 || args.priorityValue > 10) {
        throw new Error("Priority value must be between 1 and 10");
      }
      updates.priorityValue = args.priorityValue;
    } else if (args.priority !== undefined) {
      // Auto-update priorityValue based on priority string
      switch (args.priority) {
        case "high":
          updates.priorityValue = Math.min(task.priorityValue, 3); // Keep in high range
          break;
        case "medium":
          updates.priorityValue = Math.max(4, Math.min(task.priorityValue, 6)); // Move to medium range
          break;
        case "low":
          updates.priorityValue = Math.max(task.priorityValue, 7); // Keep in low range
          break;
      }
    }

    console.log("🔧 About to patch task with updates:", updates);

    await ctx.db.patch(args.taskId, updates);

    console.log("🔧 Task patched successfully");

    return null;
  },
});

/**
 * Delete a task
 */
export const deleteTask = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Task not found or access denied");
    }

    await ctx.db.delete(args.taskId);
    return null;
  },
});

/**
 * Link a task to an event (bidirectional)
 */
export const linkTaskToEvent = mutation({
  args: {
    taskId: v.id("tasks"),
    eventId: v.id("events"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify task ownership
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== identity.subject) {
      throw new Error("Task not found or access denied");
    }

    // Verify event ownership
    const event = await ctx.db.get(args.eventId);
    if (!event || event.userId !== identity.subject) {
      throw new Error("Event not found or access denied");
    }

    // Update both sides of the relationship
    await ctx.db.patch(args.taskId, {
      scheduledEventId: args.eventId,
      status: "scheduled" as const,
    });

    await ctx.db.patch(args.eventId, {
      taskId: args.taskId,
    });

    return null;
  },
});

/**
 * Get task by scheduled event ID
 */
export const getTaskByEventId = query({
  args: {
    eventId: v.id("events"),
  },
  returns: v.union(v.object({
    _id: v.id("tasks"),
    _creationTime: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    priorityValue: v.number(),
    duration: v.number(),
    deadline: v.optional(v.string()),
    startDate: v.optional(v.string()),
    userId: v.string(),
    status: v.union(v.literal("pending"), v.literal("scheduled"), v.literal("completed")),
    scheduledEventId: v.optional(v.id("events")),
  }), v.null()),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const task = await ctx.db
      .query("tasks")
      .withIndex("by_event", (q) => q.eq("scheduledEventId", args.eventId))
      .first();

    if (!task || task.userId !== identity.subject) {
      return null;
    }

    return task;
  },
});