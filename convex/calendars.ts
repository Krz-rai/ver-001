import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get user calendars with fallback to create default calendar
 */
export const getUserCalendars = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("calendars"),
    _creationTime: v.number(),
    name: v.string(),
    color: v.string(),
    userId: v.string(),
    isDefault: v.optional(v.boolean()),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const calendars = await ctx.db
      .query("calendars")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return calendars;
  },
});

/**
 * Create a new calendar
 */
export const createCalendar = mutation({
  args: {
    name: v.string(),
    color: v.string(),
  },
  returns: v.id("calendars"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("calendars", {
      name: args.name,
      color: args.color,
      userId: identity.subject,
      isDefault: false,
    });
  },
});

/**
 * Create default calendar for new users
 */
export const createDefaultCalendar = mutation({
  args: {},
  returns: v.id("calendars"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user already has calendars
    const existingCalendars = await ctx.db
      .query("calendars")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    if (existingCalendars.length > 0) {
      return existingCalendars[0]._id;
    }

    // Create default calendar
    return await ctx.db.insert("calendars", {
      name: "My Calendar",
      color: "blue-500",
      userId: identity.subject,
      isDefault: true,
    });
  },
});
