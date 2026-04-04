import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create thread
export const createThread = mutation({
  args: {
    propertyId: v.id("properties"),
    category: v.union(
      v.literal("Lost & Found"),
      v.literal("Buy & Sell"),
      v.literal("Help Needed"),
      v.literal("General"),
      v.literal("Recommendations")
    ),
    title: v.string(),
    body: v.string(),
    attachments: v.optional(v.array(v.string())),
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

    const threadId = await ctx.db.insert("threads", {
      propertyId: args.propertyId,
      residentId: resident._id,
      category: args.category,
      title: args.title,
      body: args.body,
      attachments: args.attachments || [],
      solved: false,
      upvotes: 0,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(threadId);
  },
});

// Get thread with comments
export const getThread = query({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    const [comments, votes, reports, creator] = await Promise.all([
      ctx.db
        .query("threadComments")
        .withIndex("by_threadId_createdAt", (q) =>
          q.eq("threadId", args.threadId)
        )
        .collect(),
      ctx.db
        .query("threadVotes")
        .withIndex("by_threadId", (q) =>
          q.eq("threadId", args.threadId)
        )
        .collect(),
      ctx.db
        .query("threadReports")
        .withIndex("by_threadId", (q) =>
          q.eq("threadId", args.threadId)
        )
        .collect(),
      ctx.db.get(thread.residentId),
    ]);

    const commentDetails = await Promise.all(
      comments.map(async (comment) => {
        const resident = await ctx.db.get(comment.residentId);
        if (!resident) return { comment, author: null };
        const user = resident.userId ? await ctx.db.get(resident.userId) : null;

        return {
          comment,
          author: user,
        };
      })
    );

    return {
      thread,
      comments: commentDetails,
      upvoteCount: votes.length,
      reportCount: reports.length,
      creator,
    };
  },
});

// List threads in category
export const listThreads = query({
  args: {
    propertyId: v.id("properties"),
    category: v.optional(v.string()),
    solved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_propertyId_category", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    let filtered = threads;

    if (args.category) {
      filtered = filtered.filter((t) => t.category === args.category);
    }

    if (args.solved !== undefined) {
      filtered = filtered.filter((t) => t.solved === args.solved);
    }

    // Sort by pinned first, then upvotes, then creation date
    return filtered.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.upvotes !== b.upvotes) return b.upvotes - a.upvotes;
      return b.createdAt - a.createdAt;
    });
  },
});

// Add comment to thread
export const addThreadComment = mutation({
  args: {
    threadId: v.id("threads"),
    text: v.string(),
    attachments: v.optional(v.array(v.string())),
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

    const commentId = await ctx.db.insert("threadComments", {
      threadId: args.threadId,
      residentId: resident._id,
      text: args.text,
      attachments: args.attachments || [],
      createdAt: Date.now(),
    });

    return await ctx.db.get(commentId);
  },
});

// Upvote thread
export const upvoteThread = mutation({
  args: {
    threadId: v.id("threads"),
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
      .query("threadVotes")
      .withIndex("by_threadId_residentId", (q) =>
        q.eq("threadId", args.threadId).eq("residentId", resident._id)
      )
      .first();

    if (existing) {
      // Remove upvote
      await ctx.db.delete(existing._id);
      const thread = await ctx.db.get(args.threadId);
      if (thread) {
        await ctx.db.patch(args.threadId, {
          upvotes: Math.max(0, thread.upvotes - 1),
        });
      }
    } else {
      // Add upvote
      await ctx.db.insert("threadVotes", {
        threadId: args.threadId,
        residentId: resident._id,
      });
      const thread = await ctx.db.get(args.threadId);
      if (thread) {
        await ctx.db.patch(args.threadId, {
          upvotes: thread.upvotes + 1,
        });
      }
    }

    return await ctx.db.get(args.threadId);
  },
});

// Report thread
export const reportThread = mutation({
  args: {
    threadId: v.id("threads"),
    reason: v.string(),
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

    const reportId = await ctx.db.insert("threadReports", {
      threadId: args.threadId,
      residentId: resident._id,
      reason: args.reason,
      createdAt: Date.now(),
      status: "pending",
    });

    return await ctx.db.get(reportId);
  },
});

// Mark thread as solved
export const markThreadSolved = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

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

    if (!resident) throw new Error("Only residents can mark threads as solved");

    if (thread.residentId !== resident._id) {
      throw new Error("Can only mark own threads as solved");
    }

    await ctx.db.patch(args.threadId, {
      solved: true,
    });

    return await ctx.db.get(args.threadId);
  },
});

// Pin thread (admin)
export const pinThread = mutation({
  args: {
    threadId: v.id("threads"),
    pin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

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

    if (!staff) throw new Error("Only staff can pin threads");

    await ctx.db.patch(args.threadId, {
      pinned: args.pin,
    });

    return await ctx.db.get(args.threadId);
  },
});

// Review reports (admin)
export const reviewThreadReport = mutation({
  args: {
    reportId: v.id("threadReports"),
    action: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    await ctx.db.patch(args.reportId, {
      status: args.action,
    });

    if (args.action === "approved") {
      // Delete thread
      await ctx.db.delete(report.threadId);
    }

    return await ctx.db.get(args.reportId);
  },
});

// Get moderation queue
export const getReportQueue = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("threadReports")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const pending = reports.filter((r) => r.status === "pending");

    const withDetails = await Promise.all(
      pending.map(async (report) => {
        const thread = await ctx.db.get(report.threadId);
        const resident = await ctx.db.get(report.residentId);
        if (!resident) return { report, thread, reportedBy: null };
        const user = resident.userId ? await ctx.db.get(resident.userId) : null;

        return {
          report,
          thread,
          reportedBy: user?.name || null,
        };
      })
    );

    return withDetails;
  },
});
