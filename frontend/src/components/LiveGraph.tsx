"use client";
import { useEffect, useRef } from 'react';

interface Node {
  id: string;
  name: string;
  group: 'Whale' | 'Provider' | 'Chain';
  val: number;
  x?: number;
  y?: number;
}

interface Link {
  source: string;
  target: string;
}

interface Particle {
  linkIndex: number;
  progress: number;
  speed: number;
}

export default function LiveGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<{ nodes: Node[]; links: Link[] }>({ nodes: [], links: [] });
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  const getFallbackData = () => ({
    nodes: [
      { id: "whale1", name: "Whale 1", group: "Whale" as const, val: 20 },
      { id: "whale2", name: "Whale 2", group: "Whale" as const, val: 18 },
      { id: "p2p", name: "P2P Validator", group: "Provider" as const, val: 15 },
      { id: "lido", name: "Lido", group: "Provider" as const, val: 14 },
      { id: "osmosis", name: "Osmosis", group: "Chain" as const, val: 20 },
      { id: "neutron", name: "Neutron", group: "Chain" as const, val: 18 },
    ],
    links: [
      { source: "whale1", target: "p2p" },
      { source: "whale2", target: "lido" },
      { source: "p2p", target: "osmosis" },
      { source: "lido", target: "neutron" },
    ]
  });

  const positionNodes = (nodes: Node[]) => {
    const positioned = [...nodes];
    const width = 800;
    const height = 550;

    const whales = positioned.filter(n => n.group === 'Whale');
    const providers = positioned.filter(n => n.group === 'Provider');
    const chains = positioned.filter(n => n.group === 'Chain');

    whales.forEach((node, i) => {
      node.x = 80;
      node.y = 100 + (i * (height - 200) / Math.max(whales.length - 1, 1));
    });

    providers.forEach((node, i) => {
      node.x = width / 2;
      node.y = 100 + (i * (height - 200) / Math.max(providers.length - 1, 1));
    });

    chains.forEach((node, i) => {
      node.x = width - 80;
      node.y = 100 + (i * (height - 200) / Math.max(chains.length - 1, 1));
    });

    return positioned;
  };

  const fetchData = async () => {
    try {
      const { apiCall } = await import('@/lib/api');
      const res = await apiCall('/graph-data');
      const newData = await res.json();

      if (newData && Array.isArray(newData.nodes) && Array.isArray(newData.links)) {
        if (newData.nodes.length > 0) {
          dataRef.current = newData;
        } else {
          console.warn('Graph data is empty, using fallback data');
          dataRef.current = getFallbackData();
        }
      } else {
        console.warn('Invalid graph data format:', newData);
        dataRef.current = getFallbackData();
      }
    } catch (e) {
      console.error("API Error:", e);
      dataRef.current = getFallbackData();
    }
  };

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Spawn particles periodically
    const spawnInterval = setInterval(() => {
      if (Array.isArray(dataRef.current.links) && dataRef.current.links.length > 0) {
        const linkIndex = Math.floor(Math.random() * dataRef.current.links.length);
        particlesRef.current.push({
          linkIndex,
          progress: 0,
          speed: 0.008 + Math.random() * 0.012,
        });
      }
    }, 200);

    const animate = () => {
      const data = dataRef.current;
      if (data.nodes.length === 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const positionedNodes = positionNodes(data.nodes);

      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw links
      ctx.strokeStyle = 'rgba(100, 200, 100, 0.2)';
      ctx.lineWidth = 2;
      data.links.forEach(link => {
        const source = positionedNodes.find(n => n.id === link.source);
        const target = positionedNodes.find(n => n.id === link.target);
        if (source && target && source.x && source.y && target.x && target.y) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      });

      // Draw nodes
      positionedNodes.forEach(node => {
        if (!node.x || !node.y) return;

        let color = '#888888';
        let glowColor = 'rgba(136, 136, 136, 0.3)';

        if (node.group === 'Chain') {
          color = '#3b82f6';
          glowColor = 'rgba(59, 130, 246, 0.4)';
        } else if (node.group === 'Provider') {
          color = '#a855f7';
          glowColor = 'rgba(168, 85, 247, 0.4)';
        } else if (node.group === 'Whale') {
          color = '#ef4444';
          glowColor = 'rgba(239, 68, 68, 0.4)';
        }

        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(node.name, node.x, node.y + 15);
      });

      // Update and draw particles
      particlesRef.current = particlesRef.current
        .map(p => ({
          ...p,
          progress: p.progress + p.speed,
        }))
        .filter(p => p.progress < 1);

      particlesRef.current.forEach(particle => {
        if (!Array.isArray(data.links) || !data.links[particle.linkIndex]) return;

        const link = data.links[particle.linkIndex];
        const source = positionedNodes.find(n => n.id === link.source);
        const target = positionedNodes.find(n => n.id === link.target);

        if (source && target && source.x && source.y && target.x && target.y) {
          const x = source.x + (target.x - source.x) * particle.progress;
          const y = source.y + (target.y - source.y) * particle.progress;

          ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      clearInterval(spawnInterval);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Fetch data on mount and periodically
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border border-gray-800 bg-black rounded-xl relative overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-green-500 text-xs font-mono">LIVE FEED: Babylon Testnet</span>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={550}
        className="w-full"
      />
    </div>
  );
}