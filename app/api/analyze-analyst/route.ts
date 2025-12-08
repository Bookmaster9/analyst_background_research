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

You will be given one or more questions asked by a single analyst. Rate the analyst along ALL dimensions below: general behavioral, finance-specific analytical, AND specificity dimensions.

IMPORTANT: You MUST score ALL 17 dimensions listed below. Do not skip any dimension. Be harsh on this rating and only give good scores for analysts that are exception in the dimension.

Return ONLY valid JSON following the schema at the end.

## GENERAL BEHAVIORAL DIMENSIONS (1–5)

1. politeness_respect
   - Tone, courtesy, respect toward management and other participants.

2. aggressiveness_pressure
   - How forcefully or persistently they push for answers, challenge management.

3. analytical_depth
   - Overall intellectual rigor, sophistication of thinking, logical structure.

4. preparation_company_knowledge
   - Evidence of research, understanding of company specifics, filings, history.

5. clarity_structure
   - How clearly and logically the questions are formulated and organized.

6. constructiveness
   - Whether questions are productive vs confrontational, helpful vs nitpicking.

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

## SPECIFICITY DIMENSIONS (1–5)

13. quantitative_precision
   - Use of specific numbers, percentages, basis points, and precise financial metrics in questions.

14. temporal_specificity
   - References to specific timeframes, quarters, dates, sequential trends, and forward-looking periods.

15. segment_granularity
   - Depth in asking about specific product lines, geographies, customer segments, or business units.

16. metric_decomposition
   - Breaking down high-level metrics into components (revenue = price × volume, margin drivers, etc.).

17. comparative_benchmarking
   - Using specific peer comparisons, market share data, historical trends, or industry benchmarks.

CRITICAL: For EACH of the 17 dimensions above (6 general + 6 finance + 5 specificity):
- Assign a score from 1–5 (REQUIRED - no dimension can be skipped)
- Provide 1–3 sentence explanation
- Include 1–3 short evidence snippets from the questions

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
    "model_rigorousness": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]},
    "quantitative_precision": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]},
    "temporal_specificity": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]},
    "segment_granularity": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]},
    "metric_decomposition": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]},
    "comparative_benchmarking": {"score": <int>, "explanation": "<string>", "evidence": ["<string>", ...]}
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

${questions
  .map((q: string, i: number) => `Question ${i + 1}: ${q}`)
  .join("\n\n")}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at evaluating equity research analysts. Return only valid JSON. CRITICAL: You must score ALL 17 dimensions without exception: 6 general behavioral, 6 finance-specific, and 5 specificity dimensions. Every dimension in the schema must have a score.",
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
