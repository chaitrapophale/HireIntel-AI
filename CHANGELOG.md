# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - Initial Release

### Added
- **Core Architecture:** Set up FastAPI backend and React 19 + Vite frontend.
- **AI Semantic Ranking:** Implemented ChromaDB and Sentence Transformers (`all-MiniLM-L6-v2`) to embed candidates and perform cosine similarity matching against job descriptions.
- **Job Parsing Pipeline:** Integrated Langchain to automate extraction of structured data from raw job descriptions using Large Language Models (OpenAI and NVIDIA APIs supported).
- **Candidate Pipeline Dashboard:** Created an interactive dashboard using Recharts and TanStack Table to track candidates from "Sourced" to "Hired".
- **Hidden Gem Detection:** Added the ability to identify candidates lacking traditional requirements but possessing high potential.
- **Data Uploads:** Added bulk dataset upload endpoint to support bootstrapping candidate pools.
- **Security:** Implemented JWT-based authentication on the backend and Firebase Authentication on the frontend.
- **Documentation:** Created comprehensive `README.md`, `ARCHITECTURE.md`, `SECURITY.md`, and `CONTRIBUTING.md`.

### Fixed
- Addressed `PydanticUndefinedAnnotation` startup bugs resulting from `slowapi` decorators wrapping complex Pydantic types.
- Fixed `pip install` dependency conflicts causing issues with ChromaDB bindings on Windows environments.
