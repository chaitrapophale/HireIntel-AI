# Changelog

All notable changes to the HireIntel AI project are documented below, categorized by release version.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-06-30
### Added
- **Two-Factor Authentication (2FA):** 
  - Integrated `pyotp` on the backend to support Google Authenticator (TOTP) protocols.
  - Implemented secure backend endpoints: setup 2FA (`/2fa/setup`), enable 2FA (`/2fa/enable`), verify login code (`/2fa/verify`), and disable 2FA (`/2fa/disable`).
  - Added frontend settings panel component within [SettingsPage.tsx](file:///c:/Jayani%20all%20files/Projects%20Jayani/HireIntelAI/frontend/src/features/settings/SettingsPage.tsx) for QR code scanning (using Google Charts QR API), key copying, and TOTP verification.
  - Hardened the frontend [LoginPage.tsx](file:///c:/Jayani%20all%20files/Projects%20Jayani/HireIntelAI/frontend/src/features/auth/LoginPage.tsx) flow to prompt for 2FA validation codes before releasing final JWT tokens.
- **Database Schema Updates:**
  - Extended the `User` SQL Alchemy model in [user.py](file:///c:/Jayani%20all%20files/Projects%20Jayani/HireIntelAI/backend/app/models/user.py) to save TOTP secrets (`totp_secret`) and status flags (`is_totp_enabled`).
  - Regenerated initial Alembic DB migrations to sync security changes.

### Fixed
- **Authentication Environment Config:**
  - Added environment placeholders to `frontend/.env.example`.
  - Created and configured `frontend/.env` with active credentials, resolving the Google Identity Toolkit 400 Bad Request error.

---

## [1.1.0] - 2026-06-25
### Added
- **Production Hardening:**
  - Configured custom JWT authentication handlers to work in parallel with standard Firebase verification.
  - Integrated `slowapi` decorators for IP-based rate limiting on sensitive routes.
- **TypeScript Compliance:**
  - Refactored frontend routes, Zustand stores, and component properties to adhere strictly to strict TypeScript specifications.

### Fixed
- **API & Upload Integrity:**
  - Resolved a missing `/upload` route matching candidate dataset ingestion.
  - Standardized candidate skill parsing to normalize skill levels across JSON, CSV, and Excel imports.
  - Fixed database session import scope issues inside backend controllers.
  - Handled Pydantic v2 validation errors on file upload payloads when decorated with rate-limiting middleware.

---

## [1.0.0] - 2026-06-15
### Added
- **Core Architecture:**
  - Configured FastAPI asynchronous backend framework and Vite + React 19 SPA frontend structure.
- **AI Semantic Matching Engine:**
  - Integrated local ChromaDB client for vector indexing.
  - Added Hugging Face `SentenceTransformer` (`all-MiniLM-L6-v2`) embeddings generator.
  - Programmed custom cosine-similarity mathematical formula to yield match percentage indices.
- **LLM-Based Job Parsing:**
  - Integrated Langchain to automate structural field extraction (e.g. core skills, locations, titles) from raw pasted job postings using OpenAI or NVIDIA NIM models.
- **Recruitment Dashboard:**
  - Built interactive candidate pipelines using TanStack Table v8 and dashboard charts using Recharts.
  - Added "Hidden Gems" detection algorithm to highlight high-potential non-traditional resumes.
- **Security:**
  - Set up CORS restrictions and Firebase Auth handlers.
