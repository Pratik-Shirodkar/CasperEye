'use client';

import { useState, useEffect } from 'react';
import { Wallet, Zap, Shield, TrendingUp, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface AuthGateProps {
  children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'connecting' | 'signing' | 'verifying'>('idle');

  // Check if already authenticated on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('satoshiseye_token');
    const savedAddress = localStorage.getItem('satoshiseye_wallet');
    if (savedToken && savedAddress) {
      setIsAuthenticated(true);
      setWalletAddress(savedAddress);
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask not installed. Please install MetaMask to continue.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setStep('connecting');

      // Request wallet connection
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const address = accounts[0];
      setWalletAddress(address);
      setStep('signing');

      // Get message to sign
      const { apiCall } = await import('@/lib/api');
      const signRes = await apiCall('/auth/sign-message', {
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

      setStep('verifying');

      // Verify signature and get JWT token
      console.log('Sending verification request with:', {
        wallet_address: address,
        message: signData.message,
        signature: signature,
      });

      const verifyRes = await apiCall('/auth/verify-signature', {
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
        localStorage.setItem('satoshiseye_token', verifyData.token);
        localStorage.setItem('satoshiseye_wallet', address);
        setIsAuthenticated(true);
      } else {
        setError(verifyData.error || 'Authentication failed');
        setStep('idle');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setStep('idle');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-purple-500/30 shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-lg opacity-75"></div>
                <div className="relative bg-slate-900 rounded-full p-4">
                  <Wallet className="w-8 h-8 text-purple-400" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">CasperEye</h1>
            <p className="text-sm text-gray-300">CSPR Staking Intelligence Platform</p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-sm">
              <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-gray-300">Secure wallet authentication</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <TrendingUp className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-gray-300">Real-time risk analysis</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <span className="text-gray-300">AI-powered insights</span>
            </div>
          </div>

          {/* Status indicator */}
          {step !== 'idle' && (
            <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-3">
                <Loader className="w-4 h-4 text-purple-400 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {step === 'connecting' && 'Connecting wallet...'}
                    {step === 'signing' && 'Waiting for signature...'}
                    {step === 'verifying' && 'Verifying authentication...'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {step === 'connecting' && 'Check your MetaMask extension'}
                    {step === 'signing' && 'Sign the message in MetaMask'}
                    {step === 'verifying' && 'Verifying your wallet...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 rounded-lg border border-red-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-300">Authentication Error</p>
                  <p className="text-xs text-red-200 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Connect button */}
          <button
            onClick={connectWallet}
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                Connect Wallet to Continue
              </>
            )}
          </button>

          {/* Footer */}
          <p className="text-xs text-gray-400 text-center mt-6">
            🔐 Your wallet signature proves ownership. No passwords needed.
          </p>
        </div>

        {/* Info box */}
        <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 backdrop-blur-sm">
          <p className="text-xs text-gray-300">
            <span className="font-semibold text-purple-300">First time?</span> Install{' '}
            <a
              href="https://metamask.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline"
            >
              MetaMask
            </a>{' '}
            to get started.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
