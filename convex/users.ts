import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// Get or create user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", identity.email || "")
      )
      .first();

    return user || null;
  },
});

// Create user on first sign-up
export const createUser = mutation({
  args: {
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", identity.email || "")
      )
      .first();

    if (existing) return existing;

    // User created by Convex Auth - just return it
    // Auth automatically creates users when they first authenticate
    return await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", identity.email || "")
      )
      .first();
  },
});

// Update user role (Admin only)
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("Super Admin"),
      v.literal("Property Manager"),
      v.literal("Staff"),
      v.literal("Resident"),
      v.literal("Service Provider")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Note: role is managed separately via staff/property tables
    // This is a placeholder for future role management
    return await ctx.db.get(args.userId);
  },
});

// List users in property (Admin)
export const listPropertyUsers = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const property = await ctx.db.get(args.propertyId);
    if (!property) return [];

    // Get all residents for this property
    const residents = await ctx.db
      .query("residents")
      .withIndex("by_propertyId", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    // Get all staff for this property
    const staff = await ctx.db
      .query("staff")
      .withIndex("by_propertyId", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    const userIds = [
      ...residents.map((r) => r.userId),
      ...staff.map((s) => s.userId),
      property.ownerId,
    ];

    const users = await Promise.all(
      userIds.map((id) => ctx.db.get(id))
    );

    return users.filter(Boolean);
  },
});
