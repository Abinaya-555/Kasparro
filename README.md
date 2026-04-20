# AI Commerce Readiness Engine

An AI-powered system that analyzes e-commerce product listings and improves their discoverability for AI-driven search and recommendations.

---

##  Features
- AI perception analysis (current vs ideal)
- Scoring system (0–100)
- Priority + impact engine
- Structured improvements
- Query simulations (before vs after)
- Shopify integration (fetch, analyze, update)

---

##  Tech Stack
- Node.js + Express + TypeScript
- Next.js + Tailwind CSS
- OpenAI (feature-flagged)
- Shopify Admin API

---

##  Run Locally


npm install
npm run dev
Backend (Express + TypeScript):
Setup:

npm install
Run dev server (port 5000)
npm run dev
Build + start
npm run build
npm start
⚙️ Environment
Copy .env.example → .env

Key variables:

PORT=5000

SIMULATION_QUERY_MODE:

fixed

ai

hybrid

OPENAI_API_KEY (only needed for ai or hybrid)

SHOPIFY_STORE_URL

SHOPIFY_ACCESS_TOKEN

Quick Test
curl -X POST http://localhost:5000/api/v1/products/analyze \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Vitamin C Serum\",\"description\":\"A brightening serum.\"}"
Output Includes
data.perception (current vs ideal)

data.score (value + grade + breakdown)

data.priorities (what to fix first)

data.impactAnalysis (AI + business impact)

data.improvements (structured fixes)

data.simulations (before vs after matching)

Shopify Flow
Fetch products

Analyze product

Generate improvements

Apply improvements back to Shopify

Project Goal
Help e-commerce products become more AI-readable, discoverable, and conversion-optimized in modern search and recommendation systems.