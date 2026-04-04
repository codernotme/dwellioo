import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  // Override users table to add custom fields and indexes
  users: defineTable({
    // Auth fields from @convex-dev/auth
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  // ============ MODULE 1 — NOTICE BOARD ============
  notices: defineTable({
    propertyId: v.id("properties"),
    title: v.string(),
    body: v.string(), // Rich text (HTML)
    category: v.union(
      v.literal("Maintenance"),
      v.literal("Rules"),
      v.literal("General"),
      v.literal("Urgent"),
      v.literal("Festival")
    ),
    attachments: v.array(
      v.object({
        name: v.string(),
        url: v.string(),
        type: v.string(), // "image" | "pdf"
      })
    ),
    pinned: v.boolean(),
    visibility: v.union(
      v.literal("all"),
      v.object({
        type: v.literal("wing"),
        wing: v.string(),
      }),
      v.object({
        type: v.literal("floor"),
        floor: v.number(),
      })
    ),
    expiresAt: v.optional(v.number()), // timestamp
    createdBy: v.id("staff"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_createdAt", ["propertyId", "createdAt"]),

  noticeAcknowledgements: defineTable({
    noticeId: v.id("notices"),
    residentId: v.id("residents"),
    readAt: v.number(),
  })
    .index("by_noticeId", ["noticeId"])
    .index("by_residentId", ["residentId"])
    .index("by_noticeId_residentId", ["noticeId", "residentId"]),

  noticeComments: defineTable({
    noticeId: v.id("notices"),
    residentId: v.id("residents"),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_noticeId", ["noticeId"])
    .index("by_noticeId_createdAt", ["noticeId", "createdAt"]),

  // ============ MODULE 2 — EVENTS & ACTIVITIES ============
  events: defineTable({
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
    date: v.number(), // timestamp
    venue: v.string(),
    coverImage: v.optional(v.string()),
    capacity: v.optional(v.number()),
    rsvpDeadline: v.number(),
    recurring: v.optional(
      v.object({
        frequency: v.union(v.literal("weekly"), v.literal("monthly")),
        endDate: v.optional(v.number()),
      })
    ),
    createdBy: v.id("staff"),
    createdAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_date", ["propertyId", "date"]),

  eventRSVPs: defineTable({
    eventId: v.id("events"),
    residentId: v.id("residents"),
    status: v.union(
      v.literal("going"),
      v.literal("not_going"),
      v.literal("maybe")
    ),
    guestCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_eventId", ["eventId"])
    .index("by_residentId", ["residentId"])
    .index("by_eventId_residentId", ["eventId", "residentId"]),

  eventPhotos: defineTable({
    eventId: v.id("events"),
    url: v.string(),
    uploadedBy: v.id("residents"),
    uploadedAt: v.number(),
  })
    .index("by_eventId", ["eventId"]),

  // ============ MODULE 3 — COMMUNITY MESSAGE BOARD ============
  threads: defineTable({
    propertyId: v.id("properties"),
    residentId: v.id("residents"),
    category: v.union(
      v.literal("Lost & Found"),
      v.literal("Buy & Sell"),
      v.literal("Help Needed"),
      v.literal("General"),
      v.literal("Recommendations")
    ),
    title: v.string(),
    body: v.string(),
    attachments: v.array(v.string()),
    solved: v.boolean(),
    upvotes: v.number(),
    pinned: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_category", ["propertyId", "category"])
    .index("by_propertyId_createdAt", ["propertyId", "createdAt"]),

  threadComments: defineTable({
    threadId: v.id("threads"),
    residentId: v.id("residents"),
    text: v.string(),
    attachments: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_threadId", ["threadId"])
    .index("by_threadId_createdAt", ["threadId", "createdAt"]),

  threadVotes: defineTable({
    threadId: v.id("threads"),
    residentId: v.id("residents"),
  })
    .index("by_threadId", ["threadId"])
    .index("by_threadId_residentId", ["threadId", "residentId"]),

  threadReports: defineTable({
    threadId: v.id("threads"),
    residentId: v.id("residents"),
    reason: v.string(),
    createdAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
  })
    .index("by_threadId", ["threadId"])
    .index("by_status", ["status"]),

  // ============ MODULE 4 — ANNOUNCEMENTS & ALERTS ============
  announcements: defineTable({
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
    createdBy: v.id("staff"),
    createdAt: v.number(),
    scheduledFor: v.optional(v.number()),
    sent: v.boolean(),
    sentAt: v.optional(v.number()),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_createdAt", ["propertyId", "createdAt"]),

  announcementReceipts: defineTable({
    announcementId: v.id("announcements"),
    residentId: v.id("residents"),
    readAt: v.optional(v.number()),
  })
    .index("by_announcementId", ["announcementId"])
    .index("by_residentId", ["residentId"])
    .index("by_announcementId_residentId", ["announcementId", "residentId"]),

  // ============ MODULE 5 — MAINTENANCE & COMPLAINTS ============
  complaints: defineTable({
    propertyId: v.id("properties"),
    residentId: v.id("residents"),
    ticketId: v.string(), // Auto-generated
    category: v.union(
      v.literal("Water"),
      v.literal("Electricity"),
      v.literal("Lift"),
      v.literal("Cleanliness"),
      v.literal("Security"),
      v.literal("Other")
    ),
    description: v.string(),
    photos: v.array(v.string()),
    status: v.union(
      v.literal("Open"),
      v.literal("Assigned"),
      v.literal("In Progress"),
      v.literal("Resolved"),
      v.literal("Closed")
    ),
    assignedTo: v.optional(v.id("staff")),
    estimatedResolutionTime: v.optional(v.number()), // hours
    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_residentId", ["residentId"])
    .index("by_status", ["status"])
    .index("by_propertyId_status", ["propertyId", "status"]),

  complaintUpdates: defineTable({
    complaintId: v.id("complaints"),
    status: v.union(
      v.literal("Open"),
      v.literal("Assigned"),
      v.literal("In Progress"),
      v.literal("Resolved"),
      v.literal("Closed")
    ),
    note: v.string(),
    updatedBy: v.id("staff"),
    createdAt: v.number(),
  })
    .index("by_complaintId", ["complaintId"]),

  complaintRatings: defineTable({
    complaintId: v.id("complaints"),
    residentId: v.id("residents"),
    rating: v.number(), // 1-5
    review: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_complaintId", ["complaintId"])
    .index("by_residentId", ["residentId"]),

  // ============ MODULE 6 — SERVICE PROVIDER DIRECTORY ============
  serviceProviders: defineTable({
    propertyId: v.id("properties"),
    name: v.string(),
    phone: v.string(),
    whatsapp: v.optional(v.string()),
    photo: v.optional(v.string()),
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
      start: v.string(), // "09:00"
      end: v.string(), // "18:00"
    }),
    serviceArea: v.union(
      v.literal("Within Society"),
      v.literal("Nearby Area"),
      v.literal("City-wide")
    ),
    basePricing: v.optional(v.string()),
    priceOnRequest: v.boolean(),
    verified: v.boolean(),
    availability: v.union(
      v.literal("Available"),
      v.literal("Busy"),
      v.literal("On Leave")
    ),
    avgRating: v.number(),
    totalReviews: v.number(),
    createdAt: v.number(),
    userId: v.optional(v.id("users")),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_category", ["category"])
    .index("by_propertyId_category", ["propertyId", "category"]),

  providerSlots: defineTable({
    providerId: v.id("serviceProviders"),
    dayOfWeek: v.number(), // 0-6
    startTime: v.string(), // "09:00"
    endTime: v.string(), // "18:00"
    slotDuration: v.number(), // minutes
    isAvailable: v.boolean(),
  })
    .index("by_providerId", ["providerId"])
    .index("by_providerId_dayOfWeek", ["providerId", "dayOfWeek"]),

  bookings: defineTable({
    providerId: v.id("serviceProviders"),
    residentId: v.id("residents"),
    serviceType: v.string(),
    notes: v.optional(v.string()),
    scheduledAt: v.number(),
    status: v.union(
      v.literal("Pending"),
      v.literal("Confirmed"),
      v.literal("Completed"),
      v.literal("Cancelled")
    ),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_providerId", ["providerId"])
    .index("by_residentId", ["residentId"])
    .index("by_status", ["status"])
    .index("by_scheduledAt", ["scheduledAt"]),

  providerReviews: defineTable({
    bookingId: v.id("bookings"),
    providerId: v.id("serviceProviders"),
    residentId: v.id("residents"),
    rating: v.number(), // 1-5
    reviewText: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_providerId", ["providerId"])
    .index("by_bookingId", ["bookingId"]),

  // ============ MODULE 7 — POLLS & SURVEYS ============
  polls: defineTable({
    propertyId: v.id("properties"),
    question: v.string(),
    options: v.array(v.string()),
    anonymous: v.boolean(),
    closesAt: v.number(),
    createdBy: v.id("staff"),
    createdAt: v.number(),
    closed: v.boolean(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_createdAt", ["createdAt"]),

  pollVotes: defineTable({
    pollId: v.id("polls"),
    residentId: v.id("residents"),
    selectedOption: v.number(), // index
    createdAt: v.number(),
  })
    .index("by_pollId", ["pollId"])
    .index("by_residentId", ["residentId"])
    .index("by_pollId_residentId", ["pollId", "residentId"]),

  surveys: defineTable({
    propertyId: v.id("properties"),
    title: v.string(),
    questions: v.array(
      v.object({
        text: v.string(),
        type: v.union(v.literal("text"), v.literal("multiple-choice")),
        options: v.optional(v.array(v.string())),
      })
    ),
    createdBy: v.id("staff"),
    createdAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"]),

  surveyResponses: defineTable({
    surveyId: v.id("surveys"),
    residentId: v.id("residents"),
    responses: v.array(v.string()), // answers to questions
    createdAt: v.number(),
  })
    .index("by_surveyId", ["surveyId"])
    .index("by_residentId", ["residentId"]),

  // ============ MODULE 8 — PAYMENTS & DUES ============
  paymentDues: defineTable({
    propertyId: v.id("properties"),
    residentId: v.id("residents"),
    month: v.string(), // "2024-04"
    amount: v.number(),
    dueDate: v.number(),
    status: v.union(
      v.literal("Pending"),
      v.literal("Paid"),
      v.literal("Overdue"),
      v.literal("Partial")
    ),
    lateFeeApplied: v.number(),
    createdAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_residentId", ["residentId"])
    .index("by_status", ["status"])
    .index("by_propertyId_status", ["propertyId", "status"]),

  payments: defineTable({
    propertyId: v.id("properties"),
    residentId: v.id("residents"),
    dueId: v.id("paymentDues"),
    amount: v.number(),
    paidAt: v.number(),
    razorpayPaymentId: v.optional(v.string()),
    receipts: v.array(v.string()),
  })
    .index("by_residentId", ["residentId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_paidAt", ["paidAt"]),

  // ============ MODULE 9 — RESIDENT & MEMBER MANAGEMENT ============
  properties: defineTable({
    ownerId: v.id("users"),
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
    settings: v.object({
      maintenanceAmount: v.number(),
      lateFeePercent: v.number(),
      slaHours: v.number(),
      bookingCancelWindow: v.number(), // hours
      logo: v.optional(v.string()),
      accentColor: v.optional(v.string()),
    }),
    createdAt: v.number(),
  })
    .index("by_ownerId", ["ownerId"]),

  units: defineTable({
    propertyId: v.id("properties"),
    wing: v.string(),
    floor: v.number(),
    unitNumber: v.string(),
    type: v.union(v.literal("Flat"), v.literal("Room"), v.literal("Hostel")),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_propertyId_wing", ["propertyId", "wing"]),



  residents: defineTable({
    propertyId: v.id("properties"),
    unitId: v.id("units"),
    userId: v.id("users"),
    status: v.union(
      v.literal("Active"),
      v.literal("Archive"),
      v.literal("Pending")
    ),
    moveInDate: v.number(),
    moveOutDate: v.optional(v.number()),
    photo: v.optional(v.string()),
    familyMembers: v.array(v.string()),
    showInDirectory: v.boolean(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_userId", ["userId"])
    .index("by_unitId", ["unitId"]),

  vehicles: defineTable({
    residentId: v.id("residents"),
    numberPlate: v.string(),
    type: v.union(
      v.literal("Car"),
      v.literal("Bike"),
      v.literal("Scooter"),
      v.literal("Other")
    ),
    color: v.optional(v.string()),
  })
    .index("by_residentId", ["residentId"]),

  residentInvites: defineTable({
    propertyId: v.id("properties"),
    unitId: v.id("units"),
    inviteCode: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    usedBy: v.optional(v.id("users")),
  })
    .index("by_inviteCode", ["inviteCode"])
    .index("by_propertyId", ["propertyId"]),

  staff: defineTable({
    propertyId: v.id("properties"),
    userId: v.id("users"),
    role: v.union(
      v.literal("Manager"),
      v.literal("Watchman"),
      v.literal("Housekeeping"),
      v.literal("Maintenance"),
      v.literal("Other")
    ),
    permissions: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_userId", ["userId"]),

  // ============ MODULE 10 — VISITOR & GATE MANAGEMENT ============
  visitors: defineTable({
    residentId: v.id("residents"),
    propertyId: v.id("properties"),
    name: v.string(),
    phone: v.string(),
    purpose: v.string(),
    expectedAt: v.number(),
    duration: v.number(), // hours
    otpCode: v.string(),
    status: v.union(
      v.literal("Pending"),
      v.literal("Approved"),
      v.literal("Entered"),
      v.literal("Exited"),
      v.literal("Rejected")
    ),
    createdAt: v.number(),
  })
    .index("by_residentId", ["residentId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_otpCode", ["otpCode"]),

  visitorLogs: defineTable({
    visitorId: v.id("visitors"),
    propertyId: v.id("properties"),
    enteredAt: v.number(),
    exitedAt: v.optional(v.number()),
    loggedBy: v.id("staff"),
  })
    .index("by_visitorId", ["visitorId"])
    .index("by_propertyId", ["propertyId"]),

  deliveries: defineTable({
    propertyId: v.id("properties"),
    unitId: v.id("units"),
    itemDescription: v.string(),
    expectedAt: v.number(),
    status: v.union(
      v.literal("Expected"),
      v.literal("Arrived"),
      v.literal("Collected")
    ),
    createdAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_unitId", ["unitId"]),

  // ============ MODULE 11 — ADMIN / MANAGER AUDIT LOGS ============
  auditLogs: defineTable({
    propertyId: v.id("properties"),
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    changes: v.object({}),
    createdAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_userId", ["userId"])
    .index("by_createdAt", ["createdAt"]),
});
