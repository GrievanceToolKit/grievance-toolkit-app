'use client';
import React, { useState } from 'react';

export default function ConfigurationPage() {
  const [settings, setSettings] = useState({
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1500,
    pdfLimit: 5,
    customTags: 'Discipline, Overtime, Safety, Harassment',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: value });
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">⚙️ System Configuration</h1>

      <div className="space-y-4">
        <div>
          <label className="block font-medium mb-1 text-gray-700 dark:text-gray-200">AI Model</label>
          <select
            name="model"
            value={settings.model}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:text-white"
          >
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1 text-gray-700 dark:text-gray-200">Temperature</label>
          <input
            type="number"
            step="0.1"
            name="temperature"
            value={settings.temperature}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block font-medium mb-1 text-gray-700 dark:text-gray-200">Max Tokens</label>
          <input
            type="number"
            id="maxTokens"
            name="maxTokens"
            min="100"
            max="4000"
            value={settings.maxTokens}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block font-medium mb-1 text-gray-700 dark:text-gray-200">PDF Generation Limit</label>
          <input
            type="number"
            name="pdfLimit"
            value={settings.pdfLimit}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block font-medium mb-1 text-gray-700 dark:text-gray-200">Custom Contract Tags</label>
          <input
            type="text"
            name="customTags"
            value={settings.customTags}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:text-white"
          />
        </div>

        <button
          type="submit"
          className="w-full mt-4 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
          onClick={e => e.preventDefault()}
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
