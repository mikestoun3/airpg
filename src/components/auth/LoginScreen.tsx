'use client';
import { useState, useEffect } from 'react';

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
  const [isMobile, setIsMobile] = useState(false);
  const [hasEthereum, setHasEthereum] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    setHasEthereum(!!window.ethereum);
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) setRefCode(ref);
  }, []);

  const handleConnect = async () => {
    setError(null);

    if (!window.ethereum) {
      if (isMobile) {
        window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
        return;
      }
      setError('MetaMask not found. Please install the MetaMask browser extension.');
      return;
    }

    try {
      setStatus('connecting');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      const address = accounts[0];
      if (!address) throw new Error('No account returned');

      setStatus('signing');
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const nonceData = await nonceRes.json() as { ok: boolean; message?: string; error?: string };
      if (!nonceData.ok) throw new Error(nonceData.error ?? 'Failed to get nonce');

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [nonceData.message, address],
      }) as string;

      setStatus('verifying');
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, signature }),
      });
      const verifyData = await verifyRes.json() as { ok: boolean; walletAddress?: string; error?: string };
      if (!verifyData.ok) throw new Error(verifyData.error ?? 'Verification failed');

      // Apply referral code if present in URL
      if (refCode) {
        await fetch('/api/referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: refCode }),
        }).catch(() => {});
      }

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

  const handleOpenInMetaMask = () => {
    window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
  };

  const statusLabel = {
    idle: null,
    connecting: 'Connecting to MetaMask...',
    signing: 'Sign the message in MetaMask...',
    verifying: 'Verifying...',
    error: null,
  }[status];

  return (
    <div className="h-[100dvh] flex items-center justify-center bg-[#0d0808]">
      <div className="flex flex-col items-center gap-8 max-w-sm w-full px-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-700 to-rose-900 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-red-950/60">
            A
          </div>
          <div className="text-center">
            <p className="text-slate-100 font-black text-2xl tracking-wide">AirPG</p>
            <p className="text-[#6a4040] text-sm tracking-widest uppercase">Idle Dungeon</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-[#130909] border border-[rgba(200,70,70,0.25)] rounded-2xl p-6 flex flex-col gap-5">
          <div className="text-center">
            <p className="text-slate-200 font-semibold text-lg">Sign in with MetaMask</p>
            <p className="text-[#6a4040] text-sm mt-1">Your wallet is your account. No password needed.</p>
          </div>

          {statusLabel && (
            <div className="flex items-center justify-center gap-2 text-rose-400 text-sm">
              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              {statusLabel}
            </div>
          )}

          {error && (
            <div className="bg-red-950/40 border border-red-700/30 rounded-xl px-4 py-3 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* Main connect button — shows if MetaMask is injected OR on desktop */}
          {(hasEthereum || !isMobile) && (
            <button
              onClick={handleConnect}
              disabled={status === 'connecting' || status === 'signing' || status === 'verifying'}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-700 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
              <MetaMaskIcon />
              Connect MetaMask
            </button>
          )}

          {/* Mobile: open in MetaMask app */}
          {isMobile && !hasEthereum && (
            <button
              onClick={handleOpenInMetaMask}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
              <MetaMaskIcon />
              Open in MetaMask
            </button>
          )}

          {/* Mobile hint when MetaMask IS injected (inside MM browser) */}
          {isMobile && hasEthereum && (
            <p className="text-center text-[#5a3535] text-xs">
              Running inside MetaMask browser ✓
            </p>
          )}

          {/* Mobile: also show "open in MM" as secondary option if on desktop no ethereum */}
          {isMobile && !hasEthereum && (
            <p className="text-center text-[#4a2a2a] text-xs">
              This opens the site inside MetaMask&apos;s built-in browser where your wallet is available.
            </p>
          )}

          {!isMobile && (
            <p className="text-center text-[#4a2a2a] text-xs">
              A new hero is created for each wallet address.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaMaskIcon() {
  return <img src="/icons/metamask.svg" alt="MetaMask" width={22} height={22} />;
}
