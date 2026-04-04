import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Create a property
export const createProperty = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("Society"),
      v.literal("Hostel"),
      v.literal("PG"),
      v.literal("Co-living")
    ),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    pincode: v.string(),
    wings: v.array(v.string()),
    floorsPerWing: v.number(),
    unitsPerFloor: v.number(),
    maintenanceAmount: v.number(),
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

    if (!user) throw new Error("User not found");

    const propertyId = await ctx.db.insert("properties", {
      ownerId: user._id,
      name: args.name,
      type: args.type,
      address: args.address,
      city: args.city,
      state: args.state,
      pincode: args.pincode,
      wings: args.wings,
      floorsPerWing: args.floorsPerWing,
      unitsPerFloor: args.unitsPerFloor,
      settings: {
        maintenanceAmount: args.maintenanceAmount,
        lateFeePercent: 10,
        slaHours: 48,
        bookingCancelWindow: 24,
      },
      createdAt: Date.now(),
    });

    // Create units for the property
    for (const wing of args.wings) {
      for (let floor = 1; floor <= args.floorsPerWing; floor++) {
        for (let unit = 1; unit <= args.unitsPerFloor; unit++) {
          await ctx.db.insert("units", {
            propertyId,
            wing,
            floor,
            unitNumber: `${wing}-${floor}${String(unit).padStart(2, "0")}`,
            type: args.type === "Hostel" ? "Room" : "Flat",
          });
        }
      }
    }

    return await ctx.db.get(propertyId);
  },
});

// Get property by ID
export const getProperty = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.propertyId);
  },
});

// List properties by owner
export const listMyProperties = query({
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

    return await ctx.db
      .query("properties")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .collect();
  },
});

// Update property settings
export const updatePropertySettings = mutation({
  args: {
    propertyId: v.id("properties"),
    settings: v.object({
      maintenanceAmount: v.optional(v.number()),
      lateFeePercent: v.optional(v.number()),
      slaHours: v.optional(v.number()),
      bookingCancelWindow: v.optional(v.number()),
      logo: v.optional(v.string()),
      accentColor: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new Error("Property not found");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", identity.email || "")
      )
      .first();

    if (property.ownerId !== user?._id) {
      throw new Error("Unauthorized");
    }

    const updatedSettings = {
      ...property.settings,
      ...args.settings,
    };

    await ctx.db.patch(args.propertyId, {
      settings: updatedSettings,
    });

    return await ctx.db.get(args.propertyId);
  },
});

// Get property statistics (dashboard)
export const getPropertyStats = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new Error("Property not found");

    const [residents, openComplaints, pendingPayments, upcomingEvents] =
      await Promise.all([
        ctx.db
          .query("residents")
          .withIndex("by_propertyId", (q) =>
            q.eq("propertyId", args.propertyId)
          )
          .collect(),
        ctx.db
          .query("complaints")
          .withIndex("by_propertyId_status", (q) =>
            q.eq("propertyId", args.propertyId).eq("status", "Open")
          )
          .collect(),
        ctx.db
          .query("paymentDues")
          .withIndex("by_propertyId_status", (q) =>
            q.eq("propertyId", args.propertyId).eq("status", "Pending")
          )
          .collect(),
        ctx.db
          .query("events")
          .withIndex("by_propertyId_date", (q) =>
            q.eq("propertyId", args.propertyId).gte("date", Date.now())
          )
          .collect(),
      ]);

    return {
      totalResidents: residents.length,
      activeResidents: residents.filter(
        (r) => r.status === "Active"
      ).length,
      openComplaints: openComplaints.length,
      pendingPayments: pendingPayments.length,
      upcomingEvents: upcomingEvents.length,
      collectionRate: residents.length
        ? ((residents.length - pendingPayments.length) /
            residents.length) *
          100
        : 0,
    };
  },
});

// List units in property
export const listPropertyUnits = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("units")
      .withIndex("by_propertyId", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();
  },
});

export const logAuditEvent = internalMutation({
  args: {
    propertyId: v.id("properties"),
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    changes: v.object({}),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      propertyId: args.propertyId,
      userId: args.userId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      changes: args.changes,
      createdAt: Date.now(),
    });
  },
});
