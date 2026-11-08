# PaperMind

## Research Trend Intelligence Platform

PaperMind helps researchers quickly understand the evolution of a research field by automatically discovering topics, measuring their growth, forecasting future trends, and identifying emerging research opportunities from real-time arXiv data.

Instead of manually reading hundreds of papers or relying on generic AI summaries, PaperPulse provides data-driven insights into:

* Which topics are growing rapidly
* Which topics are losing momentum
* Which areas are gaining citation impact
* What research gaps may exist
* Which topics are likely to dominate in the future

---

## Problem Statement

Researchers entering a new domain often face information overload. Thousands of papers are published every month, making it difficult to identify:

* Emerging research directions
* Declining areas of interest
* High-impact topics
* Unexplored research opportunities

Existing tools primarily focus on paper search and summarization, but they rarely answer:

> Which ideas are gaining momentum and where should researchers focus next?

PaperPulse addresses this challenge through topic discovery, trend analysis, forecasting, and citation-aware momentum scoring.

---

## Features

### Real-Time Paper Collection

* Fetches latest papers directly from arXiv
* Supports custom research queries
* Processes titles, abstracts, authors, and publication dates

### Topic Discovery

* Uses BERTopic for unsupervised topic modeling
* Groups papers into meaningful research themes
* Generates topic-specific keywords

### Trend Analysis

* Computes topic growth using TF-IDF based scoring
* Measures publication velocity across time windows
* Classifies topics as:

  * Rising ↑
  * Stable →
  * Declining ↓

### Citation-Aware Momentum

* Retrieves citation statistics using Semantic Scholar
* Calculates citation velocity
* Combines publication growth and citation growth into a unified momentum score

### Forecasting

* Predicts future topic growth using regression-based forecasting
* Estimates topic performance over the next 12 months

### Research Gap Identification

* Highlights rapidly accelerating topics
* Provides structured inputs for LLM-powered research gap analysis

### Interactive Dashboard

* Dynamic frontend visualization
* Topic cards
* Trend graphs
* Forecast charts
* Momentum indicators
* Research insights

---

## System Architecture

```text
                 ┌──────────────────┐
                 │     User Query   │
                 └─────────┬────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │   arXiv API      │
                 └─────────┬────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │ Paper Collection │
                 └─────────┬────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │   BERTopic ML    │
                 └─────────┬────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
 ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
 │ TF-IDF      │ │ Citations   │ │ Forecasting │
 │ Scoring     │ │ Analysis    │ │ Engine      │
 └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
        ▼               ▼               ▼
 ┌─────────────────────────────────────────┐
 │ Velocity & Momentum Analysis            │
 └─────────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │ Interactive Dashboard  │
         └────────────────────────┘
```

---

## Tech Stack

### Backend

* Python
* FastAPI
* Pandas
* NumPy
* Scikit-Learn

### Machine Learning

* BERTopic
* Sentence Transformers
* UMAP
* HDBSCAN
* TF-IDF Vectorization
* Linear Regression

### Data Sources

* arXiv API
* Semantic Scholar API

### Frontend

* React
* Tailwind CSS
* Modern Dashboard UI

---

## Project Structure

```text
paperpulse/

├── backend/
│   ├── api.py
│   ├── data_fetch.py
│   ├── citation_fetch.py
│   ├── time_windows.py
│   ├── tfidf_scoring.py
│   ├── velocity.py
│   ├── citation_velocity.py
│   ├── momentum.py
│   ├── forecasting.py
│   ├── trend_analysis.py
│   └── pipeline.py
│
├── ml/
│   ├── topic_modeling.py
│   └── gap_analysis.py
│
├── frontend/
│   └── src/
│
├── tests/
│
├── requirements.txt
├── README.md
└── .env
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/your-username/paperpulse.git

cd paperpulse
```

### Create Virtual Environment

```bash
python -m venv .venv
```

### Activate Environment

Mac/Linux:

```bash
source .venv/bin/activate
```

Windows:

```bash
.venv\Scripts\activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Environment Variables

Create a `.env` file:

```env
GEMINI_API_KEY=your_api_key
```

---

## Running Backend

```bash
uvicorn backend.api:app --reload --host 0.0.0.0 --port 8000
```

Health Check:

```bash
curl http://localhost:8000/health
```

Expected Response:

```json
{
  "status": "ok"
}
```

---

## Running Frontend

```bash
cd frontend

npm install

npm run dev
```

---

## API Endpoint

### Generate Research Insights

```http
POST /api/pipeline
```

Request:

```json
{
  "query": "federated learning"
}
```

Response:

```json
{
  "papers": [],
  "topic_map": {},
  "velocity": [],
  "citation_velocity": [],
  "momentum": [],
  "forecast": [],
  "top_accelerating": []
}
```

---

## Example Use Cases

### Researchers

* Explore new research domains
* Track emerging trends
* Identify research opportunities

### Students

* Understand rapidly evolving fields
* Select project ideas
* Discover research directions

### Research Labs

* Monitor field evolution
* Detect high-impact topics
* Analyze community momentum

### Industry R&D Teams

* Track technological shifts
* Discover promising research areas
* Guide innovation strategy

---

## Future Improvements

* Multi-year trend forecasting
* Citation network visualization
* Interactive topic evolution graphs
* Personalized research recommendations
* Cross-domain topic comparison
* Automated literature reviews
* Research gap scoring engine

---

## Team

Built with the goal of transforming raw research papers into actionable research intelligence.

PaperPulse helps researchers move from:

**"What papers exist?"**

to

**"Where is the field heading next?"**

## Google OAuth setup

PaperMind uses Google Identity Services for sign-in. Create an OAuth 2.0 Client ID with application type **Web application** in Google Cloud Console. Add each frontend origin (for local development, `http://localhost:5173`) to **Authorized JavaScript origins**. Copy the same client ID into `VITE_GOOGLE_CLIENT_ID` in `frontend/.env.local` and `GOOGLE_CLIENT_ID` in `backend/.env`; the API checks the token audience against it. Copy the examples in `frontend/.env.example` and `backend/.env.example`, then restart both servers. The browser client ID is public; never put a Google client secret in the frontend.

From the repository root, install and run the backend with `backend\venv\Scripts\python.exe -m pip install -r requirements.txt` and `backend\venv\Scripts\python.exe -m uvicorn backend.api:app --reload --port 8000`. If you have not created `backend\venv` yet, make it with `py -m venv backend\venv` first. In a second terminal, run `cd frontend`, `npm install`, then `npm run dev -- --force` after dependency changes.

The API validates Google-signed ID tokens against Google's rotating public keys, checks the configured client ID, issuer, expiry, and verified email, then uses Google's stable subject claim for per-user limits. It does not store passwords. `/health` is public and `/api/pipeline` requires sign-in. CORS controls which browser origins may read responses; CORS is not authentication. New uncached analyses are limited to 10 per user per UTC day. The initial counter is held in memory and resets when the API process restarts.
