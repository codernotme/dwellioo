import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateOTP(): string {
  return Math.random().toString().slice(2, 8);
}

// Pre-approve visitor
export const approveVisitor = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    purpose: v.string(),
    expectedAt: v.number(),
    duration: v.number(),
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

    const resident = await ctx.db
      .query("residents")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!resident) throw new Error("Not a resident");

    const otpCode = generateOTP();

    const visitorId = await ctx.db.insert("visitors", {
      residentId: resident._id,
      propertyId: resident.propertyId,
      name: args.name,
      phone: args.phone,
      purpose: args.purpose,
      expectedAt: args.expectedAt,
      duration: args.duration,
      otpCode,
      status: "Approved",
      createdAt: Date.now(),
    });

    return await ctx.db.get(visitorId);
  },
});

// Get visitor by OTP (for gate entry)
export const getVisitorByOTP = query({
  args: {
    otpCode: v.string(),
  },
  handler: async (ctx, args) => {
    const visitor = await ctx.db
      .query("visitors")
      .withIndex("by_otpCode", (q) =>
        q.eq("otpCode", args.otpCode)
      )
      .first();

    if (!visitor) return null;

    const resident = await ctx.db.get(visitor.residentId);
    if (!resident) return { visitor, resident: null, unit: null };
    const unit = resident.unitId ? await ctx.db.get(resident.unitId) : null;

    return {
      visitor,
      resident: resident.userId,
      unit: unit?.unitNumber || null,
    };
  },
});

// Log visitor entry
export const logVisitorEntry = mutation({
  args: {
    visitorId: v.id("visitors"),
  },
  handler: async (ctx, args) => {
    const visitor = await ctx.db.get(args.visitorId);
    if (!visitor) throw new Error("Visitor not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", identity.email || "")
      )
      .first();

    if (!user) throw new Error("User not found");

    const staff = await ctx.db
      .query("staff")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!staff) throw new Error("Only staff can log entries");

    const logId = await ctx.db.insert("visitorLogs", {
      visitorId: args.visitorId,
      propertyId: visitor.propertyId,
      enteredAt: Date.now(),
      loggedBy: staff._id,
    });

    // Update visitor status
    await ctx.db.patch(args.visitorId, {
      status: "Entered",
    });

    return await ctx.db.get(logId);
  },
});

// Log visitor exit
export const logVisitorExit = mutation({
  args: {
    visitorId: v.id("visitors"),
  },
  handler: async (ctx, args) => {
    const visitor = await ctx.db.get(args.visitorId);
    if (!visitor) throw new Error("Visitor not found");

    const logs = await ctx.db
      .query("visitorLogs")
      .withIndex("by_visitorId", (q) =>
        q.eq("visitorId", args.visitorId)
      )
      .collect();

    const currentLog = logs.find((l) => !l.exitedAt);
    if (!currentLog) throw new Error("No active entry found");

    await ctx.db.patch(currentLog._id, {
      exitedAt: Date.now(),
    });

    // Update visitor status
    await ctx.db.patch(args.visitorId, {
      status: "Exited",
    });

    return await ctx.db.get(currentLog._id);
  },
});

// Get resident visitors
export const getResidentVisitors = query({
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

    const resident = await ctx.db
      .query("residents")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!resident) return [];

    const visitors = await ctx.db
      .query("visitors")
      .withIndex("by_residentId", (q) =>
        q.eq("residentId", resident._id)
      )
      .collect();

    const withLogs = await Promise.all(
      visitors.map(async (visitor) => {
        const logs = await ctx.db
          .query("visitorLogs")
          .withIndex("by_visitorId", (q) =>
            q.eq("visitorId", visitor._id)
          )
          .collect();

        return {
          visitor,
          logs,
        };
      })
    );

    return withLogs.sort(
      (a, b) => b.visitor.createdAt - a.visitor.createdAt
    );
  },
});

// List property visitors (for gate staff)
export const listPropertyVisitors = query({
  args: {
    propertyId: v.id("properties"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const visitors = await ctx.db
      .query("visitors")
      .withIndex("by_propertyId", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    let filtered = visitors;

    if (args.status) {
      filtered = filtered.filter((v) => v.status === args.status);
    }

    const withDetails = await Promise.all(
      filtered.map(async (visitor) => {
        const resident = await ctx.db.get(visitor.residentId);
        if (!resident) return { visitor, resident: null, unit: null };
        const user = resident.userId ? await ctx.db.get(resident.userId) : null;
        const unit = resident.unitId ? await ctx.db.get(resident.unitId) : null;

        return {
          visitor,
          resident: user?.name || null,
          unit: unit?.unitNumber || null,
        };
      })
    );

    return withDetails.sort(
      (a, b) => b.visitor.createdAt - a.visitor.createdAt
    );
  },
});

// Reject visitor
export const rejectVisitor = mutation({
  args: {
    visitorId: v.id("visitors"),
  },
  handler: async (ctx, args) => {
    const visitor = await ctx.db.get(args.visitorId);
    if (!visitor) throw new Error("Visitor not found");

    await ctx.db.patch(args.visitorId, {
      status: "Rejected",
    });

    return await ctx.db.get(args.visitorId);
  },
});

// ============ DELIVERIES ============

// Log expected delivery
export const logDelivery = mutation({
  args: {
    propertyId: v.id("properties"),
    unitId: v.id("units"),
    itemDescription: v.string(),
    expectedAt: v.number(),
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

    const staff = await ctx.db
      .query("staff")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!staff) throw new Error("Only staff can log deliveries");

    const deliveryId = await ctx.db.insert("deliveries", {
      propertyId: args.propertyId,
      unitId: args.unitId,
      itemDescription: args.itemDescription,
      expectedAt: args.expectedAt,
      status: "Expected",
      createdAt: Date.now(),
    });

    return await ctx.db.get(deliveryId);
  },
});

// Mark delivery as arrived
export const markDeliveryArrived = mutation({
  args: {
    deliveryId: v.id("deliveries"),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) throw new Error("Delivery not found");

    await ctx.db.patch(args.deliveryId, {
      status: "Arrived",
    });

    return await ctx.db.get(args.deliveryId);
  },
});

// Mark delivery as collected
export const markDeliveryCollected = mutation({
  args: {
    deliveryId: v.id("deliveries"),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) throw new Error("Delivery not found");

    await ctx.db.patch(args.deliveryId, {
      status: "Collected",
    });

    return await ctx.db.get(args.deliveryId);
  },
});

// Get unit deliveries
export const getUnitDeliveries = query({
  args: {
    unitId: v.id("units"),
  },
  handler: async (ctx, args) => {
    const deliveries = await ctx.db
      .query("deliveries")
      .withIndex("by_unitId", (q) =>
        q.eq("unitId", args.unitId)
      )
      .collect();

    return deliveries.sort(
      (a, b) => b.expectedAt - a.expectedAt
    );
  },
});

// Get property deliveries
export const getPropertyDeliveries = query({
  args: {
    propertyId: v.id("properties"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const deliveries = await ctx.db
      .query("deliveries")
      .withIndex("by_propertyId", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    let filtered = deliveries;

    if (args.status) {
      filtered = filtered.filter((d) => d.status === args.status);
    }

    const withDetails = await Promise.all(
      filtered.map(async (delivery) => {
        const unit = await ctx.db.get(delivery.unitId);

        return {
          delivery,
          unit: unit?.unitNumber,
        };
      })
    );

    return withDetails.sort(
      (a, b) => b.delivery.expectedAt - a.delivery.expectedAt
    );
  },
});
