import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get user events with proper date filtering
 */
export const getUserEvents = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("events"),
    _creationTime: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    calendarId: v.id("calendars"),
    userId: v.string(),
    isAllDay: v.optional(v.boolean()),
    location: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")), // Link to associated task
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Use the user-time index for better performance
    let query = ctx.db
      .query("events")
      .withIndex("by_user_and_time", (q) => q.eq("userId", identity.subject));

    // Apply date range filtering if provided
    if (args.startDate && args.endDate) {
      query = query.filter((q) =>
        q.and(
          q.lte(q.field("startTime"), args.endDate!),
          q.gte(q.field("endTime"), args.startDate!)
        )
      );
    }

    return await query.collect();
  },
});

/**
 * Create a new event
 */
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    calendarId: v.id("calendars"),
    isAllDay: v.optional(v.boolean()),
    location: v.optional(v.string()),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify that the calendar belongs to the user
    const calendar = await ctx.db.get(args.calendarId);
    if (!calendar || calendar.userId !== identity.subject) {
      throw new Error("Calendar not found or access denied");
    }

    return await ctx.db.insert("events", {
      title: args.title,
      description: args.description,
      startTime: args.startTime,
      endTime: args.endTime,
      calendarId: args.calendarId,
      userId: identity.subject,
      isAllDay: args.isAllDay,
      location: args.location,
    });
  },
});

/**
 * Delete an event
 */
export const deleteEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event || event.userId !== identity.subject) {
      throw new Error("Event not found or access denied");
    }

    await ctx.db.delete(args.eventId);
    return null;
  },
});

/**
 * Update an event
 */
export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    calendarId: v.optional(v.id("calendars")),
    isAllDay: v.optional(v.boolean()),
    location: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event || event.userId !== identity.subject) {
      throw new Error("Event not found or access denied");
    }

    console.log("⚡ updateEvent mutation called", {
      eventId: args.eventId,
      currentEvent: {
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        calendarId: event.calendarId,
        taskId: event.taskId
      },
      args: args
    });

    // If calendarId is being changed, verify the new calendar belongs to user
    if (args.calendarId) {
      const calendar = await ctx.db.get(args.calendarId);
      if (!calendar || calendar.userId !== identity.subject) {
        throw new Error("Calendar not found or access denied");
      }
    }

    // Build update object with only provided fields
    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.startTime !== undefined) updates.startTime = args.startTime;
    if (args.endTime !== undefined) updates.endTime = args.endTime;
    if (args.calendarId !== undefined) updates.calendarId = args.calendarId;
    if (args.isAllDay !== undefined) updates.isAllDay = args.isAllDay;
    if (args.location !== undefined) updates.location = args.location;

    console.log("⚡ About to patch event with updates:", updates);

    await ctx.db.patch(args.eventId, updates);

    console.log("⚡ Event patched successfully");

    return null;
  },
});
