import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { claims } = body;

    if (!claims || !Array.isArray(claims) || claims.length === 0) {
      return NextResponse.json({ error: 'Valid array of claims is required' }, { status: 400 });
    }

    const verifiedClaims = [];

    // Process sequentially to respect free tier limits
    for (const item of claims) {
      try {
        // 1. Search using Tavily API (100% Free, 1000 searches/month)
        const tavilyResponse = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: item.claim,
            api_key: process.env.TAVILY_API_KEY,
            max_results: 3,
            include_raw_content: false
          })
        });

        const tavilyData = await tavilyResponse.json();
        const snippets = tavilyData.results
          ?.map((r: any) => r.content)
          .join('\n\n') || "No search results found.";

        // 2. Verify using Groq (Llama 3.3 - Free & Fast)
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
          model: "llama-3.3-70b-versatile",
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
    return NextResponse.json({ error: 'Failed to process verification batch' }, { status: 500 });
  }
}