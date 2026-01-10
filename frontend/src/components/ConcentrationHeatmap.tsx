"use client";
import { useEffect, useState } from 'react';

interface Node {
  id: string;
  name: string;
  group: string;
  val: number;
}

interface Link {
  source: string;
  target: string;
}

export default function ConcentrationHeatmap() {
  const [data, setData] = useState<{ nodes: Node[]; links: Link[] }>({ nodes: [], links: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { apiCall } = await import('@/lib/api');
        const res = await apiCall('/graph-data');
        const newData = await res.json();
        
        if (newData && Array.isArray(newData.nodes) && Array.isArray(newData.links)) {
          setData(newData);
        } else {
          console.warn('Invalid data format:', newData);
          setData({ nodes: [], links: [] });
        }
      } catch (e) {
        console.error('Failed to fetch data:', e);
        setData({ nodes: [], links: [] });
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get providers and chains
  const providers = Array.isArray(data.nodes) ? data.nodes.filter(n => n.group === 'Provider') : [];
  const chains = Array.isArray(data.nodes) ? data.nodes.filter(n => n.group === 'Chain') : [];

  // Calculate connections between providers and chains
  const getConnectionCount = (providerId: string, chainId: string) => {
    if (!Array.isArray(data.links)) return 0;
    return data.links.filter(
      l =>
        (l.source === providerId && l.target === chainId) ||
        (l.source === chainId && l.target === providerId)
    ).length;
  };

  // Get max connections for color scaling
  const maxConnections = Math.max(
    ...(providers.length > 0 && chains.length > 0 
      ? providers.flatMap(p =>
          chains.map(c => getConnectionCount(p.id, c.id))
        )
      : [1]),
    1
  );

  const getHeatColor = (connections: number) => {
    if (connections === 0) return 'bg-gray-800';
    const intensity = connections / maxConnections;
    if (intensity > 0.7) return 'bg-red-600';
    if (intensity > 0.4) return 'bg-orange-600';
    if (intensity > 0.1) return 'bg-yellow-600';
    return 'bg-gray-700';
  };

  // Calculate concentration metrics
  const providerConcentration = providers.map(p => ({
    name: p.name,
    connections: chains.reduce((sum, c) => sum + getConnectionCount(p.id, c.id), 0),
  }));

  const chainConcentration = chains.map(c => ({
    name: c.name,
    providers: providers.filter(p => getConnectionCount(p.id, c.id) > 0).length,
  }));

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <h3 className="text-lg font-semibold mb-4">Provider-Chain Relationships</h3>

      {/* Heatmap */}
      <div className="overflow-x-auto mb-6">
        <div className="inline-block min-w-full">
          {/* Header */}
          <div className="flex">
            <div className="w-24 flex-shrink-0" />
            {chains.map(chain => (
              <div
                key={chain.id}
                className="w-20 text-center text-xs font-semibold text-blue-400 py-2"
              >
                {chain.name}
              </div>
            ))}
          </div>

          {/* Rows */}
          {providers.map(provider => (
            <div key={provider.id} className="flex">
              <div className="w-24 flex-shrink-0 text-xs font-semibold text-purple-400 py-2 px-2 truncate">
                {provider.name}
              </div>
              {chains.map(chain => {
                const connections = getConnectionCount(provider.id, chain.id);
                return (
                  <div
                    key={`${provider.id}-${chain.id}`}
                    className={`w-20 h-12 flex items-center justify-center text-xs font-bold ${getHeatColor(
                      connections
                    )} border border-gray-700`}
                  >
                    {connections > 0 ? connections : '-'}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6 flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-800" />
          <span>No connection</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-600" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-600" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-600" />
          <span>High</span>
        </div>
      </div>

      {/* Concentration Analysis */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-purple-400 mb-2">Provider Coverage</h4>
          <div className="space-y-1 text-xs">
            {providerConcentration
              .sort((a, b) => b.connections - a.connections)
              .map(p => (
                <div key={p.name} className="flex justify-between">
                  <span>{p.name}</span>
                  <span className="text-gray-400">{p.connections} chains</span>
                </div>
              ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-blue-400 mb-2">Chain Security</h4>
          <div className="space-y-1 text-xs">
            {chainConcentration.map(c => (
              <div key={c.name} className="flex justify-between">
                <span>{c.name}</span>
                <span className={c.providers >= 3 ? 'text-green-400' : 'text-red-400'}>
                  {c.providers} providers
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="mt-4 p-3 bg-gray-800 rounded text-xs">
        <div className="font-semibold mb-2">Risk Assessment:</div>
        <ul className="space-y-1 text-gray-300">
          {chainConcentration.map(c => (
            <li key={c.name}>
              {c.name}:{' '}
              {c.providers >= 3 ? (
                <span className="text-green-400">✓ SAFE (multiple providers)</span>
              ) : c.providers === 2 ? (
                <span className="text-yellow-400">⚠ MODERATE (limited redundancy)</span>
              ) : (
                <span className="text-red-400">✗ CRITICAL (single provider)</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
