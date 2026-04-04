import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create announcement
export const createAnnouncement = mutation({
  args: {
    propertyId: v.id("properties"),
    title: v.string(),
    body: v.string(),
    priority: v.union(
      v.literal("Normal"),
      v.literal("Important"),
      v.literal("Emergency")
    ),
    channels: v.array(
      v.union(
        v.literal("in-app"),
        v.literal("whatsapp"),
        v.literal("email"),
        v.literal("sms")
      )
    ),
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

    const staff = await ctx.db
      .query("staff")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!staff) throw new Error("Only staff can create announcements");

    const announcementId = await ctx.db.insert("announcements", {
      propertyId: args.propertyId,
      title: args.title,
      body: args.body,
      priority: args.priority,
      channels: args.channels,
      createdBy: staff._id,
      createdAt: Date.now(),
      scheduledFor: args.scheduledFor,
      sent: !args.scheduledFor,
      sentAt: args.scheduledFor ? undefined : Date.now(),
    });

    const announcement = await ctx.db.get(announcementId);

    // Create receipts for all active residents
    if (!args.scheduledFor) {
      const residents = await ctx.db
        .query("residents")
        .withIndex("by_propertyId", (q) =>
          q.eq("propertyId", args.propertyId)
        )
        .collect();

      for (const resident of residents.filter(
        (r) => r.status === "Active"
      )) {
        await ctx.db.insert("announcementReceipts", {
          announcementId,
          residentId: resident._id,
        });
      }
    }

    return announcement;
  },
});

// Get announcement
export const getAnnouncement = query({
  args: {
    announcementId: v.id("announcements"),
  },
  handler: async (ctx, args) => {
    const announcement = await ctx.db.get(args.announcementId);
    if (!announcement) throw new Error("Announcement not found");

    const receipts = await ctx.db
      .query("announcementReceipts")
      .withIndex("by_announcementId", (q) =>
        q.eq("announcementId", args.announcementId)
      )
      .collect();

    const readCount = receipts.filter((r) => r.readAt).length;

    return {
      announcement,
      totalReceipts: receipts.length,
      readCount,
      readPercentage:
        receipts.length > 0
          ? ((readCount / receipts.length) * 100).toFixed(2)
          : "0",
    };
  },
});

// Mark announcement as read
export const markAnnouncementRead = mutation({
  args: {
    announcementId: v.id("announcements"),
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

    const receipt = await ctx.db
      .query("announcementReceipts")
      .withIndex("by_announcementId_residentId", (q) =>
        q
          .eq("announcementId", args.announcementId)
          .eq("residentId", resident._id)
      )
      .first();

    if (!receipt) throw new Error("Receipt not found");

    await ctx.db.patch(receipt._id, {
      readAt: Date.now(),
    });

    return await ctx.db.get(receipt._id);
  },
});

// List announcements for property
export const listAnnouncements = query({
  args: {
    propertyId: v.id("properties"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const announcements = await ctx.db
      .query("announcements")
      .withIndex("by_propertyId_createdAt", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .order("desc")
      .take(args.limit || 10);

    return announcements;
  },
});

// Get announcements for resident
export const getResidentAnnouncements = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
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

    if (!resident || resident.propertyId !== args.propertyId) return [];

    const receipts = await ctx.db
      .query("announcementReceipts")
      .withIndex("by_residentId", (q) =>
        q.eq("residentId", resident._id)
      )
      .collect();

    const announcements = await Promise.all(
      receipts.map(async (receipt) => {
        const announcement = await ctx.db.get(
          receipt.announcementId
        );
        return {
          announcement,
          receipt,
        };
      })
    );

    return announcements.sort((a, b) => {
      if (a.announcement && b.announcement) {
        return (
          (b.announcement.createdAt || 0) -
          (a.announcement.createdAt || 0)
        );
      }
      return 0;
    });
  },
});

// Update announcement (if not yet sent)
export const updateAnnouncement = mutation({
  args: {
    announcementId: v.id("announcements"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const announcement = await ctx.db.get(
      args.announcementId
    );
    if (!announcement) throw new Error("Announcement not found");

    if (announcement.sent) {
      throw new Error("Cannot edit sent announcements");
    }

    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.body !== undefined) updates.body = args.body;

    await ctx.db.patch(args.announcementId, updates);
    return await ctx.db.get(args.announcementId);
  },
});

// Send scheduled announcement
export const sendScheduledAnnouncement = mutation({
  args: {
    announcementId: v.id("announcements"),
  },
  handler: async (ctx, args) => {
    const announcement = await ctx.db.get(
      args.announcementId
    );
    if (!announcement) throw new Error("Announcement not found");

    if (announcement.sent) {
      throw new Error("Already sent");
    }

    // Create receipts for all active residents
    const residents = await ctx.db
      .query("residents")
      .withIndex("by_propertyId", (q) =>
        q.eq("propertyId", announcement.propertyId)
      )
      .collect();

    for (const resident of residents.filter(
      (r) => r.status === "Active"
    )) {
      await ctx.db.insert("announcementReceipts", {
        announcementId: args.announcementId,
        residentId: resident._id,
      });
    }

    await ctx.db.patch(args.announcementId, {
      sent: true,
      sentAt: Date.now(),
    });

    return await ctx.db.get(args.announcementId);
  },
});
