# Lumina Prompt Engine — Frontend

Next.js 15 dashboard for the Lumina Prompt Engine. Connects to the FastAPI backend at `http://localhost:8000`.

## Tech Stack

- Next.js 15, TypeScript
- Tailwind CSS, shadcn/ui (Radix UI)
- Framer Motion, Lucide React

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # Optional: override API URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Ensure the backend is running at `http://localhost:8000`.
