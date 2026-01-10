"use client";
import { useState } from 'react';

declare global {
  interface Window {
    keplr?: any;
    leap?: any;
    unisat?: any;
    ethereum?: any;
  }
}

export default function WalletConnect() {
  const [wallet, setWallet] = useState<{type: string, address: string} | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connectKeplr = async () => {
    if (!window.keplr) {
      alert('Please install Keplr wallet');
      return;
    }
    
    try {
      setConnecting(true);
      await window.keplr.enable('babylon-1');
      const offlineSigner = window.keplr.getOfflineSigner('babylon-1');
      const accounts = await offlineSigner.getAccounts();
      
      setWallet({
        type: 'Keplr',
        address: accounts[0].address
      });
    } catch (error) {
      console.error('Keplr connection failed:', error);
    } finally {
      setConnecting(false);
    }
  };

  const connectUnisat = async () => {
    if (!window.unisat) {
      alert('Please install Unisat wallet');
      return;
    }
    
    try {
      setConnecting(true);
      const accounts = await window.unisat.requestAccounts();
      
      setWallet({
        type: 'Unisat',
        address: accounts[0]
      });
    } catch (error) {
      console.error('Unisat connection failed:', error);
    } finally {
      setConnecting(false);
    }
  };

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
          {wallet.address.slice(0, 8)}...{wallet.address.slice(-4)}
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button 
        onClick={connectKeplr}
        disabled={connecting}
        className="bg-purple-600 text-white px-3 py-2 rounded-full text-sm hover:bg-purple-700 disabled:opacity-50"
      >
        {connecting ? 'Connecting...' : 'Keplr'}
      </button>
      <button 
        onClick={connectUnisat}
        disabled={connecting}
        className="bg-orange-600 text-white px-3 py-2 rounded-full text-sm hover:bg-orange-700 disabled:opacity-50"
      >
        {connecting ? 'Connecting...' : 'Unisat'}
      </button>
      <button 
        onClick={connectMetaMask}
        disabled={connecting}
        className="bg-orange-500 text-white px-3 py-2 rounded-full text-sm hover:bg-orange-600 disabled:opacity-50"
      >
        {connecting ? 'Connecting...' : 'MetaMask'}
      </button>
    </div>
  );
}