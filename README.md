## Backend (Express + TypeScript)

### Setup

```bash
npm install
```

### Run dev server (port 5000)

```bash
npm run dev
```

### Build + start

```bash
npm run build
npm start
```

### Environment

Copy `.env.example` to `.env` (optional for local dev).

Key variables:
- `PORT` (default `5000`)
- `SIMULATION_QUERY_MODE`:
  - `fixed` (always use deterministic templates)
  - `ai` (generate simulation queries with OpenAI; falls back to fixed if key/call fails)
  - `hybrid` (generate AI queries + include fixed templates)
- `OPENAI_API_KEY` (required only when `SIMULATION_QUERY_MODE` is `ai` or `hybrid`)

### Quick test

```bash
curl -X POST http://localhost:5000/api/v1/products/analyze \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Vitamin C Serum\",\"description\":\"A brightening serum.\"}"
```

The response includes:
- `data.perception.current` and `data.perception.ideal`
- `data.score` (value/grade/breakdown)
- `data.priorities` (what to fix first)
- `data.simulations` (before vs after matching queries)

