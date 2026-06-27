# HireIntel AI Frontend

This is the production-ready frontend for the HireIntel AI platform. It was migrated from a static HTML/CSS prototype into a highly scalable, modern React application.

## Tech Stack

The architecture was designed to be the "gold standard" for an enterprise-grade web application, particularly focusing on performance, maintainability, and seamless backend integration.

* **Core:** React 19, Vite, TypeScript
* **Routing:** React Router v7
* **Styling:** Tailwind CSS v4
* **UI Components:** Built with inspiration from `shadcn/ui`, utilizing custom Tailwind `@theme` tokens for absolute design consistency.
* **State Management:**
  * **Server State:** TanStack Query (`@tanstack/react-query`)
  * **Client State:** Zustand
* **Forms & Validation:** React Hook Form + Zod
* **Data Visualization:** Recharts (Radar charts, Funnel charts, Bar charts)
* **Data Tables:** TanStack Table (Headless sorting, filtering, and pagination)
* **Animations:** Framer Motion (Glassmorphism glows, AI parsing states, staggered entrances)
* **Icons:** Lucide React
* **Utilities:** React Dropzone (File uploads), Axios (API client), Sonner (Toasts)

## Architecture & Folder Structure

The project strictly follows a **Feature-Based Architecture**. This means that instead of grouping files by type (e.g., all components in one folder, all styles in another), files are grouped by the feature they belong to.

```text
src/
├── features/          # Feature-based modules
│   ├── auth/          # Login, Registration
│   ├── dashboard/     # Dashboard view and insights
│   ├── jobs/          # Requisitions, Create Job, Dropzone logic
│   ├── candidates/    # Rankings table, Candidate Profile, Hidden Gems
│   ├── analytics/     # Recharts components and funnel stats
│   ├── team/          # Team management table
│   └── settings/      # Enterprise preferences, billing, forms
├── layouts/           # Global layouts (AppShell, Sidebar, TopNav)
├── lib/               # Utility functions (cn, axios API client)
├── router/            # React Router v7 configuration
├── services/          # API communication layers (Integrated with FastAPI)
├── store/             # Zustand stores (Auth state, Sidebar state)
└── types/             # Global TypeScript interfaces
```

## Getting Started

### Prerequisites
* Node.js (v18+)
* npm (or pnpm/yarn)

### Installation
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App
Start the Vite development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

### Building for Production
To create an optimized production build:
```bash
npm run build
```
The output will be generated in the `dist/` directory.

## FastAPI Backend Integration

The frontend is fully integrated with the FastAPI backend server. All API requests are processed through `src/services/index.ts` using the configured Axios client in `src/lib/api.ts`.

Key integrated features:
1. **Live Candidate Directory & Profiles**: Displays and parses actual database records from the SQLite engine.
2. **Drag & Drop Dataset Ingestion**: Uploads CSV, XLSX, and JSON datasets to the backend `/dataset/upload` API.
3. **AI Ranking Engine**: Executes the vector search (ChromaDB + NV-Embed-QA) and reranking (Llama-3-70B) pipeline.
4. **Client-Side Export**: Generates local candidate list downloads.
5. **TanStack Query state synchronization**: Handles real-time loading, cache invalidations, and data syncing.
