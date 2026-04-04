import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Add staff member to property
export const addStaff = mutation({
  args: {
    propertyId: v.id("properties"),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    name: v.string(),
    role: v.union(
      v.literal("Manager"),
      v.literal("Watchman"),
      v.literal("Housekeeping"),
      v.literal("Maintenance"),
      v.literal("Other")
    ),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", identity.email || "")
      )
      .first();

    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new Error("Property not found");

    if (property.ownerId !== user?._id) {
      throw new Error("Unauthorized");
    }

    // Create or get user for staff
    let staffUserId = user._id;

    if (args.phone || args.email) {
      // Find existing user by phone or email
      const existing = await ctx.db
        .query("users")
        .collect();

      const found = existing.find(
        (u) => u.phone === args.phone || u.email === args.email
      );

      if (found) {
        staffUserId = found._id;
      }
      // Note: If user doesn't exist, they must sign up through auth first
    }

    const staffId = await ctx.db.insert("staff", {
      propertyId: args.propertyId,
      userId: staffUserId,
      role: args.role,
      permissions: args.permissions,
      createdAt: Date.now(),
    });

    return await ctx.db.get(staffId);
  },
});

// Get staff member
export const getStaff = query({
  args: {
    staffId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId);
    if (!staff) throw new Error("Staff not found");

    const [user, property] = await Promise.all([
      ctx.db.get(staff.userId),
      ctx.db.get(staff.propertyId),
    ]);

    return {
      staff,
      user,
      property,
    };
  },
});

// List property staff
export const listPropertyStaff = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const staff = await ctx.db
      .query("staff")
      .withIndex("by_propertyId", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    const withUsers = await Promise.all(
      staff.map(async (s) => {
        const user = await ctx.db.get(s.userId);

        return {
          staff: s,
          user,
        };
      })
    );

    return withUsers;
  },
});

// Get staff properties (for staff member)
export const getStaffProperties = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", identity.email || "")
      )
      .first();

    if (!user) return [];

    const staffRecords = await ctx.db
      .query("staff")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const properties = await Promise.all(
      staffRecords.map(async (s) => {
        const property = await ctx.db.get(s.propertyId);

        return {
          staff: s,
          property,
        };
      })
    );

    return properties;
  },
});

// Update staff role and permissions
export const updateStaffRole = mutation({
  args: {
    staffId: v.id("staff"),
    role: v.union(
      v.literal("Manager"),
      v.literal("Watchman"),
      v.literal("Housekeeping"),
      v.literal("Maintenance"),
      v.literal("Other")
    ),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId);
    if (!staff) throw new Error("Staff not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", identity.email || "")
      )
      .first();

    const property = await ctx.db.get(staff.propertyId);
    if (property?.ownerId !== user?._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.staffId, {
      role: args.role,
      permissions: args.permissions,
    });

    return await ctx.db.get(args.staffId);
  },
});

// Remove staff
export const removeStaff = mutation({
  args: {
    staffId: v.id("staff"),
  },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId);
    if (!staff) throw new Error("Staff not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", identity.email || "")
      )
      .first();

    const property = await ctx.db.get(staff.propertyId);
    if (property?.ownerId !== user?._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.staffId);

    return { success: true };
  },
});

// Check staff permission
export const hasPermission = query({
  args: {
    permission: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", identity.email || "")
      )
      .first();

    if (!user) return false;

    const staff = await ctx.db
      .query("staff")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!staff) return false;

    return staff.permissions.includes(args.permission);
  },
});
