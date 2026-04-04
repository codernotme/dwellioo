import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create monthly dues for all residents
export const generateMonthlyDues = mutation({
  args: {
    propertyId: v.id("properties"),
    month: v.string(), // "2024-04"
  },
  handler: async (ctx, args) => {
    const property = await ctx.db.get(args.propertyId);
    if (!property) throw new Error("Property not found");

    const residents = await ctx.db
      .query("residents")
      .withIndex("by_propertyId", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    const activeResidents = residents.filter(
      (r) => r.status === "Active"
    );

    const amount = property.settings.maintenanceAmount;

    // Check if dues already exist for this month
    const existing = await ctx.db
      .query("paymentDues")
      .withIndex("by_propertyId_status", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    const createdDues = [];

    for (const resident of activeResidents) {
      const existingDue = existing.find(
        (d) => d.residentId === resident._id && d.month === args.month
      );

      if (existingDue) continue;

      // Due date is 5th of next month
      const [year, month] = args.month.split("-");
      const dueDate = new Date(
        parseInt(year),
        parseInt(month),
        5
      ).getTime();

      const dueId = await ctx.db.insert("paymentDues", {
        propertyId: args.propertyId,
        residentId: resident._id,
        month: args.month,
        amount,
        dueDate,
        status: "Pending",
        lateFeeApplied: 0,
        createdAt: Date.now(),
      });

      createdDues.push(dueId);
    }

    return { createdCount: createdDues.length };
  },
});

// Get resident dues
export const getResidentDues = query({
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

    const dues = await ctx.db
      .query("paymentDues")
      .withIndex("by_residentId", (q) =>
        q.eq("residentId", resident._id)
      )
      .collect();

    // Get payment history for each due
    const withPayments = await Promise.all(
      dues.map(async (due) => {
        const payments = await ctx.db
          .query("payments")
          .collect();

        const duePayments = payments.filter(
          (p) => p.dueId === due._id
        );

        return {
          due,
          payments: duePayments,
          totalPaid: duePayments.reduce((sum, p) => sum + p.amount, 0),
          remainingAmount: Math.max(0, due.amount - duePayments.reduce((sum, p) => sum + p.amount, 0)),
        };
      })
    );

    return withPayments;
  },
});

// Create payment
export const createPayment = mutation({
  args: {
    dueId: v.id("paymentDues"),
    amount: v.number(),
    razorpayPaymentId: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const due = await ctx.db.get(args.dueId);
    if (!due) throw new Error("Due not found");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) =>
        q.eq("email", identity.email || "")
      )
      .first();

    if (!user || !identity.email) throw new Error("Email not found in identity");

    const resident = await ctx.db
      .query("residents")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!resident) throw new Error("User is not a resident");

    if (due.residentId !== resident._id) {
      throw new Error("Can only pay own dues");
    }

    const paymentId = await ctx.db.insert("payments", {
      propertyId: due.propertyId,
      residentId: due.residentId,
      dueId: args.dueId,
      amount: args.amount,
      paidAt: Date.now(),
      razorpayPaymentId: args.razorpayPaymentId,
      receipts: args.receiptUrl ? [args.receiptUrl] : [],
    });

    // Update due status
    const payments = await ctx.db
      .query("payments")
      .collect();

    const duePayments = payments.filter((p) => p.dueId === args.dueId);
    const totalPaid = duePayments.reduce((sum, p) => sum + p.amount, 0);

    let newStatus: "Pending" | "Paid" | "Partial" | "Overdue" = "Pending";
    if (totalPaid >= due.amount) {
      newStatus = "Paid";
    } else if (totalPaid > 0) {
      newStatus = "Partial";
    } else if (due.dueDate < Date.now()) {
      newStatus = "Overdue";
    }

    await ctx.db.patch(args.dueId, {
      status: newStatus,
    });

    return await ctx.db.get(paymentId);
  },
});

// Get payment
export const getPayment = query({
  args: {
    paymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    const [resident, due, property] = await Promise.all([
      ctx.db.get(payment.residentId),
      ctx.db.get(payment.dueId),
      ctx.db.get(payment.propertyId),
    ]);

    return {
      payment,
      resident,
      due,
      property,
    };
  },
});

// Get property payment stats
export const getPaymentStats = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const dues = await ctx.db
      .query("paymentDues")
      .withIndex("by_propertyId_status", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    const payments = await ctx.db
      .query("payments")
      .collect();

    const propertyPayments = payments.filter(
      (p) => p.propertyId === args.propertyId
    );

    const totalDues = dues.reduce((sum, d) => sum + d.amount, 0);
    const totalCollected = propertyPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    const pendingDues = dues.filter((d) => d.status === "Pending");
    const overdueDues = dues.filter((d) => d.status === "Overdue");
    const paidDues = dues.filter((d) => d.status === "Paid");

    return {
      totalDues,
      totalCollected,
      pendingDues: pendingDues.length,
      overdueDues: overdueDues.length,
      paidDues: paidDues.length,
      collectionPercentage:
        totalDues > 0 ? ((totalCollected / totalDues) * 100).toFixed(2) : "0",
      pendingAmount: pendingDues.reduce((sum, d) => sum + d.amount, 0),
      overdueAmount: overdueDues.reduce((sum, d) => sum + d.amount, 0),
    };
  },
});

// Get monthly collection report
export const getMonthlyReport = query({
  args: {
    propertyId: v.id("properties"),
    month: v.string(),
  },
  handler: async (ctx, args) => {
    const dues = await ctx.db
      .query("paymentDues")
      .withIndex("by_propertyId_status", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    const monthDues = dues.filter((d) => d.month === args.month);

    const payments = await ctx.db
      .query("payments")
      .collect();

    const details = await Promise.all(
      monthDues.map(async (due) => {
        const duePayments = payments.filter(
          (p) => p.dueId === due._id
        );
        const resident = await ctx.db.get(due.residentId);
        if (!resident) return { unit: null, residentName: null, dueAmount: due.amount, paidAmount: duePayments.reduce((sum, p) => sum + p.amount, 0), status: due.status };
        const user = resident.userId ? await ctx.db.get(resident.userId) : null;
        const unit = resident.unitId ? await ctx.db.get(resident.unitId) : null;

        return {
          unit: unit?.unitNumber || null,
          residentName: user?.name || null,
          dueAmount: due.amount,
          paidAmount: duePayments.reduce((sum, p) => sum + p.amount, 0),
          status: due.status,
        };
      })
    );

    const totalDue = monthDues.reduce((sum, d) => sum + d.amount, 0);
    const totalPaid = details.reduce((sum, d) => sum + d.paidAmount, 0);

    return {
      month: args.month,
      totalUnits: monthDues.length,
      totalDue,
      totalPaid,
      totalPending: totalDue - totalPaid,
      collectionRate: totalDue > 0 ? ((totalPaid / totalDue) * 100).toFixed(2) : "0",
      details,
    };
  },
});

// Apply late fee
export const applyLateFee = mutation({
  args: {
    dueId: v.id("paymentDues"),
  },
  handler: async (ctx, args) => {
    const due = await ctx.db.get(args.dueId);
    if (!due) throw new Error("Due not found");

    const property = await ctx.db.get(due.propertyId);
    if (!property) throw new Error("Property not found");

    if (due.lateFeeApplied > 0) {
      throw new Error("Late fee already applied");
    }

    const lateFee =
      (due.amount * property.settings.lateFeePercent) / 100;

    await ctx.db.patch(args.dueId, {
      lateFeeApplied: lateFee,
      amount: due.amount + lateFee,
    });

    return await ctx.db.get(args.dueId);
  },
});
