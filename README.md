This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

# 🏘️ Dwello — The OS for Residential Communities

> **Dwello is the operating system for residential communities — replacing WhatsApp chaos with structured communication, accountable management, and trusted local services.**

---

## 😤 The Problem

Walk into any residential society, private hostel, or PG in India. This is what communication looks like:

- 📢 **Notice never reaches everyone** — Paper boards fade, WhatsApp announcements drown in noise. Residents claim they "didn't know."
- 🔧 **Nobody knows who to call** — 6 different plumber numbers floating around. No ratings, no accountability. The job half-works and nobody fixes it.
- 📋 **Complaints disappear** — Secretary says "I'll look into it." Nothing happens for a week. Zero visibility, zero accountability.
- 💸 **Collecting maintenance is a nightmare** — Treasurer manually calls 200 flats every month. Keeps a messy Excel sheet. Who paid? Nobody knows.
- 🚪 **Gate security is a joke** — Physical visitor logbook. Illegible. 5 minutes later, a stranger walks past the guard.
- 📅 **Half the society never got the invite** — Event on Sunday. WhatsApp group announcement. People muted it 6 months ago. 40% no-show rate.
- 🔕 **Nobody checks WhatsApp anymore** — Too noisy. Too chaotic. Official info buried under memes and arguments.

**This hasn't changed in 20 years.**

---

## 📊 The Market

| Segment | Estimated Count (India) |
|---------|---------------------|
| Registered Housing Societies (RWAs) | 1.7 lakh+ |
| Private Hostels & PGs | 5 lakh+ |
| Co-living spaces | Growing 40% YoY |
| Gated apartment complexes | 80,000+ |
| Addressable units needing this | **5–8 crore** |

**None of them have structured communication infrastructure.** They're all running on WhatsApp, paper notices, and personal phone numbers.

---

## 🎯 What Dwello Does

Dwello is **not** a replacement for WhatsApp. It's a replacement for the broken, informal, unaccountable stack that societies have hacked together on top of it.

### 7 Core Pains Dwello Solves

| Pain | Dwello's Fix |
|------|-------------|
| **📢 "Nobody saw the notice"** | Structured notice board with push + WhatsApp delivery, read receipts, and pin-to-top. |
| **🔧 "Who do I call for a plumber?"** | Verified service provider directory with ratings, booking slots, and reviews. |
| **📋 "My complaint went into a black hole"** | Ticketed complaint system with assignment, status tracking, and SLA timers. |
| **💸 "Collecting maintenance is a nightmare"** | Automated due generation, WhatsApp reminders, one-click Razorpay payment, auto-receipts. |
| **🚪 "Who let that person in?"** | Digital visitor pre-approval, WhatsApp OTP gate passes, watchman entry/exit logging. |
| **📅 "Half the society didn't come to the meeting"** | Event creation with RSVP, capacity management, auto reminders, attendance visibility. |
| **🔕 "Nobody checks the group anymore"** | Purpose-built platform with dedicated spaces for notices, events, complaints, and chatter. |

---

## 🚀 Key Features

### ✅ MVP v1 (Current Focus)

- **📌 Notice Board** — Post notices with visibility targeting, expiry dates, read receipts
- **🔔 Announcements** — Priority-based broadcasts via push + WhatsApp + email
- **📅 Events & RSVP** — Create events, track RSVPs, send reminders, post galleries
- **🛠️ Complaints & Maintenance** — Ticketed system with status tracking, SLA timers, resident ratings
- **🔧 Service Provider Directory** — Browse verified vendors by category, book appointments, leave reviews
- **👥 Resident Management** — Profiles, family members, vehicle registration, move-out workflows
- **📱 PWA + Push Notifications** — Installable app experience, push notifications for all events

### ⏳ v2 & Beyond

- **🚪 Visitor & Gate Management** — Pre-approval, OTP passes, watchman logging, delivery tracking
- **💰 Payments & Dues** — Auto-due generation, WhatsApp reminders, Razorpay integration, collection dashboard
- **🗳️ Polls & Surveys** — Quick polls, multi-question surveys, visual results, export to CSV
- **📊 Analytics** — Engagement metrics, complaint resolution times, payment trends, exportable reports
- **🏪 Community Marketplace** — Buy/sell, lost & found, service recommendations, moderator queue

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (App Router) + React 19 |
| **UI Components** | HeroUI v3 + Tailwind CSS v4 |
| **Backend + DB** | Convex (real-time serverless) |
| **Authentication** | Convex Auth (OTP + phone/email) |
| **File Storage** | Convex Files |
| **Notifications** | WhatsApp WABA + Email (Nodemailer) |
| **Payments** | Razorpay |
| **Hosting** | Vercel (frontend) + Convex Cloud (backend) |

---

## 👤 User Roles

- **Super Admin** — Dwello platform owner
- **Property Manager** — Society secretary, hostel owner
- **Staff** — Watchman, housekeeping, maintenance in-charge
- **Resident** — Flat owner, tenant, student
- **Service Provider** — Plumber, electrician, carpenter, etc.

---

## 🏗️ Project Structure

```
dwellioo/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with ConvexProvider
│   ├── page.tsx           # Dashboard / landing page
│   └── ...                # Feature pages (notices, events, complaints, etc.)
├── convex/                # Backend
│   ├── auth.config.ts     # Convex Auth configuration
│   ├── auth.ts            # Auth functions (OTP, session)
│   ├── http.ts            # HTTP API routes (Razorpay webhooks, etc.)
│   ├── functions/         # Queries & mutations (organized by feature)
│   │   ├── notices.ts
│   │   ├── events.ts
│   │   ├── complaints.ts
│   │   ├── serviceProviders.ts
│   │   └── ...
│   ├── schema.ts          # Convex database schema
│   └── _generated/        # Auto-generated types & client
├── public/                # Static assets
├── skills/                # Agent skills (HeroUI, Convex)
└── ...

```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- A Convex account (free tier available at [convex.dev](https://convex.dev))

### Installation

1. **Clone and install:**
   ```bash
   git clone https://github.com/codernotme/dwellioo.git
   cd dwellioo
   npm install
   ```

2. **Set up Convex:**
   ```bash
   npx convex dev
   ```
   This will:
   - Prompt you to log in to Convex
   - Create a `.env.local` with `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`
   - Start the local development server at `localhost:3210`

3. **Start the Next.js dev server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file in the root:

```env
# Convex (auto-generated by npx convex dev)
CONVEX_DEPLOYMENT=dev:your-deployment-id
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-deployment.convex.site

# WhatsApp (optional, for v2)
WHATSAPP_BUSINESS_ACCOUNT_ID=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_API_TOKEN=...

# Razorpay (optional, for v2 payments)
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

# Email (optional)
NODEMAILER_FROM=noreply@dwello.local
NODEMAILER_USER=...
NODEMAILER_PASS=...
```

---

## 📚 Convex Schema & Collections

The backend is organized around these core collections:

- **`properties`** — Buildings/hostels managed by Dwello
- **`residents`** — Tenants/owners/students in each property
- **`notices`** — Official announcements with read receipts
- **`events`** — Society events with RSVP tracking
- **`complaints`** — Ticketed maintenance requests
- **`serviceProviders`** — Verified vendors (plumber, electrician, etc.)
- **`bookings`** — Service provider appointments
- **`visitors`** — Gate entry logs with OTP passes
- **`payments`** — Monthly maintenance dues and receipts
- **`announcements`** — High-priority broadcasts
- **`threads`** — Community message board posts
- **`polls`** — Quick surveys and voting

See `convex/_generated/dataModel.d.ts` for the full schema.

---

## 🛠️ Development Workflow

### Running Queries & Mutations Locally

All functions in `convex/` run locally via Convex's sync engine at `localhost:3210`.

```typescript
// Example: Create a notice (convex/functions/notices.ts)
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createNotice = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const propertyId = (await ctx.auth.getUserIdentity())?.propertyId;
    return await ctx.db.insert("notices", {
      propertyId,
      ...args,
      createdAt: Date.now(),
    });
  },
});
```

### Building & Deploying

```bash
# Deploy to Convex production
npx convex deploy

# Build Next.js for production
npm run build

# Deploy to Vercel (recommended)
vercel deploy
```

---

## 📝 Key Workflows

### Property Onboarding
```
Admin signs up → Creates property → Add units → Configure settings 
→ Invite residents → Residents join & verify → Property live ✅
```

### Resident Onboarding
```
Resident gets WhatsApp invite → Verifies OTP → Sets profile 
→ Admin approves → Access granted ✅
```

### Posting a Notice
```
Admin → New Notice → Fill details → Set visibility & expiry 
→ Publish → Residents notified (push + WhatsApp) → See read count ✅
```

### Booking a Service Provider
```
Resident → Services tab → Browse vendors → View availability → Book slot 
→ Provider notified on WhatsApp → Provider confirms → Reminder 1hr before 
→ Service done → Resident rates ⭐ ✅
```

### Raising a Complaint
```
Resident → New Complaint → Select category & upload photo → Submit 
→ Admin assigns to staff → Status updates push to resident 
→ Resolved → Resident rates ✅
```

---

## 🎨 UI & Branding

- **Design System:** HeroUI v3 (React Aria components + Tailwind CSS v4)
- **Theme:** Light/dark mode with oklch color variables
- **Mobile-First:** Responsive design with bottom nav for mobile
- **Accessible:** WCAG 2.1 AA compliant

### Color Palette (Tailwind CSS v4 oklch)
- Primary: `oklch(0.5 0.16 275)` (Purple)
- Success: `oklch(0.6 0.15 142)` (Green)
- Warning: `oklch(0.7 0.2 61)` (Orange)
- Danger: `oklch(0.6 0.2 20)` (Red)

---

## 🧪 Testing

```bash
# Run ESLint
npm run lint

# Run tests (future)
npm run test
```

---

## 📱 PWA & Mobile

Dwello is a Progressive Web App (PWA):
- ✅ Installable on home screen
- ✅ Works offline (cached notices)
- ✅ Push notifications
- ✅ Bottom nav for mobile navigation

---

## 💸 Pricing Model

| Plan | Units | Price | Key Features |
|------|-------|-------|-------------|
| **Starter** | Up to 50 | ₹999/mo | 1 property, basic notifications |
| **Growth** | Up to 200 | ₹2,499/mo | 3 properties, WhatsApp included |
| **Pro** | Up to 500 | ₹5,999/mo | Unlimited properties, analytics, payments |
| **Enterprise** | 500+ | Custom | White-label, dedicated support |

---

## 🗓️ MVP v1 Timeline

- **Week 1–2:** Convex schema + auth setup
- **Week 3:** Admin onboarding wizard + property setup
- **Week 4:** Notice board + resident dashboard
- **Week 5:** Events + RSVP system
- **Week 6:** Complaints + tracking
- **Week 7:** Service provider directory + light booking
- **Week 8:** Testing, PWA setup, polish & deploy

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create a feature branch** — `git checkout -b feature/amazing-feature`
3. **Make changes** — Follow the existing code style (TypeScript, React hooks, Convex patterns)
4. **Test locally** — Run `npm run dev` and test in browser
5. **Commit** — `git commit -m "Add amazing feature"`
6. **Push** — `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Code Style
- Use TypeScript with strict mode
- Follow React & Next.js best practices
- Use Convex functions for all backend logic
- Write descriptive commit messages

---

## 📖 Documentation

- **[Convex Docs](https://docs.convex.dev)** — Backend framework
- **[Next.js Docs](https://nextjs.org/docs)** — Frontend framework
- **[HeroUI Docs](https://heroui.com)** — UI component library
- **[Tailwind CSS v4](https://tailwindcss.com)** — Styling

**Dwello-specific guides:**
- `convex/_generated/ai/guidelines.md` — Convex best practices for this project
- `AGENTS.md` — AI agent rules and skills installed

---

## 🐛 Known Limitations

- **v1 does not include:** Visitor gate management, payments module, advanced analytics
- **WhatsApp integration:** Phase 2 (currently testing WABA setup)
- **Multi-language:** Phase 2 (v1 is English-only for India launch)

---

## 🆘 Support & Feedback

- **Issues?** Open a GitHub issue with details
- **Feedback?** Reach out on the discussion board
- **Security concerns?** Email [security@dwello.local](mailto:security@dwello.local) (do not open public issues)

---

## 📄 License

This project is proprietary. All rights reserved © 2026 Dwello.

---

## 👥 Team

- **Product & Strategy** — Problem statement & feature design
- **Engineering** — Building the MVP
- **Community** — Testing with real housing societies

---

## 🎯 Our Vision

> Dwello isn't trying to replace WhatsApp. It's replacing the broken, informal, unaccountable stack that 5 crore Indian households are running on today.

**In 2 years, Dwello will be the default OS for residential communities — replacing 20 years of chaos with structure, trust, and accountability.**

---

**Dwello** — *Your community, connected.* 🏘️

---

## 🚀 Ready to Build?

```bash
git clone https://github.com/codernotme/dwellioo.git
cd dwellioo
npm install
npx convex dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start building the future of residential communities. 🎉
