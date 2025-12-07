'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type Analyst } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Analyst[]>([]);
  const [exampleAnalysts, setExampleAnalysts] = useState<Analyst[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch example analysts on component mount
  useEffect(() => {
    fetchExampleAnalysts();
  }, []);

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
