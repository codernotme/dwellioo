# Dwello Convex Backend — API Documentation

> **Version**: 1.0  
> **Last Updated**: April 4, 2026  
> **Framework**: Convex (Serverless Database & API)  
> **Frontend Integration**: Next.js 15 + React 19

---

## 🚀 QUICK START FOR FRONTEND

### Installation
```bash
npm install convex next react
npx convex init
```

### Setup ConvexProvider
```tsx
// app/layout.tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexAuthNext } from "@convex-dev/auth/nextjs";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ConvexAuthNext>
        {children}
      </ConvexAuthNext>
    </ConvexProvider>
  );
}
```

---

## 📌 MODULE 1 — NOTICE BOARD

### Create Notice
**Function**: `convex/notices.ts` → `createNotice`  
**Type**: Mutation

```typescript
// Call from frontend
const { mutate } = useMutation(api.notices.createNotice);

await mutate({
  propertyId: "prop_123",
  title: "Maintenance Shutdown - Lift Area",
  body: "<h2>Notice</h2><p>Lift will be non-operational...</p>",
  category: "Maintenance",
  attachments: [
    { name: "plan.pdf", url: "s3://...", type: "pdf" }
  ],
  pinned: true,
  visibility: "all",
  expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  scheduledFor: undefined
});
```

**Response**:
```typescript
{
  _id: "notice_456",
  propertyId: "prop_123",
  title: "Maintenance Shutdown - Lift Area",
  body: "...",
  category: "Maintenance",
  pinned: true,
  createdAt: 1712304000000,
  // ... full notice object
}
```

---

### Get Notice with Stats
**Function**: `convex/notices.ts` → `getNotice`  
**Type**: Query

```typescript
// Real-time reactive query
const notice = useQuery(api.notices.getNotice, { 
  noticeId: "notice_456" 
});

// Loading state
if (notice === undefined) return <Spinner />;
if (notice === null) return <NotFound />;

// Access data
const { 
  notice: noticeData, 
  acknowledgeCount, 
  comments 
} = notice;
```

**Response**:
```typescript
{
  notice: { /* full notice doc */ },
  acknowledgeCount: 145,  // How many residents read it
  comments: [
    {
      comment: { text, createdAt },
      resident: { name, photo }
    }
  ]
}
```

---

### Mark Notice as Read
**Function**: `convex/notices.ts` → `markNoticeRead`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.notices.markNoticeRead);

await mutate({ noticeId: "notice_456" });
// ✅ Resident marked as read automatically
```

---

### List Notices for Property
**Function**: `convex/notices.ts` → `listNotices`  
**Type**: Query

```typescript
const notices = useQuery(api.notices.listNotices, {
  propertyId: "prop_123",
  category: "Urgent"  // Optional filter
});

// Filter, sort, reactive
notices?.map(notice => (
  <NoticeCard 
    key={notice._id}
    pinned={notice.pinned}
    category={notice.category}
  />
))
```

**Response**:
```typescript
[
  { 
    _id: "notice_1", 
    title: "...", 
    pinned: true,
    category: "Urgent"
  },
  // Sorted: pinned first, then by creation date
]
```

---

### Add Comment to Notice
**Function**: `convex/notices.ts` → `addNoticeComment`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.notices.addNoticeComment);

await mutate({
  noticeId: "notice_456",
  text: "What time will the maintenance start?"
});
```

---

### Get Notice Read Statistics
**Function**: `convex/notices.ts` → `getNoticeReadStats`  
**Type**: Query

```typescript
const stats = useQuery(api.notices.getNoticeReadStats, {
  noticeId: "notice_456"
});

// Returns
{
  readCount: 145,
  totalCount: 200,
  readPercentage: "72.50"
}
```

---

## 📅 MODULE 2 — EVENTS

### Create Event
**Function**: `convex/events.ts` → `createEvent`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.events.createEvent);

await mutate({
  propertyId: "prop_123",
  title: "Diwali Celebration",
  description: "Annual diwali fest with lights, music, food",
  category: "Festival",
  date: Date.now() + 30 * 24 * 60 * 60 * 1000,  // 30 days from now
  venue: "Community Hall, Ground Floor",
  capacity: 300,
  rsvpDeadline: Date.now() + 20 * 24 * 60 * 60 * 1000,
  coverImage: "s3://dwello-assets/diwali.jpg"
});
```

---

### RSVP to Event
**Function**: `convex/events.ts` → `rsvpEvent`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.events.rsvpEvent);

await mutate({
  eventId: "evt_789",
  status: "going",  // "going" | "not_going" | "maybe"
  guestCount: 3  // Including resident + family
});
```

---

### Get Event Details
**Function**: `convex/events.ts` → `getEvent`  
**Type**: Query

```typescript
const event = useQuery(api.events.getEvent, { 
  eventId: "evt_789" 
});

// Real-time RSVP counts
{
  event: { /* event data */ },
  rsvps: [ /* individual RSVPs */ ],
  going: 145,
  notGoing: 30,
  maybe: 25,
  totalGuests: 215,
  photos: [ /* post-event photos */ ]
}
```

---

### Upload Event Photo (Post-Event)
**Function**: `convex/events.ts` → `uploadEventPhoto`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.events.uploadEventPhoto);

await mutate({
  eventId: "evt_789",
  url: "s3://dwello-assets/diwali_photo_1.jpg"
});
```

---

### Get Event Attendees (CSV Export)
**Function**: `convex/events.ts` → `getEventAttendees`  
**Type**: Query

```typescript
const attendees = useQuery(api.events.getEventAttendees, { 
  eventId: "evt_789" 
});

// Returns CSV-friendly format
[
  {
    name: "Raj Kumar",
    phone: "9876543210",
    email: "raj@example.com",
    unit: "A-302",
    guestCount: 3
  },
  // ... more attendees
]
```

---

## 💬 MODULE 3 — COMMUNITY BOARD

### Create Thread
**Function**: `convex/threads.ts` → `createThread`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.threads.createThread);

await mutate({
  propertyId: "prop_123",
  category: "Buy & Sell",  // or "Lost & Found", "Help Needed", etc.
  title: "Selling old sofa set - great condition",
  body: "Brown leather sofa, 4 years old, very comfortable...",
  attachments: ["s3://sofa_photo_1.jpg", "s3://sofa_photo_2.jpg"]
});
```

---

### List Threads
**Function**: `convex/threads.ts` → `listThreads`  
**Type**: Query

```typescript
const threads = useQuery(api.threads.listThreads, {
  propertyId: "prop_123",
  category: "Help Needed",  // Optional
  solved: false  // Optional
});

// Sorted: pinned → upvotes (desc) → creation date (desc)
```

---

### Upvote Thread
**Function**: `convex/threads.ts` → `upvoteThread`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.threads.upvoteThread);

await mutate({ threadId: "thrd_999" });
// Toggles vote on/off
```

---

### Report Inappropriate Content
**Function**: `convex/threads.ts` → `reportThread`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.threads.reportThread);

await mutate({
  threadId: "thrd_999",
  reason: "Harassment and abuse"
});
```

---

## 🔔 MODULE 4 — ANNOUNCEMENTS

### Get Resident Announcements (Inbox)
**Function**: `convex/announcements.ts` → `getResidentAnnouncements`  
**Type**: Query

```typescript
const announcements = useQuery(api.announcements.getResidentAnnouncements, {
  propertyId: "prop_123"
});

// Returns inbox with read/unread status
[
  {
    announcement: {
      title: "🚨 Emergency Water Shutdown",
      body: "Water supply will be offline...",
      priority: "Emergency",
      sentAt: 1712304000000
    },
    receipt: {
      readAt: null  // null means unread
    }
  }
]
```

---

### Mark Announcement as Read
**Function**: `convex/announcements.ts` → `markAnnouncementRead`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.announcements.markAnnouncementRead);

await mutate({ announcementId: "ann_555" });
```

---

## 🛠️ MODULE 5 — COMPLAINTS

### Create Complaint
**Function**: `convex/complaints.ts` → `createComplaint`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.complaints.createComplaint);

await mutate({
  propertyId: "prop_123",
  category: "Water",  // or "Electricity", "Lift", "Cleanliness", etc.
  description: "No water in unit A-302 since morning",
  photos: ["s3://complaint_photo_dry_tap.jpg"]
});

// Response includes auto-generated ticketId
// e.g., "TKT-1712304000000-a34b5c6"
```

---

### Get Complaint with Timeline
**Function**: `convex/complaints.ts` → `getComplaint`  
**Type**: Query

```typescript
const complaint = useQuery(api.complaints.getComplaint, { 
  complaintId: "cmp_111" 
});

// Includes full history of status updates
{
  complaint: { status: "In Progress", ... },
  resident: { name, unit },
  updates: [
    {
      update: { status: "Assigned", note: "Assigned to plumber", createdAt },
      staff: { name }
    }
  ],
  rating: { rating: 4, review: "Quick response" }  // if completed
}
```

---

### Rate Complaint Resolution
**Function**: `convex/complaints.ts` → `rateComplaint`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.complaints.rateComplaint);

await mutate({
  complaintId: "cmp_111",
  rating: 5,  // 1-5 stars
  review: "Excellent service! Problem resolved in 2 hours."
});
```

---

### Get Complaint Statistics (Admin Dashboard)
**Function**: `convex/complaints.ts` → `getComplaintStats`  
**Type**: Query

```typescript
const stats = useQuery(api.complaints.getComplaintStats, { 
  propertyId: "prop_123" 
});

// Returns
{
  total: 45,
  open: 3,
  assigned: 5,
  inProgress: 8,
  resolved: 27,
  closed: 2,
  avgResolutionTime: "18.5",  // hours
  avgRating: "4.2",
  avgRatingCount: 25
}
```

---

## 🔧 MODULE 6 — SERVICE PROVIDERS

### List Service Providers
**Function**: `convex/services.ts` → `listServiceProviders`  
**Type**: Query

```typescript
const providers = useQuery(api.services.listServiceProviders, {
  propertyId: "prop_123",
  category: "Plumber",  // Optional
  verified: true  // Optional (show only verified)
});

// Sorted by avgRating (descending)
[
  {
    name: "Sharma Plumbers",
    phone: "9876543210",
    whatsapp: "9876543210",
    category: "Plumber",
    basePricing: "₹300-500",
    verified: true,
    avgRating: 4.8,
    totalReviews: 23,
    availability: "Available"
  }
]
```

---

### Book Service
**Function**: `convex/services.ts` → `bookService`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.services.bookService);

await mutate({
  providerId: "prov_222",
  serviceType: "Pipe Fitting",
  scheduledAt: Date.now() + 2 * 24 * 60 * 60 * 1000,  // 2 days from now
  notes: "Please bring your own pipe fitting kit"
});

// Response
{
  _id: "book_999",
  status: "Pending",  // Waiting for provider to accept
  scheduledAt: 1712390400000
}
```

---

### Add Service Review
**Function**: `convex/services.ts` → `addServiceReview`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.services.addServiceReview);

await mutate({
  bookingId: "book_999",
  rating: 5,  // 1-5 stars
  reviewText: "Excellent work, very professional!"
});

// Provider's avgRating is auto-updated
```

---

### Get Resident Bookings
**Function**: `convex/services.ts` → `getResidentBookings`  
**Type**: Query

```typescript
const bookings = useQuery(api.services.getResidentBookings, {});

// Returns all bookings for current resident
[
  {
    booking: { 
      status: "Completed", 
      scheduledAt, providerName 
    },
    provider: { /* full provider */ },
    review: { rating: 5, reviewText: "Great!" }  // if reviewed
  }
]
```

---

## 🗳️ MODULE 7 — POLLS & SURVEYS

### Create Poll
**Function**: `convex/polls.ts` → `createPoll`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.polls.createPoll);

await mutate({
  propertyId: "prop_123",
  question: "Should we install solar panels on the roof?",
  options: ["Yes, definitely", "No, too expensive", "Maybe, get quotes first"],
  anonymous: true,  // Results show votes, not who voted
  closesIn: 7 * 24 * 60 * 60  // 7 days in seconds
});
```

---

### Vote in Poll
**Function**: `convex/polls.ts` → `votePoll`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.polls.votePoll);

await mutate({
  pollId: "poll_333",
  selectedOption: 0  // Index of selected option (0, 1, 2, etc.)
});
```

---

### Get Poll Results
**Function**: `convex/polls.ts` → `getPoll`  
**Type**: Query

```typescript
const pollData = useQuery(api.polls.getPoll, { 
  pollId: "poll_333" 
});

// Real-time results
{
  poll: { question, options, closed },
  votes: [
    { votes: 145, percentage: "48.33" },  // Option 0
    { votes: 89, percentage: "29.67" },   // Option 1
    { votes: 66, percentage: "22.00" }    // Option 2
  ],
  totalVotes: 300,
  closed: false
}
```

---

## 💰 MODULE 8 — PAYMENTS

### Get Resident Dues
**Function**: `convex/payments.ts` → `getResidentDues`  
**Type**: Query

```typescript
const dues = useQuery(api.payments.getResidentDues, {});

// Returns all dues for current resident
[
  {
    due: {
      month: "2024-04",
      amount: 5000,
      dueDate: 1721500800000,
      status: "Pending"
    },
    payments: [ /* payment history */ ],
    totalPaid: 0,
    remainingAmount: 5000
  },
  {
    due: {
      month: "2024-03",
      dueDate: 1719000000000,
      status: "Paid"
    },
    totalPaid: 5000,
    remainingAmount: 0
  }
]
```

---

### Create Payment (Razorpay)
**Function**: `convex/payments.ts` → `createPayment`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.payments.createPayment);

// After Razorpay returns successful payment
await mutate({
  dueId: "due_444",
  amount: 5000,
  razorpayPaymentId: "pay_1234567890",
  receiptUrl: "s3://receipts/payment_123.pdf"
});

// Due status automatically updates:
// Pending → Partial (if partial) or Paid (if full)
```

---

### Get Payment Statistics (Admin)
**Function**: `convex/payments.ts` → `getPaymentStats`  
**Type**: Query

```typescript
const stats = useQuery(api.payments.getPaymentStats, { 
  propertyId: "prop_123" 
});

// Dashboard metrics
{
  totalDues: 500000,        // Total outstanding
  totalCollected: 420000,   // Total received
  pendingDues: 75,          // Count of pending
  overdueDues: 15,
  paidDues: 210,            // Count of paid
  collectionPercentage: "84.00",
  pendingAmount: 60000,
  overdueAmount: 20000
}
```

---

## 👥 MODULE 9 — RESIDENTS

### Get Resident Profile
**Function**: `convex/residents.ts` → `getResidentProfile`  
**Type**: Query

```typescript
const profile = useQuery(api.residents.getResidentProfile, {
  residentId: "res_555"
});

// Full profile with vehicles
{
  resident: { moveInDate, familyMembers, showInDirectory },
  user: { name, phone, email, photo },
  unit: { unitNumber, wing, floor },
  property: { name, address },
  vehicles: [
    { numberPlate: "DL01AB1234", type: "Car", color: "Silver" }
  ]
}
```

---

### Update Resident Profile
**Function**: `convex/residents.ts` → `updateResidentProfile`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.residents.updateResidentProfile);

await mutate({
  residentId: "res_555",
  photo: "s3://profile_photos/resident_555.jpg",
  familyMembers: ["Priya Kumar (Wife)", "Arav Kumar (Son)"],
  showInDirectory: true
});
```

---

### Get Resident Directory (Public)
**Function**: `convex/residents.ts` → `getResidentDirectory`  
**Type**: Query

```typescript
const directory = useQuery(api.residents.getResidentDirectory, {
  propertyId: "prop_123"
});

// Only residents with showInDirectory: true
[
  {
    name: "Raj Kumar",
    phone: "9876543210",
    email: "raj@example.com",
    unit: "A-302",
    familyMembers: ["Priya (Wife)", "Arav (Son)"]
  }
]
```

---

## 🚪 MODULE 10 — VISITORS & GATE

### Approve Visitor
**Function**: `convex/visitors.ts` → `approveVisitor`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.visitors.approveVisitor);

await mutate({
  name: "Rahul Singh",
  phone: "9876543210",
  purpose: "Meeting with Raj Kumar",
  expectedAt: Date.now() + 2 * 60 * 60 * 1000,  // 2 hours from now
  duration: 3  // hours
});

// Auto-generates OTP and sends to visitor's phone
// Response includes otpCode: "123456"
```

---

### Visitor Gate Entry (Watchman)
**Function**: `convex/visitors.ts` → `getVisitorByOTP`  
**Type**: Query

```typescript
// Watchman enters OTP from visitor phone
const visitorInfo = useQuery(api.visitors.getVisitorByOTP, {
  otpCode: "123456"
});

// Returns visitor details for verification
{
  visitor: { name, phone, purpose, expectedAt },
  resident: { name, unit },  // Who approved
  unit: "A-302"
}
```

---

### Log Visitor Entry
**Function**: `convex/visitors.ts` → `logVisitorEntry`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.visitors.logVisitorEntry);

await mutate({ visitorId: "vis_666" });

// Timestamps entry, updates visitor status to "Entered"
```

---

### Get Resident Visitor History
**Function**: `convex/visitors.ts` → `getResidentVisitors`  
**Type**: Query

```typescript
const visitors = useQuery(api.visitors.getResidentVisitors, {});

// Returns all visitors approved by resident with entry/exit logs
[
  {
    visitor: {
      name: "Rahul Singh",
      phone: "9876543210",
      purpose: "Meeting",
      status: "Exited"
    },
    logs: [
      {
        enteredAt: 1712388000000,
        exitedAt: 1712390800000  // 45 minutes later
      }
    ]
  }
]
```

---

## 🏢 ADMIN DASHBOARD QUERIES

### Property Statistics
**Function**: `convex/properties.ts` → `getPropertyStats`  
**Type**: Query

```typescript
const stats = useQuery(api.properties.getPropertyStats, {
  propertyId: "prop_123"
});

// KPI summary
{
  totalResidents: 200,
  activeResidents: 185,
  openComplaints: 12,
  pendingPayments: 45,
  upcomingEvents: 3,
  collectionRate: "78.5"
}
```

---

### List Property Residents
**Function**: `convex/residents.ts` → `listPropertyResidents`  
**Type**: Query

```typescript
const residents = useQuery(api.residents.listPropertyResidents, {
  propertyId: "prop_123"
});

// Full resident list with contact info
[
  {
    resident: { status: "Active", moveInDate },
    user: { name, phone, email },
    unit: { unitNumber, wing, floor }
  }
]
```

---

### List Complaints (Filter & Sort)
**Function**: `convex/complaints.ts` → `listComplaints`  
**Type**: Query

```typescript
const complaints = useQuery(api.complaints.listComplaints, {
  propertyId: "prop_123",
  status: "Open",  // Optional
  category: "Water"  // Optional
});

// Returns filtered list for dashboard
```

---

## 🔐 AUTHENTICATION

### User Identity
**Function**: `convex/users.ts` → `getCurrentUser`  
**Type**: Query

```typescript
const user = useQuery(api.users.getCurrentUser, {});

// Returns null if not authenticated
// Returns user object if authenticated
{
  _id: "user_123",
  tokenIdentifier: "google|oauth123",
  name: "Raj Kumar",
  phone: "9876543210",
  email: "raj@example.com",
  role: "Resident"  // or "Staff", "Property Manager", etc.
}
```

---

### Create User
**Function**: `convex/users.ts` → `createUser`  
**Type**: Mutation

```typescript
const { mutate } = useMutation(api.users.createUser);

await mutate({
  phone: "9876543210",
  email: "raj@example.com",
  name: "Raj Kumar"
});

// Called on first sign-up
// Auto-sets role to "Resident" initially
```

---

## 🎯 FRONTEND INTEGRATION PATTERNS

### Pattern 1: Using Query Hook (Real-Time)
```tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function NoticeBoard({ propertyId }) {
  const notices = useQuery(api.notices.listNotices, { propertyId });
  
  if (notices === undefined) return <Spinner />;  // Loading
  
  return (
    <div>
      {notices.map(notice => (
        <NoticeCard key={notice._id} notice={notice} />
      ))}
    </div>
  );
}
```

### Pattern 2: Using Mutation Hook (Call Actions)
```tsx
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function CreateComplaint() {
  const { mutate, isPending } = useMutation(api.complaints.createComplaint);
  
  const handleSubmit = async (data) => {
    try {
      const result = await mutate({
        propertyId: "...",
        category: data.category,
        description: data.description
      });
      console.log("Ticket ID:", result.ticketId);
    } catch (error) {
      console.error("Failed:", error.message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={isPending}>Submit</button>
    </form>
  );
}
```

### Pattern 3: Pagination
```tsx
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function ComplaintList({ propertyId }) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.complaints.listComplaints,
    { propertyId },
    { initialNumItems: 10 }
  );
  
  return (
    <>
      {results?.map(complaint => (
        <ComplaintCard key={complaint._id} complaint={complaint} />
      ))}
      
      {status === "CanLoadMore" && (
        <button onClick={() => loadMore(5)}>Load More</button>
      )}
    </>
  );
}
```

---

## 📊 RESPONSE STATUS CODES

| Code | Scenario |
|------|----------|
| 200  | Success |
| 400  | Validation error (missing field, invalid type) |
| 401  | Not authenticated |
| 403  | Forbidden (insufficient permissions) |
| 404  | Resource not found |
| 409  | Conflict (duplicate, already exists) |
| 500  | Server error (rare with Convex) |

---

## 🚀 DEPLOYMENT

### Environment Variables
```env
# .env.local
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOYMENT=prod:your-deployment
```

### Testing Endpoints
```bash
# Convex dashboard
https://dashboard.convex.dev

# Functions can be tested directly:
# 1. Go to Functions tab
# 2. Select function
# 3. Click "Test"
# 4. Provide test arguments
```

---

## 📞 SUPPORT

- **Convex Docs**: https://docs.convex.dev
- **API Reference**: Generated in Convex dashboard
- **Type Definitions**: Exported from `convex/_generated/api.d.ts`
- **Issues**: GitHub issues in project repo

---

**Version**: 1.0  
**Last Updated**: April 4, 2026  
**Maintainer**: Backend Team
