import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
  }).index("by_clerk_id", ["clerkId"]),

  calendars: defineTable({
    name: v.string(),
    color: v.string(),
    userId: v.string(), // Clerk user ID
    isDefault: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(), // Unix timestamp
    endTime: v.number(),   // Unix timestamp
    calendarId: v.id("calendars"),
    userId: v.string(), // Clerk user ID
    isAllDay: v.optional(v.boolean()),
    location: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")), // Link to associated task
  })
    .index("by_calendar", ["calendarId"])
    .index("by_user", ["userId"])
    .index("by_user_and_time", ["userId", "startTime"])
    .index("by_calendar_and_time", ["calendarId", "startTime"])
    .index("by_task", ["taskId"]),

  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    priorityValue: v.number(), // 1-10 scale (1=highest, 10=lowest)
    duration: v.number(), // minutes
    deadline: v.optional(v.string()), // ISO date string
    startDate: v.optional(v.string()), // ISO date string
    userId: v.string(), // Clerk user ID
    status: v.union(v.literal("pending"), v.literal("scheduled"), v.literal("completed")),
    scheduledEventId: v.optional(v.id("events")), // Link to scheduled event
  })
    .index("by_user", ["userId"])
    .index("by_user_and_priority", ["userId", "priorityValue"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_event", ["scheduledEventId"]),
});


