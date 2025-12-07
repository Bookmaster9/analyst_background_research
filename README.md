# Analyst Dashboard

An interactive web application for exploring financial analyst insights, predictions, and earnings call commentary.

## Features

- Search for analysts with autocomplete
- View analyst profiles with LinkedIn information
- Browse analyst predictions and performance
- Explore earnings call commentary
- AI-powered insights chatbot

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Supabase:**

   Edit the `.env.local` file in the root directory and add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

   You can find these values in your Supabase project settings:
   - Go to https://app.supabase.com
   - Select your project
   - Go to Settings > API
   - Copy the Project URL and anon/public key

3. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the app.

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Add environment variables:**
   After deployment, add your environment variables in the Vercel dashboard:
   - Go to your project settings
   - Navigate to Environment Variables
   - Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Option 2: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables in the setup screen
6. Click "Deploy"

## Database Schema

The application connects to a Supabase database with the following tables:
- `analysts` - Analyst information
- `linkedin_info` - LinkedIn profile data
- `predictions` - Analyst predictions
- `earnings_questions` - Earnings call commentary
- `security_prices` - Historical stock prices
- `companies` - Company information

## Tech Stack

- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Deployment:** Vercel

## Project Structure

```
analyst-dashboard/
├── app/
│   ├── page.tsx              # Landing page with search
│   ├── analyst/[id]/         # Analyst dashboard pages
│   └── layout.tsx            # Root layout
├── lib/
│   └── supabase.ts           # Supabase client and types
├── .env.local                # Environment variables (not in git)
└── package.json
```

## Next Steps

- [ ] Build analyst dashboard page
- [ ] Add predictions display with TradingView charts
- [ ] Implement earnings call commentary viewer
- [ ] Integrate AI chatbot for insights
