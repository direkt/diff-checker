import React, { useState, useEffect } from 'react';

const LOCAL_STORAGE_KEY = 'openai_api_key';

const OpenAISetupBox: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      setSavedKey(stored);
      setApiKey(stored);
    }
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem(LOCAL_STORAGE_KEY, apiKey.trim());
      setSavedKey(apiKey.trim());
      setStatus('API key saved!');
    } else {
      setStatus('Please enter a valid API key.');
    }
  };

  const handleClear = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setSavedKey(null);
    setApiKey('');
    setStatus('API key cleared.');
  };

  return (
    <div className="border rounded-lg p-4 mb-6 bg-gray-50 max-w-xl mx-auto">
      <h2 className="text-lg font-semibold mb-2">OpenAI API Setup</h2>
      <div className="mb-2">
        <input
          type="password"
          className="border p-2 rounded w-full"
          placeholder="Enter your OpenAI API key..."
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
        />
      </div>
      <div className="flex gap-2 mb-2">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleSave}
        >
          Save
        </button>
        <button
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
          onClick={handleClear}
        >
          Clear
        </button>
      </div>
      <div className="text-sm text-gray-600">
        {savedKey ? 'API key is set.' : 'No API key set.'}
        {status && <span className="ml-2 text-blue-700">{status}</span>}
      </div>
      <div className="text-xs text-gray-500 mt-2">
        Your API key is stored only in your browser and never sent to our server.
      </div>
    </div>
  );
};

export default OpenAISetupBox; 