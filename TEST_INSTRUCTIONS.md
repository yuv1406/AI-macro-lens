# README: How to Test Your Deployed Function

## Quick Start

1. **Fill in your `.env` file:**
   - Open `c:/Users/yuvia/OneDrive/Desktop/ai-macrolens/.env`
   - Get your keys from: https://supabase.com/dashboard/project/djtqlcljpmmuvvbptvhc/settings/api
   - Replace the placeholder values:
     - `SUPABASE_ANON_KEY` → paste your **anon public** key
     - `SUPABASE_SERVICE_ROLE_KEY` → paste your **service_role** key

2. **Run the test:**
   ```powershell
   cd c:/Users/yuvia/OneDrive/Desktop/ai-macrolens
   .\test-simple.ps1
   ```

3. **Expected output:**
   ```
   📊 Macro Analysis Results
   =========================================
     🔥 Calories:    450 kcal
     🥩 Protein:     18.5 g
     🍚 Carbs:       65.2 g
     🧈 Fat:         12.3 g
     📈 Confidence:  high
     🤖 AI Model:    gemini
     📦 Source:      ai
   =========================================
   ```

## What the Script Does

1. ✅ Loads Supabase credentials from `.env` file
2. ✅ Validates all required variables are set
3. ✅ Calls your deployed Edge Function
4. ✅ Analyzes the food platter image with Gemini AI
5. ✅ Shows formatted macro results
6. ✅ Saves to your database automatically

## Important Variables in `.env`

Required for testing:
- `SUPABASE_URL` ✅ (already set)
- `SUPABASE_ANON_KEY` ⚠️ (you need to fill this)
- `SUPABASE_SERVICE_ROLE_KEY` ⚠️ (you need to fill this)

Already configured for production:
- `GEMINI_API_KEY` ✅ (set via `npx supabase secrets set`)

## Security Notes

⚠️ **Never commit `.env` to git** - it's already in `.gitignore`
⚠️ **Service role key bypasses all security** - only for testing
✅ **For production apps**, users should authenticate and get their own JWT tokens

## Troubleshooting

**"Missing required environment variables"**
- Make sure you filled in `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`

**"Request failed"**
- Check function logs: `npx supabase functions logs analyze-meal`
- Verify Gemini API key is set: `npx supabase secrets list`

**"Unable to estimate"**
- The AI couldn't identify food in the image
- Try a different image URL
