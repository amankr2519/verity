import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }
  return new Groq({ apiKey });
}

export async function POST(req: NextRequest) {
  try {
    const groq = getGroqClient();
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Valid text string is required' },
        { status: 400 }
      );
    }

    const truncatedText = text.length > 25000 ? text.substring(0, 25000) + "..." : text;

    const completion = await groq.chat.completions.create({
      messages: [
                {
          role: "system",
          content: `You are an expert fact-checking assistant. Your task is to extract discrete, verifiable claims from the provided text. 
          
          Extract specific factual assertions, including but not limited to:
          - Hard statistics (e.g., population numbers, percentages, financial figures).
          - Specific dates or timeframes (e.g., "in 2023", "during winter months").
          - Specific health, environmental, or economic impacts stated as facts (e.g., "PM2.5 causes asthma", "pollution reduces visibility").
          - Roles of specific organizations, policies, or laws (e.g., "CPCB monitors air quality", "GRAP is implemented during severe episodes").
          - Technical or scientific facts stated in the text.

          Rules:
          1. Return ONLY a valid JSON array. Do not include markdown formatting.
          2. Each object must have exactly two keys: "claim" (the isolated fact) and "category" (one of: "statistic", "date", "health_impact", "environmental_impact", "policy", "technical_fact", "organization").
          3. Make claims concise, self-contained, and easily searchable on the web.
          4. Do not extract vague opinions; only extract statements presented as facts.
          5. If no claims are found, return an empty array [].`
        },
        {
          role: "user",
          content: truncatedText
        }
      ],
      model: GROQ_MODEL,
      temperature: 0.1, 
      response_format: { type: "json_object" } 
    });

    const responseContent = completion.choices[0]?.message?.content || "[]";
    const cleanJson = responseContent.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // --- THE FIX: Smart JSON Unwrapping ---
    const parsed = JSON.parse(cleanJson);
    let claims = [];
    
    if (Array.isArray(parsed)) {
      // The AI returned a perfect array: [{...}, {...}]
      claims = parsed;
    } else if (parsed && typeof parsed === 'object') {
      // The AI wrapped it in an object: {"claims": [{...}, {...}]} or {"results": [...]}
      claims = parsed.claims || parsed.results || parsed.facts || Object.values(parsed)[0];
      if (!Array.isArray(claims)) {
        claims = []; // Fallback if we still can't find an array
      }
    }
    // --------------------------------------

    return NextResponse.json({
      success: true,
      claims: claims,
    });

  } catch (error) {
    console.error('Claim Extraction Error:', error);
    if (error instanceof Error && error.message.includes('model')) {
      return NextResponse.json(
        { error: `Groq model is unavailable. Check GROQ_MODEL in .env.local (currently ${GROQ_MODEL}).` },
        { status: 502 }
      );
    }
    if (error instanceof Error && error.message.includes('GROQ_API_KEY is not configured')) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is missing. Add it to the project root .env.local file and restart the dev server.' },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to extract claims from text' },
      { status: 500 }
    );
  }
}