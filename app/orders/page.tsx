'use client'

import React, { useState } from 'react'
import { useAppState } from '@/lib/store'
import { Search, Copy, Check } from 'lucide-react'

interface DisplayOrder {
  id: string | number
  created_at: string
  target_link: string
  charge_xaf: number
  charge_usd?: number
  start_count: number
  quantity: number
  service_name: string
  remains: number
  status: string
}

export default function OrdersPage() {
  const { smmOrders } = useAppState()

  const [activeFilter, setActiveFilter] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | number | null>(null)

  const filterTabs = [
    'All',
    'Pending',
    'In progress',
    'Completed',
    'Partial',
    'Processing',
    'Canceled',
    'Refunds'
  ]

  const displayOrders: DisplayOrder[] = smmOrders

  const handleCopy = (id: string | number) => {
    navigator.clipboard.writeText(String(id))
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredOrders = displayOrders.filter(o => {
    const matchStatus = activeFilter === 'All' || o.status.toLowerCase() === activeFilter.toLowerCase()
    const matchSearch = String(o.id).includes(searchQuery) || o.service_name.toLowerCase().includes(searchQuery.toLowerCase()) || o.target_link.toLowerCase().includes(searchQuery.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className="space-y-6">
      
      {/* Status Filter Header Bar (Exact JAP layout Screenshot 4) */}
      <div className="bg-[#eef2ff]/70 rounded-2xl p-3 flex flex-col md:flex-row items-center justify-between gap-4 border border-blue-100">
        
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-4 py-2 rounded-xl font-semibold text-xs transition whitespace-nowrap ${
                activeFilter === tab
                  ? 'bg-white text-gray-900 shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-white border border-gray-200 rounded-xl py-2 px-4 text-xs text-gray-800 placeholder-gray-400 outline-none"
          />
        </div>

      </div>

      {/* Orders Table Container */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="font-bold text-gray-500 uppercase bg-[#f8fafc] border-b border-gray-200/80">
              <tr>
                <th className="p-3.5">ID</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Link</th>
                <th className="p-3.5">Charge</th>
                <th className="p-3.5">Start count</th>
                <th className="p-3.5">Quantity</th>
                <th className="p-3.5">Service</th>
                <th className="p-3.5">Remains</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400 font-medium">
                    No orders found. Place your first order from the <a href="/dashboard" className="text-[#ff5722] font-bold underline">New Order Dashboard</a>.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/80 transition">
                  {/* ID + Copy Button */}
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="rounded text-[#ff5722]" />
                      <button
                        onClick={() => handleCopy(order.id)}
                        className="w-6 h-6 rounded-md bg-[#2563eb] text-white flex items-center justify-center hover:opacity-90 transition"
                        title="Copy Order ID"
                      >
                        {copiedId === order.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <span className="font-mono font-bold text-gray-900">{order.id}</span>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="p-3.5 text-gray-500 whitespace-nowrap">
                    {new Date(order.created_at).toISOString().replace('T', ' ').substring(0, 19)}
                  </td>

                  {/* Link */}
                  <td className="p-3.5 max-w-xs">
                    <a
                      href={order.target_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#ea580c] hover:underline font-medium truncate block"
                    >
                      {order.target_link}
                    </a>
                  </td>

                  {/* Charge */}
                  <td className="p-3.5 font-bold font-mono text-gray-900">
                    {order.charge_usd !== undefined ? order.charge_usd : (order.charge_xaf / 600).toFixed(4)}
                  </td>

                  {/* Start count */}
                  <td className="p-3.5 font-mono text-gray-600">{order.start_count}</td>

                  {/* Quantity */}
                  <td className="p-3.5 font-bold text-gray-900 font-mono">{order.quantity}</td>

                  {/* Service */}
                  <td className="p-3.5 max-w-md text-gray-700 leading-snug">
                    {order.service_name}
                  </td>

                  {/* Remains */}
                  <td className="p-3.5 font-mono text-gray-600">{order.remains}</td>

                  {/* Status Pill (Exact match to JAP screenshot: Green for Completed, Cyan for Processing) */}
                  <td className="p-3.5 text-center whitespace-nowrap">
                    <span
                      className={`px-3 py-1 rounded-md text-[11px] font-bold text-white uppercase inline-block min-w-[90px] ${
                        order.status.toLowerCase() === 'completed'
                          ? 'bg-[#16a34a]'
                          : order.status.toLowerCase() === 'processing'
                          ? 'bg-[#00b4d8]'
                          : 'bg-[#2563eb]'
                      }`}
                    >
                      {order.status}
                    </span>
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
