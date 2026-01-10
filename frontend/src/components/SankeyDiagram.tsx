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

export default function SankeyDiagram() {
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

  // Group nodes by type
  const whales = Array.isArray(data.nodes) ? data.nodes.filter(n => n.group === 'Whale') : [];
  const providers = Array.isArray(data.nodes) ? data.nodes.filter(n => n.group === 'Provider') : [];
  const chains = Array.isArray(data.nodes) ? data.nodes.filter(n => n.group === 'Chain') : [];

  // Calculate connections
  const getConnectionCount = (nodeId: string) => {
    if (!Array.isArray(data.links)) return 0;
    return data.links.filter(l => l.source === nodeId || l.target === nodeId).length;
  };

  const getConnectionsTo = (sourceId: string, targetGroup: string) => {
    if (!Array.isArray(data.links) || !Array.isArray(data.nodes)) return 0;
    return data.links.filter(
      l => l.source === sourceId && data.nodes.find(n => n.id === l.target)?.group === targetGroup
    ).length;
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <h3 className="text-lg font-semibold mb-4">Staking Flow (Sankey)</h3>

      <div className="overflow-x-auto">
        <div className="min-w-full flex gap-8 p-4 bg-black rounded">
          {/* Whales Column */}
          <div className="flex-1 min-w-[150px]">
            <h4 className="text-sm font-semibold text-red-400 mb-3">Whales ({whales.length})</h4>
            <div className="space-y-2">
              {whales.map(whale => (
                <div
                  key={whale.id}
                  className="bg-red-900/30 border border-red-700 rounded p-2 text-xs"
                >
                  <div className="font-mono truncate">{whale.name}</div>
                  <div className="text-red-300 text-xs mt-1">
                    {getConnectionCount(whale.id)} connections
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center text-gray-500">
            <div className="text-2xl">→</div>
          </div>

          {/* Providers Column */}
          <div className="flex-1 min-w-[150px]">
            <h4 className="text-sm font-semibold text-purple-400 mb-3">
              Providers ({providers.length})
            </h4>
            <div className="space-y-2">
              {providers.map(provider => (
                <div
                  key={provider.id}
                  className="bg-purple-900/30 border border-purple-700 rounded p-2 text-xs"
                >
                  <div className="font-mono truncate">{provider.name}</div>
                  <div className="text-purple-300 text-xs mt-1">
                    {getConnectionCount(provider.id)} connections
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center text-gray-500">
            <div className="text-2xl">→</div>
          </div>

          {/* Chains Column */}
          <div className="flex-1 min-w-[150px]">
            <h4 className="text-sm font-semibold text-blue-400 mb-3">Chains ({chains.length})</h4>
            <div className="space-y-2">
              {chains.map(chain => (
                <div
                  key={chain.id}
                  className="bg-blue-900/30 border border-blue-700 rounded p-2 text-xs"
                >
                  <div className="font-mono truncate">{chain.name}</div>
                  <div className="text-blue-300 text-xs mt-1">
                    {getConnectionCount(chain.id)} providers
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="bg-red-900/20 border border-red-700 rounded p-3">
          <div className="text-red-400 font-semibold">{whales.length}</div>
          <div className="text-gray-400 text-xs">Whale Stakers</div>
        </div>
        <div className="bg-purple-900/20 border border-purple-700 rounded p-3">
          <div className="text-purple-400 font-semibold">{providers.length}</div>
          <div className="text-gray-400 text-xs">Providers</div>
        </div>
        <div className="bg-blue-900/20 border border-blue-700 rounded p-3">
          <div className="text-blue-400 font-semibold">{chains.length}</div>
          <div className="text-gray-400 text-xs">Chains Secured</div>
        </div>
      </div>
    </div>
  );
}
