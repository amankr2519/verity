import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

type ClaimInput = {
  claim: string;
  category: string;
};

type TavilyResult = {
  content?: string;
};

type TavilyResponse = {
  results?: TavilyResult[];
};

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
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
      return NextResponse.json(
        { error: 'TAVILY_API_KEY is not configured' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { claims } = body;

    if (
      !Array.isArray(claims) ||
      claims.length === 0 ||
      claims.some(
        (item): item is ClaimInput =>
          !item ||
          typeof item !== 'object' ||
          typeof item.claim !== 'string' ||
          typeof item.category !== 'string'
      )
    ) {
      return NextResponse.json({ error: 'Valid array of claims is required' }, { status: 400 });
    }

    const verifiedClaims: Array<ClaimInput & { status: string; reasoning: string }> = [];

    // Process sequentially to respect free tier limits
    for (const item of claims) {
      try {
        // 1. Search using Tavily API (100% Free, 1000 searches/month)
        const tavilyResponse = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: item.claim,
            api_key: tavilyApiKey,
            max_results: 3,
            include_raw_content: false
          })
        });

        if (!tavilyResponse.ok) {
          throw new Error(`Tavily search failed (${tavilyResponse.status})`);
        }

        const tavilyData = (await tavilyResponse.json()) as TavilyResponse;
        const snippets = tavilyData.results
          ?.map((result) => result.content)
          .filter((content): content is string => Boolean(content))
          .join('\n\n') || "No search results found.";

        // 2. Verify using Groq against the collected evidence.
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are an expert fact-checker. Evaluate the provided claim using ONLY the provided web search snippets.
              Return ONLY a valid JSON object with exactly two keys:
              1. "status": Must be EXACTLY one of: "Verified", "Inaccurate", "False", "Unverifiable".
              2. "reasoning": A concise 1-2 sentence explanation citing the search results.`
            },
            {
              role: "user",
              content: `Claim to verify: "${item.claim}"\n\nWeb Search Snippets:\n${snippets}`
            }
          ],
          model: GROQ_MODEL,
          temperature: 0.0,
          response_format: { type: "json_object" }
        });

        const responseContent = completion.choices[0]?.message?.content || '{}';
        const cleanJson = responseContent.replace(/```json/g, '').replace(/```/g, '').trim();
        const verification = JSON.parse(cleanJson);

        verifiedClaims.push({
          ...item,
          status: verification.status || "Unverifiable",
          reasoning: verification.reasoning || "Could not determine status.",
        });

        // Wait 2 seconds between claims to be safe with free tier limits
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Failed to verify claim: "${item.claim}"`, error);
        if (error instanceof Error && error.message.includes('model')) {
          throw error;
        }
        verifiedClaims.push({
          ...item,
          status: "Unverifiable",
          reasoning: `Error during verification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    return NextResponse.json({ success: true, results: verifiedClaims });
  } catch (error) {
    console.error('Verification Batch Error:', error);
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
    return NextResponse.json({ error: 'Failed to process verification batch' }, { status: 500 });
  }
}