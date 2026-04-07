'use client';

import { useAuth } from '../../../../lib/auth-context';
import { playersApi } from '../../../../lib/api';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const { session } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [allowGuildUse, setAllowGuildUse] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  // Load current player settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!selectedPlayer) return;
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/api/players/${selectedPlayer.allyCode}`,
          {
            credentials: 'include',
            headers: {
              'x-api-key': process.env.NEXT_PUBLIC_INTERNAL_API_KEY || '',
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          // Show masked key if one exists
          if (data.player?.mhannApiKey) {
            setApiKey('••••••••••••••••••••');
          }
          setAllowGuildUse(data.player?.allowGuildApiKeyUse ?? false);
        }
      } catch (error) {
        console.error('Failed to load player settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [selectedPlayer]);

  if (!selectedPlayer) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Only send apiKey if it's not the masked placeholder
      const updates: { mhannApiKey?: string; allowGuildApiKeyUse: boolean } = {
        allowGuildApiKeyUse: allowGuildUse,
      };

      // If the field is empty, clear the key. If it's the masked value, don't change it.
      if (apiKey === '') {
        updates.mhannApiKey = '';
      } else if (!apiKey.startsWith('••')) {
        updates.mhannApiKey = apiKey;
      }

      await playersApi.update(selectedPlayer.allyCode, updates);

      // If we saved a new key, show masked version
      if (updates.mhannApiKey && updates.mhannApiKey !== '') {
        setApiKey('••••••••••••••••••••');
      }

      setMessage({ type: 'success', text: 'Settings saved' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const tooltipText = `When enabled, your API key may be used to fetch guild data (like raid scores) when you're not actively playing. If the system mistakenly thinks you're inactive while you're in a battle, it could disconnect you from that battle. The system waits 15 minutes of inactivity before using your key to minimize this risk.`;

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-2">Mhann API Integration</h2>
        <p className="text-sm text-gray-400 mb-4">
          Configure your Mhann API key to enable automatic data collection features.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium mb-2">
              API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onFocus={() => {
                // Clear masked value when user focuses to type
                if (apiKey.startsWith('••')) {
                  setApiKey('');
                }
              }}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your Mhann API key"
            />
            <p className="mt-2 text-xs text-gray-500">
              Your API key is stored securely. Clear the field and save to remove it.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="allowGuildUse"
              checked={allowGuildUse}
              onChange={(e) => setAllowGuildUse(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <label htmlFor="allowGuildUse" className="text-sm font-medium">
                  Allow guild to use my API key for data fetching
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTooltip(!showTooltip)}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="text-gray-400 hover:text-gray-300"
                    aria-label="More information"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                  {showTooltip && (
                    <div className="absolute left-6 top-0 z-10 w-80 p-3 text-sm bg-gray-900 border border-gray-600 rounded-lg shadow-lg">
                      <p className="text-gray-300">{tooltipText}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-900/50 border border-green-700 text-green-200'
                : 'bg-red-900/50 border border-red-700 text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
