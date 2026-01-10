'use client';

import { useState } from 'react';
import { Bell, Check, AlertCircle } from 'lucide-react';

export default function WhaleAlerts() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setStatus('error');
      setMessage('Please enter an email address');
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      const { apiCall } = await import('@/lib/api');
      const response = await apiCall('/whale-alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to subscribe');
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      setStatus('error');
      setMessage('Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-lg p-6 border border-amber-200 dark:border-amber-800">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
          🐋 Whale Watcher Alerts
        </h3>
      </div>

      <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
        Get instant email notifications when Smart Money moves. Alerts trigger for transactions over 10 BTC.
      </p>

      <form onSubmit={handleSubscribe} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="flex-1 px-4 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-900 text-amber-900 dark:text-amber-100 placeholder-amber-500 dark:placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Subscribing...' : 'Alert Me'}
        </button>
      </form>

      {status === 'success' && (
        <div className="mt-3 flex items-center gap-2 text-green-700 dark:text-green-400 text-sm">
          <Check className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-3 flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
