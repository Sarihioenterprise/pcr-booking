'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { AlertTriangle, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react'

interface VehiclePnLRow {
  id: string
  make: string
  model: string
  year: number
  license_plate: string | null
  vehicle_status: string
  daily_rate: number
  monthly_insurance_cost: number | null
  monthly_payment: number | null
  booking_count: number
  total_revenue: number
  days_booked: number
  total_maintenance: number
  utilization_rate: number
  net_profit: number
}

type SortKey = 'net_profit' | 'total_revenue' | 'utilization_rate'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function UtilizationBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const color = clamped >= 70 ? 'bg-emerald-500' : clamped >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-10 text-right">{clamped.toFixed(1)}%</span>
    </div>
  )
}

export default function VehiclePnL() {
  const [rows, setRows] = useState<VehiclePnLRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('net_profit')
  const [sortAsc, setSortAsc] = useState(true)

  useEffect(() => {
    fetch('/api/vehicles/pnl')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setRows(data)
        else setError(data.error ?? 'Unknown error')
      })
      .catch(() => setError('Failed to load fleet data'))
      .finally(() => setLoading(false))
  }, [])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey]
      return sortAsc ? diff : -diff
    })
  }, [rows, sortKey, sortAsc])

  const totals = useMemo(() => ({
    revenue: rows.reduce((s, r) => s + r.total_revenue, 0),
    maintenance: rows.reduce((s, r) => s + r.total_maintenance, 0),
    net: rows.reduce((s, r) => s + r.net_profit, 0),
  }), [rows])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  function SortBtn({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k
    return (
      <button
        onClick={() => toggleSort(k)}
        className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors ${
          active ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
        }`}
      >
        {label}
        <ArrowUpDown className="w-3 h-3" />
      </button>
    )
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-center text-slate-400">
        Loading fleet data…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-700/50 bg-red-900/20 p-6 text-red-400">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Fleet Performance</h2>
          <p className="text-xs text-slate-400 mt-0.5">Last 30 days · {rows.length} vehicle{rows.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500 mr-1">Sort:</span>
          <SortBtn label="Profit" k="net_profit" />
          <SortBtn label="Revenue" k="total_revenue" />
          <SortBtn label="Utilization" k="utilization_rate" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">No vehicles found.</div>
        ) : (
          <div className="divide-y divide-slate-700/60">
            {sorted.map(v => {
              const isLoss = v.net_profit < 0
              return (
                <div
                  key={v.id}
                  className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors hover:bg-slate-700/30 ${
                    isLoss ? 'border-l-2 border-red-500/70' : 'border-l-2 border-transparent'
                  }`}
                >
                  {/* Vehicle name */}
                  <div className="flex items-center gap-2 min-w-0 sm:w-48">
                    {isLoss ? (
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">
                        {v.year} {v.make} {v.model}
                      </p>
                      {v.license_plate && (
                        <p className="text-xs text-slate-500">{v.license_plate}</p>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Revenue</p>
                      <p className={`text-sm font-semibold ${v.total_revenue > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {fmt(v.total_revenue)}
                      </p>
                      <p className="text-xs text-slate-500">{v.booking_count} booking{v.booking_count !== 1 ? 's' : ''}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Maintenance</p>
                      <p className={`text-sm font-semibold ${v.total_maintenance > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        {fmt(v.total_maintenance)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Net Profit</p>
                      <p className={`text-base font-bold ${isLoss ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isLoss && <TrendingDown className="inline w-3.5 h-3.5 mr-0.5 mb-0.5" />}
                        {fmt(v.net_profit)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Utilization</p>
                      <UtilizationBar pct={v.utilization_rate} />
                    </div>
                  </div>

                  {/* Action */}
                  <div className="sm:w-20 flex sm:justify-end">
                    <Link
                      href={`/dashboard/vehicles/${v.id}`}
                      className="text-xs text-slate-400 hover:text-slate-100 border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Summary footer */}
        {sorted.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-700 bg-slate-900/40 flex flex-wrap gap-6">
            <div>
              <span className="text-xs text-slate-500">Total Revenue </span>
              <span className="text-sm font-semibold text-emerald-400">{fmt(totals.revenue)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500">Total Maintenance </span>
              <span className="text-sm font-semibold text-red-400">{fmt(totals.maintenance)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500">Fleet Net Profit </span>
              <span className={`text-sm font-bold ${totals.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmt(totals.net)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
