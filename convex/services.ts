import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create/register service provider
export const registerServiceProvider = mutation({
  args: {
    propertyId: v.id("properties"),
    name: v.string(),
    phone: v.string(),
    whatsapp: v.optional(v.string()),
    category: v.union(
      v.literal("Plumber"),
      v.literal("Electrician"),
      v.literal("Carpenter"),
      v.literal("Painter"),
      v.literal("AC Repair"),
      v.literal("Pest Control"),
      v.literal("Cleaning"),
      v.literal("Maid"),
      v.literal("Driver"),
      v.literal("Tutor"),
      v.literal("Doctor"),
      v.literal("Gym Trainer"),
      v.literal("Other")
    ),
    tags: v.array(v.string()),
    workingHours: v.object({
      start: v.string(),
      end: v.string(),
    }),
    serviceArea: v.union(
      v.literal("Within Society"),
      v.literal("Nearby Area"),
      v.literal("City-wide")
    ),
    basePricing: v.optional(v.string()),
    priceOnRequest: v.boolean(),
    photo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    let userId: any = undefined;
    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("email", (q) =>
          q.eq("email", identity.email || "")
        )
        .first();
      if (user) {
        userId = user._id;
      }
    }

    const providerId = await ctx.db.insert("serviceProviders", {
      propertyId: args.propertyId,
      name: args.name,
      phone: args.phone,
      whatsapp: args.whatsapp,
      photo: args.photo,
      category: args.category,
      tags: args.tags,
      workingHours: args.workingHours,
      serviceArea: args.serviceArea,
      basePricing: args.basePricing,
      priceOnRequest: args.priceOnRequest,
      verified: false,
      availability: "Available",
      avgRating: 0,
      totalReviews: 0,
      createdAt: Date.now(),
      userId,
    });

    return await ctx.db.get(providerId);
  },
});

// Get service provider details
export const getServiceProvider = query({
  args: {
    providerId: v.id("serviceProviders"),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) throw new Error("Provider not found");

    const reviews = await ctx.db
      .query("providerReviews")
      .withIndex("by_providerId", (q) =>
        q.eq("providerId", args.providerId)
      )
      .collect();

    const slots = await ctx.db
      .query("providerSlots")
      .withIndex("by_providerId", (q) =>
        q.eq("providerId", args.providerId)
      )
      .collect();

    const reviewDetails = await Promise.all(
      reviews.map(async (review) => {
        const resident = await ctx.db.get(review.residentId);
        if (!resident) return { review, residentName: null };
        const user = resident.userId ? await ctx.db.get(resident.userId) : null;

        return {
          review,
          residentName: user?.name || null,
        };
      })
    );

    return {
      provider,
      reviews: reviewDetails,
      slots,
    };
  },
});

// List service providers by category
export const listServiceProviders = query({
  args: {
    propertyId: v.id("properties"),
    category: v.optional(v.string()),
    verified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const providers = await ctx.db
      .query("serviceProviders")
      .withIndex("by_propertyId_category", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    let filtered = providers;

    if (args.category) {
      filtered = filtered.filter((p) => p.category === args.category);
    }

    if (args.verified !== undefined) {
      filtered = filtered.filter((p) => p.verified === args.verified);
    }

    // Sort by rating
    return filtered.sort((a, b) => b.avgRating - a.avgRating);
  },
});

// Create availability slots
export const createProviderSlots = mutation({
  args: {
    providerId: v.id("serviceProviders"),
    dayOfWeek: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    slotDuration: v.number(),
  },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    if (!provider) throw new Error("Provider not found");

    const slotId = await ctx.db.insert("providerSlots", {
      providerId: args.providerId,
      dayOfWeek: args.dayOfWeek,
      startTime: args.startTime,
      endTime: args.endTime,
      slotDuration: args.slotDuration,
      isAvailable: true,
    });

    return await ctx.db.get(slotId);
  },
});

// Book service provider
export const bookService = mutation({
  args: {
    providerId: v.id("serviceProviders"),
    serviceType: v.string(),
    scheduledAt: v.number(),
    notes: v.optional(v.string()),
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

    const bookingId = await ctx.db.insert("bookings", {
      providerId: args.providerId,
      residentId: resident._id,
      serviceType: args.serviceType,
      scheduledAt: args.scheduledAt,
      status: "Pending",
      notes: args.notes,
      createdAt: Date.now(),
    });

    return await ctx.db.get(bookingId);
  },
});

// Get booking details
export const getBooking = query({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    const [provider, resident] = await Promise.all([
      ctx.db.get(booking.providerId),
      ctx.db.get(booking.residentId),
    ]);

    const review = await ctx.db
      .query("providerReviews")
      .withIndex("by_bookingId", (q) =>
        q.eq("bookingId", args.bookingId)
      )
      .first();

    return {
      booking,
      provider,
      resident,
      review,
    };
  },
});

// Accept/reject booking (provider)
export const updateBookingStatus = mutation({
  args: {
    bookingId: v.id("bookings"),
    status: v.union(
      v.literal("Pending"),
      v.literal("Confirmed"),
      v.literal("Completed"),
      v.literal("Cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    const updates: any = {
      status: args.status,
    };

    if (args.status === "Completed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.bookingId, updates);
    return await ctx.db.get(args.bookingId);
  },
});

// Add review to booking
export const addServiceReview = mutation({
  args: {
    bookingId: v.id("bookings"),
    rating: v.number(),
    reviewText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

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

    if (booking.residentId !== resident._id) {
      throw new Error("Can only review own bookings");
    }

    const reviewId = await ctx.db.insert("providerReviews", {
      bookingId: args.bookingId,
      providerId: booking.providerId,
      residentId: booking.residentId,
      rating: args.rating,
      reviewText: args.reviewText,
      createdAt: Date.now(),
    });

    // Update provider average rating
    const allReviews = await ctx.db
      .query("providerReviews")
      .withIndex("by_providerId", (q) =>
        q.eq("providerId", booking.providerId)
      )
      .collect();

    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = totalRating / allReviews.length;

    await ctx.db.patch(booking.providerId, {
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews: allReviews.length,
    });

    return await ctx.db.get(reviewId);
  },
});

// Get resident bookings
export const getResidentBookings = query({
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

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_residentId", (q) =>
        q.eq("residentId", resident._id)
      )
      .collect();

    const withDetails = await Promise.all(
      bookings.map(async (booking) => {
        const provider = await ctx.db.get(booking.providerId);
        const review = await ctx.db
          .query("providerReviews")
          .withIndex("by_bookingId", (q) =>
            q.eq("bookingId", booking._id)
          )
          .first();

        return {
          booking,
          provider,
          review,
        };
      })
    );

    return withDetails;
  },
});

// Get provider bookings
export const getProviderBookings = query({
  args: {
    providerId: v.id("serviceProviders"),
  },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_providerId", (q) =>
        q.eq("providerId", args.providerId)
      )
      .collect();

    const withDetails = await Promise.all(
      bookings.map(async (booking) => {
        const resident = await ctx.db.get(booking.residentId);
        if (!resident) return { booking, resident: null };
        const user = resident.userId ? await ctx.db.get(resident.userId) : null;

        return {
          booking,
          resident: user,
        };
      })
    );

    return withDetails;
  },
});
