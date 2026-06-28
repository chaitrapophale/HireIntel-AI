from fastapi import APIRouter
from app.api.endpoints import candidates, jobs, auth, dashboard, analytics

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(candidates.router, prefix="/candidates", tags=["candidates"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["jobs"])

# Root-level aliases as requested by priority list
api_router.post("/dataset/upload", tags=["dataset"])(candidates.upload_dataset)
api_router.post("/rank", tags=["rank"])(candidates.rank_candidates)


