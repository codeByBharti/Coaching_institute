# Coaching Institute - Deployment Guide

## Project Structure

Your project is already organized for deployment:

```
CoachingS/
├── frontend/          # React + Vite (deploy to Vercel)
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.mts
├── backend/           # Node + Express (deploy to Render/Railway/etc.)
│   ├── src/
│   ├── uploads/
│   ├── package.json
│   └── .env
├── mobile/            # React Native (optional)
└── DEPLOYMENT.md
```

- **frontend/** – All React, Vite, CSS, and client-side code
- **backend/** – All Node.js, Express, MongoDB, API, and server code

---

## 1. Push to GitHub

### Step 1: Create a GitHub repository
1. Go to [github.com](https://github.com) and sign in
2. Click **New repository**
3. Name it (e.g. `coaching-institute`)
4. Leave **Add .gitignore** and **README** unchecked if you already have code
5. Click **Create repository**

### Step 2: Add `.gitignore` (if not present)
Create `.gitignore` in your project root:

```
node_modules/
.env
.env.local
dist/
backend/uploads/*
!backend/uploads/.gitkeep
.DS_Store
*.log
```

### Step 3: Initialize Git and push
In your terminal (from `CoachingS` folder):

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and repo name.

---

## 2. Deploy Frontend on Vercel

Vercel is suitable for your React frontend. The backend must be deployed elsewhere (see Section 3).

### Step 1: Sign up / Log in
1. Go to [vercel.com](https://vercel.com)
2. Sign up or log in (you can use your GitHub account)

### Step 2: Import project
1. Click **Add New** → **Project**
2. Import your GitHub repository
3. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist` (Vite default)

### Step 3: Environment variables (if needed)
If the frontend uses env vars, add them in **Settings → Environment Variables**:
- `VITE_API_URL` = your deployed backend URL (e.g. `https://your-backend.onrender.com`)

### Step 4: Update API URL
Your frontend uses `/api` via proxy in dev. In production you need to call your real backend URL. Update `frontend/vite.config.mts` to use the API URL in build:

```js
// In your axios setup or API base URL:
const API_URL = import.meta.env.VITE_API_URL || '';
axios.defaults.baseURL = API_URL;
```

Or set the backend URL in Vercel env as `VITE_API_URL=https://your-backend.onrender.com`.

### Step 5: Deploy
Click **Deploy**. Vercel will build and host your frontend.

---

## 3. Deploy Backend (Required)

Vercel hosts the frontend only. Deploy the backend to a platform that supports Node.js:

### Option A: Render (Free tier)
1. Go to [render.com](https://render.com) and sign up
2. **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm run dev` or `node src/server.js`
   - **Environment Variables:**
     - `MONGODB_URI` = your MongoDB Atlas connection string
     - `JWT_SECRET` = a secure random string
     - `PORT` = 5000 (Render sets this automatically)

5. Deploy

### Option B: Railway
1. Go to [railway.app](https://railway.app) and sign up
2. **New Project** → **Deploy from GitHub**
3. Select repo, set root to `backend`
4. Add env vars: `MONGODB_URI`, `JWT_SECRET`
5. Deploy

### After backend is live
- Copy the backend URL (e.g. `https://your-app.onrender.com`)
- Add it to Vercel as `VITE_API_URL` and rebuild
- Ensure your backend allows CORS for your Vercel domain

---

## 4. CORS for Backend

In `backend/src/server.js`, update CORS:

```js
app.use(cors({
  origin: ['https://your-vercel-app.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
```

Replace with your actual Vercel URL.

---

## Quick Reference

| Part    | Where to deploy | Platform |
|---------|------------------|----------|
| Frontend | `frontend/`     | Vercel   |
| Backend  | `backend/`      | Render / Railway / Heroku |
| Database | -               | MongoDB Atlas (already used) |
