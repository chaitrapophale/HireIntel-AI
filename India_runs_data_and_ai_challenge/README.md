# Intelligent Candidate Discovery & Ranking Challenge — Redrob Hackathon v4

This repository contains the source code, submission metadata, and resulting ranking for the Redrob Intelligent Candidate Discovery & Ranking Challenge.

## Team Identity
* **Team Name**: Antigravity
* **Primary Contact**: Jayani Parashar (jayani.parashar@example.com)

---

## 🚀 How to Reproduce the Submission

The ranking script runs on standard Python 3 and has **zero external package dependencies**.

### Command to Run
To reproduce the candidate ranking CSV from the dataset:

```bash
python rank.py --candidates ./candidates.jsonl --out ./team_antigravity.csv
```

*Note: The script natively accepts both uncompressed `.jsonl` and gzipped `.jsonl.gz` dataset files.*

### Resource Usage
* **Runtime**: ~15-20 seconds on a standard 8-core CPU (well within the 5-minute limit)
* **Memory**: ~150 MB RAM (well within the 16 GB limit)
* **GPU**: None (CPU-only execution)
* **Network**: None (fully self-contained, no external API calls)

---

## 🛠️ Ranking & Filtering Methodology

Our system uses a multi-stage heuristic filter and scoring model to isolate the best candidates while avoiding traps and honeypots:

1. **Honeypot/Impossible Profile Filtering**:
   * Scans candidate skills to reject anyone with `expert` or `advanced` proficiency in 0 months.
   * Scans candidate education to reject impossible combos (e.g. `Ph.D` in `MBA`, `B.Tech` in `Fine Arts`, `B.E` in `History`).
   * Validates total experience timeline against graduation dates.
   * Cross-references career history titles against descriptions to eliminate contradictions (e.g., DevOps Engineer title with Frontend-only description).

2. **Core Requisition Alignment**:
   * **Location alignment**: Matches Noida/Pune location, relocation to India, or relocation willingness from Tier-1 cities (Bangalore, Mumbai, Hyderabad, Chennai, Kolkata, Ahmedabad). Unhirable locations are assigned a 0 multiplier.
   * **Experience matching**: Evaluates experience against the target 5-9 year window (ideal 6-8), and analyzes career history descriptions to compute total years in applied ML/AI engineering.
   * **Skill matching**: Analyzes proficiency levels and matches against key keywords (RAG, LLMs, Vector Search, Recommender Systems, Fine-Tuning, PyTorch, Transformers, NLP).

3. **Behavioral multiplier**:
   * Downweights inactive profiles (`last_active_date` not in 2026/2025).
   * Factorizes `recruiter_response_rate` and `open_to_work_flag` to favor highly engaged candidates.
   * Applies negative weights for long notice periods (`notice_period_days` > 90).

4. **Tie-breaking**:
   * Equal scores are broken deterministically by sorting `candidate_id` in ascending alphabetical order, fully compliant with Section 3 format validator rules.

---

## 📋 Requirements
* Python 3.8+
* Standard Library modules only (`json`, `gzip`, `csv`, `re`, `argparse`, `datetime`)
