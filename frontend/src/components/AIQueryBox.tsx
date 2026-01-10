'use client';

import { useState } from 'react';
import { Send, Loader, Sparkles } from 'lucide-react';
import { apiCall } from '@/lib/api';

export default function AIQueryBox() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await apiCall('/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setResponse(data.analysis || 'No response received');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
          🤖 AI Analysis
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about network risks, chains, or strategies..."
            className="flex-1 px-4 py-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-purple-900 text-purple-900 dark:text-purple-100 placeholder-purple-500 dark:placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Ask
              </>
            )}
          </button>
        </div>

        {response && (
          <div className="bg-white dark:bg-purple-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
            <p className="text-sm text-purple-900 dark:text-purple-100 leading-relaxed">
              {response}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 border border-red-200 dark:border-red-700">
            <p className="text-sm text-red-700 dark:text-red-300">
              Error: {error}
            </p>
          </div>
        )}
      </form>

      <div className="mt-3 text-xs text-purple-600 dark:text-purple-400">
        💡 Try asking: "What's the risk on Osmosis?" or "Which chains are safest?"
      </div>
    </div>
  );
}
