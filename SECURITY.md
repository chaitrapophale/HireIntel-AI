# Security Policy

HireIntel AI takes security seriously. As a talent platform processing resumes, job descriptions, and user data, we are committed to ensuring our application is secure by default.

## Supported Versions

Currently, we provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

*Older versions or forks are not officially supported for security patches.*

## Authentication and Authorization

### Frontend (Firebase)
- The frontend relies on **Firebase Authentication** for identity management.
- Ensure that your Firebase project has proper authorized domains configured in the Firebase Console to prevent unauthorized usage of your API keys.
- **API Keys:** The `VITE_FIREBASE_API_KEY` exposed in the frontend is safe to be public *only* if you restrict it to your specific domain (`HTTP referrers`) in the Google Cloud Console.

### Backend (FastAPI + JWT)
- The backend uses JWTs (JSON Web Tokens) for authenticating requests. 
- The JWT is signed using the `JWT_SECRET` environment variable. 
- **CRITICAL:** You must change `JWT_SECRET` in production to a long, random, and securely generated string. Do not use the default value.
- Authentication dependencies (`get_current_user`) are strictly applied to all sensitive API endpoints, ensuring data is scoped by `user_id`.

## Secret Management

- **Environment Variables:** Never commit `.env` files to the repository. The `.env.example` files provided contain safe, mock data.
- **Firebase Admin SDK:** If using the Firebase Admin SDK in the backend, the `firebase-adminsdk.json` file contains highly sensitive private keys. Keep this file outside of the web root and securely mounted in your production environments (or use environment variable injection).

## Cross-Origin Resource Sharing (CORS)

- The FastAPI backend uses strict CORS middleware.
- In production, ensure the `allow_origins` array in FastAPI is set *only* to the exact URLs of your deployed frontend (e.g., `https://hireintel.yourdomain.com`). Do not leave it as `*` or `http://localhost:5173`.

## Rate Limiting and Abuse Prevention

- Expensive endpoints (such as those calling OpenAI, NVIDIA APIs, or handling file uploads) are protected using **SlowAPI**.
- Ensure that the reverse proxy (e.g., Nginx) correctly forwards the `X-Forwarded-For` headers so the backend rate limiter identifies the correct client IP.

## Reporting a Vulnerability

We deeply appreciate the efforts of security researchers and users who report vulnerabilities. 

If you discover a security vulnerability within HireIntel AI, please do **not** open a public issue.

Instead, please send an e-mail to the repository maintainer(s) directly or utilize the GitHub Security Advisory feature to privately report the vulnerability. 

We will review the report and provide an initial response within 48 hours.

### What to include in your report:
- A description of the vulnerability.
- Steps to reproduce the issue (including any payloads).
- Potential impact of the vulnerability.

Thank you for helping keep HireIntel AI secure!
