'use client';

import { useState, useEffect } from 'react';
import { LogIn, LogOut, CheckCircle, AlertCircle } from 'lucide-react';

interface WalletAuthProps {
  onAuthSuccess?: (token: string, address: string) => void;
}

export default function WalletAuth({ onAuthSuccess }: WalletAuthProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if already authenticated on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('satoshiseye_token');
    const savedAddress = localStorage.getItem('satoshiseye_wallet');
    if (savedToken && savedAddress) {
      setToken(savedToken);
      setWalletAddress(savedAddress);
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask not installed');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Request wallet connection
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const address = accounts[0];
      setWalletAddress(address);

      // Get message to sign
      const signUrl = '/api/auth/sign-message';
      const signRes = await fetch(signUrl, {
        method: 'POST',
      });
      if (!signRes.ok) {
        throw new Error(`Failed to get sign message: ${signRes.status}`);
      }
      const signData = await signRes.json();

      // Sign message with wallet
      console.log('Requesting signature for message:', signData.message);
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [signData.message, address],
      });
      console.log('Signature received:', signature);

      // Verify signature and get JWT token
      console.log('Sending verification request with:', {
        wallet_address: address,
        message: signData.message,
        signature: signature,
      });
      
      const verifyUrl = '/api/auth/verify-signature';
      const verifyRes = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: address,
          message: signData.message,
          signature: signature,
        }),
      });

      console.log('Verification response status:', verifyRes.status);
      
      if (!verifyRes.ok) {
        const errorText = await verifyRes.text();
        console.error('Verification error response:', errorText);
        throw new Error(`Failed to verify signature: ${verifyRes.status} - ${errorText}`);
      }
      const verifyData = await verifyRes.json();
      console.log('Verification response data:', verifyData);

      if (verifyData.success && verifyData.token) {
        setToken(verifyData.token);
        localStorage.setItem('satoshiseye_token', verifyData.token);
        localStorage.setItem('satoshiseye_wallet', address);
        setSuccess(true);
        onAuthSuccess?.(verifyData.token, address);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(verifyData.error || 'Authentication failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setToken(null);
    setWalletAddress(null);
    localStorage.removeItem('satoshiseye_token');
    localStorage.removeItem('satoshiseye_wallet');
    setError(null);
  };

  if (token && walletAddress) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-xs font-mono text-green-700 dark:text-green-300">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
        </div>
        <button
          onClick={disconnect}
          className="px-3 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
        >
          <LogOut className="w-4 h-4" />
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={connectWallet}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded font-medium transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
      >
        <LogIn className="w-4 h-4" />
        {loading ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-xs">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-xs">
          <CheckCircle className="w-4 h-4" />
          <span>Authenticated successfully!</span>
        </div>
      )}
    </div>
  );
}
