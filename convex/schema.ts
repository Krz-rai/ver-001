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
  })
    .index("by_calendar", ["calendarId"])
    .index("by_user", ["userId"])
    .index("by_user_and_time", ["userId", "startTime"])
    .index("by_calendar_and_time", ["calendarId", "startTime"]),
});


