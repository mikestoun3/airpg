'use client';
import { useState } from 'react';

interface Props {
  onLogin: (wallet: string) => void;
}

declare global {
  interface Window {
    ethereum?: {
      request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export function LoginScreen({ onLogin }: Props) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'signing' | 'verifying' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    if (!window.ethereum) {
      setError('MetaMask not found. Please install the MetaMask browser extension.');
      return;
    }

    try {
      setStatus('connecting');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      const address = accounts[0];
      if (!address) throw new Error('No account returned');

      // Get nonce from server
      setStatus('signing');
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const nonceData = await nonceRes.json() as { ok: boolean; message?: string; error?: string };
      if (!nonceData.ok) throw new Error(nonceData.error ?? 'Failed to get nonce');

      // Sign message with MetaMask
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [nonceData.message, address],
      }) as string;

      // Verify with server
      setStatus('verifying');
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature }),
      });
      const verifyData = await verifyRes.json() as { ok: boolean; walletAddress?: string; error?: string };
      if (!verifyData.ok) throw new Error(verifyData.error ?? 'Verification failed');

      onLogin(verifyData.walletAddress!);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('User rejected') || msg.includes('user rejected')) {
        setError('Signature cancelled.');
      } else {
        setError(msg);
      }
      setStatus('error');
    }
  };

  const statusLabel = {
    idle: null,
    connecting: 'Connecting to MetaMask...',
    signing: 'Sign the message in MetaMask...',
    verifying: 'Verifying...',
    error: null,
  }[status];

  return (
    <div className="h-screen flex items-center justify-center bg-[#09091a]">
      <div className="flex flex-col items-center gap-8 max-w-sm w-full px-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-900 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-purple-900/60">
            A
          </div>
          <div className="text-center">
            <p className="text-slate-100 font-black text-2xl tracking-wide">AirPG</p>
            <p className="text-[#5050a0] text-sm tracking-widest uppercase">Idle Dungeon</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-[#0f0f22] border border-[rgba(120,110,200,0.25)] rounded-2xl p-6 flex flex-col gap-5">
          <div className="text-center">
            <p className="text-slate-200 font-semibold text-lg">Sign in with MetaMask</p>
            <p className="text-[#5050a0] text-sm mt-1">Your wallet is your account. No password needed.</p>
          </div>

          {statusLabel && (
            <div className="flex items-center justify-center gap-2 text-purple-400 text-sm">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              {statusLabel}
            </div>
          )}

          {error && (
            <div className="bg-red-950/40 border border-red-700/30 rounded-xl px-4 py-3 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={status === 'connecting' || status === 'signing' || status === 'verifying'}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 hover:from-violet-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 212 189" fill="none">
              <path d="M201.7 0L120.2 61.4l14.8-35.1L201.7 0z" fill="#E17726"/>
              <path d="M10.3 0l80.8 62-14.1-35.7L10.3 0z" fill="#E27625"/>
              <path d="M172 136.5l-21.7 33.2 46.5 12.8 13.3-45.4-38.1-.6z" fill="#E27625"/>
              <path d="M2 137.1l13.2 45.4 46.4-12.8-21.6-33.2-38 .6z" fill="#E27625"/>
              <path d="M59.2 82.1l-12.8 19.4 45.6 2-1.5-49L59.2 82.1z" fill="#E27625"/>
              <path d="M152.8 82.1l-31.7-28.2-1 49.5 45.5-2-12.8-19.3z" fill="#E27625"/>
              <path d="M61.6 169.7l27.4-13.3-23.6-18.4-3.8 31.7z" fill="#E27625"/>
              <path d="M123 156.4l27.3 13.3-3.7-31.7-23.6 18.4z" fill="#E27625"/>
            </svg>
            Connect MetaMask
          </button>

          <p className="text-center text-[#3a3a6a] text-xs">
            A new hero is created for each wallet address.
          </p>
        </div>
      </div>
    </div>
  );
}
