<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/NVIDIA_NIM-76B900?style=for-the-badge&logo=nvidia&logoColor=white" />
</p>

# 🎓 AI Inclusive Assessment System

An AI-powered, full-stack assessment platform that enables teachers to create, manage, and analyze examinations with intelligent question generation, adaptive testing, AI proctoring, and semantic grading.

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **Dual AI Question Generation** | Generate MCQ, Descriptive, or Mixed questions using **Google Gemini** or **NVIDIA NIM** (switchable in the UI) |
| 📝 **Adaptive Exam Engine** | Questions adapt to student performance in real-time using SBERT-based difficulty matching |
| 🎥 **AI Proctoring** | Real-time webcam monitoring during exams with anomaly detection |
| 🔒 **Exam Lockdown** | Navbar and navigation are disabled during active exams to prevent cheating |
| 🎙️ **Voice-to-Text** | Students can dictate descriptive answers using browser speech recognition |
| 📊 **Analytics Dashboard** | Rich analytics for teachers (class performance, difficulty breakdown) and students (progress tracking) |
| 📄 **Document Upload** | Upload PDF/DOCX files — OCR extracts text for AI question generation |
| 🧠 **Semantic Grading** | SBERT-powered automated grading for descriptive answers |
| 👥 **Role-Based Access** | Admin, Teacher, and Student roles with dedicated dashboards |

## 🏗️ Architecture

```
ai-assessment-tool/
├── backend/                  # FastAPI + Python
│   ├── app/
│   │   ├── agents/           # AI generators, adaptive engine, grading
│   │   ├── api/              # REST API routes (auth, exams, analytics)
│   │   ├── core/             # Config, security, dependencies
│   │   └── db/               # MongoDB models (Beanie ODM)
│   ├── seed_db.py            # Database seeder with demo data
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 # React 19 + TypeScript + Vite
│   ├── src/
│   │   ├── components/       # Reusable UI components (shadcn/ui)
│   │   ├── pages/            # Route pages (Dashboard, Exam, Login)
│   │   ├── lib/              # API client, utilities
│   │   └── hooks/            # Custom React hooks
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml        # One-command deployment
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** & npm
- **MongoDB** (running locally or via Docker)
- API Keys: [Google Gemini](https://aistudio.google.com/apikey) and/or [NVIDIA NIM](https://build.nvidia.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/kmu2994/ai-assessment-tool.git
cd ai-assessment-tool
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate
# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys (GEMINI_API_KEY, NVIDIA_API_KEY, etc.)

# Seed database with demo users (optional)
python seed_db.py

# Start backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Open the App

| Service | URL |
|---------|-----|
| 🌐 Frontend | [http://localhost:3000](http://localhost:3000) |
| ⚡ Backend API | [http://localhost:8000](http://localhost:8000) |
| 📖 API Docs (Swagger) | [http://localhost:8000/docs](http://localhost:8000/docs) |

### 🐳 Docker (Alternative)

```bash
# Set environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Start all services
docker-compose up --build
```

## 🔑 Demo Accounts

After running `python seed_db.py`, these accounts are available:

| Role | Username | Password |
|------|----------|----------|
| 👑 Admin | `admin` | `admin123` |
| 🧑‍🏫 Teacher | `vishwa` | `vishwa123` |
| 🎓 Student | `student1` | `student123` |

## ⚙️ Environment Variables

Create `backend/.env` from `.env.example`:

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | ✅ | JWT signing key — generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `MONGODB_URL` | ✅ | MongoDB connection string |
| `GEMINI_API_KEY` | ⚡ | Google Gemini API key ([Get one](https://aistudio.google.com/apikey)) |
| `GEMINI_MODELS` | — | Comma-separated model fallback chain (default: `gemini-2.5-flash-lite,gemini-2.0-flash-lite`) |
| `NVIDIA_API_KEY` | ⚡ | NVIDIA NIM API key ([Get one](https://build.nvidia.com/)) |
| `NVIDIA_LLM_MODEL` | — | NVIDIA model (default: `meta/llama-3.1-70b-instruct`) |

> ⚡ At least one AI provider key is required for question generation.

## 🧰 Tech Stack

### Backend
- **FastAPI** — High-performance async Python API framework
- **MongoDB** + **Beanie ODM** — Document database with async ODM
- **Sentence-Transformers (SBERT)** — Semantic similarity for grading
- **Google GenAI SDK** — Gemini model integration
- **OpenAI SDK** — NVIDIA NIM integration (OpenAI-compatible API)
- **PyTesseract** — OCR for handwritten answer processing

### Frontend
- **React 19** + **TypeScript** — Type-safe UI framework
- **Vite** — Lightning-fast build tool
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Premium component library (Radix UI)
- **Recharts** — Data visualization for analytics
- **React Router v6** — Client-side routing
- **Sonner** — Toast notifications

## 📸 Screenshots

### Teacher Dashboard — AI Question Generation
Teachers can select between **Google Gemini** and **NVIDIA NIM** to generate MCQ, Descriptive, or Mixed question sets from uploaded documents.

### Student Exam — Proctored Mode
During active exams, the navbar is locked, webcam proctoring is active, and students can use voice-to-text for descriptive answers.

### Analytics Dashboard
Rich visual analytics with performance charts, difficulty distribution, and class-wide metrics.

## 📄 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login and get JWT token |
| `GET` | `/api/exams/available` | List available exams |
| `POST` | `/api/exams/create` | Create new exam (Teacher) |
| `GET` | `/api/exams/ai-providers` | List available AI providers |
| `POST` | `/api/exams/generate-questions` | AI-powered question generation |
| `POST` | `/api/exams/extract-text` | Extract text from PDF/DOCX |
| `POST` | `/api/exams/{id}/submit` | Submit exam answers |
| `GET` | `/api/analytics/dashboard/teacher` | Teacher analytics |
| `GET` | `/api/analytics/student/me` | Student analytics |

> Full interactive docs available at `/docs` when the backend is running.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is developed as part of an academic Major Project. Feel free to use it for educational purposes.

---

<p align="center">
  Built with ❤️ using FastAPI, React, and AI
</p>
