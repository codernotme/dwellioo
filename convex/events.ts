import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create event
export const createEvent = mutation({
  args: {
    propertyId: v.id("properties"),
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("Meeting"),
      v.literal("Festival"),
      v.literal("Sports"),
      v.literal("Workshop"),
      v.literal("Maintenance Shutdown")
    ),
    date: v.number(),
    venue: v.string(),
    capacity: v.optional(v.number()),
    rsvpDeadline: v.number(),
    coverImage: v.optional(v.string()),
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

    if (!staff) throw new Error("Only staff can create events");

    const eventId = await ctx.db.insert("events", {
      propertyId: args.propertyId,
      title: args.title,
      description: args.description,
      category: args.category,
      date: args.date,
      venue: args.venue,
      capacity: args.capacity,
      rsvpDeadline: args.rsvpDeadline,
      coverImage: args.coverImage,
      createdBy: staff._id,
      createdAt: Date.now(),
    });

    return await ctx.db.get(eventId);
  },
});

// Get event with RSVPs
export const getEvent = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const rsvps = await ctx.db
      .query("eventRSVPs")
      .withIndex("by_eventId", (q) =>
        q.eq("eventId", args.eventId)
      )
      .collect();

    const photos = await ctx.db
      .query("eventPhotos")
      .withIndex("by_eventId", (q) =>
        q.eq("eventId", args.eventId)
      )
      .collect();

    const rsvpDetails = await Promise.all(
      rsvps.map(async (rsvp) => {
        const resident = await ctx.db.get(rsvp.residentId);
        return {
          rsvp,
          resident,
        };
      })
    );

    return {
      event,
      rsvps: rsvpDetails,
      going: rsvps.filter((r) => r.status === "going").length,
      notGoing: rsvps.filter((r) => r.status === "not_going").length,
      maybe: rsvps.filter((r) => r.status === "maybe").length,
      totalGuests: rsvps.reduce((sum, r) => sum + r.guestCount, 0),
      photos,
    };
  },
});

// RSVP to event
export const rsvpEvent = mutation({
  args: {
    eventId: v.id("events"),
    status: v.union(
      v.literal("going"),
      v.literal("not_going"),
      v.literal("maybe")
    ),
    guestCount: v.number(),
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
      .query("eventRSVPs")
      .withIndex("by_eventId_residentId", (q) =>
        q.eq("eventId", args.eventId).eq("residentId", resident._id)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        guestCount: args.guestCount,
      });
      return await ctx.db.get(existing._id);
    }

    const rsvpId = await ctx.db.insert("eventRSVPs", {
      eventId: args.eventId,
      residentId: resident._id,
      status: args.status,
      guestCount: args.guestCount,
      createdAt: Date.now(),
    });

    return await ctx.db.get(rsvpId);
  },
});

// List events for property
export const listEvents = query({
  args: {
    propertyId: v.id("properties"),
    upcomingOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_propertyId_date", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    if (args.upcomingOnly) {
      return events.filter((e) => e.date >= Date.now());
    }

    return events;
  },
});

// Upload event photo
export const uploadEventPhoto = mutation({
  args: {
    eventId: v.id("events"),
    url: v.string(),
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

    const photoId = await ctx.db.insert("eventPhotos", {
      eventId: args.eventId,
      url: args.url,
      uploadedBy: resident._id,
      uploadedAt: Date.now(),
    });

    return await ctx.db.get(photoId);
  },
});

// Get event attendee list
export const getEventAttendees = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const rsvps = await ctx.db
      .query("eventRSVPs")
      .withIndex("by_eventId", (q) =>
        q.eq("eventId", args.eventId)
      )
      .collect();

    const attendees = await Promise.all(
      rsvps
        .filter((r) => r.status === "going")
        .map(async (rsvp) => {
          const resident = await ctx.db.get(rsvp.residentId);
          const user = await ctx.db.get(resident!.userId);
          const unit = await ctx.db.get(resident!.unitId);

          return {
            name: user?.name,
            email: user?.email,
            phone: user?.phone,
            unit: unit?.unitNumber,
            guestCount: rsvp.guestCount,
          };
        })
    );

    return attendees;
  },
});

// Update event
export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.number()),
    venue: v.optional(v.string()),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.date !== undefined) updates.date = args.date;
    if (args.venue !== undefined) updates.venue = args.venue;
    if (args.capacity !== undefined) updates.capacity = args.capacity;

    await ctx.db.patch(args.eventId, updates);
    return await ctx.db.get(args.eventId);
  },
});

// Cancel event
export const cancelEvent = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) throw new Error("Event not found");

    // Delete RSVPs
    const rsvps = await ctx.db
      .query("eventRSVPs")
      .withIndex("by_eventId", (q) =>
        q.eq("eventId", args.eventId)
      )
      .collect();

    for (const rsvp of rsvps) {
      await ctx.db.delete(rsvp._id);
    }

    // Delete photos
    const photos = await ctx.db
      .query("eventPhotos")
      .withIndex("by_eventId", (q) =>
        q.eq("eventId", args.eventId)
      )
      .collect();

    for (const photo of photos) {
      await ctx.db.delete(photo._id);
    }

    // Delete event
    await ctx.db.delete(args.eventId);

    return { success: true };
  },
});
