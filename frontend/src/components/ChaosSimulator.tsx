"use client";
import { useState, useEffect } from 'react';
import { AlertTriangle, RotateCcw, Zap } from 'lucide-react';

interface ChaosSimulatorProps {
  data: { nodes: any[]; links: any[] };
  onSimulationChange: (simulatedData: { nodes: any[]; links: any[] } | null) => void;
}

export default function ChaosSimulator({ data, onSimulationChange }: ChaosSimulatorProps) {
  const [isActive, setIsActive] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [simulatedData, setSimulatedData] = useState<{ nodes: any[]; links: any[] } | null>(null);

  const providers = data.nodes.filter(n => n.group === 'Provider');

  const simulateProviderCrash = (providerName: string) => {
    if (!isActive) return;

    // Filter out the crashed provider and its connections
    const filteredNodes = data.nodes.filter(n => n.name !== providerName);
    const filteredLinks = data.links.filter(
      l => l.source !== providerName && l.target !== providerName
    );

    const newSimulatedData = {
      nodes: filteredNodes,
      links: filteredLinks,
    };

    setSelectedProvider(providerName);
    setSimulatedData(newSimulatedData);
    onSimulationChange(newSimulatedData);
  };

  const resetSimulation = () => {
    setIsActive(false);
    setSelectedProvider(null);
    setSimulatedData(null);
    onSimulationChange(null);
  };

  // Calculate impact
  const getImpactAnalysis = () => {
    if (!simulatedData || !selectedProvider) return null;

    const originalProvider = data.nodes.find(n => n.name === selectedProvider);
    const affectedChains = data.links
      .filter(l => l.source === selectedProvider)
      .map(l => l.target);

    const affectedWhales = data.links
      .filter(l => l.target === selectedProvider)
      .map(l => l.source);

    return {
      provider: selectedProvider,
      affectedChains: affectedChains.length,
      affectedWhales: affectedWhales.length,
      nodesRemoved: data.nodes.filter(n => n.name === selectedProvider).length,
      edgesRemoved: data.links.filter(
        l => l.source === selectedProvider || l.target === selectedProvider
      ).length,
    };
  };

  const impact = getImpactAnalysis();

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={20} className="text-yellow-400" />
        <h3 className="text-lg font-semibold">Chaos Simulator</h3>
        <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded">
          What-If Analysis
        </span>
      </div>

      {/* Toggle */}
      <div className="mb-4 p-3 bg-gray-800 rounded-lg">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => {
              setIsActive(e.target.checked);
              if (!e.target.checked) resetSimulation();
            }}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">
            {isActive ? '🔴 Simulation Active' : '⚪ Enable Simulation'}
          </span>
        </label>
        <p className="text-xs text-gray-400 mt-2">
          Click a provider below to simulate it going offline
        </p>
      </div>

      {/* Provider List */}
      {isActive && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-400 mb-2">Select Provider to Crash:</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {providers.map(provider => (
              <button
                key={provider.id}
                onClick={() => simulateProviderCrash(provider.name)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                  selectedProvider === provider.name
                    ? 'bg-red-600 text-white border border-red-500'
                    : 'bg-purple-900/30 text-purple-200 border border-purple-700 hover:bg-purple-900/50'
                }`}
              >
                <div className="font-medium">{provider.name}</div>
                <div className="text-xs opacity-75">
                  {data.links.filter(l => l.source === provider.name || l.target === provider.name).length} connections
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Impact Analysis */}
      {impact && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-red-300">Impact Analysis</div>
              <div className="text-xs text-red-200 mt-1">
                If {impact.provider} goes offline:
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-red-900/30 rounded p-2">
              <div className="text-red-400 text-xs font-semibold">Chains Affected</div>
              <div className="text-2xl font-bold text-red-300">{impact.affectedChains}</div>
            </div>
            <div className="bg-red-900/30 rounded p-2">
              <div className="text-red-400 text-xs font-semibold">Whales Impacted</div>
              <div className="text-2xl font-bold text-red-300">{impact.affectedWhales}</div>
            </div>
            <div className="bg-red-900/30 rounded p-2">
              <div className="text-red-400 text-xs font-semibold">Nodes Removed</div>
              <div className="text-2xl font-bold text-red-300">{impact.nodesRemoved}</div>
            </div>
            <div className="bg-red-900/30 rounded p-2">
              <div className="text-red-400 text-xs font-semibold">Edges Removed</div>
              <div className="text-2xl font-bold text-red-300">{impact.edgesRemoved}</div>
            </div>
          </div>

          <div className="mt-3 p-2 bg-red-900/50 rounded text-xs text-red-200">
            ⚠️ The graph above shows the network WITHOUT this provider. Risk levels have been recalculated.
          </div>
        </div>
      )}

      {/* Reset Button */}
      {selectedProvider && (
        <button
          onClick={resetSimulation}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} />
          Reset Simulation
        </button>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded text-xs text-blue-200">
        <div className="font-semibold mb-1">💡 Use Cases:</div>
        <ul className="space-y-1 text-blue-300">
          <li>• Stress test your staking setup</li>
          <li>• Identify single points of failure</li>
          <li>• Plan for validator redundancy</li>
          <li>• Understand risk exposure</li>
        </ul>
      </div>
    </div>
  );
}
