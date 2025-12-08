"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  supabase,
  type Analyst,
  type LinkedInInfo,
  type Prediction,
  type EarningsQuestion,
  type BaseballCard,
} from "@/lib/supabase";
import Link from "next/link";

declare global {
  interface Window {
    TradingView: any;
  }
}

interface PredictionWithPrice extends Prediction {
  start_price?: number;
  end_price?: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// TradingView Chart Component
function TradingViewChart({ prediction }: { prediction: PredictionWithPrice }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load TradingView script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (containerRef.current && window.TradingView) {
        // Calculate date range
        const predDate = prediction.anndats ? new Date(prediction.anndats) : new Date();
        const startDate = new Date(predDate);
        startDate.setMonth(startDate.getMonth() - 1);
        const endDate = new Date(predDate);
        endDate.setFullYear(endDate.getFullYear() + 1);

        // Create widget
        new window.TradingView.widget({
          autosize: true,
          symbol: prediction.ticker,
          interval: 'D',
          timezone: 'Etc/UTC',
          theme: 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          container_id: containerRef.current.id,
          range: '60M', // Show 5 years of data
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [prediction]);

  return (
    <div
      ref={containerRef}
      id={`tradingview-${prediction.prediction_id}`}
      className="w-full h-full"
    />
  );
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
  const [baseballCard, setBaseballCard] = useState<BaseballCard | null>(null);
  const [predictions, setPredictions] = useState<PredictionWithPrice[]>([]);
  const [earningsComments, setEarningsComments] = useState<EarningsQuestion[]>(
    []
  );
  const [selectedPrediction, setSelectedPrediction] =
    useState<PredictionWithPrice | null>(null);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [allEarningsComments, setAllEarningsComments] = useState<EarningsQuestion[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchAllEarningsComments = async () => {
    const analystId = parseInt(unwrappedParams.id);
    const { data: earningsData } = await supabase
      .from('earnings_questions')
      .select('*')
      .eq('analyst_id', analystId)
      .order('mostimportantdateutc', { ascending: false });

    if (earningsData) {
      setAllEarningsComments(earningsData);
    }
  };

  const handleOpenEarningsModal = async () => {
    setShowEarningsModal(true);
    setChatMessages([]);
    setInputMessage('');
    await fetchAllEarningsComments();
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || chatLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setChatLoading(true);

    try {
      const context = allEarningsComments
        .map((comment) => {
          const date = comment.mostimportantdateutc
            ? new Date(comment.mostimportantdateutc).toLocaleDateString()
            : 'Unknown date';
          return `[${date} - ${comment.ticker}]\n${comment.componenttextpreview}\n`;
        })
        .join('\n---\n\n');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...chatMessages, userMessage],
          context,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure your OpenAI API key is configured.',
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

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

    // Fetch Baseball Card data
    const { data: baseballCardData, error: baseballCardError } = await supabase
      .from("baseball_card")
      .select("*")
      .eq("analyst_id", analystId)
      .maybeSingle();

    console.log("Baseball card data:", baseballCardData, "Error:", baseballCardError);
    if (baseballCardData) {
      setBaseballCard(baseballCardData);
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
        .order("mostimportantdateutc", { ascending: false })
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

                  {/* Baseball Card Statistics */}
                  {baseballCard && (
                    <div className="pt-3 border-t border-gray-200">
                      <h3 className="font-semibold text-gray-700 mb-2 text-sm">
                        Performance Metrics
                      </h3>
                      <div className="space-y-2">
                        {/* Batting Average */}
                        {baseballCard.Batting_Avg !== null && baseballCard.Batting_Avg !== undefined && (
                          <div className="flex items-center justify-between bg-blue-50 rounded p-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-700">
                                Batting Avg
                              </span>
                              <div className="group relative">
                                <svg
                                  className="w-3 h-3 text-gray-400 cursor-help"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <div className="absolute left-0 bottom-full mb-2 w-48 bg-gray-900 text-white text-xs rounded py-2 px-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10 pointer-events-none">
                                  How often the analyst gets the direction of stock move correct
                                  <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            </div>
                            <span className="text-lg font-bold text-blue-700">
                              {(baseballCard.Batting_Avg * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}

                        {/* Slugging Percentage */}
                        {baseballCard.Slugging_Pct !== null && baseballCard.Slugging_Pct !== undefined && (
                          <div className="flex items-center justify-between bg-green-50 rounded p-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-700">
                                Slugging %
                              </span>
                              <div className="group relative">
                                <svg
                                  className="w-3 h-3 text-gray-400 cursor-help"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <div className="absolute left-0 bottom-full mb-2 w-48 bg-gray-900 text-white text-xs rounded py-2 px-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10 pointer-events-none">
                                  How big the returns are when they hit
                                  <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            </div>
                            <span className="text-lg font-bold text-green-700">
                              {(baseballCard.Slugging_Pct * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}

                        {/* Specificity Score */}
                        {baseballCard.Specificity_Score !== null && baseballCard.Specificity_Score !== undefined && (
                          <div className="flex items-center justify-between bg-purple-50 rounded p-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-700">
                                Specificity
                              </span>
                              <div className="group relative">
                                <svg
                                  className="w-3 h-3 text-gray-400 cursor-help"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <div className="absolute left-0 bottom-full mb-2 w-48 bg-gray-900 text-white text-xs rounded py-2 px-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10 pointer-events-none">
                                  NLP score for how data heavy their questions are - measures how many numbers were in the earnings call questions
                                  <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            </div>
                            <span className="text-lg font-bold text-purple-700">
                              {baseballCard.Specificity_Score.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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

                        {/* All Dimensions by Category */}
                        {analystInsights.scores && (() => {
                          const getScoreColor = (score: number) => {
                            if (score >= 4.5) return 'rgb(34, 197, 94)'; // green-500
                            if (score >= 3.5) return 'rgb(132, 204, 22)'; // lime-500
                            if (score >= 2.5) return 'rgb(234, 179, 8)'; // yellow-500
                            if (score >= 1.5) return 'rgb(249, 115, 22)'; // orange-500
                            return 'rgb(239, 68, 68)'; // red-500
                          };

                          // Dimension descriptions
                          const dimensionDescriptions: Record<string, string> = {
                            'politeness_respect': 'Tone, courtesy, respect toward management and other participants.',
                            'aggressiveness_pressure': 'How forcefully or persistently they push for answers, challenge management.',
                            'analytical_depth': 'Overall intellectual rigor, sophistication of thinking, logical structure.',
                            'preparation_company_knowledge': 'Evidence of research, understanding of company specifics, filings, history.',
                            'clarity_structure': 'How clearly and logically the questions are formulated and organized.',
                            'constructiveness': 'Whether questions are productive vs confrontational, helpful vs nitpicking.',
                            'accounting_skepticism': 'Probing on accounting quality, KPIs, margins, working capital, adjustments.',
                            'guidance_interrogation': 'How well they drill into forward guidance, embedded assumptions, bridges.',
                            'risk_focus': 'Attention to demand risk, execution risk, regulatory risk, supply chain, macro.',
                            'capital_allocation_focus': 'Depth of questions on capex, leverage, buybacks, dividends, ROIC, M&A.',
                            'industry_contextualization': 'References to peers, competitive dynamics, regulatory environment, global macro.',
                            'model_rigorousness': 'Use of numbers, deltas, decomposition, margin math, sensitivity analysis.',
                            'quantitative_precision': 'Use of specific numbers, percentages, basis points, and precise financial metrics in questions.',
                            'temporal_specificity': 'References to specific timeframes, quarters, dates, sequential trends, and forward-looking periods.',
                            'segment_granularity': 'Depth in asking about specific product lines, geographies, customer segments, or business units.',
                            'metric_decomposition': 'Breaking down high-level metrics into components (revenue = price × volume, margin drivers, etc.).',
                            'comparative_benchmarking': 'Using specific peer comparisons, market share data, historical trends, or industry benchmarks.'
                          };

                          const generalDimensions = [
                            'politeness_respect',
                            'aggressiveness_pressure',
                            'analytical_depth',
                            'preparation_company_knowledge',
                            'clarity_structure',
                            'constructiveness'
                          ];

                          const financeSpecificDimensions = [
                            'accounting_skepticism',
                            'guidance_interrogation',
                            'risk_focus',
                            'capital_allocation_focus',
                            'industry_contextualization',
                            'model_rigorousness'
                          ];

                          const specificityDimensions = [
                            'quantitative_precision',
                            'temporal_specificity',
                            'segment_granularity',
                            'metric_decomposition',
                            'comparative_benchmarking'
                          ];

                          // Calculate overall average score
                          const allScores = Object.values(analystInsights.scores).map((v: any) => v.score);
                          const averageScore = allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length;

                          const renderDimension = ([key, value]: [string, any]) => (
                            <div key={key} className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-600 capitalize">
                                  {key.replace(/_/g, " ")}
                                </span>
                                <div className="group relative">
                                  <svg
                                    className="w-3 h-3 text-gray-400 cursor-help"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  <div className="absolute left-0 bottom-full mb-2 w-56 bg-gray-900 text-white text-xs rounded py-2 px-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10 pointer-events-none">
                                    {dimensionDescriptions[key]}
                                    <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full transition-all"
                                    style={{
                                      width: `${(value.score / 5) * 100}%`,
                                      backgroundColor: getScoreColor(value.score)
                                    }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-gray-700 w-6">
                                  {value.score}/5
                                </span>
                              </div>
                            </div>
                          );

                          return (
                            <div className="space-y-3">
                              {/* Overall Rating with Stars */}
                              <div className="bg-indigo-50 rounded-lg p-3 mb-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-gray-700">Overall Score</span>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-0.5">
                                      {[1, 2, 3, 4, 5].map((star) => {
                                        const fillPercentage = Math.max(0, Math.min(100, (averageScore - (star - 1)) * 100));
                                        return (
                                          <div key={star} className="relative w-4 h-4">
                                            {/* Empty star */}
                                            <svg
                                              className="absolute inset-0 w-4 h-4 text-gray-300"
                                              fill="currentColor"
                                              viewBox="0 0 20 20"
                                            >
                                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                            {/* Filled star with gradient */}
                                            <div
                                              className="absolute inset-0 overflow-hidden"
                                              style={{ width: `${fillPercentage}%` }}
                                            >
                                              <svg
                                                className="w-4 h-4"
                                                fill={getScoreColor(averageScore)}
                                                viewBox="0 0 20 20"
                                              >
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                              </svg>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">
                                      {averageScore.toFixed(2)}/5
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* General Dimensions */}
                              <div>
                                <p className="text-xs font-semibold text-gray-700 mb-1">
                                  General Behavioral:
                                </p>
                                <div className="space-y-1">
                                  {generalDimensions
                                    .filter(key => analystInsights.scores[key])
                                    .map(key => renderDimension([key, analystInsights.scores[key]]))}
                                </div>
                              </div>

                              {/* Finance-Specific Dimensions */}
                              <div>
                                <p className="text-xs font-semibold text-gray-700 mb-1">
                                  Finance-Specific:
                                </p>
                                <div className="space-y-1">
                                  {financeSpecificDimensions
                                    .filter(key => analystInsights.scores[key])
                                    .map(key => renderDimension([key, analystInsights.scores[key]]))}
                                </div>
                              </div>

                              {/* Specificity Dimensions */}
                              <div>
                                <p className="text-xs font-semibold text-gray-700 mb-1">
                                  Specificity:
                                </p>
                                <div className="space-y-1">
                                  {specificityDimensions
                                    .filter(key => analystInsights.scores[key])
                                    .map(key => renderDimension([key, analystInsights.scores[key]]))}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
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
                      <button
                        key={comment.question_id}
                        onClick={handleOpenEarningsModal}
                        className="block w-full text-left p-3 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-200 hover:border-indigo-300"
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
                      </button>
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

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
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
                <div>
                  <p className="text-sm text-gray-600">Forecast Duration</p>
                  <p className="font-semibold text-gray-800">
                    {selectedPrediction.horizon ? `${selectedPrediction.horizon} months` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Return</p>
                  <p className={`font-semibold ${
                    (() => {
                      const returnPct =
                        selectedPrediction.start_price && selectedPrediction.end_price && selectedPrediction.value
                          ? selectedPrediction.value > selectedPrediction.start_price
                            ? ((selectedPrediction.end_price - selectedPrediction.start_price) /
                                selectedPrediction.start_price) *
                              100
                            : ((selectedPrediction.start_price - selectedPrediction.end_price) /
                                selectedPrediction.start_price) *
                              100
                          : null;
                      return returnPct !== null && returnPct >= 0 ? "text-green-600" : "text-red-600";
                    })()
                  }`}>
                    {(() => {
                      const returnPct =
                        selectedPrediction.start_price && selectedPrediction.end_price && selectedPrediction.value
                          ? selectedPrediction.value > selectedPrediction.start_price
                            ? ((selectedPrediction.end_price - selectedPrediction.start_price) /
                                selectedPrediction.start_price) *
                              100
                            : ((selectedPrediction.start_price - selectedPrediction.end_price) /
                                selectedPrediction.start_price) *
                              100
                          : null;
                      return returnPct !== null
                        ? `${returnPct >= 0 ? "+" : ""}${returnPct.toFixed(1)}%`
                        : "N/A";
                    })()}
                  </p>
                </div>
              </div>

              {/* TradingView Widget */}
              <div className="w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
                <TradingViewChart prediction={selectedPrediction} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Earnings Call Comments Modal */}
      {showEarningsModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEarningsModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-7xl w-full h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {analyst?.full_name} - Earnings Call Commentary
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">
                    {allEarningsComments.length} total comments
                  </p>
                </div>
                <button
                  onClick={() => setShowEarningsModal(false)}
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
            </div>

            {/* Content - Two column layout */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 min-h-0 overflow-hidden">
              {/* Left Side - Scrollable Comments List */}
              <div className="bg-gray-50 rounded-lg p-4 overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 sticky top-0 bg-gray-50 pb-2">
                  All Comments ({allEarningsComments.length})
                </h3>

                {allEarningsComments.length > 0 ? (
                  <div className="space-y-3">
                    {allEarningsComments.map((comment) => (
                      <div
                        key={comment.question_id}
                        className="p-3 bg-white rounded-lg border border-gray-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-indigo-600 text-sm">
                            {comment.ticker}
                          </span>
                          <span className="text-xs text-gray-500">
                            {comment.mostimportantdateutc
                              ? new Date(comment.mostimportantdateutc).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </div>
                        <p className="text-gray-700 text-xs whitespace-pre-wrap">
                          {comment.componenttextpreview}
                        </p>
                        {comment.word_count && (
                          <p className="text-xs text-gray-400 mt-2">{comment.word_count} words</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No earnings call comments available</p>
                )}
              </div>

              {/* Right Side - Chatbot */}
              <div className="bg-gray-50 rounded-lg flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex-shrink-0">
                  <h3 className="text-lg font-semibold text-gray-800">AI Insights Assistant</h3>
                  <p className="text-gray-600 text-xs mt-1">
                    Ask me anything about {analyst?.full_name}'s earnings call commentary
                  </p>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <p className="mb-3 text-sm">Start by asking a question, for example:</p>
                      <div className="space-y-2 text-xs">
                        <p className="italic">"What companies does this analyst focus on?"</p>
                        <p className="italic">"What are their main concerns about tech stocks?"</p>
                        <p className="italic">"Summarize their recent commentary on AAPL"</p>
                      </div>
                    </div>
                  )}

                  {chatMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-800 border border-gray-200'
                        }`}
                      >
                        <p className="text-xs whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-gray-200 flex-shrink-0">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ask a question about the analyst's commentary..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 text-gray-900 bg-white"
                      disabled={chatLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={chatLoading || !inputMessage.trim()}
                      className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
