import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create notice
export const createNotice = mutation({
  args: {
    propertyId: v.id("properties"),
    title: v.string(),
    body: v.string(),
    category: v.union(
      v.literal("Maintenance"),
      v.literal("Rules"),
      v.literal("General"),
      v.literal("Urgent"),
      v.literal("Festival")
    ),
    attachments: v.optional(
      v.array(
        v.object({
          name: v.string(),
          url: v.string(),
          type: v.string(),
        })
      )
    ),
    pinned: v.optional(v.boolean()),
    visibility: v.optional(
      v.union(
        v.literal("all"),
        v.object({
          type: v.literal("wing"),
          wing: v.string(),
        }),
        v.object({
          type: v.literal("floor"),
          floor: v.number(),
        })
      )
    ),
    expiresAt: v.optional(v.number()),
    scheduledFor: v.optional(v.number()),
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

    // Get staff member
    const staff = await ctx.db
      .query("staff")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!staff) throw new Error("Only staff can create notices");

    const noticeId = await ctx.db.insert("notices", {
      propertyId: args.propertyId,
      title: args.title,
      body: args.body,
      category: args.category,
      attachments: args.attachments || [],
      pinned: args.pinned || false,
      visibility: args.visibility || "all",
      expiresAt: args.expiresAt,
      createdBy: staff._id,
      createdAt: args.scheduledFor || Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(noticeId);
  },
});

// Get notice with acknowledgements
export const getNotice = query({
  args: {
    noticeId: v.id("notices"),
  },
  handler: async (ctx, args) => {
    const notice = await ctx.db.get(args.noticeId);
    if (!notice) throw new Error("Notice not found");

    const [acknowledgements, comments] = await Promise.all([
      ctx.db
        .query("noticeAcknowledgements")
        .withIndex("by_noticeId", (q) =>
          q.eq("noticeId", args.noticeId)
        )
        .collect(),
      ctx.db
        .query("noticeComments")
        .withIndex("by_noticeId", (q) =>
          q.eq("noticeId", args.noticeId)
        )
        .collect(),
    ]);

    return {
      notice,
      acknowledgeCount: acknowledgements.length,
      comments: await Promise.all(
        comments.map(async (comment) => {
          const resident = await ctx.db.get(comment.residentId);
          return {
            comment,
            resident,
          };
        })
      ),
    };
  },
});

// Mark notice as read
export const markNoticeRead = mutation({
  args: {
    noticeId: v.id("notices"),
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

    const existing = await ctx.db
      .query("noticeAcknowledgements")
      .withIndex("by_noticeId_residentId", (q) =>
        q.eq("noticeId", args.noticeId).eq("residentId", resident._id)
      )
      .first();

    if (existing) return existing;

    const ackId = await ctx.db.insert("noticeAcknowledgements", {
      noticeId: args.noticeId,
      residentId: resident._id,
      readAt: Date.now(),
    });

    return await ctx.db.get(ackId);
  },
});

// List notices for property
export const listNotices = query({
  args: {
    propertyId: v.id("properties"),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("notices")
      .withIndex("by_propertyId_createdAt", (q) =>
        q.eq("propertyId", args.propertyId)
      );

    const notices = await query.order("desc").collect();

    const filtered = notices.filter((notice) => {
      if (notice.expiresAt && notice.expiresAt < Date.now()) return false;
      if (args.category && notice.category !== args.category) return false;
      return true;
    });

    // Sort pinned first
    return filtered.sort((a, b) => {
      if (a.pinned === b.pinned) return 0;
      return a.pinned ? -1 : 1;
    });
  },
});

// Update notice
export const updateNotice = mutation({
  args: {
    noticeId: v.id("notices"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const notice = await ctx.db.get(args.noticeId);
    if (!notice) throw new Error("Notice not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", identity.email || "")
      )
      .first();

    const staff = await ctx.db.get(notice.createdBy);
    if (staff?.userId !== user?._id) {
      throw new Error("Can only edit own notices");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };
    if (args.title !== undefined) updates.title = args.title;
    if (args.body !== undefined) updates.body = args.body;
    if (args.pinned !== undefined) updates.pinned = args.pinned;

    await ctx.db.patch(args.noticeId, updates);
    return await ctx.db.get(args.noticeId);
  },
});

// Delete notice
export const deleteNotice = mutation({
  args: {
    noticeId: v.id("notices"),
  },
  handler: async (ctx, args) => {
    const notice = await ctx.db.get(args.noticeId);
    if (!notice) throw new Error("Notice not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", identity.email || "")
      )
      .first();

    const staff = await ctx.db.get(notice.createdBy);
    if (staff?.userId !== user?._id) {
      throw new Error("Can only delete own notices");
    }

    // Delete acknowledgements
    const acks = await ctx.db
      .query("noticeAcknowledgements")
      .withIndex("by_noticeId", (q) =>
        q.eq("noticeId", args.noticeId)
      )
      .collect();

    for (const ack of acks) {
      await ctx.db.delete(ack._id);
    }

    // Delete comments
    const comments = await ctx.db
      .query("noticeComments")
      .withIndex("by_noticeId", (q) =>
        q.eq("noticeId", args.noticeId)
      )
      .collect();

    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    // Delete notice
    await ctx.db.delete(args.noticeId);

    return { success: true };
  },
});

// Add comment to notice
export const addNoticeComment = mutation({
  args: {
    noticeId: v.id("notices"),
    text: v.string(),
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

    const commentId = await ctx.db.insert("noticeComments", {
      noticeId: args.noticeId,
      residentId: resident._id,
      text: args.text,
      createdAt: Date.now(),
    });

    return await ctx.db.get(commentId);
  },
});

// Get notice read statistics
export const getNoticeReadStats = query({
  args: {
    noticeId: v.id("notices"),
  },
  handler: async (ctx, args) => {
    const notice = await ctx.db.get(args.noticeId);
    if (!notice) throw new Error("Notice not found");

    const acknowledgements = await ctx.db
      .query("noticeAcknowledgements")
      .withIndex("by_noticeId", (q) =>
        q.eq("noticeId", args.noticeId)
      )
      .collect();

    const totalResidents = await ctx.db
      .query("residents")
      .withIndex("by_propertyId", (q) =>
        q.eq("propertyId", notice.propertyId)
      )
      .collect();

    const readCount = acknowledgements.length;
    const totalCount = totalResidents.filter(
      (r) => r.status === "Active"
    ).length;

    return {
      readCount,
      totalCount,
      readPercentage:
        totalCount > 0 ? ((readCount / totalCount) * 100).toFixed(2) : "0",
    };
  },
});
