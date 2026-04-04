import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { nanoid } from "nanoid";

// Create resident invite
export const createResidentInvite = mutation({
  args: {
    propertyId: v.id("properties"),
    unitId: v.id("units"),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.phone && !args.email) {
      throw new Error("Phone or email required");
    }

    const inviteCode = nanoid(12);
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    const inviteId = await ctx.db.insert("residentInvites", {
      propertyId: args.propertyId,
      unitId: args.unitId,
      inviteCode,
      phone: args.phone,
      email: args.email,
      expiresAt,
    });

    return await ctx.db.get(inviteId);
  },
});

// Accept resident invite and create resident
export const acceptResidentInvite = mutation({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const invite = await ctx.db
      .query("residentInvites")
      .withIndex("by_inviteCode", (q) =>
        q.eq("inviteCode", args.inviteCode)
      )
      .first();

    if (!invite) throw new Error("Invalid invite code");
    if (invite.expiresAt < Date.now()) throw new Error("Invite expired");
    if (invite.usedAt) throw new Error("Invite already used");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", identity.email || "")
      )
      .first();

    if (!user) throw new Error("User not found");

    const residentId = await ctx.db.insert("residents", {
      propertyId: invite.propertyId,
      unitId: invite.unitId,
      userId: user._id,
      status: "Pending",
      moveInDate: Date.now(),
      familyMembers: [],
      showInDirectory: false,
    });

    // Mark invite as used
    await ctx.db.patch(invite._id, {
      usedAt: Date.now(),
      usedBy: user._id,
    });

    return await ctx.db.get(residentId);
  },
});

// Get resident profile
export const getResidentProfile = query({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const resident = await ctx.db.get(args.residentId);
    if (!resident) throw new Error("Resident not found");

    const [user, unit, property] = await Promise.all([
      ctx.db.get(resident.userId),
      ctx.db.get(resident.unitId),
      ctx.db.get(resident.propertyId),
    ]);

    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_residentId", (q) =>
        q.eq("residentId", args.residentId)
      )
      .collect();

    return {
      resident,
      user,
      unit,
      property,
      vehicles,
    };
  },
});

// Update resident profile
export const updateResidentProfile = mutation({
  args: {
    residentId: v.id("residents"),
    photo: v.optional(v.string()),
    familyMembers: v.optional(v.array(v.string())),
    showInDirectory: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const resident = await ctx.db.get(args.residentId);
    if (!resident) throw new Error("Resident not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", identity.email || "")
      )
      .first();

    if (resident.userId !== user?._id) {
      throw new Error("Can only update own profile");
    }

    const updates: any = {};
    if (args.photo !== undefined) updates.photo = args.photo;
    if (args.familyMembers !== undefined) updates.familyMembers = args.familyMembers;
    if (args.showInDirectory !== undefined) updates.showInDirectory = args.showInDirectory;

    await ctx.db.patch(args.residentId, updates);
    return await ctx.db.get(args.residentId);
  },
});

// Add vehicle for resident
export const addVehicle = mutation({
  args: {
    residentId: v.id("residents"),
    numberPlate: v.string(),
    type: v.union(
      v.literal("Car"),
      v.literal("Bike"),
      v.literal("Scooter"),
      v.literal("Other")
    ),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const vehicleId = await ctx.db.insert("vehicles", {
      residentId: args.residentId,
      numberPlate: args.numberPlate,
      type: args.type,
      color: args.color,
    });

    return await ctx.db.get(vehicleId);
  },
});

// List residents in property
export const listPropertyResidents = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const residents = await ctx.db
      .query("residents")
      .withIndex("by_propertyId", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    const withDetails = await Promise.all(
      residents.map(async (resident) => {
        const [user, unit] = await Promise.all([
          ctx.db.get(resident.userId),
          ctx.db.get(resident.unitId),
        ]);

        return {
          resident,
          user,
          unit,
        };
      })
    );

    return withDetails;
  },
});

// Approve resident (Admin only)
export const approveResident = mutation({
  args: {
    residentId: v.id("residents"),
  },
  handler: async (ctx, args) => {
    const resident = await ctx.db.get(args.residentId);
    if (!resident) throw new Error("Resident not found");

    await ctx.db.patch(args.residentId, {
      status: "Active",
    });

    return await ctx.db.get(args.residentId);
  },
});

// Archive resident (move-out)
export const archiveResident = mutation({
  args: {
    residentId: v.id("residents"),
    moveOutDate: v.number(),
  },
  handler: async (ctx, args) => {
    const resident = await ctx.db.get(args.residentId);
    if (!resident) throw new Error("Resident not found");

    await ctx.db.patch(args.residentId, {
      status: "Archive",
      moveOutDate: args.moveOutDate,
    });

    return await ctx.db.get(args.residentId);
  },
});

// Get resident directory (public contact list)
export const getResidentDirectory = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const residents = await ctx.db
      .query("residents")
      .withIndex("by_propertyId", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    const directory = await Promise.all(
      residents
        .filter((r) => r.showInDirectory && r.status === "Active")
        .map(async (resident) => {
          const user = await ctx.db.get(resident.userId);
          const unit = await ctx.db.get(resident.unitId);

          return {
            name: user?.name,
            phone: user?.phone,
            email: user?.email,
            unit: unit?.unitNumber,
            familyMembers: resident.familyMembers,
          };
        })
    );

    return directory;
  },
});

// Bulk upload residents from CSV
export const bulkCreateResidents = mutation({
  args: {
    propertyId: v.id("properties"),
    residents: v.array(
      v.object({
        unitId: v.id("units"),
        name: v.string(),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
        moveInDate: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const createdIds = [];

    for (const resident of args.residents) {
      // Create invite code for resident
      const inviteCode = `INVITE-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
      
      // Create resident invite
      const inviteId = await ctx.db.insert("residentInvites", {
        propertyId: args.propertyId,
        unitId: resident.unitId,
        inviteCode,
        phone: resident.phone,
        email: resident.email,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      createdIds.push(inviteId);
    }

    return createdIds;
  },
});
