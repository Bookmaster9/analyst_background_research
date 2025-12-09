'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type Analyst } from '@/lib/supabase';

const features = [
  {
    image: '/earnings-commentary-example.png',
    alt: 'Earnings Commentary AI Chat',
    title: 'AI-Powered Commentary Analysis',
    description: 'Chat with an AI trained on all of an analyst\'s earnings call questions to understand their analytical style and focus areas.'
  },
  {
    image: '/earnings-ratings.png',
    alt: 'Analyst Performance Ratings',
    title: 'Comprehensive Performance Ratings',
    description: 'See detailed breakdowns across 17 dimensions including analytical depth, accounting skepticism, and quantitative precision.'
  },
  {
    image: '/forecast-example.png',
    alt: 'Stock Price Forecast Visualization',
    title: 'Interactive Forecast Tracking',
    description: 'View analyst price targets overlaid on TradingView charts to track prediction accuracy and investment performance.'
  }
];

export default function Home() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Analyst[]>([]);
  const [exampleAnalysts, setExampleAnalysts] = useState<Analyst[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  // Fetch example analysts on component mount
  useEffect(() => {
    fetchExampleAnalysts();
  }, []);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000); // Rotate every 5 seconds
    return () => clearInterval(interval);
  }, [activeFeature]); // Reset interval when activeFeature changes

  const fetchExampleAnalysts = async () => {
    // Fetch random analysts
    // First get total count
    const { count } = await supabase
      .from('analysts')
      .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      // Generate 5 random offsets
      const randomAnalysts: Analyst[] = [];
      const attempts = Math.min(10, count); // Try up to 10 times to get 5 analysts

      for (let i = 0; i < attempts && randomAnalysts.length < 5; i++) {
        const randomOffset = Math.floor(Math.random() * count);
        const { data } = await supabase
          .from('analysts')
          .select('*')
          .range(randomOffset, randomOffset)
          .limit(1);

        if (data && data.length > 0 && !randomAnalysts.find(a => a.analyst_id === data[0].analyst_id)) {
          randomAnalysts.push(data[0]);
        }
      }

      setExampleAnalysts(randomAnalysts);
    }
  };

  const handleSearch = async (value: string) => {
    setSearchTerm(value);

    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('analysts')
      .select('*')
      .ilike('full_name', `%${value}%`)
      .limit(10);

    if (data && !error) {
      setSuggestions(data);
    }
    setLoading(false);
  };

  const handleSelectAnalyst = (analystId: number) => {
    router.push(`/analyst/${analystId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating symbols */}
        <div className="absolute top-20 left-10 text-indigo-300/20 text-6xl animate-float">$</div>
        <div className="absolute top-40 right-20 text-blue-300/20 text-5xl animate-float-delayed">₿</div>
        <div className="absolute bottom-40 left-1/4 text-indigo-400/20 text-7xl animate-float-slow">€</div>
        <div className="absolute top-1/3 right-1/3 text-blue-400/20 text-4xl animate-float">¥</div>
        <div className="absolute bottom-20 right-10 text-indigo-300/20 text-6xl animate-float-delayed">£</div>

        {/* Animated grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-indigo-300"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Floating chart lines */}
        <div className="absolute top-1/4 left-0 w-full h-32 opacity-20">
          <svg width="100%" height="100%" viewBox="0 0 1000 100" preserveAspectRatio="none">
            <path
              d="M0,50 Q250,20 500,50 T1000,50"
              fill="none"
              stroke="url(#gradient1)"
              strokeWidth="2"
              className="animate-pulse"
            />
            <defs>
              <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0" />
                <stop offset="50%" stopColor="#818cf8" stopOpacity="1" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Binary code rain effect */}
        <div className="absolute top-0 left-1/4 text-xs text-indigo-400/10 font-mono animate-scroll-down">
          01001001 01001110 01010110 01000101 01010011 01010100
        </div>
        <div className="absolute top-0 right-1/4 text-xs text-blue-400/10 font-mono animate-scroll-down-delayed">
          01000001 01001110 01000001 01001100 01011001 01010011 01010100
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Main Search Section */}
          <div className="flex-1 flex flex-col justify-start items-center pt-20">
            <div className="w-full max-w-2xl">
              <h1 className="text-6xl font-bold text-white mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200">
                Analyst Dashboard
              </h1>
              <p className="text-xl text-indigo-200 mb-12 text-center">
                Search for financial analysts and explore their insights
              </p>

              {/* Search Box */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search for an analyst..."
                  className="w-full px-6 py-4 text-lg text-gray-900 bg-white/90 backdrop-blur-sm border-2 border-indigo-300/50 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/50 shadow-2xl placeholder:text-gray-400 transition-all"
                />

                {/* Autocomplete Suggestions */}
                {suggestions.length > 0 && (
                  <div className="absolute w-full mt-2 bg-white/95 backdrop-blur-sm border border-indigo-200/50 rounded-lg shadow-2xl z-10 max-h-80 overflow-y-auto">
                    {suggestions.map((analyst) => (
                      <button
                        key={analyst.analyst_id}
                        onClick={() => handleSelectAnalyst(analyst.analyst_id)}
                        className="w-full px-6 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-800">
                          {analyst.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {analyst.first_initial_last_name}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Loading indicator */}
                {loading && (
                  <div className="absolute right-4 top-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                  </div>
                )}
              </div>

              {/* Feature Showcase Carousel */}
              <div className="mt-16 w-full max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-white mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200">
                  Platform Features
                </h2>

                <div className="relative h-[500px] flex items-center justify-center">
                  {features.map((feature, index) => {
                    const position = (index - activeFeature + features.length) % features.length;
                    const isCenter = position === 0;
                    const isLeft = position === features.length - 1;
                    const isRight = position === 1;
                    const isHidden = position > 1 && position < features.length - 1;

                    return (
                      <div
                        key={index}
                        className={`absolute transition-all duration-700 ease-in-out ${
                          isHidden ? 'opacity-0 pointer-events-none' : ''
                        } ${
                          isCenter
                            ? 'z-20 scale-100 opacity-100'
                            : 'z-10 scale-75 opacity-60 blur-sm'
                        }`}
                        style={{
                          left: isCenter ? '50%' : isLeft ? '10%' : isRight ? '90%' : '50%',
                          transform: isCenter
                            ? 'translateX(-50%)'
                            : isLeft
                            ? 'translateX(-50%)'
                            : isRight
                            ? 'translateX(-50%)'
                            : 'translateX(-50%)',
                          width: isCenter ? '400px' : '240px',
                          maxWidth: isCenter ? '400px' : '240px',
                          top: '0'
                        }}
                      >
                        <div
                          className={`cursor-pointer ${
                            !isCenter ? 'hover:scale-95 hover:opacity-80 transition-all duration-300' : ''
                          }`}
                          onClick={() => {
                            if (!isCenter) {
                              setActiveFeature(index);
                            }
                          }}
                        >
                          <div
                            className={`relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 ${
                              isCenter
                                ? 'hover:shadow-2xl hover:-translate-y-2 hover:brightness-110 hover:ring-2 hover:ring-indigo-400'
                                : ''
                            }`}
                          >
                            <img
                              src={feature.image}
                              alt={feature.alt}
                              className="w-full transition-transform duration-300"
                              style={{
                                height: isCenter ? '300px' : '180px',
                                objectFit: 'cover',
                                objectPosition: 'top'
                              }}
                            />
                          </div>
                          {isCenter && (
                            <div className="mt-4 text-center px-4">
                              <h3 className="text-lg font-semibold text-white mb-2">
                                {feature.title}
                              </h3>
                              <p className="text-indigo-200 text-sm">
                                {feature.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Navigation Dots */}
                <div className="flex justify-center gap-2 mt-4">
                  {features.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveFeature(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        index === activeFeature
                          ? 'bg-indigo-400 w-8'
                          : 'bg-indigo-600/30 hover:bg-indigo-500/50'
                      }`}
                      aria-label={`Go to feature ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Example Analysts Sidebar */}
          <div className="lg:w-80">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-2xl p-6 border border-indigo-200/50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Example Analysts
                </h2>
                <button
                  onClick={fetchExampleAnalysts}
                  className="text-indigo-600 hover:text-indigo-800 transition-colors"
                  title="Get new random analysts"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                Click on any analyst to view their dashboard
              </p>

              <div className="space-y-3">
                {exampleAnalysts.map((analyst) => (
                  <button
                    key={analyst.analyst_id}
                    onClick={() => handleSelectAnalyst(analyst.analyst_id)}
                    className="w-full p-4 text-left bg-gray-50 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-200 hover:border-indigo-300"
                  >
                    <div className="font-medium text-gray-800">
                      {analyst.full_name}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {analyst.first_initial_last_name}
                    </div>
                  </button>
                ))}
              </div>

              {exampleAnalysts.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  Loading examples...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
