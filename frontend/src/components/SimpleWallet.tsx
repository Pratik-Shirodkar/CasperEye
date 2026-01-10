"use client";
import { useState } from 'react';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function SimpleWallet() {
  const [wallet, setWallet] = useState<{type: string, address: string} | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask');
      return;
    }
    
    try {
      setConnecting(true);
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      setWallet({
        type: 'MetaMask',
        address: accounts[0]
      });
    } catch (error) {
      console.error('MetaMask connection failed:', error);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setWallet(null);
  };

  if (wallet) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-400">{wallet.type}</div>
        <button 
          onClick={disconnect}
          className="bg-white text-black px-4 py-2 rounded-full font-bold hover:bg-gray-200"
        >
          {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={connectMetaMask}
      disabled={connecting}
      className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold hover:bg-orange-600 disabled:opacity-50 shadow-md"
    >
      {connecting ? 'Connecting...' : 'Connect MetaMask'}
    </button>
  );
}