# HireIntel AI

HireIntel AI is a next-generation enterprise talent platform. It uses advanced machine learning (Sentence Transformers + ChromaDB) combined with a highly scalable React frontend to rank candidates semantically, detect "hidden gems", and provide a comprehensive candidate pipeline dashboard.

## Architecture Overview

The project is split into a decoupled Frontend and Backend architecture:

- **Frontend (`/frontend`)**: A modern Single Page Application built with React 19, Vite, Tailwind CSS v4, and TypeScript.
- **Backend (`/backend`)**: A FastAPI backend powering semantic search and AI candidate ranking utilizing ChromaDB, Langchain, and Hugging Face sentence-transformers.

---

## 🖥️ Frontend Stack
- **Framework**: React 19 + Vite + TypeScript
- **Styling**: Tailwind CSS v4 + custom `@theme` tokens (inspired by shadcn/ui)
- **State Management**: Zustand (Client State), TanStack Query (Server State)
- **Routing**: React Router v7
- **UI & Data**: Recharts, TanStack Table, Framer Motion, Hook Form + Zod

## ⚙️ Backend Stack
- **Framework**: FastAPI (Python 3.11+)
- **Database**: SQLite (via SQLAlchemy & Alembic)
- **Vector Database**: ChromaDB (for semantic candidate matching)
- **AI & NLP**: Langchain, OpenAI (for extraction), Sentence-Transformers (`all-MiniLM-L6-v2`)

---

## 🚀 Getting Started

### 1. Backend Setup

You need **Python 3.11** or **Python 3.12** installed (these versions have pre-built wheels for ML dependencies like `torch` and `chromadb`).

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure Environment Variables:
   - Copy `.env.example` to `.env`
   - Add your `OPENAI_API_KEY` (if you want to use the AI extraction features for job descriptions).
5. Run the server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   The backend API docs will be available at `http://localhost:8000/docs`.

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies (Requires Node 18+):
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

---

## 🧠 Core Features

1. **AI Semantic Ranking:** Evaluates candidates not just by keyword matching, but by semantic overlap between the job description and the candidate's profile/skills.
2. **Hidden Gem Detection:** Identifies candidates who might be filtered out by traditional ATS systems but show high potential (e.g. strong GitHub activity, high responsiveness, and strong core skills despite fewer years of experience).
3. **Automated Job Parsing:** Paste a raw job description and the AI automatically extracts the title, department, core skills (with required proficiency), and soft skills.
4. **Rich Data Visualization:** Track pipeline health with interactive funnel charts and radar charts.
