# 🕵️ AI Fact-Checker

**AI Fact-Checker** is an intelligent, full-stack web application built with **React** and the **Next.js framework**. It automates the tedious process of fact-checking by allowing users to upload PDF documents, automatically extracting verifiable claims (statistics, dates, technical facts), and verifying them against live web data using advanced AI.

---

## ✨ Features

- 📄 **Smart PDF Parsing**: Instantly extracts raw text from uploaded PDF documents using a native Node.js engine.
- 🧠 **AI Claim Extraction**: Uses Large Language Models (LLMs) to identify and isolate discrete, verifiable facts from dense text.
- 🌍 **Live Web Verification**: Cross-references extracted claims against real-time web search results.
- ⚖️ **Automated Judgment**: AI evaluates the search results to classify claims as `Verified`, `False`, `Inaccurate`, or `Unverifiable`.
- 📊 **Interactive Dashboard**: A clean, responsive React UI with color-coded status badges and detailed AI reasoning.
- 💾 **CSV Export**: Download the complete fact-check report as a CSV file for offline analysis.

---

## 🛠️ Tech Stack

This project is built using **React** for the frontend UI, leveraging **Next.js** as the underlying React framework to provide a seamless full-stack experience (handling both the client-side UI and server-side API routes in a single codebase).

| Category | Technology |
|----------|------------|
| **Core UI Library** | **React** (Hooks, State Management, Component Architecture) |
| **React Framework** | **Next.js** (App Router, Serverless API Routes, Edge/Node Runtime) |
| **Styling** | Tailwind CSS |
| **AI / LLM Engine** | Groq API (Llama 3.3 70B Versatile) |
| **Live Web Search** | Tavily Search API |
| **PDF Processing** | MuPDF (Native Node.js PDF Parser) |
| **Deployment** | Vercel |

---

## ⚙️ How It Works (Architecture)

The application follows a streamlined 5-step pipeline:

### 1. Upload & Parse
The user uploads a PDF via the React frontend. The Next.js API route receives the file and uses `mupdf` to extract clean text.

### 2. AI Extraction
The extracted text is sent to the Groq API (Llama 3.3). The AI acts as an analyst, reading the document and outputting a structured JSON array of verifiable claims (e.g., statistics, health impacts, policies).

### 3. Live Search
For every extracted claim, the backend queries the **Tavily API** to fetch the top 3 most relevant live web search snippets.

### 4. AI Verification
The claim and the live web snippets are sent back to Groq. The AI acts as a judge, comparing the claim against the live evidence and determining its accuracy.

### 5. Display
The React frontend receives the final JSON, rendering a color-coded dashboard showing the claim, category, status, and AI-generated reasoning.

---

## 🚀 Getting Started Locally

Follow these steps to run the project on your local machine.

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A free Groq API Key
- A free Tavily API Key

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

Create a `.env.local` file in the root directory and add your API keys:

```env
GROQ_API_KEY=your_groq_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

#### 4. Run the Development Server

```bash
npm run dev
```

Open your browser and navigate to:

```text
http://localhost:3000
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
4. Click **Deploy**.

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
├── .env.local                    # Environment variables (not committed)
├── package.json                  # Dependencies and scripts
└── README.md
```

---

## 📝 License

This project is open-source and available under the **MIT License**.

---

### Built With

- React
- Next.js
- Tailwind CSS
- Groq API
- Tavily Search API
- MuPDF
- Vercel
