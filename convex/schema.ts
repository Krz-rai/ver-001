import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const applicationTables = {
  calendars: defineTable({
    name: v.string(),
    color: v.string(),
    userId: v.id("users"),
    isDefault: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    calendarId: v.id("calendars"),
    userId: v.id("users"),
    isAllDay: v.optional(v.boolean()),
    location: v.optional(v.string()),
  })
    .index("by_calendar", ["calendarId"])
    .index("by_user", ["userId"])
    .index("by_time_range", ["startTime", "endTime"]),
};


