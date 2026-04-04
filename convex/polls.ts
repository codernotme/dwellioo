import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create poll
export const createPoll = mutation({
  args: {
    propertyId: v.id("properties"),
    question: v.string(),
    options: v.array(v.string()),
    anonymous: v.boolean(),
    closesIn: v.number(), // seconds
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

    if (!staff) throw new Error("Only staff can create polls");

    const closesAt = Date.now() + args.closesIn * 1000;

    const pollId = await ctx.db.insert("polls", {
      propertyId: args.propertyId,
      question: args.question,
      options: args.options,
      anonymous: args.anonymous,
      closesAt,
      createdBy: staff._id,
      createdAt: Date.now(),
      closed: false,
    });

    return await ctx.db.get(pollId);
  },
});

// Get poll with votes
export const getPoll = query({
  args: {
    pollId: v.id("polls"),
  },
  handler: async (ctx, args) => {
    const poll = await ctx.db.get(args.pollId);
    if (!poll) throw new Error("Poll not found");

    const votes = await ctx.db
      .query("pollVotes")
      .withIndex("by_pollId", (q) =>
        q.eq("pollId", args.pollId)
      )
      .collect();

    // Calculate option counts
    const optionCounts = poll.options.map((_, index) =>
      votes.filter((v) => v.selectedOption === index).length
    );

    const totalVotes = votes.length;

    return {
      poll,
      votes: optionCounts.map((count) => ({
        votes: count,
        percentage:
          totalVotes > 0
            ? ((count / totalVotes) * 100).toFixed(2)
            : "0",
      })),
      totalVotes,
      closed: poll.closed || poll.closesAt < Date.now(),
    };
  },
});

// Vote in poll
export const votePoll = mutation({
  args: {
    pollId: v.id("polls"),
    selectedOption: v.number(),
  },
  handler: async (ctx, args) => {
    const poll = await ctx.db.get(args.pollId);
    if (!poll) throw new Error("Poll not found");

    if (poll.closed || poll.closesAt < Date.now()) {
      throw new Error("Poll is closed");
    }

    if (
      args.selectedOption < 0 ||
      args.selectedOption >= poll.options.length
    ) {
      throw new Error("Invalid option");
    }

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

    // Check if already voted
    const existing = await ctx.db
      .query("pollVotes")
      .withIndex("by_pollId_residentId", (q) =>
        q.eq("pollId", args.pollId).eq("residentId", resident._id)
      )
      .first();

    if (existing) {
      throw new Error("Already voted");
    }

    const voteId = await ctx.db.insert("pollVotes", {
      pollId: args.pollId,
      residentId: resident._id,
      selectedOption: args.selectedOption,
      createdAt: Date.now(),
    });

    return await ctx.db.get(voteId);
  },
});

// List polls for property
export const listPolls = query({
  args: {
    propertyId: v.id("properties"),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const polls = await ctx.db
      .query("polls")
      .withIndex("by_propertyId", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    let filtered = polls;

    if (args.active !== undefined) {
      if (args.active) {
        filtered = filtered.filter(
          (p) => !p.closed && p.closesAt >= Date.now()
        );
      } else {
        filtered = filtered.filter(
          (p) => p.closed || p.closesAt < Date.now()
        );
      }
    }

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Close poll (auto or manual)
export const closePoll = mutation({
  args: {
    pollId: v.id("polls"),
  },
  handler: async (ctx, args) => {
    const poll = await ctx.db.get(args.pollId);
    if (!poll) throw new Error("Poll not found");

    await ctx.db.patch(args.pollId, {
      closed: true,
    });

    return await ctx.db.get(args.pollId);
  },
});

// ============ SURVEYS ============

// Create survey
export const createSurvey = mutation({
  args: {
    propertyId: v.id("properties"),
    title: v.string(),
    questions: v.array(
      v.object({
        text: v.string(),
        type: v.union(v.literal("text"), v.literal("multiple-choice")),
        options: v.optional(v.array(v.string())),
      })
    ),
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

    if (!staff) throw new Error("Only staff can create surveys");

    const surveyId = await ctx.db.insert("surveys", {
      propertyId: args.propertyId,
      title: args.title,
      questions: args.questions,
      createdBy: staff._id,
      createdAt: Date.now(),
    });

    return await ctx.db.get(surveyId);
  },
});

// Get survey
export const getSurvey = query({
  args: {
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) throw new Error("Survey not found");

    const responses = await ctx.db
      .query("surveyResponses")
      .withIndex("by_surveyId", (q) =>
        q.eq("surveyId", args.surveyId)
      )
      .collect();

    return {
      survey,
      responseCount: responses.length,
    };
  },
});

// Submit survey response
export const submitSurveyResponse = mutation({
  args: {
    surveyId: v.id("surveys"),
    responses: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) throw new Error("Survey not found");

    if (args.responses.length !== survey.questions.length) {
      throw new Error("Response count mismatch");
    }

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

    const responseId = await ctx.db.insert("surveyResponses", {
      surveyId: args.surveyId,
      residentId: resident._id,
      responses: args.responses,
      createdAt: Date.now(),
    });

    return await ctx.db.get(responseId);
  },
});

// List surveys for property
export const listSurveys = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const surveys = await ctx.db
      .query("surveys")
      .withIndex("by_propertyId", (q) =>
        q.eq("propertyId", args.propertyId)
      )
      .collect();

    const withCounts = await Promise.all(
      surveys.map(async (survey) => {
        const responses = await ctx.db
          .query("surveyResponses")
          .withIndex("by_surveyId", (q) =>
            q.eq("surveyId", survey._id)
          )
          .collect();

        return {
          survey,
          responseCount: responses.length,
        };
      })
    );

    return withCounts.sort(
      (a, b) => b.survey.createdAt - a.survey.createdAt
    );
  },
});

// Get survey results
export const getSurveyResults = query({
  args: {
    surveyId: v.id("surveys"),
  },
  handler: async (ctx, args) => {
    const survey = await ctx.db.get(args.surveyId);
    if (!survey) throw new Error("Survey not found");

    const responses = await ctx.db
      .query("surveyResponses")
      .withIndex("by_surveyId", (q) =>
        q.eq("surveyId", args.surveyId)
      )
      .collect();

    const results = survey.questions.map((question, index) => {
      if (question.type === "multiple-choice") {
        const optionCounts = (question.options || []).map((option) =>
          responses.filter(
            (r) => r.responses[index] === option
          ).length
        );

        return {
          question: question.text,
          type: "multiple-choice",
          options: (question.options || []).map((option, idx) => ({
            option,
            count: optionCounts[idx],
            percentage:
              responses.length > 0
                ? (
                    (optionCounts[idx] / responses.length) *
                    100
                  ).toFixed(2)
                : "0",
          })),
        };
      } else {
        return {
          question: question.text,
          type: "text",
          responses: responses.map((r) => r.responses[index]),
        };
      }
    });

    return {
      survey,
      totalResponses: responses.length,
      results,
    };
  },
});
