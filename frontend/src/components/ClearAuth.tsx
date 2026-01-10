'use client';

import { useEffect } from 'react';

export default function ClearAuth() {
  useEffect(() => {
    // Clear authentication keys
    localStorage.removeItem('satoshiseye_token');
    localStorage.removeItem('satoshiseye_wallet');
    console.log('✅ Cleared authentication keys');
    console.log('satoshiseye_token removed');
    console.log('satoshiseye_wallet removed');
    
    // Reload page to show welcome page
    window.location.reload();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-300">Clearing authentication...</p>
      </div>
    </div>
  );
}
