"use client";
import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

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

export default function DataTable() {
  const [data, setData] = useState<{ nodes: Node[]; links: Link[] }>({ nodes: [], links: [] });
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'connections'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<'all' | 'whale' | 'retail' | 'provider' | 'chain'>('all');

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

  const getConnections = (nodeId: string) => {
    if (!Array.isArray(data.links)) return 0;
    return data.links.filter(l => l.source === nodeId || l.target === nodeId).length;
  };

  let filtered = Array.isArray(data.nodes) ? data.nodes : [];
  if (filter !== 'all') {
    filtered = filtered.filter(n => n.group.toLowerCase() === filter);
  }

  let sorted = [...filtered];
  sorted.sort((a, b) => {
    let aVal, bVal;
    if (sortBy === 'name') {
      aVal = a.name;
      bVal = b.name;
    } else if (sortBy === 'type') {
      aVal = a.group;
      bVal = b.group;
    } else {
      aVal = getConnections(a.id);
      bVal = getConnections(b.id);
    }

    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (column: 'name' | 'type' | 'connections') => {
    if (sortBy === column) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ column }: { column: 'name' | 'type' | 'connections' }) => {
    if (sortBy !== column) return <div className="w-4 h-4" />;
    return sortDir === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <h3 className="text-lg font-semibold mb-4">Network Data</h3>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'whale', 'retail', 'provider', 'chain'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3">
                <button
                  onClick={() => toggleSort('name')}
                  className="flex items-center gap-2 hover:text-blue-400"
                >
                  Name <SortIcon column="name" />
                </button>
              </th>
              <th className="text-left py-2 px-3">
                <button
                  onClick={() => toggleSort('type')}
                  className="flex items-center gap-2 hover:text-blue-400"
                >
                  Type <SortIcon column="type" />
                </button>
              </th>
              <th className="text-left py-2 px-3">
                <button
                  onClick={() => toggleSort('connections')}
                  className="flex items-center gap-2 hover:text-blue-400"
                >
                  Connections <SortIcon column="connections" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(node => (
              <tr key={node.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-2 px-3 font-mono text-xs">{node.name}</td>
                <td className="py-2 px-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      node.group === 'Chain'
                        ? 'bg-blue-900 text-blue-200'
                        : node.group === 'Provider'
                        ? 'bg-purple-900 text-purple-200'
                        : node.group === 'Whale'
                        ? 'bg-red-900 text-red-200'
                        : 'bg-green-900 text-green-200'
                    }`}
                  >
                    {node.group}
                  </span>
                </td>
                <td className="py-2 px-3">{getConnections(node.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        Showing {sorted.length} of {data.nodes.length} nodes
      </div>
    </div>
  );
}
