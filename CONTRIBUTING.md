# Contributing to HireIntel AI

First off, thank you for considering contributing to HireIntel AI! It's people like you that make HireIntel AI such a great tool for modern recruitment.

Please take a moment to review this document in order to make the contribution process easy and effective for everyone involved.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We expect all contributors to maintain a welcoming and inclusive environment.

## Getting Started

### 1. Local Development Setup

To get your local development environment set up, please follow the detailed instructions in the [Installation section of the README.md](README.md#installation).

You will need:
- Node.js 18+
- Python 3.11 or 3.12 (Highly recommended for ChromaDB compatibility on Windows)
- Git

### 2. Fork and Clone

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/HireIntel-AI.git
   ```
3. Add the original repository as an upstream remote:
   ```bash
   git remote add upstream https://github.com/chaitrapophale/HireIntel-AI.git
   ```

## Development Workflow

### Branching Strategy

We use a standard feature-branch workflow. **Never commit directly to the `main` branch.**

1. Ensure your local `main` branch is up to date:
   ```bash
   git checkout main
   git pull upstream main
   ```
2. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bugfix-name
   ```

### Code Style & Formatting

#### Frontend (React / TypeScript)
- We use ESLint for linting.
- Run `npm run lint` in the `frontend` directory before committing to ensure there are no linting errors.
- Prefer functional components with React Hooks.
- Ensure strict TypeScript typing. Do not use `any` unless absolutely necessary.

#### Backend (Python / FastAPI)
- We use standard Python conventions (PEP 8).
- Keep API endpoints thin; place business logic in the `app/services` directory.
- Use Pydantic schemas for all request/response validation.
- Format code using Black or standard Python formatting tools.

### Commit Conventions

We follow Conventional Commits. Your commit messages should be structured as follows:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Common Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries

**Example:**
`feat(candidates): add bulk upload support for CSV files`

## Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request against the `main` branch of the upstream repository.
3. Provide a clear description of the problem you are solving and the solution you have implemented.
4. If your PR fixes an open issue, include `Fixes #ISSUE_NUMBER` in the description.
5. Wait for a maintainer to review your code. Be prepared to make requested changes.

## Reporting Bugs and Requesting Features

If you find a bug or have a feature request, please open an issue on GitHub. 

When reporting a bug, please include:
- A clear and descriptive title.
- Steps to reproduce the issue.
- The expected behavior vs the actual behavior.
- Any relevant logs, screenshots, or environment details (e.g., OS, Python version, Node version).

Thank you for contributing!
