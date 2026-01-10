"use client";
import { useEffect, useState } from 'react';

export default function SimpleGraph() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const { apiCall } = await import('@/lib/api');
        const res = await apiCall('/graph-data');
        const data = await res.json();
        console.log('Received data:', data);
        
        if (data && Array.isArray(data.nodes) && Array.isArray(data.links)) {
          setData(data);
        } else {
          console.warn('Invalid data format:', data);
          setData({ nodes: [], links: [] });
        }
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    })();
  }, []);

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!data) {
    return <div className="text-gray-400">Loading...</div>;
  }

  return (
    <div className="border border-gray-800 bg-black rounded-xl p-4">
      <h3 className="text-white mb-4">Network Graph Data</h3>
      <div className="text-sm text-gray-400">
        <div>Nodes: {data.nodes?.length || 0}</div>
        <div>Links: {data.links?.length || 0}</div>
        <div className="mt-4">
          <strong>Nodes:</strong>
          <ul className="ml-4">
            {data.nodes?.slice(0, 5).map((n: any) => (
              <li key={n.id}>{n.name} ({n.group})</li>
            ))}
          </ul>
        </div>
        <div className="mt-4">
          <strong>Links:</strong>
          <ul className="ml-4">
            {data.links?.slice(0, 5).map((l: any, i: number) => (
              <li key={i}>{l.source} → {l.target}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}