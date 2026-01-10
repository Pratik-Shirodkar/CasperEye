"use client";
import { useEffect, useState } from 'react';
import LiveGraph from '@/components/LiveGraph';
import DataTable from '@/components/DataTable';
import SankeyDiagram from '@/components/SankeyDiagram';
import ConcentrationHeatmap from '@/components/ConcentrationHeatmap';
import MetricsDashboard from '@/components/MetricsDashboard';
import ChainDetailsModal from '@/components/ChainDetailsModal';
import { ShieldAlert, CheckCircle, TrendingUp, Zap, Calendar, AlertCircle } from 'lucide-react';
import SimpleWallet from '@/components/SimpleWallet';
import ThemeToggle from '@/components/ThemeToggle';
import WhaleAlerts from '@/components/WhaleAlerts';
import UnbondingForecast from '@/components/UnbondingForecast';
import RestakingArbitrageBot from '@/components/RestakingArbitrageBot';
import AIQueryBox from '@/components/AIQueryBox';
import AuthGate from '@/components/AuthGate';
import WelcomePage from '@/components/WelcomePage';
import ErrorBoundary from '@/components/ErrorBoundary';
import { apiCall } from '@/lib/api';

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [risks, setRisks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'network' | 'arbitrage' | 'unbonding' | 'alerts'>('network');
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [visualTab, setVisualTab] = useState<'graph' | 'table' | 'sankey' | 'heatmap' | 'metrics'>('graph');


  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch risk analysis
        try {
          const riskRes = await apiCall('/risk-analysis');
          if (riskRes.ok) {
            const riskData = await riskRes.json();
            if (Array.isArray(riskData)) {
              setRisks(riskData);
            } else {
              console.warn('Risk data is not an array:', riskData);
              setRisks([]);
            }
          } else {
            console.warn('Risk analysis API returned:', riskRes.status);
            setRisks([]);
          }
        } catch (err) {
          console.error('Failed to fetch risk analysis:', err);
          setRisks([]);
        }

        // Fetch graph data
        try {
          const graphRes = await apiCall('/graph-data');
          if (graphRes.ok) {
            const graphDataRes = await graphRes.json();
            if (graphDataRes && typeof graphDataRes === 'object' && (graphDataRes.nodes || graphDataRes.links)) {
              setGraphData(graphDataRes);
            } else {
              console.warn('Graph data is invalid:', graphDataRes);
              setGraphData({ nodes: [], links: [] });
            }
          } else {
            console.warn('Graph data API returned:', graphRes.status);
            setGraphData({ nodes: [], links: [] });
          }
        } catch (err) {
          console.error('Failed to fetch graph data:', err);
          setGraphData({ nodes: [], links: [] });
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setRisks([]);
        setGraphData({ nodes: [], links: [] });
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ErrorBoundary>
      {showWelcome ? (
        <WelcomePage onEnterApp={() => {
          setShowWelcome(false);
        }} />
      ) : (
        <AuthGate>
          <main className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white transition-colors">
            {/* Header */}
            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">
                    CasperEye
                  </h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Casper Network Staking Intelligence</p>
                </div>
                <div className="flex items-center gap-3">
                  <ThemeToggle />
                  <SimpleWallet />
                </div>
              </div>
            </header>

            {/* Main Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="max-w-7xl mx-auto px-8 flex gap-8">
                {[
                  { id: 'network', label: '📊 Network', icon: TrendingUp },
                  { id: 'arbitrage', label: '⚡ Arbitrage', icon: Zap },
                  { id: 'unbonding', label: '📅 Unbonding', icon: Calendar },
                  { id: 'alerts', label: '🚨 Alerts', icon: AlertCircle },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-4 font-medium border-b-2 transition ${activeTab === tab.id
                        ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-8 py-8">
              {/* Network Tab */}
              {activeTab === 'network' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Network Analysis</h2>
                    <div className="flex gap-2 flex-wrap mb-6">
                      {[
                        { id: 'graph', label: 'Graph' },
                        { id: 'table', label: 'Table' },
                        { id: 'sankey', label: 'Sankey' },
                        { id: 'heatmap', label: 'Heatmap' },
                        { id: 'metrics', label: 'Metrics' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setVisualTab(tab.id as any)}
                          className={`px-4 py-2 rounded font-medium transition ${visualTab === tab.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Two Column Layout: Graph + Smart Money */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Visualizations (2/3 width) */}
                    <div className="lg:col-span-2">
                      {visualTab === 'graph' && <LiveGraph />}
                      {visualTab === 'table' && <DataTable />}
                      {visualTab === 'sankey' && graphData?.nodes?.length > 0 && <SankeyDiagram />}
                      {visualTab === 'heatmap' && graphData?.nodes?.length > 0 && <ConcentrationHeatmap />}
                      {visualTab === 'metrics' && <MetricsDashboard />}
                    </div>

                    {/* Right: Smart Money Alerts + AI Query (1/3 width) */}
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                        <h3 className="text-lg font-semibold mb-4">Smart Money Alerts</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {Array.isArray(risks) && risks.length > 0 ? (
                            risks.map((item) => (
                              <div
                                key={item.chain}
                                onClick={() => setSelectedChain(item.chain)}
                                className={`p-3 rounded-lg border transition-colors cursor-pointer hover:shadow-lg ${item.risk === 'CRITICAL'
                                    ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
                                    : 'border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/30'
                                  }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm truncate">{item.chain}</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                      {item.smart_money_cspr || item.smart_money_btc} CSPR
                                    </div>
                                  </div>
                                  {item.risk === 'CRITICAL' ? (
                                    <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
                                  ) : (
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              Loading risk data...
                            </div>
                          )}
                        </div>
                      </div>

                      <AIQueryBox />
                    </div>
                  </div>
                </div>
              )}

              {/* Arbitrage Tab */}
              {activeTab === 'arbitrage' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Restaking Arbitrage Bot</h2>
                  <RestakingArbitrageBot />
                </div>
              )}

              {/* Unbonding Tab */}
              {activeTab === 'unbonding' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Unbonding Forecast</h2>
                  <UnbondingForecast />
                </div>
              )}

              {/* Alerts Tab */}
              {activeTab === 'alerts' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Whale Alerts</h2>
                  <WhaleAlerts />
                </div>
              )}
            </div>

            {/* Chain Details Modal */}
            {selectedChain && (
              <ChainDetailsModal
                chain={selectedChain}
                onClose={() => setSelectedChain(null)}
                data={graphData}
                risks={Array.isArray(risks) ? risks : []}
              />
            )}
          </main>
        </AuthGate>
      )}
    </ErrorBoundary>
  );
}