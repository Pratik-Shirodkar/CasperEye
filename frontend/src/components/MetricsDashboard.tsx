"use client";
import { useEffect, useState } from 'react';
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface Metrics {
  total_staked_btc: number;
  total_providers: number;
  total_chains: number;
  concentration_ratio: number;
  risk_score: number;
  last_update: string;
}

export default function MetricsDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { apiCall } = await import('@/lib/api');
        const res = await apiCall('/metrics');

        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        } else {
          console.error('Failed to fetch metrics:', res.status);
        }
      } catch (e) {
        console.error('Failed to fetch metrics:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <div className="animate-pulse">Loading metrics...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <div className="text-red-400">Failed to load metrics</div>
      </div>
    );
  }

  const getRiskColor = (score: number) => {
    if (score < 3) return 'text-green-400';
    if (score < 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRiskLabel = (score: number) => {
    if (score < 3) return 'SAFE';
    if (score < 6) return 'MODERATE';
    return 'CRITICAL';
  };

  const getConcentrationColor = (ratio: number) => {
    if (ratio < 0.5) return 'text-green-400';
    if (ratio < 0.8) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <h3 className="text-lg font-semibold mb-4">Network Metrics</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {/* Total Staked BTC */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Total Staked</div>
          <div className="text-2xl font-bold text-blue-400">{metrics.total_staked_btc}</div>
          <div className="text-xs text-gray-500">BTC</div>
        </div>

        {/* Total Providers */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Providers</div>
          <div className="text-2xl font-bold text-purple-400">{metrics.total_providers}</div>
          <div className="text-xs text-gray-500">Validators</div>
        </div>

        {/* Total Chains */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Chains</div>
          <div className="text-2xl font-bold text-blue-400">{metrics.total_chains}</div>
          <div className="text-xs text-gray-500">Secured</div>
        </div>

        {/* Concentration Ratio */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Concentration</div>
          <div className={`text-2xl font-bold ${getConcentrationColor(metrics.concentration_ratio)}`}>
            {(metrics.concentration_ratio * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500">Top 3 Providers</div>
        </div>

        {/* Risk Score */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Risk Score</div>
          <div className={`text-2xl font-bold ${getRiskColor(metrics.risk_score)}`}>
            {metrics.risk_score.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">/ 10</div>
        </div>

        {/* Risk Level */}
        <div className="bg-gray-800 rounded p-3">
          <div className="text-xs text-gray-400 mb-1">Status</div>
          <div className={`text-2xl font-bold ${getRiskColor(metrics.risk_score)}`}>
            {getRiskLabel(metrics.risk_score)}
          </div>
          <div className="text-xs text-gray-500">Overall</div>
        </div>
      </div>

      {/* Risk Breakdown */}
      <div className="bg-gray-800 rounded p-4 mb-4">
        <h4 className="text-sm font-semibold mb-3">Risk Breakdown</h4>

        {/* Concentration Risk */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm">Concentration Risk</span>
            <span className={`text-sm font-semibold ${getConcentrationColor(metrics.concentration_ratio)}`}>
              {metrics.concentration_ratio < 0.5
                ? 'Low'
                : metrics.concentration_ratio < 0.8
                  ? 'Medium'
                  : 'High'}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded h-2">
            <div
              className={`h-2 rounded ${metrics.concentration_ratio < 0.5
                  ? 'bg-green-500'
                  : metrics.concentration_ratio < 0.8
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
              style={{ width: `${Math.min(metrics.concentration_ratio * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Provider Diversity */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm">Provider Diversity</span>
            <span className="text-sm font-semibold text-blue-400">
              {metrics.total_providers} providers
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded h-2">
            <div
              className="h-2 rounded bg-blue-500"
              style={{ width: `${Math.min((metrics.total_providers / 50) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Chain Coverage */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm">Chain Coverage</span>
            <span className="text-sm font-semibold text-purple-400">
              {metrics.total_chains} chains
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded h-2">
            <div
              className="h-2 rounded bg-purple-500"
              style={{ width: `${(metrics.total_chains / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-gray-800 rounded p-4">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          {metrics.risk_score < 3 ? (
            <CheckCircle size={16} className="text-green-400" />
          ) : metrics.risk_score < 6 ? (
            <AlertCircle size={16} className="text-yellow-400" />
          ) : (
            <AlertCircle size={16} className="text-red-400" />
          )}
          Recommendations
        </h4>
        <ul className="space-y-2 text-xs text-gray-300">
          {metrics.concentration_ratio > 0.8 && (
            <li>• High concentration detected. Consider diversifying across more providers.</li>
          )}
          {metrics.total_providers < 5 && (
            <li>• Limited provider diversity. Add more validators for redundancy.</li>
          )}
          {metrics.total_chains < 3 && (
            <li>• Few chains secured. Expand to more consumer chains.</li>
          )}
          {metrics.risk_score < 3 && (
            <li>✓ Network is well-distributed and secure.</li>
          )}
        </ul>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Last updated: {new Date(metrics.last_update).toLocaleTimeString()}
      </div>
    </div>
  );
}
