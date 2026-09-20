'use client'

import React, { useState } from 'react'

export default function SubscriptionsPage() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const tabs = ['All', 'Active', 'Paused', 'Completed', 'Expired', 'Canceled']

  const subscriptions: any[] = []

  const filtered = subscriptions.filter(s => {
    const matchStatus = activeFilter === 'All' || s.status.toLowerCase() === activeFilter.toLowerCase()
    const matchQuery = String(s.id).includes(searchQuery) || s.username.includes(searchQuery) || s.service.toLowerCase().includes(searchQuery.toLowerCase())
    return matchStatus && matchQuery
  })

  return (
    <div className="space-y-6">
      
      {/* Header filter bar (Exact JAP layout Screenshot 3) */}
      <div className="bg-[#eef2ff]/70 rounded-2xl p-3 flex flex-col md:flex-row items-center justify-between gap-4 border border-blue-100">
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition ${
                activeFilter === tab
                  ? 'bg-white text-gray-900 shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-white border border-gray-200 rounded-xl py-2 px-4 text-xs text-gray-800 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="font-bold text-gray-500 uppercase bg-[#f8fafc] border-b border-gray-200/80">
              <tr>
                <th className="p-3.5">ID</th>
                <th className="p-3.5">Username</th>
                <th className="p-3.5">Quantity</th>
                <th className="p-3.5">Posts</th>
                <th className="p-3.5">Old posts</th>
                <th className="p-3.5">Delay</th>
                <th className="p-3.5">Service</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Created</th>
                <th className="p-3.5">Updated</th>
                <th className="p-3.5">Expiry</th>
                <th className="p-3.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-gray-400 font-medium">
                    No active auto subscriptions found.
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50/80 transition">
                  <td className="p-3.5 font-bold font-mono text-gray-900 flex items-center gap-2">
                    <span>{sub.id}</span>
                    <span className="w-5 h-5 rounded bg-[#ff5722] text-white text-[10px] font-bold flex items-center justify-center">
                      L
                    </span>
                  </td>
                  <td className="p-3.5 font-semibold text-gray-800">{sub.username}</td>
                  <td className="p-3.5 font-mono">{sub.quantity}</td>
                  <td className="p-3.5 font-mono">{sub.posts}</td>
                  <td className="p-3.5 font-mono">{sub.oldPosts}</td>
                  <td className="p-3.5 text-gray-600">{sub.delay}</td>
                  <td className="p-3.5 max-w-xs text-gray-700 leading-snug">{sub.service}</td>
                  
                  {/* Status Pill (Exact match to JAP screenshot: Purple for Active) */}
                  <td className="p-3.5 text-center">
                    <span className="px-3 py-1 rounded-md text-[11px] font-bold text-white uppercase bg-[#7e22ce]">
                      {sub.status}
                    </span>
                  </td>

                  <td className="p-3.5 text-gray-500 whitespace-nowrap">{sub.created}</td>
                  <td className="p-3.5 text-gray-500 whitespace-nowrap">{sub.updated}</td>
                  <td className="p-3.5 text-gray-500 whitespace-nowrap">{sub.expiry}</td>

                  <td className="p-3.5">
                    <button
                      onClick={() => {}}
                      className="w-5 h-5 rounded bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition"
                      title="Stop Subscription"
                    >
                      ■
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
