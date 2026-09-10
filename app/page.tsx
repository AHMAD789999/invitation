'use client';

import { useState } from 'react';

export default function HomePage() {
  const [showMessage, setShowMessage] = useState(false);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome
        </h1>

        <p className="text-gray-600 text-lg mb-8">
          Welcome to our website. We are happy to have you here.
        </p>

        <button
          onClick={() => setShowMessage(!showMessage)}
          className="px-6 py-3 rounded-lg bg-black text-white hover:bg-gray-800 transition"
        >
          {showMessage ? 'Hide Message' : 'Get Started'}
        </button>

        {showMessage && (
          <div className="mt-6 p-4 rounded-lg bg-gray-100 text-gray-700">
            Thank you for visiting our website.
          </div>
        )}
      </div>
    </main>
  );
}
