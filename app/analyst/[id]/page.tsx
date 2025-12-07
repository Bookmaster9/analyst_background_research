"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  supabase,
  type Analyst,
  type LinkedInInfo,
  type Prediction,
  type EarningsQuestion,
} from "@/lib/supabase";
import Link from "next/link";

interface PredictionWithPrice extends Prediction {
  start_price?: number;
  end_price?: number;
}

export default function AnalystDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const [analyst, setAnalyst] = useState<Analyst | null>(null);
  const [linkedInInfo, setLinkedInInfo] = useState<LinkedInInfo | null>(null);
  const [predictions, setPredictions] = useState<PredictionWithPrice[]>([]);
  const [earningsComments, setEarningsComments] = useState<EarningsQuestion[]>(
    []
  );
  const [selectedPrediction, setSelectedPrediction] =
    useState<PredictionWithPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [predictionsPage, setPredictionsPage] = useState(0);
  const [earningsPage, setEarningsPage] = useState(0);
  const [totalPredictions, setTotalPredictions] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [analystInsights, setAnalystInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchAnalystData();
  }, [unwrappedParams.id]);

  useEffect(() => {
    fetchPredictions();
  }, [predictionsPage, unwrappedParams.id]);

  useEffect(() => {
    fetchEarnings();
  }, [earningsPage, unwrappedParams.id]);

  useEffect(() => {
    fetchAnalystInsights();
  }, [unwrappedParams.id]);

  const fetchAnalystData = async () => {
    setLoading(true);
    const analystId = parseInt(unwrappedParams.id);
    console.log("Fetching data for analyst ID:", analystId);

    // Fetch analyst basic info
    const { data: analystData, error: analystError } = await supabase
      .from("analysts")
      .select("*")
      .eq("analyst_id", analystId)
      .single();

    console.log("Analyst data:", analystData, "Error:", analystError);
    if (analystData) {
      setAnalyst(analystData);
    }

    // Fetch LinkedIn info
    const { data: linkedInData, error: linkedInError } = await supabase
      .from("linkedin_info")
      .select("*")
      .eq("analyst_id", analystId)
      .maybeSingle();

    console.log("LinkedIn data:", linkedInData, "Error:", linkedInError);
    if (linkedInData) {
      setLinkedInInfo(linkedInData);
    }

    setLoading(false);
  };

  const fetchPredictions = async () => {
    const analystId = parseInt(unwrappedParams.id);

    // Get total count
    const { count } = await supabase
      .from("predictions")
      .select("*", { count: "exact", head: true })
      .eq("analyst_id", analystId);

    if (count) {
      setTotalPredictions(count);
    }

    // Fetch paginated predictions
    const { data: predictionsData } = await supabase
      .from("predictions")
      .select("*")
      .eq("analyst_id", analystId)
      .order("anndats", { ascending: false })
      .range(
        predictionsPage * ITEMS_PER_PAGE,
        (predictionsPage + 1) * ITEMS_PER_PAGE - 1
      );

    if (predictionsData && predictionsData.length > 0) {
      // Fetch prices for each prediction (only for current page)
      const predictionsWithPrices = await Promise.all(
        predictionsData.map(async (pred) => {
          const predDate = pred.anndats;
          const horizon = pred.horizon;

          let endDate = predDate;
          if (horizon && predDate) {
            const startDate = new Date(predDate);
            const horizonMonths = parseInt(horizon) || 12;
            const endDateObj = new Date(startDate);
            endDateObj.setMonth(endDateObj.getMonth() + horizonMonths);
            endDate = endDateObj.toISOString().split("T")[0];
          }

          const { data: startPriceData } = await supabase
            .from("security_prices")
            .select("prc")
            .eq("ticker", pred.ticker)
            .gte("date", predDate)
            .order("date", { ascending: true })
            .limit(1);

          const { data: endPriceData } = await supabase
            .from("security_prices")
            .select("prc")
            .eq("ticker", pred.ticker)
            .lte("date", endDate)
            .order("date", { ascending: false })
            .limit(1);

          return {
            ...pred,
            start_price: startPriceData?.[0]?.prc,
            end_price: endPriceData?.[0]?.prc,
          };
        })
      );

      setPredictions(predictionsWithPrices);
    } else {
      setPredictions([]);
    }
  };

  const fetchEarnings = async () => {
    const analystId = parseInt(unwrappedParams.id);

    // Get total count
    const { count } = await supabase
      .from("earnings_questions")
      .select("*", { count: "exact", head: true })
      .eq("analyst_id", analystId);

    if (count) {
      setTotalEarnings(count);
    }

    // Fetch paginated earnings
    const { data: earningsData } = await supabase
      .from("earnings_questions")
      .select("*")
      .eq("analyst_id", analystId)
      .order("mostimportantdateutc", { ascending: false })
      .range(
        earningsPage * ITEMS_PER_PAGE,
        (earningsPage + 1) * ITEMS_PER_PAGE - 1
      );

    if (earningsData) {
      setEarningsComments(earningsData);
    }
  };

  const fetchAnalystInsights = async () => {
    const analystId = parseInt(unwrappedParams.id);
    setInsightsLoading(true);

    try {
      // Fetch all earnings questions for this analyst (limit to 50 for API)
      const { data: allQuestions } = await supabase
        .from("earnings_questions")
        .select("componenttextpreview, full_name")
        .eq("analyst_id", analystId)
        .limit(50);

      if (!allQuestions || allQuestions.length === 0) {
        setInsightsLoading(false);
        return;
      }

      // Call our API route to get OpenAI analysis
      const response = await fetch("/api/analyze-analyst", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questions: allQuestions.map((q) => q.componenttextpreview),
          analystName: allQuestions[0].full_name,
        }),
      });

      if (response.ok) {
        const insights = await response.json();
        setAnalystInsights(insights);
      }
    } catch (error) {
      console.error("Error fetching analyst insights:", error);
    } finally {
      setInsightsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analyst dashboard...</p>
        </div>
      </div>
    );
  }

  if (!analyst) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Analyst not found
          </h1>
          <Link href="/" className="text-indigo-600 hover:text-indigo-800">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-3 px-8">
        <div className="max-w-[1800px] mx-auto">
          <Link
            href="/"
            className="text-indigo-600 hover:text-indigo-800 mb-1 inline-block text-sm"
          >
            ← Back to search
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">
            {analyst.full_name}
          </h1>
          <p className="text-gray-600 text-sm">
            {analyst.first_initial_last_name}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Profile Box */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4 h-[calc(100vh-140px)] flex flex-col">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Profile
              </h2>

              {linkedInInfo ? (
                <div className="flex-1 overflow-y-auto space-y-3">
                  {linkedInInfo.Linkedin && (
                    <a
                      href={linkedInInfo.Linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                      View LinkedIn Profile
                    </a>
                  )}

                  {linkedInInfo.current_company_name && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-1 text-sm">
                        Current Company
                      </h3>
                      <p className="text-gray-600 text-xs">
                        {linkedInInfo.current_company_name}
                      </p>
                    </div>
                  )}

                  {linkedInInfo.about && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-1 text-sm">
                        About
                      </h3>
                      <p className="text-gray-600 text-xs leading-relaxed">
                        {linkedInInfo.about}
                      </p>
                    </div>
                  )}

                  {linkedInInfo.experience && (() => {
                    try {
                      const experiences = JSON.parse(linkedInInfo.experience);
                      if (Array.isArray(experiences) && experiences.length > 0) {
                        // Filter out entries without title or company (they appear to be incomplete)
                        const validExperiences = experiences.filter(
                          (exp: any) => exp.title || exp.company
                        );

                        if (validExperiences.length === 0) return null;

                        return (
                          <div>
                            <h3 className="font-semibold text-gray-700 mb-2 text-sm">
                              Experience
                            </h3>
                            <div className="space-y-3">
                              {validExperiences.slice(0, 5).map((exp: any, idx: number) => (
                                <div key={idx} className="border-l-2 border-indigo-200 pl-3">
                                  <div className="flex items-start gap-2">
                                    {exp.company_logo_url && (
                                      <img
                                        src={exp.company_logo_url}
                                        alt={exp.company || exp.title || 'Company logo'}
                                        className="w-8 h-8 rounded flex-shrink-0"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      {exp.title && (
                                        <p className="font-medium text-gray-800 text-xs">
                                          {exp.title}
                                        </p>
                                      )}
                                      {exp.company && (
                                        <p className="text-gray-600 text-xs">
                                          {exp.company}
                                        </p>
                                      )}
                                      {exp.duration && (
                                        <p className="text-gray-500 text-xs">
                                          {exp.duration}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    } catch (e) {
                      return null;
                    }
                  })()}

                  {linkedInInfo.educations_details && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-1 text-sm">
                        Education
                      </h3>
                      <p className="text-gray-600 text-xs whitespace-pre-wrap">
                        {linkedInInfo.educations_details}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4 pt-3 border-t border-gray-200">
                    {linkedInInfo.followers !== null && (
                      <div>
                        <p className="text-xl font-bold text-gray-800">
                          {linkedInInfo.followers?.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">Followers</p>
                      </div>
                    )}
                    {linkedInInfo.connections !== null && (
                      <div>
                        <p className="text-xl font-bold text-gray-800">
                          {linkedInInfo.connections?.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">Connections</p>
                      </div>
                    )}
                  </div>

                  {/* AI Insights Section */}
                  <div className="pt-3 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-700 mb-2 text-sm">
                      AI Analysis
                    </h3>
                    {insightsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-2"></div>
                          <p className="text-xs text-gray-500">
                            Loading additional metrics...
                          </p>
                        </div>
                      </div>
                    ) : analystInsights ? (
                      <div className="space-y-2">
                        <div className="bg-indigo-50 rounded p-2">
                          <p className="text-xs font-semibold text-indigo-900">
                            Style: {analystInsights.overall_style_label}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Based on {analystInsights.num_questions} questions
                          </p>
                        </div>

                        {/* Key Strengths */}
                        {analystInsights.key_strengths && analystInsights.key_strengths.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-green-700 mb-1">
                              Strengths:
                            </p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {analystInsights.key_strengths.map((strength: string, idx: number) => (
                                <li key={idx} className="flex items-start">
                                  <span className="text-green-600 mr-1">•</span>
                                  <span>{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Key Weaknesses */}
                        {analystInsights.key_weaknesses && analystInsights.key_weaknesses.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-orange-700 mb-1">
                              Weaknesses:
                            </p>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {analystInsights.key_weaknesses.map((weakness: string, idx: number) => (
                                <li key={idx} className="flex items-start">
                                  <span className="text-orange-600 mr-1">•</span>
                                  <span>{weakness}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Top Scores */}
                        {analystInsights.scores && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-1">
                              Top Dimensions:
                            </p>
                            <div className="space-y-1">
                              {Object.entries(analystInsights.scores)
                                .sort((a: any, b: any) => b[1].score - a[1].score)
                                .slice(0, 3)
                                .map(([key, value]: [string, any]) => (
                                  <div key={key} className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600 capitalize">
                                      {key.replace(/_/g, " ")}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-indigo-500"
                                          style={{ width: `${(value.score / 5) * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-semibold text-gray-700 w-6">
                                        {value.score}/5
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        No insights available
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">
                  No LinkedIn information available
                </p>
              )}
            </div>
          </div>

          {/* Predictions List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4 h-[calc(100vh-140px)] flex flex-col">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Predictions
              </h2>

              {predictions.length > 0 ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-gray-500">
                      Showing {predictionsPage * ITEMS_PER_PAGE + 1}-
                      {Math.min(
                        (predictionsPage + 1) * ITEMS_PER_PAGE,
                        totalPredictions
                      )}{" "}
                      of {totalPredictions}
                    </p>
                  </div>
                  <div className="space-y-2 overflow-y-auto flex-1">
                    {predictions.map((pred) => {
                      // Calculate return based on prediction direction
                      // If target > start (bullish), use (end - start) / start
                      // If target < start (bearish), use (start - end) / start
                      const returnPct =
                        pred.start_price && pred.end_price && pred.value
                          ? pred.value > pred.start_price
                            ? ((pred.end_price - pred.start_price) /
                                pred.start_price) *
                              100
                            : ((pred.start_price - pred.end_price) /
                                pred.start_price) *
                              100
                          : null;

                      // Calculate accuracy: difference between end price and target price
                      const accuracyPct =
                        pred.end_price && pred.value
                          ? ((pred.end_price - pred.value) / pred.value) * 100
                          : null;

                      return (
                        <div
                          key={pred.prediction_id}
                          onClick={() => setSelectedPrediction(pred)}
                          className="p-3 bg-gray-50 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors border border-gray-200 hover:border-indigo-300"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-gray-800">
                              {pred.ticker}
                            </span>
                            <span className="text-xs text-gray-500">
                              {pred.anndats
                                ? new Date(pred.anndats).toLocaleDateString()
                                : "N/A"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div>
                              <span className="text-gray-500">Start:</span>
                              <span className="ml-1 text-gray-800">
                                {pred.start_price
                                  ? `$${pred.start_price.toFixed(2)}`
                                  : "N/A"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Target:</span>
                              <span className="ml-1 font-medium text-gray-800">
                                ${pred.value.toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">End:</span>
                              <span className="ml-1 text-gray-800">
                                {pred.end_price
                                  ? `$${pred.end_price.toFixed(2)}`
                                  : "N/A"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Period:</span>
                              <span className="ml-1 text-gray-800">
                                {pred.horizon ? `${pred.horizon}mo` : "N/A"}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                            <div>
                              <span className="text-xs text-gray-500">Return:</span>
                              {returnPct !== null ? (
                                <span
                                  className={`ml-1 text-sm font-medium ${
                                    returnPct >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {returnPct >= 0 ? "+" : ""}
                                  {returnPct.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="ml-1 text-xs text-gray-400">N/A</span>
                              )}
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Accuracy:</span>
                              {accuracyPct !== null ? (
                                <span
                                  className={`ml-1 text-sm font-medium ${
                                    Math.abs(accuracyPct) <= 10
                                      ? "text-green-600"
                                      : "text-orange-600"
                                  }`}
                                >
                                  {accuracyPct >= 0 ? "+" : ""}
                                  {accuracyPct.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="ml-1 text-xs text-gray-400">N/A</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 flex-shrink-0">
                    <button
                      onClick={() =>
                        setPredictionsPage(Math.max(0, predictionsPage - 1))
                      }
                      disabled={predictionsPage === 0}
                      className="px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      ← Previous
                    </button>
                    <span className="text-xs text-gray-600">
                      Page {predictionsPage + 1} of{" "}
                      {Math.ceil(totalPredictions / ITEMS_PER_PAGE)}
                    </span>
                    <button
                      onClick={() => setPredictionsPage(predictionsPage + 1)}
                      disabled={
                        (predictionsPage + 1) * ITEMS_PER_PAGE >=
                        totalPredictions
                      }
                      className="px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">
                  No predictions available for this analyst. This analyst may
                  not have made any predictions in the database.
                </p>
              )}
            </div>
          </div>

          {/* Earnings Call Comments */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-4 h-[calc(100vh-140px)] flex flex-col">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Earnings Call Comments
              </h2>

              {earningsComments.length > 0 ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-gray-500">
                      Showing {earningsPage * ITEMS_PER_PAGE + 1}-
                      {Math.min(
                        (earningsPage + 1) * ITEMS_PER_PAGE,
                        totalEarnings
                      )}{" "}
                      of {totalEarnings}
                    </p>
                  </div>
                  <div className="space-y-2 overflow-y-auto flex-1">
                    {earningsComments.map((comment) => (
                      <Link
                        key={comment.question_id}
                        href={`/analyst/${unwrappedParams.id}/earnings`}
                        className="block p-3 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-200 hover:border-indigo-300"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-gray-800">
                            {comment.ticker}
                          </span>
                          <span className="text-xs text-gray-500">
                            {comment.mostimportantdateutc
                              ? new Date(
                                  comment.mostimportantdateutc
                                ).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-3">
                          {comment.componenttextpreview}
                        </p>
                        {comment.word_count && (
                          <p className="text-xs text-gray-400 mt-2">
                            {comment.word_count} words
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 flex-shrink-0">
                    <button
                      onClick={() =>
                        setEarningsPage(Math.max(0, earningsPage - 1))
                      }
                      disabled={earningsPage === 0}
                      className="px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      ← Previous
                    </button>
                    <span className="text-xs text-gray-600">
                      Page {earningsPage + 1} of{" "}
                      {Math.ceil(totalEarnings / ITEMS_PER_PAGE)}
                    </span>
                    <button
                      onClick={() => setEarningsPage(earningsPage + 1)}
                      disabled={
                        (earningsPage + 1) * ITEMS_PER_PAGE >= totalEarnings
                      }
                      className="px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">
                  No earnings call comments available
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TradingView Chart Overlay */}
      {selectedPrediction && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPrediction(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    {selectedPrediction.ticker}
                  </h3>
                  <p className="text-gray-600">{selectedPrediction.cname}</p>
                </div>
                <button
                  onClick={() => setSelectedPrediction(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-semibold text-gray-800">
                    {selectedPrediction.anndats
                      ? new Date(
                          selectedPrediction.anndats
                        ).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Start Price</p>
                  <p className="font-semibold text-gray-800">
                    {selectedPrediction.start_price
                      ? `$${selectedPrediction.start_price.toFixed(2)}`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Target Price</p>
                  <p className="font-semibold text-gray-800">
                    ${selectedPrediction.value.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">End Price</p>
                  <p className="font-semibold text-gray-800">
                    {selectedPrediction.end_price
                      ? `$${selectedPrediction.end_price.toFixed(2)}`
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* TradingView Widget */}
              <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                <iframe
                  src={`https://www.tradingview.com/widgetembed/?symbol=${selectedPrediction.ticker}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=light&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1&studies_overrides={}`}
                  className="w-full h-full rounded-lg"
                  style={{ border: 0 }}
                  allow="fullscreen"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
