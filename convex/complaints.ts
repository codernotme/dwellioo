import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate ticket ID
function generateTicketId(): string {
  return `TKT-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Create complaint
export const createComplaint = mutation({
  args: {
    propertyId: v.id("properties"),
    category: v.union(
      v.literal("Water"),
      v.literal("Electricity"),
      v.literal("Lift"),
      v.literal("Cleanliness"),
      v.literal("Security"),
      v.literal("Other")
    ),
    description: v.string(),
    photos: v.optional(v.array(v.string())),
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

    const complaintId = await ctx.db.insert("complaints", {
      propertyId: args.propertyId,
      residentId: resident._id,
      ticketId: generateTicketId(),
      category: args.category,
      description: args.description,
      photos: args.photos || [],
      status: "Open",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(complaintId);
  },
});

// Get complaint with updates
export const getComplaint = query({
  args: {
    complaintId: v.id("complaints"),
  },
  handler: async (ctx, args) => {
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) throw new Error("Complaint not found");

    const [resident, updates, rating] = await Promise.all([
      ctx.db.get(complaint.residentId),
      ctx.db
        .query("complaintUpdates")
        .withIndex("by_complaintId", (q) =>
          q.eq("complaintId", args.complaintId)
        )
        .collect(),
      ctx.db
        .query("complaintRatings")
        .withIndex("by_complaintId", (q) =>
          q.eq("complaintId", args.complaintId)
        )
        .first(),
    ]);

    const updatesWithUsers = await Promise.all(
      updates.map(async (update) => {
        const staff = await ctx.db.get(update.updatedBy);
        if (!staff) return { update, staff: null };
        const user = staff.userId ? await ctx.db.get(staff.userId) : null;
        return {
          update,
          staff: user,
        };
      })
    );

    return {
      complaint,
      resident,
      updates: updatesWithUsers,
      rating,
    };
  },
});

// Assign complaint to staff
export const assignComplaint = mutation({
  args: {
    complaintId: v.id("complaints"),
    staffId: v.id("staff"),
    estimatedHours: v.number(),
  },
  handler: async (ctx, args) => {
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) throw new Error("Complaint not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", identity.email || "")
      )
      .first();

    if (!user) throw new Error("User not found");

    const assigneeStaff = await ctx.db.get(args.staffId);
    if (!assigneeStaff) throw new Error("Staff not found");

    // Update complaint
    await ctx.db.patch(args.complaintId, {
      status: "Assigned",
      assignedTo: args.staffId,
      estimatedResolutionTime: args.estimatedHours,
      updatedAt: Date.now(),
    });

    // Log update
    await ctx.db.insert("complaintUpdates", {
      complaintId: args.complaintId,
      status: "Assigned",
      note: `Assigned to ${assigneeStaff.role}`,
      updatedBy: args.staffId,
      createdAt: Date.now(),
    });

    return await ctx.db.get(args.complaintId);
  },
});

// Update complaint status
export const updateComplaintStatus = mutation({
  args: {
    complaintId: v.id("complaints"),
    status: v.union(
      v.literal("Open"),
      v.literal("Assigned"),
      v.literal("In Progress"),
      v.literal("Resolved"),
      v.literal("Closed")
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) throw new Error("Complaint not found");

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

    if (!staff) throw new Error("Only staff can update complaints");

    // Update complaint
    const updates: any = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.status === "Resolved") {
      updates.resolvedAt = Date.now();
    }

    await ctx.db.patch(args.complaintId, updates);

    // Log update
    await ctx.db.insert("complaintUpdates", {
      complaintId: args.complaintId,
      status: args.status,
      note: args.note || `Status changed to ${args.status}`,
      updatedBy: staff._id,
      createdAt: Date.now(),
    });

    return await ctx.db.get(args.complaintId);
  },
});

// Rate complaint resolution
export const rateComplaint = mutation({
  args: {
    complaintId: v.id("complaints"),
    rating: v.number(),
    review: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) throw new Error("Complaint not found");

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

    if (!resident) throw new Error("User is not a resident");

    if (complaint.residentId !== resident._id) {
      throw new Error("Can only rate own complaints");
    }

    const ratingId = await ctx.db.insert("complaintRatings", {
      complaintId: args.complaintId,
      residentId: complaint.residentId,
      rating: args.rating,
      review: args.review,
      createdAt: Date.now(),
    });

    return await ctx.db.get(ratingId);
  },
});

// List complaints for property
export const listComplaints = query({
  args: {
    propertyId: v.id("properties"),
    status: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("complaints")
      .withIndex("by_propertyId_status", (q) =>
        q.eq("propertyId", args.propertyId)
      );

    const complaints = await query.collect();

    return complaints.filter((c) => {
      if (args.status && c.status !== args.status) return false;
      if (args.category && c.category !== args.category) return false;
      return true;
    });
  },
});

// Get resident complaints
export const getResidentComplaints = query({
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

    return await ctx.db
      .query("complaints")
      .withIndex("by_residentId", (q) =>
        q.eq("residentId", resident._id)
      )
      .collect();
  },
});

// Get complaint stats
export const getComplaintStats = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const complaints = await ctx.db
      .query("complaints")
      .withIndex("by_propertyId_status", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    const ratings = await ctx.db
      .query("complaintRatings")
      .collect();

    const avgResolutionTime =
      complaints
        .filter((c) => c.resolvedAt && c.createdAt)
        .reduce((sum, c) => {
          const time = ((c.resolvedAt || 0) - c.createdAt) / (1000 * 60 * 60); // hours
          return sum + time;
        }, 0) / complaints.length || 0;

    const avgRating =
      ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length || 0;

    return {
      total: complaints.length,
      open: complaints.filter((c) => c.status === "Open").length,
      assigned: complaints.filter((c) => c.status === "Assigned").length,
      inProgress: complaints.filter((c) => c.status === "In Progress").length,
      resolved: complaints.filter((c) => c.status === "Resolved").length,
      closed: complaints.filter((c) => c.status === "Closed").length,
      avgResolutionTime: avgResolutionTime.toFixed(2),
      avgRating: avgRating.toFixed(2),
      avgRatingCount: ratings.length,
    };
  },
});
