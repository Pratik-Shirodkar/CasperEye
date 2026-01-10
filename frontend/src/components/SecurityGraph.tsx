"use client";
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamic import is CRITICAL for this library in Next.js
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

export default function SecurityGraph() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data from your Python Backend
    (async () => {
      try {
        const { apiCall } = await import('@/lib/api');
        const res = await apiCall('/graph-data');
        const data = await res.json();
        
        if (data && Array.isArray(data.nodes) && Array.isArray(data.links)) {
          setGraphData(data);
        } else {
          console.warn('Invalid graph data format:', data);
          setGraphData({ nodes: [], links: [] });
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch graph data:', err);
        setGraphData({ nodes: [], links: [] });
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="border border-gray-800 rounded-xl overflow-hidden bg-black h-96 flex items-center justify-center">
        <div className="text-gray-400">Loading graph...</div>
      </div>
    );
  }

  if (!graphData.nodes || graphData.nodes.length === 0) {
    return (
      <div className="border border-gray-800 rounded-xl overflow-hidden bg-black h-96 flex items-center justify-center">
        <div className="text-gray-400">No graph data available</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden bg-black">
      <ForceGraph2D
        graphData={graphData}
        width={800}
        height={500}
        backgroundColor="#050505"
        nodeAutoColorBy="group"
        nodeLabel="id"
        linkDirectionalArrowLength={4}
        linkWidth={2}
        // Custom node rendering
        nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.id;
            const fontSize = 12/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            if (node.group === 'ConsumerChain') ctx.fillStyle = 'rgba(255, 0, 0, 0.2)'; // Red for Chains
            if (node.group === 'Smart Money') ctx.fillStyle = 'rgba(0, 255, 0, 0.2)'; // Green for Whales

            ctx.beginPath();
            ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
            ctx.fill();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = node.color;
            ctx.fillText(label, node.x, node.y + 8);
        }}
      />
    </div>
  );
}