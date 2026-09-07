# Verity

Verity is a full-stack PDF fact-checking workspace built with React and Next.js. Upload a research paper, report, or briefing, extract its factual claims, and compare them with current web evidence before publishing or sharing.

---

## ✨ Features

- PDF text extraction with MuPDF
- AI extraction of statistics, dates, policies, health impacts, environmental impacts, organizations, and technical facts
- Live evidence retrieval through Tavily Search
- Groq-based classification as `Verified`, `False`, `Inaccurate`, or `Unverifiable`
- Drag-and-drop upload interface with progress states and actionable errors
- Responsive results workspace with CSV export
- Upload validation for PDF files up to 10MB; scanned/image-only PDFs are rejected when no selectable text is found

---

## 🛠️ Tech Stack

This project is built using **React** for the frontend UI, leveraging **Next.js** as the underlying React framework to provide a seamless full-stack experience (handling both the client-side UI and server-side API routes in a single codebase).

| Category | Technology |
|----------|------------|
| **Core UI Library** | **React** (Hooks, State Management, Component Architecture) |
| **React Framework** | **Next.js** (App Router, Serverless API Routes, Edge/Node Runtime) |
| **Styling** | Tailwind CSS |
| **AI / LLM Engine** | Groq API (`openai/gpt-oss-120b` by default) |
| **Live Web Search** | Tavily Search API |
| **PDF Processing** | MuPDF (Native Node.js PDF Parser) |
| **Deployment** | Vercel |

---

## ⚙️ How It Works (Architecture)

The application follows a five-step pipeline:

### 1. Upload & Parse
The user uploads a PDF via the React frontend. The Next.js API route receives the file and uses `mupdf` to extract clean text.

### 2. AI Extraction
The extracted text is sent to Groq. The model acts as an analyst and returns a structured JSON array of verifiable claims.

### 3. Live Search
For each extracted claim, the backend queries Tavily for up to three relevant live web snippets.

### 4. AI Verification
The claim and snippets are sent back to Groq. The model compares the claim with the supplied evidence and returns a status plus concise reasoning.

### 5. Display
The frontend renders a color-coded review workspace showing the claim, category, status, and reasoning, with an option to export the report as CSV.

---

## 🚀 Getting Started Locally

Follow these steps to run the project on your local machine.

### Prerequisites

- Node.js 18 or higher
- npm
- A Groq API key
- A Tavily API key

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/amankr2519/ai-fact-checker.git
cd ai-fact-checker
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Set Up Environment Variables

Create `.env.local` in the project root. Never put it inside `src/app` and never commit it:

```env
GROQ_API_KEY=your_groq_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

`GROQ_MODEL` is optional. The default is `openai/gpt-oss-120b`; it must be a model available to your Groq account. A matching template is available in [.env.example](.env.example).

#### 4. Run the Development Server

```bash
npm run dev
```

Open your browser and navigate to:

```text
http://localhost:3000
```

After changing `.env.local`, restart the development server so Next.js reloads the environment variables.

### Available scripts

```bash
npm run dev    # Start the development server
npm run lint   # Run ESLint
npm run build  # Create a production build
npm run start  # Start the production server
```

---

## ☁️ Deployment

Because this project is built on the Next.js framework, it is optimized for deployment on Vercel.

### Steps

1. Push your code to a GitHub repository.
2. Import the repository into Vercel.
3. Add the following environment variables in the Vercel dashboard:
   - `GROQ_API_KEY`
   - `TAVILY_API_KEY`
4. Add `GROQ_MODEL` if you want to override the default model.
5. Click **Deploy**.

Vercel will automatically build and host your full-stack application.

---

## 📂 Project Structure

```text
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── upload/
│   │   │   │   └── route.ts      # Handles PDF upload and text extraction
│   │   │   ├── extract/
│   │   │   │   └── route.ts      # Handles AI claim extraction via Groq
│   │   │   └── verify/
│   │   │       └── route.ts      # Handles Tavily search + Groq verification
│   │   ├── page.tsx              # Main React frontend UI
│   │   └── layout.tsx            # Root layout
│   ├── components/               # Reusable React components
│   └── lib/                      # Utility functions and API helpers
├── public/                       # Static assets
├── .env.example                  # Safe environment-variable template
├── .env.local                    # Local secrets (not committed)
├── package.json                  # Dependencies and scripts
└── README.md
```

---

## API routes

| Route | Purpose |
|---|---|
| `POST /api/upload` | Validates a PDF, extracts selectable text, and returns page metadata |
| `POST /api/extract` | Sends document text to Groq and returns structured claims |
| `POST /api/verify` | Searches Tavily and sends the evidence to Groq for classification |

The current architecture uses both services: Groq provides language-model reasoning, while Tavily provides live web evidence. Groq alone is sufficient only if you replace Tavily with an LLM provider that includes reliable web search or grounding.

## License

This project is open-source and available under the **MIT License**.

---

### Built with

- React
- Next.js
- Tailwind CSS
- Groq API
- Tavily Search API
- MuPDF
- Vercel
