'use client';

import { useState } from 'react';
import { Zap, TrendingUp, Shield, Brain, ArrowRight, BarChart3, AlertTriangle, Zap as ZapIcon, TrendingDown } from 'lucide-react';

interface WelcomePageProps {
  onEnterApp: () => void;
}

export default function WelcomePage({ onEnterApp }: WelcomePageProps) {
  const [activeTab, setActiveTab] = useState<'features' | 'data' | 'use-cases'>('features');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex justify-between items-center px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold">CasperEye</span>
          </div>
          <div className="text-sm text-gray-400">CSPR Staking Intelligence</div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-8 py-16">
          <div className="space-y-12">
            {/* Header with CTA */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-12">
              <div className="flex-1">
                <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  CSPR Staking
                  <span className="bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent"> Intelligence</span>
                </h1>
                <p className="text-xl text-gray-300 leading-relaxed max-w-2xl">
                  Real-time risk analysis, AI-powered insights, and staking analytics for Casper Network. Monitor validator performance, track whale movements, and optimize your CSPR delegation strategy.
                </p>
              </div>

              <div className="flex-shrink-0">
                <button
                  onClick={onEnterApp}
                  className="group relative px-12 py-6 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:via-pink-500 hover:to-purple-500 text-white rounded-xl font-bold text-lg transition-all duration-300 flex items-center gap-3 whitespace-nowrap shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transform"
                >
                  <span>Enter App</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur"></div>
                </button>
                <p className="text-center text-sm text-gray-400 mt-3">Start analyzing in seconds</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-white/10">
              {[
                { id: 'features', label: '✨ Features' },
                { id: 'data', label: '📊 Live Data' },
                { id: 'use-cases', label: '🎯 Use Cases' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 font-medium border-b-2 transition ${activeTab === tab.id
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Features Tab */}
            {activeTab === 'features' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-purple-500/50 transition">
                  <div className="flex items-start gap-4">
                    <Shield className="w-8 h-8 text-green-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Secure Wallet Auth</h3>
                      <p className="text-gray-400">EIP-191 signature verification. No passwords, no private keys. Your wallet proves ownership.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-purple-500/50 transition">
                  <div className="flex items-start gap-4">
                    <TrendingUp className="w-8 h-8 text-blue-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Real-time Risk Analysis</h3>
                      <p className="text-gray-400">Live concentration metrics, smart money tracking, and risk scoring across all monitored chains.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-purple-500/50 transition">
                  <div className="flex items-start gap-4">
                    <ZapIcon className="w-8 h-8 text-yellow-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Arbitrage Bot</h3>
                      <p className="text-gray-400">Detect yield differentials, simulate rotations, and execute transactions with profit tracking.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-purple-500/50 transition">
                  <div className="flex items-start gap-4">
                    <Brain className="w-8 h-8 text-purple-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">AI-Powered Insights</h3>
                      <p className="text-gray-400">AWS Bedrock Claude analysis. Ask questions about risks, strategies, and market conditions.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-purple-500/50 transition">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Whale Alerts</h3>
                      <p className="text-gray-400">Monitor large transactions, track smart money movements, and get notified of significant events.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-purple-500/50 transition">
                  <div className="flex items-start gap-4">
                    <TrendingDown className="w-8 h-8 text-orange-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Unbonding Forecast</h3>
                      <p className="text-gray-400">Predict liquidity shocks, identify supply shock dates, and plan ahead for market events.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Data Tab */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-6">
                    <div className="text-sm text-purple-300 mb-2">Network Nodes</div>
                    <div className="text-4xl font-bold text-purple-400">21</div>
                    <div className="text-xs text-gray-400 mt-2">Active validators & providers</div>
                  </div>

                  <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/20 border border-pink-500/30 rounded-lg p-6">
                    <div className="text-sm text-pink-300 mb-2">Validators</div>
                    <div className="text-4xl font-bold text-pink-400">100+</div>
                    <div className="text-xs text-gray-400 mt-2">Active Casper validators</div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-6">
                    <div className="text-sm text-blue-300 mb-2">Whales Tracked</div>
                    <div className="text-4xl font-bold text-blue-400">3</div>
                    <div className="text-xs text-gray-400 mt-2">&gt;100K CSPR stakers</div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-6">
                    <div className="text-sm text-green-300 mb-2">Risk Score</div>
                    <div className="text-4xl font-bold text-green-400">5.2</div>
                    <div className="text-xs text-gray-400 mt-2">Out of 10 (Lower is better)</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Chain Risk Breakdown</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Osmosis</span>
                          <span className="text-sm text-green-400">SAFE</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Neutron</span>
                          <span className="text-sm text-red-400">CRITICAL</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div className="bg-red-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Stargaze</span>
                          <span className="text-sm text-red-400">CRITICAL</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div className="bg-red-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Arbitrage Opportunities</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/30 rounded">
                        <div>
                          <div className="text-sm font-medium">Lombard → Solv</div>
                          <div className="text-xs text-gray-400">8.5% → 12.3% APY</div>
                        </div>
                        <div className="text-green-400 font-bold">+3.8%</div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/30 rounded">
                        <div>
                          <div className="text-sm font-medium">Babylon → Lombard</div>
                          <div className="text-xs text-gray-400">7.2% → 8.5% APY</div>
                        </div>
                        <div className="text-green-400 font-bold">+1.3%</div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                        <div>
                          <div className="text-sm font-medium">Solv → Babylon</div>
                          <div className="text-xs text-gray-400">12.3% → 7.2% APY</div>
                        </div>
                        <div className="text-yellow-400 font-bold">-5.1%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Use Cases Tab */}
            {activeTab === 'use-cases' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-3">🏦 For Institutional Investors</h3>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>✓ Monitor concentration risks across protocols</li>
                    <li>✓ Track smart money movements in real-time</li>
                    <li>✓ Identify yield optimization opportunities</li>
                    <li>✓ Get AI-powered risk assessments</li>
                  </ul>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-3">🤖 For Arbitrage Traders</h3>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>✓ Detect APY differentials automatically</li>
                    <li>✓ Simulate rotations before execution</li>
                    <li>✓ Execute transactions with profit tracking</li>
                    <li>✓ Analyze historical performance</li>
                  </ul>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-3">📊 For Risk Analysts</h3>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>✓ Visualize network topology and flows</li>
                    <li>✓ Analyze concentration metrics</li>
                    <li>✓ Predict liquidity shocks</li>
                    <li>✓ Generate risk reports</li>
                  </ul>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-3">🔍 For Protocol Teams</h3>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>✓ Monitor your protocol's health</li>
                    <li>✓ Track user flows and migrations</li>
                    <li>✓ Understand competitive positioning</li>
                    <li>✓ Get market intelligence</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-white/10">
              <div>
                <div className="text-2xl font-bold text-purple-400">24/7</div>
                <p className="text-xs text-gray-400">Real-time Monitoring</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-pink-400">100+</div>
                <p className="text-xs text-gray-400">Data Points Tracked</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">&lt;1s</div>
                <p className="text-xs text-gray-400">Update Latency</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">99.9%</div>
                <p className="text-xs text-gray-400">Uptime SLA</p>
              </div>
            </div>

          </div>


        </div>

        {/* Footer */}
        <div className="mt-20 border-t border-white/10 px-8 py-8">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <div>© 2026 CasperEye. CSPR Staking Intelligence Platform.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition">Docs</a>
              <a href="#" className="hover:text-white transition">GitHub</a>
              <a href="#" className="hover:text-white transition">Twitter</a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
