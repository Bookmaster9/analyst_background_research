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
    // Fetch specific analysts that we know have predictions
    const { data, error } = await supabase
      .from('analysts')
      .select('*')
      .in('analyst_id', [659, 592, 725, 871, 178]);

    console.log('Fetched analysts:', data, 'Error:', error);
    if (data && !error) {
      setExampleAnalysts(data);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Search Section */}
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="w-full max-w-2xl">
              <h1 className="text-5xl font-bold text-gray-800 mb-4 text-center">
                Analyst Dashboard
              </h1>
              <p className="text-xl text-gray-600 mb-12 text-center">
                Search for financial analysts and explore their insights
              </p>

              {/* Search Box */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search for an analyst..."
                  className="w-full px-6 py-4 text-lg text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 shadow-lg placeholder:text-gray-400"
                />

                {/* Autocomplete Suggestions */}
                {suggestions.length > 0 && (
                  <div className="absolute w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-10 max-h-80 overflow-y-auto">
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
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Example Analysts
              </h2>
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
