"use client";
import { useEffect, useRef, useState } from 'react';

export default function CanvasGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<any>({ nodes: [], links: [] });

  useEffect(() => {
    (async () => {
      try {
        const { apiCall } = await import('@/lib/api');
        const res = await apiCall('/graph-data');
        const data = await res.json();
        
        if (data && Array.isArray(data.nodes) && Array.isArray(data.links)) {
          setData(data);
        } else {
          console.warn('Invalid data format:', data);
          setData({ nodes: [], links: [] });
        }
      } catch (err) {
        console.error('Error:', err);
        setData({ nodes: [], links: [] });
      }
    })();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !Array.isArray(data.nodes) || data.nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Position nodes in a circle
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 200;
    
    const positions: any = {};
    data.nodes.forEach((node: any, i: number) => {
      const angle = (i / data.nodes.length) * 2 * Math.PI;
      positions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    // Draw links FIRST (so they appear behind nodes)
    if (Array.isArray(data.links)) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      data.links.forEach((link: any) => {
        const source = positions[link.source];
        const target = positions[link.target];
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      });
    }

    // Draw nodes
    data.nodes.forEach((node: any) => {
      const pos = positions[node.id];
      if (!pos) return;

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15, 0, 2 * Math.PI);
      ctx.fillStyle = node.group === 'Chain' ? '#6366f1' : 
                      node.group === 'Provider' ? '#10b981' : 
                      node.group === 'Whale' ? '#f7931a' : '#6b7280';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Node label
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, pos.x, pos.y + 30);
    });

  }, [data]);

  return (
    <div className="border border-gray-800 bg-black rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-green-500 text-xs font-mono">LIVE: {data.nodes.length} nodes, {data.links.length} connections</span>
      </div>
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={500}
        className="w-full"
      />
    </div>
  );
}