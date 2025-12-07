'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { supabase, type Analyst, type EarningsQuestion } from '@/lib/supabase';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function EarningsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const [analyst, setAnalyst] = useState<Analyst | null>(null);
  const [earningsComments, setEarningsComments] = useState<EarningsQuestion[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [unwrappedParams.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchData = async () => {
    setLoading(true);
    const analystId = parseInt(unwrappedParams.id);

    // Fetch analyst info
    const { data: analystData } = await supabase
      .from('analysts')
      .select('*')
      .eq('analyst_id', analystId)
      .single();

    if (analystData) {
      setAnalyst(analystData);
    }

    // Fetch all earnings call comments
    const { data: earningsData } = await supabase
      .from('earnings_questions')
      .select('*')
      .eq('analyst_id', analystId)
      .order('mostimportantdateutc', { ascending: false });

    if (earningsData) {
      setEarningsComments(earningsData);
    }

    setLoading(false);
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
      // Prepare context from all earnings comments
      const context = earningsComments
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading earnings call data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 py-6 px-8">
        <div className="max-w-7xl mx-auto">
          <Link
            href={`/analyst/${unwrappedParams.id}`}
            className="text-indigo-600 hover:text-indigo-800 mb-2 inline-block"
          >
            ← Back to dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-800">
            {analyst?.full_name} - Earnings Call Commentary
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-250px)]">
          {/* Left Side - Scrollable Comments List */}
          <div className="bg-white rounded-lg shadow-lg p-6 overflow-y-auto">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 sticky top-0 bg-white pb-2">
              All Comments ({earningsComments.length})
            </h2>

            {earningsComments.length > 0 ? (
              <div className="space-y-4">
                {earningsComments.map((comment) => (
                  <div
                    key={comment.question_id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-indigo-600">{comment.ticker}</span>
                      <span className="text-sm text-gray-500">
                        {comment.mostimportantdateutc
                          ? new Date(comment.mostimportantdateutc).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">
                      {comment.componenttextpreview}
                    </p>
                    {comment.word_count && (
                      <p className="text-xs text-gray-400 mt-2">{comment.word_count} words</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No earnings call comments available</p>
            )}
          </div>

          {/* Right Side - Chatbot */}
          <div className="bg-white rounded-lg shadow-lg flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-2xl font-semibold text-gray-800">AI Insights Assistant</h2>
              <p className="text-gray-600 text-sm mt-1">
                Ask me anything about {analyst?.full_name}'s earnings call commentary
              </p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p className="mb-4">Start by asking a question, for example:</p>
                  <div className="space-y-2 text-sm">
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
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4">
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
            <div className="p-6 border-t border-gray-200 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask a question about the analyst's commentary..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 text-gray-900 bg-white"
                  disabled={chatLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={chatLoading || !inputMessage.trim()}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
