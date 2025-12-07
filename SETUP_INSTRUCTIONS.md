# Quick Setup Instructions

## Step 1: Add Supabase Credentials

Edit the `.env.local` file and replace the placeholder values with your actual Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

To find these values:
1. Go to https://app.supabase.com
2. Select your project
3. Click on Settings (gear icon) in the sidebar
4. Go to API section
5. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Project API keys → anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 2: Test Locally

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser. You should see the landing page with:
- A search box in the center
- Example analysts on the right sidebar

Try typing in the search box - it should autocomplete analyst names from your database.

## Step 3: Deploy to Vercel

### Quick Deploy (Recommended)

1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Run deploy from the project directory:
   ```bash
   vercel
   ```

3. Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - Project name? Press enter for default
   - Directory? Press enter (./analyst-dashboard)
   - Override settings? **N**

4. After deployment, add environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

   Or add them via the dashboard:
   - Visit the URL shown after deployment
   - Go to Settings → Environment Variables
   - Add both variables

5. Redeploy to apply environment variables:
   ```bash
   vercel --prod
   ```

### Alternative: Deploy via GitHub

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/analyst-dashboard.git
   git push -u origin main
   ```

2. Go to https://vercel.com/new

3. Import your GitHub repository

4. Add environment variables during setup:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

5. Click Deploy

## Troubleshooting

**Issue: Search not working / No example analysts showing**
- Check that your Supabase credentials are correct in `.env.local`
- Verify your database has data in the `analysts` table
- Check browser console for errors

**Issue: Deployment failing**
- Ensure environment variables are set in Vercel
- Check Vercel build logs for specific errors
- Make sure `.env.local` is NOT committed to git (it's in .gitignore)

**Issue: Page loads but no data**
- Verify Supabase RLS (Row Level Security) policies allow public read access
- Check Supabase logs for query errors
- Ensure table names match exactly (case-sensitive)

## Next Steps

After deployment, you can:
- Continue building the analyst dashboard page
- Add predictions and TradingView charts
- Implement the earnings call commentary viewer
- Add the AI chatbot integration
