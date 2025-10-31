import React, { useState } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(apiKey.trim());
    setApiKey('');
    onClose();
  };
  
  const handleCancel = () => {
    setApiKey('');
    onClose();
  }

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity"
        onClick={handleCancel}
    >
      <div 
        className="bg-dark-card rounded-lg border border-dark-border shadow-xl w-full max-w-md m-4 text-white transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-dark-border">
          <h2 className="text-2xl font-bold">Manage API Key</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-dark-text-secondary text-sm">
            To avoid hitting shared usage limits, you can use your own Google AI Studio API key. Your key is saved securely in your browser's local storage and is never sent to our servers.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Google AI Studio API Key"
            className="w-full bg-dark-bg border border-dark-border rounded-md px-4 py-3 text-white placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-purple"
          />
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-purple-light hover:underline"
          >
            Get your API key from Google AI Studio &rarr;
          </a>
        </div>
        <div className="p-4 bg-dark-bg/50 rounded-b-lg flex justify-end gap-4">
          <button onClick={handleCancel} className="bg-dark-border text-white font-semibold px-4 py-2 rounded-md hover:bg-gray-600 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="bg-brand-purple text-white font-semibold px-6 py-2 rounded-md hover:bg-brand-purple-light transition-colors">
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;