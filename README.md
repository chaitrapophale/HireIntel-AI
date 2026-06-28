# HireIntel AI

![HireIntel AI](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue.svg) ![React](https://img.shields.io/badge/React-19-blue?logo=react) ![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi) ![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)

HireIntel AI is a next-generation enterprise talent platform. It uses advanced machine learning (Sentence Transformers + ChromaDB vector search) combined with a highly scalable React frontend to rank candidates semantically, detect "hidden gems", and provide a comprehensive candidate pipeline dashboard.

---

## Overview

Traditional Applicant Tracking Systems (ATS) rely on exact keyword matching, causing great candidates to be filtered out simply because they used different terminology. **HireIntel AI** solves this by using AI embeddings to perform **semantic searches**. It understands the *meaning* behind a candidate's resume and a job description.

**Target Users:**
- Technical Recruiters
- Hiring Managers
- HR Teams

**Main Capabilities:**
- Semantically match candidates to job descriptions.
- Automatically extract structured data from raw job descriptions using Large Language Models.
- Detect "Hidden Gems" (candidates with high potential but non-traditional backgrounds).
- Track recruitment pipelines with rich, interactive analytics.

---

## Features

### AI Candidate Matching & Semantic Search
- **Vector Search Engine:** Uses ChromaDB and Hugging Face Sentence Transformers (`all-MiniLM-L6-v2`) to embed and match candidates.
- **Hidden Gem Detection:** Identifies candidates who lack standard requirements (e.g., degree or years of experience) but possess exceptional core skills, GitHub activity, or side projects.

### Automation & Parsing
- **Job Description Parsing:** Paste a raw job description, and the LLM (OpenAI or NVIDIA via Langchain) automatically extracts the required title, department, core skills, soft skills, and locations.
- **Dataset Upload:** Bulk upload candidate data (`.json`, `.csv`, `.xlsx`) to build your talent pool.

### Candidate & Job Management
- **Dashboard:** High-level overview of the pipeline, recent jobs, and top candidates.
- **Interactive Tables:** Manage, filter, and sort candidates using TanStack Table.
- **Candidate Profiles:** Detailed views showing an AI-generated fit breakdown, experience, risk areas, and why the candidate stands out.

### Analytics & Reporting
- **Funnel Analytics:** Visualize the recruitment pipeline from "Sourced" to "Hired".
- **Radar Charts:** Compare a candidate's technical skills vs soft skills vs experience.

---

## Technology Stack

### Frontend
- **Framework:** React 19 + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 + custom `@theme` tokens (shadcn-inspired)
- **State Management:** Zustand (Client State), TanStack Query (Server State)
- **Routing:** React Router v7
- **UI & Data Visualization:** Recharts, TanStack Table, Framer Motion, React Hook Form + Zod

### Backend
- **Framework:** FastAPI
- **Language:** Python 3.11+ (3.12 recommended)
- **Database:** SQLite (via SQLAlchemy)
- **Migrations:** Alembic
- **Security:** JWT Authentication, Firebase Admin, SlowAPI (Rate Limiting)

### AI Stack
- **Vector Database:** ChromaDB
- **Embeddings:** Sentence Transformers (`all-MiniLM-L6-v2`)
- **LLM Orchestration:** Langchain
- **Providers:** OpenAI API, NVIDIA API (Llama 3.3 Nemotron, NV-EmbedQA)

---

## Project Structure

```text
hireintel-ai/
├── backend/                  # FastAPI Backend
│   ├── alembic/              # Database migration scripts
│   ├── app/                  
│   │   ├── api/              # API routers and endpoints
│   │   ├── core/             # Configuration, Database setup, Security
│   │   ├── models/           # SQLAlchemy DB Models
│   │   ├── schemas/          # Pydantic schemas for request/response validation
│   │   └── services/         # Business logic, AI pipeline, Vector DB integration
│   ├── chroma_db/            # Local ChromaDB persistent storage
│   ├── requirements.txt      # Python dependencies
│   └── alembic.ini           # Alembic configuration
├── frontend/                 # React Frontend
│   ├── src/                  
│   │   ├── components/       # Reusable UI components
│   │   ├── features/         # Feature-specific components (auth, candidates, jobs)
│   │   ├── hooks/            # Custom React Hooks
│   │   ├── lib/              # API client (Axios) and utility functions
│   │   ├── store/            # Zustand state stores
│   │   └── types/            # TypeScript interfaces
│   ├── package.json          # Node dependencies
│   └── vite.config.ts        # Vite bundler configuration
└── README.md
```

---

## Architecture

1. **Frontend Architecture:**
   The frontend is built as a Single Page Application (SPA). Data fetching is handled by **TanStack Query** for caching and background updates, while local UI state is managed by **Zustand**. Routing is handled via **React Router v7**.

2. **Backend Architecture:**
   The backend follows a layered architecture. **Routers** handle HTTP requests, **Schemas** validate the payloads using Pydantic, **Services** contain the core business logic (including AI processing), and **Models** interact with the SQLite database via SQLAlchemy.

3. **AI Processing Pipeline:**
   When a candidate is uploaded, their resume and profile data are concatenated into a summary string. This string is passed through `SentenceTransformer` to generate high-dimensional vector embeddings. These embeddings are stored in a local **ChromaDB** instance alongside the candidate's metadata. 
   When a new job is created, the job description is parsed by an LLM (via **Langchain**) to extract core requirements. To find candidates, the job requirements are embedded, and ChromaDB performs a cosine similarity search to return the most semantically relevant candidates.

---

## Installation

### Prerequisites
- **Node.js 18+** (for the frontend)
- **Python 3.11 or 3.12** (Python 3.12 is highly recommended for pre-compiled ML wheels)
- **Git**

### Clone Repository
```bash
git clone https://github.com/chaitrapophale/HireIntel-AI.git
cd HireIntel-AI
```

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   
   # On Windows
   .\venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   *(Note: This installs large ML libraries like `torch` and `transformers`. It may take several minutes.)*

4. **Configure Environment Variables:**
   Copy the example environment file and fill in your keys.
   ```bash
   cp .env.example .env
   ```
   *(See the Environment Variables section below for details).*

5. **Run Database Migrations:**
   ```bash
   alembic upgrade head
   ```

6. **Start the Backend Server:**
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   The backend API docs will be available at `http://localhost:8000/docs`.

### Frontend Setup

1. **Navigate to the frontend directory:**
   Open a new terminal window/tab and run:
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file and configure Firebase.
   ```bash
   cp .env.example .env
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description | Example Value |
|----------|----------|-------------|---------------|
| `DATABASE_URL` | No | SQLite database connection string | `sqlite:///./hireintel.db` |
| `CHROMA_PERSIST_DIRECTORY` | No | Directory to store vector embeddings | `./chroma_db` |
| `JWT_SECRET` | **Yes** | Secret key for JWT signing | `generate_a_random_secure_string` |
| `GEMINI_API_KEY` | No | API Key for Gemini LLM | `AIzaSy...` |
| `NVIDIA_API_KEY` | No | API Key for NVIDIA Nim models | `nvapi-...` |
| `DEFAULT_AI_PROVIDER` | No | LLM provider to use (`gemini` or `nvidia`) | `gemini` |
| `FIREBASE_CREDENTIALS` | No | Path to Firebase Admin SDK JSON file | `./firebase-adminsdk.json` |

### Frontend (`frontend/.env`)

| Variable | Required | Description | Example Value |
|----------|----------|-------------|---------------|
| `VITE_API_URL` | **Yes** | The base URL for the FastAPI backend | `http://localhost:8000` |
| `VITE_FIREBASE_API_KEY` | **Yes** | Firebase Web API Key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | **Yes** | Firebase Auth Domain | `app.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | **Yes** | Firebase Project ID | `app-id` |
| `VITE_FIREBASE_STORAGE_BUCKET`| **Yes** | Firebase Storage Bucket | `app.firebasestorage.app` |

---

## API Documentation

When the backend is running, FastAPI automatically generates interactive API documentation.
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Important Endpoints
- `POST /api/v1/auth/login`: Authenticate and receive a JWT token.
- `POST /api/v1/jobs/analyze`: Extract structured job details from raw text using AI.
- `GET /api/v1/candidates/search`: Perform a semantic vector search across the candidate pool.
- `POST /api/v1/candidates/upload-dataset`: Bulk upload candidates and generate embeddings.

---

## Database

The project uses **SQLite** for relational data and **ChromaDB** for vector embeddings.
- **Migrations:** Managed by Alembic. Any changes to SQLAlchemy models require generating a new migration:
  ```bash
  alembic revision --autogenerate -m "Add new column"
  alembic upgrade head
  ```
- **Resetting Database:** To start fresh, delete `hireintel.db` and the `chroma_db` directory, then run `alembic upgrade head`.

---

## Security

- **Authentication:** The frontend relies on Firebase Authentication to handle user sign-ups and OAuth flows securely. The backend validates Firebase tokens or uses its own JWT implementation depending on the configuration.
- **CORS:** Cross-Origin Resource Sharing is strictly configured in FastAPI to only allow requests from authorized frontend origins (e.g., `http://localhost:5173`).
- **Rate Limiting:** Key endpoints (like file uploads) are protected using `slowapi` to prevent abuse.
- **Secrets:** Never commit `.env` or Firebase JSON credential files to version control.

---

## Troubleshooting

### 1. `pip install` fails on Windows (ChromaDB / hnswlib)
If you encounter C++ compilation errors building `chromadb`, ensure you are using **Python 3.11 or 3.12**. These versions have pre-compiled `.whl` binaries available on PyPI, meaning you do not need a C++ compiler installed on your system. 

### 2. Pydantic / FastAPI Startup Error (`Invalid args for response field`)
If the backend crashes with `PydanticUndefinedAnnotation` or an `UploadFile` error on startup, it is due to an incompatibility between `slowapi` decorators and FastAPI 0.111's AST parser. Remove the `@limiter.limit` decorators from endpoints utilizing complex types like `UploadFile`.

### 3. Frontend `net::ERR_CONNECTION_REFUSED`
This means the frontend cannot reach the backend. Ensure that:
1. The backend is actually running on port 8000.
2. Your `frontend/.env` has `VITE_API_URL=http://localhost:8000`.

### 4. Firebase Auth Policy Warnings
If you see `Cross-Origin-Opener-Policy policy would block the window.closed call` in the browser console during Firebase Auth popups, this is a standard warning caused by Vite's development server headers. The authentication will still work, and this warning will not appear in production builds.

---

## Development & Deployment

### Development
- **Linting:** Run `npm run lint` in the frontend directory.
- **Formatting:** Code adheres to standard React/TypeScript conventions.
- **Git Strategy:** Create feature branches off `main` and submit Pull Requests for review.

### Deployment
- **Frontend:** Can be built as a static site (`npm run build`) and deployed to Vercel, Netlify, or Firebase Hosting.
- **Backend:** Designed to be containerized using Docker. A `Dockerfile` and `docker-compose.yml` are provided in the repository root for production deployments via AWS ECS, Google Cloud Run, or generic VPS.
- **Database:** For production, SQLite should be swapped for PostgreSQL by updating the `DATABASE_URL` in the environment variables.

---

## Roadmap

- [ ] Add PostgreSQL support for production deployments.
- [ ] Implement WebSockets for real-time notification on background AI parsing tasks.
- [ ] Integrate with external Applicant Tracking Systems (Workday, Greenhouse).
- [ ] Add comprehensive Unit Tests (Pytest for Backend, Vitest for Frontend).

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
