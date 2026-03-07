# 📘 Flutter Interview Library

Your personal Next.js + Supabase knowledge base for Flutter interview Q&A.

---

## ✨ Features
- ➕ Add / ✏️ Edit / 🗑️ Delete questions and answers
- 🔍 Search across questions, answers, and tags
- 🏷️ Category + Difficulty filtering
- ⭐ Favourite / bookmark questions
- 📊 Stats bar (total, favs, easy/medium/hard breakdown)
- 📝 Markdown support in answers (bold, code blocks, lists)

---

## 🚀 Setup in 5 Steps

### Step 1 — Create Supabase project
1. Go to **https://supabase.com** → Sign up (free)
2. Click **"New Project"** → give it a name → pick a region close to India (Singapore)
3. Wait ~2 min for it to provision

### Step 2 — Run the SQL schema
1. In your Supabase dashboard → click **"SQL Editor"** in the sidebar
2. Open the file `supabase_schema.sql` from this project
3. Copy & paste the entire contents → click **"Run"**
4. This creates the `questions` table + 5 sample questions to start with

### Step 3 — Get your API keys
1. In Supabase → **Settings** → **API** (left sidebar)
2. Copy **"Project URL"** (looks like `https://xyz.supabase.co`)
3. Copy **"anon public"** key (a long JWT string)

### Step 4 — Configure environment variables
```bash
# In the project root, create a file called .env.local
cp .env.local.example .env.local

# Then edit .env.local and paste your values:
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 5 — Run the app
```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## 🌐 Deploy for Free on Vercel
1. Push this project to GitHub
2. Go to **https://vercel.com** → Import your GitHub repo
3. In the deployment settings → add your **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy** — your app is live at `yourapp.vercel.app` 🎉

---

## 📁 Project Structure
```
flutter-library/
├── components/
│   ├── QuestionCard.js      # Collapsible Q&A card with edit/delete/fav
│   ├── QuestionForm.js      # Add/Edit modal form
│   └── StatsBar.js          # Dashboard stats row
├── lib/
│   └── supabaseClient.js    # Supabase connection
├── pages/
│   ├── _app.js              # App wrapper + Toast notifications
│   └── index.js             # Main page (all logic lives here)
├── styles/
│   └── globals.css          # Dark theme + custom styles
├── supabase_schema.sql      # Run this in Supabase SQL Editor
├── .env.local.example       # Copy → .env.local and fill in your keys
├── package.json
├── tailwind.config.js
└── next.config.js
```

---

## 💡 Tips
- **Markdown in answers**: Use `code`, **bold**, lists, and ` ```code blocks``` ` in your answers
- **Tags**: Add comma-separated tags like `state, widgets, lifecycle` for easy searching
- The app is **personal-use** by default — no login needed (all operations are allowed)
- Supabase free tier gives you **500MB DB** — that's enough for **tens of thousands** of Q&As

---

## 🔮 Future Ideas
- Export to PDF for offline study
- Spaced repetition / quiz mode
- Import questions from JSON
- Add code screenshot support



/// Supabase DB Password : YashDebnath