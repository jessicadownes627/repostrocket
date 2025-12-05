// src/pages/Dashboard.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-black text-champagne px-6 py-10 font-inter">
      {/* HEADER */}
      <h1 className="text-4xl font-playfair tracking-wide mb-8">
        Welcome back
      </h1>

      {/* QUICK ACTIONS */}
      <div className="space-y-6">

        {/* SINGLE LISTING */}
        <Link to="/single-listing">
          <div className="p-5 bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl border border-neutral-700 hover:border-emerald-400 transition-all cursor-pointer shadow-md">
            <h2 className="text-2xl font-playfair mb-1">Single Listing ✨</h2>
            <p className="text-sm text-neutral-300">
              Create one magical listing in seconds.
            </p>
          </div>
        </Link>

        {/* BATCH MODE */}
        <Link to="/batch">
          <div className="p-5 bg-gradient-to-br from-black to-emerald-950 rounded-2xl border border-emerald-600 hover:border-emerald-300 transition-all cursor-pointer shadow-md">
            <h2 className="text-2xl font-playfair mb-1 flex items-center justify-between">
              <span>Batch Mode 🔥</span>
              <span className="text-xs bg-emerald-600 text-black px-2 py-1 rounded-md font-bold">
                PREMIUM
              </span>
            </h2>
            <p className="text-sm text-neutral-300">
              Upload multiple items. Build your inventory fast.
            </p>
          </div>
        </Link>

        {/* INVENTORY */}
        <Link to="/inventory">
          <div className="p-5 bg-neutral-900 rounded-2xl border border-neutral-700 hover:border-champagne transition-all cursor-pointer shadow-md">
            <h2 className="text-xl font-playfair mb-1">Your Inventory 📦</h2>
            <p className="text-sm text-neutral-300">View and manage your saved listings.</p>
          </div>
        </Link>

      </div>

      {/* TOOLS GRID */}
      <div className="mt-10">
        <h3 className="text-xl font-playfair mb-4">Tools</h3>

        <div className="grid grid-cols-2 gap-4">
          <Link to="/drafts">
            <div className="p-4 bg-neutral-900 rounded-xl border border-neutral-700 hover:border-emerald-300 transition-all cursor-pointer shadow-md">
              My Drafts
            </div>
          </Link>

          <Link to="/continue">
            <div className="p-4 bg-neutral-900 rounded-xl border border-neutral-700 hover:border-emerald-300 transition-all cursor-pointer shadow-md">
              Pick Up
            </div>
          </Link>

          <Link to="/usage">
            <div className="p-4 bg-neutral-900 rounded-xl border border-neutral-700 hover:border-emerald-300 transition-all cursor-pointer shadow-md">
              Usage Meter
            </div>
          </Link>

          <Link to="/settings">
            <div className="p-4 bg-neutral-900 rounded-xl border border-neutral-700 hover:border-emerald-300 transition-all cursor-pointer shadow-md">
              Settings
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
