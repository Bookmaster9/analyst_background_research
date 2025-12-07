import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { questions, analystName } = await request.json();

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: "No questions provided" },
        { status: 400 }
      );
    }

    const prompt = `You are evaluating the style and skill of an equity research analyst based ONLY on the questions they ask on earnings calls.

You will be given one or more questions asked by a single analyst. Ignore management answers. Rate the analyst along general behavioral dimensions AND finance-specific analytical dimensions.

Return ONLY valid JSON following the schema at the end.

## GENERAL DIMENSIONS (1–5)

1. politeness_respect
2. aggressiveness_pressure
3. analytical_depth
4. preparation_company_knowledge
5. clarity_structure
6. constructiveness

## FINANCE-SPECIFIC DIMENSIONS (1–5)

7. accounting_skepticism
   - Probing on accounting quality, KPIs, margins, working capital, adjustments.

8. guidance_interrogation
   - How well they drill into forward guidance, embedded assumptions, bridges.

9. risk_focus
   - Attention to demand risk, execution risk, regulatory risk, supply chain, macro.

10. capital_allocation_focus
   - Depth of questions on capex, leverage, buybacks, dividends, ROIC, M&A.

11. industry_contextualization
   - References to peers, competitive dynamics, regulatory environment, global macro.

12. model_rigorousness
   - Use of numbers, deltas, decomposition, margin math, sensitivity analysis.

For each dimension:
- Score 1–5
- 1–3 sentence explanation
- 1–3 short evidence snippets

## ADDITIONAL LABELS
- overall_style_label (short tag: e.g., "analytical-and-tough", "polite-and-generic")
- key_strengths (2–4 bullets)
- key_weaknesses (2–4 bullets)
- notable_questions (2–5 items: snippet + why it stands out)

## OUTPUT SCHEMA (JSON ONLY)

{
  "analyst_name": "<string or null>",
  "num_questions": <int>,
  "scores": {
    "politeness_respect": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]},
    "aggressiveness_pressure": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]},
    "analytical_depth": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]},
    "preparation_company_knowledge": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]},
    "clarity_structure": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]},
    "constructiveness": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]},
    "accounting_skepticism": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]},
    "guidance_interrogation": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]},
    "risk_focus": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]},
    "capital_allocation_focus": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]},
    "industry_contextualization": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]},
    "model_rigorousness": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]}
  },
  "overall_style_label": "<string>",
  "key_strengths": ["<string>", "..."],
  "key_weaknesses": ["<string>", "..."],
  "notable_questions": [
    {"reference": "<snippet>", "comment": "<string>"},
    ...
  ]
}

Here are the analyst's questions:

${questions.map((q: string, i: number) => `Question ${i + 1}: ${q}`).join("\n\n")}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at evaluating equity research analysts. Return only valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = completion.choices[0].message.content;
    const insights = JSON.parse(result || "{}");

    // Add analyst name if not in response
    if (!insights.analyst_name && analystName) {
      insights.analyst_name = analystName;
    }

    return NextResponse.json(insights);
  } catch (error) {
    console.error("Error analyzing analyst:", error);
    return NextResponse.json(
      { error: "Failed to analyze analyst" },
      { status: 500 }
    );
  }
}
