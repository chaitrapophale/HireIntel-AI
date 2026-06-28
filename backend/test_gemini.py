import asyncio, sys, warnings
warnings.filterwarnings('ignore')
sys.path.insert(0, '.')

async def test():
    from app.services.ai.ai_factory import get_ai_provider
    ai = get_ai_provider()
    candidates = [
        {
            'full_name': 'Alice Dev', 'current_title': 'Senior Engineer',
            'skills': ['Python', 'FastAPI', 'Docker'], 'years_of_experience': 6,
            'summary': 'Experienced Python developer', 'overall_score': 80,
            'skill_score': 85, 'experience_score': 90, 'behavioral_score': 75
        },
        {
            'full_name': 'Bob Coder', 'current_title': 'Mid Engineer',
            'skills': ['Python', 'Flask'], 'years_of_experience': 2,
            'summary': 'Junior Python dev', 'overall_score': 60,
            'skill_score': 55, 'experience_score': 40, 'behavioral_score': 70
        },
    ]
    result = await ai.rerank_candidates(
        'Senior Python Developer with FastAPI and Docker, 5+ years', candidates
    )
    for r in result:
        name = r.get('full_name', 'N/A')
        score = r.get('overall_score', 0)
        risks = r.get('risks', [])
        print(f"{name} => score: {score:.0f}, risks: {risks}")

asyncio.run(test())
