# 🚀 Deployment Guide — AI Assessment Tool

This guide covers multiple deployment options from **free** to **production-grade**.

---

## Option 1: Render (FREE — Recommended for Students)

**Best for**: Free hosting with zero cost. No credit card required.

### Step 1: Deploy MongoDB (Free)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas) → Create a free M0 cluster
2. Create a database user and whitelist `0.0.0.0/0` for access
3. Copy the connection string: `mongodb+srv://user:pass@cluster.mongodb.net/ai_assessment`

### Step 2: Deploy Backend on Render
1. Go to [render.com](https://render.com) → New → **Web Service**
2. Connect your GitHub repo: `kmu2994/ai-assessment-tool`
3. Configure:
   - **Name**: `ai-assessment-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables:
   ```
   MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/ai_assessment
   SECRET_KEY=<generate-a-random-key>
   GEMINI_API_KEY=<your-key>
   NVIDIA_API_KEY=<your-key>
   GEMINI_MODELS=gemini-2.5-flash-lite,gemini-2.0-flash-lite
   NVIDIA_LLM_MODEL=meta/llama-3.1-70b-instruct
   ```
5. Deploy!

### Step 3: Deploy Frontend on Render
1. New → **Static Site**
2. Connect same repo
3. Configure:
   - **Name**: `ai-assessment-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add Environment Variable:
   ```
   VITE_API_URL=https://ai-assessment-backend.onrender.com
   ```
5. Add a **Rewrite Rule**: `/* → /index.html` (for SPA routing)

---

## Option 2: Vercel (Frontend) + Render (Backend)

**Best for**: Fastest frontend with global CDN.

### Frontend on Vercel (Free)
1. Go to [vercel.com](https://vercel.com) → Import Git Repository
2. Select `kmu2994/ai-assessment-tool`
3. Configure:
   - **Framework**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   ```
   VITE_API_URL=https://ai-assessment-backend.onrender.com
   ```
5. Update `frontend/vite.config.ts` for production — remove the proxy (it's dev-only):
   ```ts
   // In production, API calls go directly to VITE_API_URL
   ```

### Backend on Render
Follow Step 2 from Option 1 above.

---

## Option 3: Railway (FREE Tier)

**Best for**: All-in-one platform with databases included.

1. Go to [railway.app](https://railway.app) → New Project
2. **Add MongoDB**: New → Database → MongoDB
3. **Add Backend**:
   - New → GitHub Repo → Select your repo
   - Set Root Directory: `backend`
   - Set Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Add env vars (Railway auto-provides `MONGODB_URL` from the linked DB)
4. **Add Frontend**:
   - New → GitHub Repo → Same repo
   - Set Root Directory: `frontend`
   - Build: `npm install && npm run build`
   - Start: `npx serve -s dist -l $PORT`

---

## Option 4: Google Cloud Run (Production)

**Best for**: Auto-scaling, pay-per-use, Google infrastructure.

### Prerequisites
- [Google Cloud account](https://cloud.google.com) with billing enabled
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed

### Step 1: Set Up MongoDB Atlas
Same as Option 1, Step 1.

### Step 2: Deploy Backend to Cloud Run
```bash
cd backend

# Build and push container
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ai-assessment-backend

# Deploy
gcloud run deploy ai-assessment-backend \
  --image gcr.io/YOUR_PROJECT_ID/ai-assessment-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "MONGODB_URL=mongodb+srv://...,SECRET_KEY=...,GEMINI_API_KEY=...,NVIDIA_API_KEY=...,GEMINI_MODELS=gemini-2.5-flash-lite"
```

### Step 3: Deploy Frontend to Cloud Run
```bash
cd frontend
npm run build

# Create a simple Dockerfile for serving static files
cat > Dockerfile.prod <<EOF
FROM node:18-alpine
RUN npm install -g serve
COPY dist /app
WORKDIR /app
EXPOSE 3000
CMD ["serve", "-s", ".", "-l", "3000"]
EOF

gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ai-assessment-frontend -f Dockerfile.prod
gcloud run deploy ai-assessment-frontend \
  --image gcr.io/YOUR_PROJECT_ID/ai-assessment-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Step 4: Update Frontend API URL
Before building, update `frontend/src/lib/api.ts` to point to your Cloud Run backend URL.

---

## Option 5: Docker Compose on a VPS

**Best for**: Full control on any VPS (DigitalOcean, Linode, AWS EC2).

```bash
# SSH into your server
ssh user@your-server

# Clone the repo
git clone https://github.com/kmu2994/ai-assessment-tool.git
cd ai-assessment-tool

# Set up environment
cp backend/.env.example backend/.env
nano backend/.env  # Add your API keys

# Start everything
docker-compose up -d --build

# Seed database (first time only)
docker exec ai-assessment-backend python seed_db.py
```

Your app will be available at `http://your-server-ip:3000`

---

## 🔧 Frontend API URL Configuration

For production deployments, you need to update how the frontend connects to the backend.

### Option A: Environment Variable (Recommended)
Update `frontend/src/lib/api.ts`:
```ts
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
```

Then set `VITE_API_URL` at build time:
```bash
VITE_API_URL=https://your-backend-url.com/api npm run build
```

### Option B: Vite Proxy (Dev Only)
The current `vite.config.ts` proxy only works in development mode. In production builds, API calls go to the same origin by default.

---

## 📋 Deployment Checklist

- [ ] Generate a strong `SECRET_KEY` for JWT
- [ ] Set up MongoDB Atlas (free M0 cluster)
- [ ] Add all environment variables
- [ ] Test AI generation with both providers
- [ ] Seed database with `python seed_db.py`
- [ ] Verify frontend can reach backend API
- [ ] Test login, exam creation, and exam taking
- [ ] Set up HTTPS (most platforms handle this automatically)

---

## 💰 Cost Comparison

| Platform | Frontend | Backend | Database | Monthly Cost |
|----------|----------|---------|----------|-------------|
| **Render** | Free (Static) | Free (750h/mo) | MongoDB Atlas Free | **$0** |
| **Vercel + Render** | Free | Free | MongoDB Atlas Free | **$0** |
| **Railway** | Free tier | Free tier | Included | **$0–5** |
| **Google Cloud Run** | Pay-per-use | Pay-per-use | Atlas Free | **$0–10** |
| **VPS + Docker** | Self-hosted | Self-hosted | Self-hosted | **$5–10** |
