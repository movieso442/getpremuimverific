'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Video,
  Music,
  Search,
  Send,
  MessageSquare,
  Globe,
  Star,
  Layers,
  Zap,
  ChevronDown,
  Info,
  Share2,
  Tv,
  MessageCircle,
  HelpCircle
} from 'lucide-react'
import liveServices from '@/lib/liveServices.json'
import { useAppState } from '@/lib/store'
import confetti from 'canvas-confetti'

export default function DashboardPage() {
  const { createSmmOrder } = useAppState()

  const allServices = liveServices as any[]
  const allCategories = Array.from(new Set(allServices.map((s) => s.category)))

  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'NEW_ORDER' | 'MY_FAVORITE' | 'AUTO_SUBSCRIPTION'>('NEW_ORDER')
  
  // Search & Filter state inside Order form
  const [searchFilter, setSearchFilter] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>(allCategories[0] || 'CoinMarketCap')
  const [selectedServiceId, setSelectedServiceId] = useState<number>(allServices[0]?.id || 10110)
  const [targetLink, setTargetLink] = useState('')
  const [quantity, setQuantity] = useState<number>(1000)
  const [favoriteServiceIds, setFavoriteServiceIds] = useState<number[]>([10110, 8751, 7102])
  const [showFilterGrid, setShowFilterGrid] = useState(true)

  const networks = [
    { name: 'Instagram', icon: CameraIcon, match: 'Instagram' },
    { name: 'Facebook', icon: Share2, match: 'Facebook' },
    { name: 'Youtube', icon: Tv, match: 'YouTube' },
    { name: 'X (Twitter)', icon: MessageCircle, match: 'Twitter' },
    { name: 'Spotify', icon: Music, match: 'Spotify' },
    { name: 'TikTok', icon: Video, match: 'TikTok' },
    { name: 'Linkedin', icon: Share2, match: 'LinkedIn' },
    { name: 'Google', icon: Search, match: 'Google' },
    { name: 'Telegram', icon: Send, match: 'Telegram' },
    { name: 'Discord', icon: MessageSquare, match: 'Discord' },
    { name: 'Snapchat', icon: Video, match: 'Snapchat' },
    { name: 'Twitch', icon: Music, match: 'Twitch' },
    { name: 'Website Traffic', icon: Globe, match: 'Traffic' },
    { name: 'Reviews', icon: Star, match: 'Reviews' },
    { name: '+ Others', icon: Layers, match: 'CoinMarketCap' },
    { name: 'Everything', icon: Zap, match: 'All' },
  ]

  function CameraIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    )
  }

  // 1. Categories filtered by selected network
  const availableCategories = selectedNetwork && selectedNetwork !== 'Everything'
    ? allCategories.filter((c) => {
        const netObj = networks.find(n => n.name === selectedNetwork)
        const matchKey = netObj ? netObj.match : selectedNetwork
        if (matchKey === 'All') return true
        return c.toLowerCase().includes(matchKey.toLowerCase())
      })
    : allCategories

  // Network selection toggle
  const handleNetworkSelect = (netName: string, matchKey: string) => {
    if (selectedNetwork === netName) {
      setSelectedNetwork(null)
      const firstCat = allCategories[0] || 'CoinMarketCap'
      setSelectedCategory(firstCat)
      const firstSrv = allServices.find((s) => s.category === firstCat)
      if (firstSrv) {
        setSelectedServiceId(firstSrv.id)
        setQuantity(firstSrv.min)
      }
    } else {
      setSelectedNetwork(netName)
      const matchedCats = matchKey === 'All'
        ? allCategories
        : allCategories.filter((c) => c.toLowerCase().includes(matchKey.toLowerCase()))

      const targetCat = matchedCats[0] || allCategories[0]
      setSelectedCategory(targetCat)
      const firstSrv = allServices.find((s) => s.category === targetCat)
      if (firstSrv) {
        setSelectedServiceId(firstSrv.id)
        setQuantity(firstSrv.min)
      }
    }
  }

  // Filter services by Category and Search Filter
  const filteredServices = allServices.filter((s) => {
    const matchCat = selectedCategory === 'All' || s.category === selectedCategory
    const matchQuery =
      searchFilter === '' ||
      s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      String(s.id).includes(searchFilter) ||
      s.category.toLowerCase().includes(searchFilter.toLowerCase())
    return matchCat && matchQuery
  })

  // Selected Service object
  const currentService = allServices.find((s) => s.id === Number(selectedServiceId)) || filteredServices[0] || allServices[0]

  // Calculated charge
  const rateUsd = currentService?.rate_usd || 1.0
  const chargeUsd = currentService?.min === 1 && currentService?.max === 1
    ? rateUsd
    : (rateUsd * (quantity / 1000))
  const chargeXaf = Math.ceil(chargeUsd * 600 * 1.25)

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetLink.trim()) {
      alert('Please enter a target link, username, or order detail keywords!')
      return
    }
    if (quantity < currentService.min || quantity > currentService.max) {
      alert(`Quantity must be between ${currentService.min.toLocaleString()} and ${currentService.max.toLocaleString()}`)
      return
    }

    const newOrder = createSmmOrder(
      currentService.id,
      currentService.name,
      currentService.category,
      targetLink,
      quantity,
      chargeXaf
    )

    if (newOrder) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      alert(`Order #${newOrder.id} placed successfully! Check status in Orders tab.`)
      setTargetLink('')
    }
  }

  const toggleFavorite = (id: number) => {
    if (favoriteServiceIds.includes(id)) {
      setFavoriteServiceIds(favoriteServiceIds.filter(f => f !== id))
    } else {
      setFavoriteServiceIds([...favoriteServiceIds, id])
    }
  }

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: CHOOSE A SOCIAL NETWORK (Exact JAP UI Screenshot 4) */}
      {showFilterGrid && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-[#3b82f6] uppercase tracking-wider">
              CHOOSE A SOCIAL NETWORK
            </h2>
            <button
              onClick={() => setShowFilterGrid(false)}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition flex items-center gap-1"
            >
              <span>Hide the filter</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Network Selection Grid (Telegram lights up orange when selected like Screenshot 4) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {networks.map((net) => {
              const Icon = net.icon
              const isSelected = selectedNetwork === net.name
              return (
                <button
                  key={net.name}
                  onClick={() => handleNetworkSelect(net.name, net.match)}
                  className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-xs font-bold transition ${
                    isSelected
                      ? 'bg-[#ff5722] border-[#ff5722] text-white shadow-sm'
                      : 'bg-[#f8fafc] border-gray-200/80 text-gray-700 hover:bg-white hover:border-gray-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                  <span className="truncate">{net.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!showFilterGrid && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowFilterGrid(true)}
            className="text-xs font-bold text-[#3b82f6] hover:underline flex items-center gap-1"
          >
            <span>Show Social Network Filter Grid</span>
            <ChevronDown className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      )}

      {/* SECTION 2: NEW ORDER FORM & SUMMARY GRID (Exact JAP Layout Screenshots 1, 2, 3, 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Order Form */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Tabs: NEW ORDER / MY FAVORITE / AUTO SUBSCRIPTION */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
            <button
              onClick={() => setActiveTab('NEW_ORDER')}
              className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
                activeTab === 'NEW_ORDER'
                  ? 'bg-[#ff5722] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              NEW ORDER
            </button>

            <button
              onClick={() => setActiveTab('MY_FAVORITE')}
              className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
                activeTab === 'MY_FAVORITE'
                  ? 'bg-[#ff5722] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              MY FAVORITE ({favoriteServiceIds.length})
            </button>

            <button
              onClick={() => setActiveTab('AUTO_SUBSCRIPTION')}
              className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
                activeTab === 'AUTO_SUBSCRIPTION'
                  ? 'bg-[#ff5722] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              AUTO SUBSCRIPTION
            </button>
          </div>

          {activeTab === 'NEW_ORDER' && (
            <form onSubmit={handleOrderSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-5 shadow-2xs">
              
              {/* Search Filter input inside Order Form (Exact JAP UI Screenshot 1, 2, 4) */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search"
                  className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-gray-800 outline-none focus:border-[#ff5722] focus:bg-white transition"
                />
              </div>

              {/* Category Select */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    const cat = e.target.value
                    setSelectedCategory(cat)
                    const firstSrv = allServices.find((s) => s.category === cat)
                    if (firstSrv) {
                      setSelectedServiceId(firstSrv.id)
                      setQuantity(firstSrv.min)
                    }
                  }}
                  className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-900 outline-none focus:border-[#ff5722] focus:bg-white transition"
                >
                  <option value="All">All Categories ({availableCategories.length})</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Service Select Dropdown (Exact JAP formatting from Screenshot 1, 2, 3) */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Service
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => {
                    const sId = Number(e.target.value)
                    setSelectedServiceId(sId)
                    const srv = allServices.find((s) => s.id === sId)
                    if (srv) setQuantity(srv.min)
                  }}
                  className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-900 outline-none focus:border-[#ff5722] focus:bg-white transition truncate font-mono"
                >
                  {filteredServices.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.id} - {srv.name} - ${srv.rate_usd}
                    </option>
                  ))}
                </select>
              </div>

              {/* Average time line (Exact match to JAP Screenshots 1, 3) */}
              <div className="bg-[#f8fafc] border border-gray-200/80 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                  <span>Average time</span>
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="text-xs font-extrabold text-gray-900">
                  {currentService?.avgTime || 'Instant'}
                </div>
              </div>

              {/* Link / Target URL Input */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Link
                </label>
                <input
                  type="text"
                  value={targetLink}
                  onChange={(e) => setTargetLink(e.target.value)}
                  placeholder="https://instagram.com/p/..."
                  className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl py-3 px-4 text-xs font-semibold text-gray-900 outline-none focus:border-[#ff5722] focus:bg-white transition"
                />
              </div>

              {/* Quantity Input */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Quantity
                </label>
                <input
                  type="number"
                  min={currentService?.min || 1}
                  max={currentService?.max || 1000000}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl py-3 px-4 text-sm font-bold text-gray-900 outline-none focus:border-[#ff5722] focus:bg-white transition font-mono"
                />
                <div className="text-[11px] font-semibold text-gray-400 mt-1">
                  Min: {currentService?.min.toLocaleString()} - Max: {currentService?.max.toLocaleString()}
                </div>
              </div>

              {/* Calculated Charge */}
              <div className="bg-[#f8fafc] border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Charge</div>
                  <div className="text-2xl font-black text-[#ff5722]">
                    ${chargeUsd.toFixed(4)}{' '}
                    <span className="text-xs font-bold text-gray-500">({chargeXaf.toLocaleString()} XAF)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleFavorite(currentService.id)}
                  className={`p-2.5 rounded-xl border transition ${
                    favoriteServiceIds.includes(currentService.id)
                      ? 'bg-amber-50 border-amber-200 text-amber-500'
                      : 'bg-white border-gray-200 text-gray-400 hover:text-amber-500'
                  }`}
                  title="Add to Favorites"
                >
                  <Star className="w-5 h-5 fill-current" />
                </button>
              </div>

              {/* SUBMIT Button (Exact Orange matching JAP Screenshots 1, 2, 4) */}
              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-[#ff5722] hover:bg-[#ea580c] text-white font-extrabold text-sm uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2"
              >
                <span>SUBMIT</span>
              </button>

            </form>
          )}

          {activeTab === 'MY_FAVORITE' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-2xs">
              <h3 className="text-sm font-bold text-gray-900">Your Favorite Services</h3>
              <div className="space-y-2">
                {favoriteServiceIds.map((id) => {
                  const srv = allServices.find((s) => s.id === id)
                  if (!srv) return null
                  return (
                    <div key={id} className="p-3 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-gray-900">#{srv.id} - {srv.name}</div>
                        <div className="text-[10px] text-gray-500">Rate: ${srv.rate_usd}</div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCategory(srv.category)
                          setSelectedServiceId(srv.id)
                          setQuantity(srv.min)
                          setActiveTab('NEW_ORDER')
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-[#ff5722] text-white font-bold text-[11px]"
                      >
                        Select
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'AUTO_SUBSCRIPTION' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 text-xs text-gray-600 shadow-2xs">
              <h3 className="text-sm font-bold text-gray-900">Auto Subscriptions</h3>
              <p>Set up automated post likes, views, and comments for your account whenever you post content.</p>
              <Link href="/subscriptions" className="inline-block px-4 py-2 bg-[#2563eb] text-white font-bold rounded-xl text-xs">
                Manage Subscriptions
              </Link>
            </div>
          )}

        </div>

        {/* Right 1 Col: Service Specification Card (Exact JAP Right Card from Screenshots 1, 2, 4) */}
        <div className="space-y-4">
          
          {/* Top Search bar inside right card */}
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs uppercase shadow-2xs">
              NEW ORDER
            </button>
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search for your orders"
                className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs text-gray-700 outline-none"
              />
            </div>
          </div>

          {/* Service Details Specification Box */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 shadow-2xs">
            
            {/* Service Title & Price */}
            <div className="text-xs font-extrabold text-gray-900 leading-relaxed font-mono">
              {currentService?.id} - {currentService?.name} - {currentService?.usdRate !== undefined ? `$${currentService.usdRate}` : `$${(currentService.rate / 600).toFixed(4)}`}
            </div>

            {/* 4-Grid Specification Metrics (Exact match to Screenshots 1, 2, 4) */}
            <div className="grid grid-cols-2 gap-4 border-y border-gray-100 py-4">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">START TIME</div>
                <div className={`text-xs font-extrabold mt-0.5 ${currentService?.startTime === 'N/A' ? 'text-red-500' : 'text-[#ea580c]'}`}>
                  {currentService?.startTime || '0-24 Hours'}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SPEED</div>
                <div className={`text-xs font-extrabold mt-0.5 ${currentService?.speed === 'N/A' ? 'text-red-500' : 'text-[#ea580c]'}`}>
                  {currentService?.speed || 'Up to 50K/D'}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">GUARANTEED</div>
                <div className={`text-xs font-extrabold mt-0.5 ${currentService?.guaranteed === 'N/A' ? 'text-red-500' : 'text-gray-800'}`}>
                  {currentService?.guaranteed || '30 Days Refill'}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AVERAGE TIME</div>
                <div className="text-xs font-extrabold text-[#ea580c] mt-0.5">
                  {currentService?.avgTime || 'Instant'}
                </div>
              </div>
            </div>

            {/* Description Details (Exact match to Screenshots 1, 2) */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">DESCRIPTION</div>
              <div className="text-xs text-gray-700 leading-relaxed font-medium whitespace-pre-line bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                {currentService?.description}
              </div>
            </div>

            {/* Notice / Quality Guarantee */}
            <div className="bg-[#f0f7ff] border border-[#dbeafe] rounded-xl p-3.5 text-xs text-[#1e40af]">
              <div className="font-bold mb-1 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#2563eb]" />
                <span>Quality & Guarantee</span>
              </div>
              <div className="text-[11px] leading-snug text-gray-700">
                Automated high-speed server execution via JustAnotherPanel API v2.
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}
