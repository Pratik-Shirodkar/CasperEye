'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Zap, DollarSign, AlertCircle, Send, CheckCircle, XCircle } from 'lucide-react';

interface Opportunity {
  from_protocol: string;
  to_protocol: string;
  from_name: string;
  to_name: string;
  from_apy: number;
  to_apy: number;
  apy_differential: number;
  amount_btc: number;
  gas_fees: number;
  annual_profit: number;
  net_profit: number;
  roi_percent: number;
  timestamp: string;
}

interface PerformanceMetrics {
  total_opportunities: number;
  best_roi: number;
  avg_roi: number;
  total_potential_profit: number;
  protocols_monitored: number;
}

interface SimulationResult {
  from_protocol: string;
  to_protocol: string;
  amount_btc: number;
  from_apy: number;
  to_apy: number;
  annual_profit_before: number;
  annual_profit_after: number;
  gas_fees: number;
  net_gain: number;
  roi_percent: number;
  payback_period_days: number;
}

export default function RestakingArbitrageBot() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [topOpportunities, setTopOpportunities] = useState<Opportunity[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simulationAmount, setSimulationAmount] = useState('1.0');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<{ type: 'success' | 'error' | 'pending', message: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    // Check if wallet is connected
    const checkWallet = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({
            method: 'eth_accounts'
          });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        } catch (error) {
          console.error('Failed to check wallet:', error);
        }
      }
    };

    checkWallet();

    const fetchOpportunities = async () => {
      try {
        const { apiCall } = await import('@/lib/api');
        const res = await apiCall('/restaking/opportunities');
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setOpportunities(data.opportunities || []);
        setTopOpportunities(data.top_opportunities || []);
        setMetrics(data.metrics || null);
      } catch (error) {
        console.error('Failed to fetch opportunities:', error);
        setOpportunities([]);
        setTopOpportunities([]);
        setMetrics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunities();
    const interval = setInterval(fetchOpportunities, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulate = async (opp: Opportunity) => {
    const amount = parseFloat(simulationAmount);
    console.log('Simulating with amount:', amount, 'BTC');

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setSimulating(true);
    try {
      const { apiCall } = await import('@/lib/api');
      const res = await apiCall('/restaking/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_protocol: opp.from_protocol,
          to_protocol: opp.to_protocol,
          amount_btc: amount,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log('Simulation result:', data);
      setSimulationResult(data);
      setShowModal(true);
    } catch (error) {
      console.error('Simulation failed:', error);
      alert('Simulation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSimulating(false);
    }
  };

  const handleExecute = async (opp: Opportunity) => {
    if (!walletAddress) {
      setExecutionStatus({
        type: 'error',
        message: 'Please connect your wallet first'
      });
      return;
    }

    setExecuting(true);
    setExecutionStatus({
      type: 'pending',
      message: 'Preparing transaction...'
    });

    try {
      console.log('Executing rotation:', {
        from_protocol: opp.from_protocol,
        to_protocol: opp.to_protocol,
        amount_btc: parseFloat(simulationAmount),
        wallet_address: walletAddress,
      });

      const { apiCall } = await import('@/lib/api');
      const res = await apiCall('/restaking/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_protocol: opp.from_protocol,
          to_protocol: opp.to_protocol,
          amount_btc: parseFloat(simulationAmount),
          wallet_address: walletAddress,
        }),
      });

      console.log('Execute response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Execute error response:', errorText);
        throw new Error(`HTTP error! status: ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      console.log('Execute response data:', data);

      if (data.success && data.tx_hash) {
        setExecutionStatus({
          type: 'success',
          message: `✅ Rotation executed! TX: ${data.tx_hash.slice(0, 10)}...`
        });
      } else if (data.error) {
        setExecutionStatus({
          type: 'error',
          message: `Error: ${data.error}`
        });
      } else {
        setExecutionStatus({
          type: 'error',
          message: 'Unexpected response from server'
        });
      }
    } catch (error) {
      console.error('Execution failed:', error);
      setExecutionStatus({
        type: 'error',
        message: `Failed to execute: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 dark:from-purple-950 dark:via-pink-950 dark:to-purple-950 rounded-xl p-8 border border-purple-200 dark:border-purple-800">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full animate-spin" style={{ maskImage: 'radial-gradient(circle, transparent 30%, black 70%)' }}></div>
            <div className="absolute inset-2 bg-purple-50 dark:bg-purple-950 rounded-full flex items-center justify-center">
              <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-1">
              Analyzing Arbitrage Opportunities
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300 animate-pulse">
              Scanning protocols for optimal yield rotations...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-2">
          <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 text-sm">🤖 Restaking Arbitrage Bot</h3>
            <p className="text-xs text-purple-800 dark:text-purple-200 mt-1">AI-powered agent detecting yield arbitrage opportunities. Rotate your BTC across protocols to maximize returns.</p>
          </div>
        </div>
      </div>

      {/* Metrics & Top Opportunities Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Metrics Box */}
        {metrics && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <h4 className="text-xs font-semibold mb-3 text-gray-900 dark:text-white">Metrics</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-50 dark:bg-purple-900/30 rounded p-3">
                <div className="text-xs text-purple-600 dark:text-purple-300 mb-1">Opportunities</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-300">
                  {metrics.total_opportunities}
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/30 rounded p-3">
                <div className="text-xs text-green-600 dark:text-green-300 mb-1">Best ROI</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-300">
                  {metrics.best_roi}%
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-3">
                <div className="text-xs text-blue-600 dark:text-blue-300 mb-1">Avg ROI</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">
                  {metrics.avg_roi}%
                </div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/30 rounded p-3">
                <div className="text-xs text-orange-600 dark:text-orange-300 mb-1">Total Profit</div>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-300">
                  {metrics.total_potential_profit.toFixed(4)} BTC
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Opportunities Box */}
        {topOpportunities.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <h4 className="text-xs font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-3 h-3" />
              Top Opportunities
            </h4>

            <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
              {topOpportunities.map((opp, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedOpp(opp)}
                  className="w-full p-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded border border-green-200 dark:border-green-800 hover:shadow-md transition-all text-left text-xs"
                >
                  <div className="flex justify-between items-center gap-1">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white truncate">
                        {opp.from_name.split(' ')[0]} → {opp.to_name.split(' ')[0]}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {opp.from_apy}% → {opp.to_apy}%
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-green-600 dark:text-green-400">
                        +{opp.roi_percent}%
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Simulation Input */}
      {selectedOpp && (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Amount (BTC)</label>
              <input
                type="number"
                value={simulationAmount}
                onChange={(e) => setSimulationAmount(e.target.value)}
                step="0.1"
                min="0.1"
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                placeholder="1.0"
              />
            </div>
            <button
              onClick={() => handleSimulate(selectedOpp)}
              disabled={simulating}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded font-medium transition-colors text-sm disabled:opacity-50 flex items-center gap-1"
            >
              {simulating ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Simulating...
                </>
              ) : (
                'Simulate'
              )}
            </button>
            <button
              onClick={() => handleExecute(selectedOpp)}
              disabled={executing || !walletAddress}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded font-medium transition-colors disabled:opacity-50 flex items-center gap-1 text-sm"
            >
              <Send className="w-3 h-3" />
              {executing ? 'Exec...' : walletAddress ? 'Execute' : 'Connect'}
            </button>
          </div>

          {executionStatus && (
            <div className={`mt-2 p-2 rounded flex items-center gap-1 text-xs ${executionStatus.type === 'success' ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' :
                executionStatus.type === 'error' ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800' :
                  'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
              }`}>
              {executionStatus.type === 'success' && <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />}
              {executionStatus.type === 'error' && <XCircle className="w-3 h-3 text-red-600 flex-shrink-0" />}
              {executionStatus.type === 'pending' && <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
              <p className={
                executionStatus.type === 'success' ? 'text-green-800 dark:text-green-200' :
                  executionStatus.type === 'error' ? 'text-red-800 dark:text-red-200' :
                    'text-blue-800 dark:text-blue-200'
              }>
                {executionStatus.message}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loading Modal */}
      {simulating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl border border-purple-500/30 shadow-2xl p-12 text-center">
            <div className="flex justify-center mb-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full animate-spin" style={{ maskImage: 'radial-gradient(circle, transparent 30%, black 70%)' }}></div>
                <div className="absolute inset-2 bg-slate-900 rounded-full flex items-center justify-center">
                  <Zap className="w-8 h-8 text-purple-400 animate-pulse" />
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Analyzing Rotation</h3>
            <p className="text-gray-300 text-sm">Calculating optimal profit strategy...</p>
          </div>
        </div>
      )}

      {/* Futuristic Modal */}
      {showModal && simulationResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl border border-purple-500/30 shadow-2xl w-full max-w-4xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-5 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Rotation Analysis</h2>
                <p className="text-sm text-purple-100 mt-1">Rotating {simulationAmount} BTC</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200 transition text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Protocol Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                  <div className="text-xs text-purple-300 mb-1 font-semibold">FROM</div>
                  <div className="text-2xl font-bold text-white">{simulationResult.from_apy}%</div>
                  <div className="text-xs text-gray-400">Current APY</div>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <div className="text-xs text-green-300 mb-1 font-semibold">TO</div>
                  <div className="text-2xl font-bold text-white">{simulationResult.to_apy}%</div>
                  <div className="text-xs text-gray-400">Target APY</div>
                </div>
              </div>

              {/* Profit Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between p-2 bg-slate-800/50 rounded border border-slate-700/50 text-sm">
                  <span className="text-gray-300">Profit Increase</span>
                  <span className="font-mono text-green-400 font-bold">+{(simulationResult.annual_profit_after - simulationResult.annual_profit_before).toFixed(6)} BTC</span>
                </div>
                <div className="flex justify-between p-2 bg-red-500/10 rounded border border-red-500/30 text-sm">
                  <span className="text-gray-300">Gas Fees</span>
                  <span className="font-mono text-red-400 font-bold">-{simulationResult.gas_fees.toFixed(6)} BTC</span>
                </div>
                <div className="flex justify-between p-2 bg-green-500/10 rounded border border-green-500/30 text-sm">
                  <span className="text-gray-300">Net Gain</span>
                  <span className="font-mono text-green-400 font-bold">+{simulationResult.net_gain.toFixed(6)} BTC</span>
                </div>
              </div>

              {/* Profit Visualization */}
              <div className="space-y-3">
                {/* Profit Chart */}
                <div className="bg-slate-800/50 rounded p-3 border border-slate-700/50">
                  <div className="text-xs text-gray-300 mb-2 font-semibold">ANNUAL PROFIT COMPARISON</div>
                  <div className="space-y-2">
                    {/* Before */}
                    <div>
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <span className="text-gray-400">Before</span>
                        <span className="font-mono text-gray-300">{simulationResult.annual_profit_before.toFixed(6)} BTC</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.min((simulationResult.annual_profit_before / simulationResult.annual_profit_after) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* After */}
                    <div>
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <span className="text-gray-400">After</span>
                        <span className="font-mono text-green-400">{simulationResult.annual_profit_after.toFixed(6)} BTC</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-green-500 h-full rounded-full"
                          style={{ width: '100%' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Gain Highlight */}
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-4 text-center">
                  <div className="text-xs text-green-300 mb-1 font-semibold">NET GAIN</div>
                  <div className="text-3xl font-bold text-green-400 mb-1">
                    +{simulationResult.net_gain.toFixed(6)} BTC
                  </div>
                  <div className="text-lg font-bold text-green-300">
                    {simulationResult.roi_percent}% ROI
                  </div>
                  {simulationResult.payback_period_days !== Infinity && (
                    <div className="text-xs text-green-300 mt-1">
                      Payback in {simulationResult.payback_period_days} days
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleExecute(selectedOpp!);
                    setShowModal(false);
                  }}
                  disabled={executing || !walletAddress}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {executing ? 'Executing...' : walletAddress ? 'Execute Now' : 'Connect Wallet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {opportunities.length === 0 && !loading && (
        <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            No arbitrage opportunities detected at the moment. Check back soon!
          </p>
        </div>
      )}
    </div>
  );
}
