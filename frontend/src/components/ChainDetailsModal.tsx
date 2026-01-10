"use client";
import { useEffect, useState } from 'react';
import { X, Shield, Users, TrendingUp } from 'lucide-react';

interface ChainDetails {
  chain: string;
  smart_money_btc: number;
  risk: string;
  providers: string[];
  whales: number;
  retail: number;
  total_connections: number;
}

interface ChainDetailsModalProps {
  chain: string | null;
  onClose: () => void;
  data: { nodes: any[]; links: any[] };
  risks?: Array<{ chain: string; smart_money_btc: number; risk: string }>;
}

export default function ChainDetailsModal({ chain, onClose, data, risks }: ChainDetailsModalProps) {
  const [details, setDetails] = useState<ChainDetails | null>(null);

  useEffect(() => {
    if (!chain) return;

    // Find the chain node
    const chainNode = data.nodes.find(n => n.name === chain);
    if (!chainNode) return;

    // Find all providers connected to this chain
    const connectedProviders = data.links
      .filter(l => l.target === chain)
      .map(l => l.source);

    // Find all whales and retail stakers connected to those providers
    let whaleCount = 0;
    let retailCount = 0;

    connectedProviders.forEach(provider => {
      data.links
        .filter(l => l.target === provider)
        .forEach(l => {
          const staker = data.nodes.find(n => n.id === l.source);
          if (staker?.group === 'Whale') whaleCount++;
          if (staker?.group === 'Retail') retailCount++;
        });
    });

    // Get provider names
    const providerNames = connectedProviders
      .map(p => data.nodes.find(n => n.id === p)?.name || p)
      .filter(Boolean);

    // Get risk from backend data if available, otherwise calculate
    let risk = 'CRITICAL';
    let smartMoneyBtc = whaleCount * 2.5;
    
    if (Array.isArray(risks) && risks.length > 0) {
      const riskData = risks.find(r => r.chain === chain);
      if (riskData) {
        risk = riskData.risk;
        smartMoneyBtc = riskData.smart_money_btc;
      }
    }

    setDetails({
      chain,
      smart_money_btc: smartMoneyBtc,
      risk,
      providers: providerNames,
      whales: whaleCount,
      retail: retailCount,
      total_connections: connectedProviders.length,
    });
  }, [chain, data, risks]);

  if (!chain || !details) return null;

  const getRiskColor = (risk: string) => {
    if (risk === 'SAFE') return 'text-green-400 bg-green-900/20 border-green-700';
    if (risk === 'MODERATE') return 'text-yellow-400 bg-yellow-900/20 border-yellow-700';
    return 'text-red-400 bg-red-900/20 border-red-700';
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-md w-full my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-blue-400">{details.chain}</h2>
            <p className="text-gray-400 text-sm">Consumer Chain Details</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Risk Status */}
        <div className={`rounded-lg border p-4 mb-4 ${getRiskColor(details.risk)}`}>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={20} />
            <span className="font-semibold">Risk Status</span>
          </div>
          <div className="text-2xl font-bold">{details.risk}</div>
        </div>

        {/* Smart Money */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} className="text-blue-400" />
            <span className="text-gray-300">Smart Money Backing</span>
          </div>
          <div className="text-3xl font-bold text-blue-400">{details.smart_money_btc.toFixed(1)} BTC</div>
          <div className="text-xs text-gray-400 mt-1">From {details.whales} whale staker{details.whales !== 1 ? 's' : ''}</div>
        </div>

        {/* Staker Distribution */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
            <div className="text-red-400 text-sm font-semibold">Whales</div>
            <div className="text-2xl font-bold text-red-300">{details.whales}</div>
          </div>
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
            <div className="text-green-400 text-sm font-semibold">Retail</div>
            <div className="text-2xl font-bold text-green-300">{details.retail}</div>
          </div>
        </div>

        {/* Providers */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={20} className="text-purple-400" />
            <span className="text-gray-300 font-semibold">Securing Providers ({details.total_connections})</span>
          </div>
          <div className="space-y-2">
            {details.providers.length > 0 ? (
              details.providers.map((provider, idx) => (
                <div
                  key={idx}
                  className="bg-purple-900/30 border border-purple-700 rounded px-3 py-2 text-sm text-purple-200"
                >
                  {provider}
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-sm">No providers found</div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="font-semibold text-gray-300 mb-2">Recommendations</div>
          <ul className="text-sm text-gray-400 space-y-1">
            {details.risk === 'CRITICAL' && (
              <>
                <li>• Increase smart money backing to reduce risk</li>
                <li>• Add more finality providers for redundancy</li>
              </>
            )}
            {details.risk === 'MODERATE' && (
              <>
                <li>• Monitor concentration levels</li>
                <li>• Consider adding backup providers</li>
              </>
            )}
            {details.risk === 'SAFE' && (
              <li>✓ Chain is well-secured with good provider diversity</li>
            )}
          </ul>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}
