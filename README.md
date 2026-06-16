# SkillPilot AI

SkillPilot AI is a full-stack SaaS prototype for AI trainers, gig workers, and learners. Trainers can build a personal brand, publish AI micro-courses, manage learners, generate marketing, schedule live sessions, track payments, and use AI-assisted automation and payment monitoring. Learners can browse courses, enroll through a local mock checkout, track progress, join sessions, and ask an AI chatbot for course support.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- SQLite
- bcrypt password hashing
- JWT session cookie authentication
- Recharts dashboard charts
- Groq API when `GROQ_API_KEY` exists
- Local mock AI fallback when no Groq key exists

## Setup Steps

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Create `.env` from `.env.example`.

Required:

```env
DATABASE_URL="file:./dev.db"
SESSION_SECRET="replace-this-with-a-long-random-secret"
```

Optional:

```env
GROQ_API_KEY="your_groq_api_key_here"
```

If `GROQ_API_KEY` is empty or missing, SkillPilot AI uses local mock AI responses. Never prefix this variable with `NEXT_PUBLIC_`.

## Database Setup

Generate Prisma Client:

```bash
npx prisma generate
```

Create the SQLite database and migration:

```bash
npx prisma migrate dev --name init
```

## Seed Command

```bash
npm run seed
```

The seed creates demo users, trainer profiles, courses, enrollments, payments, marketing content, automation tasks, notifications, sessions, and chatbot history.

## How To Run

```bash
npm run dev
```

Then visit:

```text
http://localhost:3000
```

## Demo Accounts

Admin:

```text
admin@skillpilot.ai / password123
```

Trainer:

```text
trainer@skillpilot.ai / password123
```

Learner:

```text
learner@skillpilot.ai / password123
```

## Features Implemented

- Public landing page and course marketplace
- Course details and checkout flow
- Register, login, logout, JWT session cookies, role redirects
- Learner dashboard, course progress, notifications, sessions, chatbot
- Trainer dashboard, course CRUD, learner view, marketing, automation, scheduling
- Trainer profile and AI Branding Studio
- AI Marketing Generator and Social Automation queue
- AI Automation Workflow board
- Mock payment checkout and payment success receipt
- Trainer AI Payment Agent dashboard
- Admin dashboard with users, courses, payments, enrollments, totals, details, and delete actions

## AI Marketing And Branding

The AI Branding Studio generates trainer brand names, taglines, bios, portfolio summaries, and logo prompts. The AI Marketing Generator creates platform-specific marketing copy, hashtags, and calls to action for Instagram, LinkedIn, Facebook, and Email.

When `GROQ_API_KEY` exists, these features call Groq from server-side API routes. Without a key, local mock generators produce realistic prototype content.

## AI Automation Workflow

The trainer automation board uses the `AutomationTask` table to manage:

- `COURSE_PUBLISHING`
- `SOCIAL_POST`
- `EMAIL_REMINDER`
- `CHATBOT_REPLY`
- `SESSION_REMINDER`

Tasks can be created, edited, deleted, and moved through `PENDING`, `RUNNING`, `COMPLETED`, and `FAILED`. Existing features also create tasks automatically when courses are published, social posts are scheduled, sessions are created, and chatbot replies are generated.

## AI Payment Agent

The AI Payment Agent dashboard helps trainers monitor:

- Total paid revenue
- Paid, pending, failed, and refunded payments
- Recent transactions
- Course revenue breakdown
- Pricing recommendations
- Discount recommendations
- Suspicious transaction signals

The Payment Agent does not move real money. It only assists with recommendation, verification, monitoring, and revenue tracking.

## Payment Simulation

Checkout is local and simulated. Learners select:

- Mock Card
- Online Banking
- E-Wallet

The app never asks for card numbers and never stores credit card details. On successful mock payment, SkillPilot AI creates:

- `Payment`
- `Enrollment`
- learner notification
- receipt number

Duplicate enrollments are prevented.

## Security Notes

- Passwords are hashed with bcrypt.
- Plain-text passwords are never stored.
- Authentication uses an HTTP-only session cookie with a signed JWT.
- Learner, trainer, and admin routes are role-protected.
- Checkout recalculates the final amount on the server.
- Payment records store only learner ID, course ID, amount, status, receipt number, and payment method.
- Admin delete actions require confirmation.

## Limitations

- Payments are simulated and do not connect to real payment gateways.
- Social posting is simulated by changing status to `POSTED`.
- AI fallback responses are local mock responses when no Groq key exists.
- Groq suggestions are demo guidance only. The app never lets AI execute payments, social posts, or email sends directly.
- SQLite is intended for local prototype use.
- The prototype is designed for HCI evaluation, not production deployment.

## Groq Developer Note

Create a Groq account at `https://console.groq.com`, create an API key, and place it in `.env.local`:

```env
GROQ_API_KEY="your_real_key_here"
```

For Vercel, add the same variable in Project Settings -> Environment Variables. Do not expose it as `NEXT_PUBLIC_GROQ_API_KEY`.

To test one AI route locally, sign in as the trainer demo account, open `/trainer/ai-marketing`, choose a course, and click `Generate marketing content`. If the key is missing, the app stays demo-safe and uses local mock content with friendly UI messages.
