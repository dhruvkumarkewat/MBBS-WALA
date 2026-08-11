import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function CutoffTrends({ cutoffs }: { cutoffs: any[] }) {
  // Aggregate data by year for the chart
  // We'll show the top categories. E.g. UR, OBC.
  const chartData = useMemo(() => {
    if (!cutoffs || cutoffs.length === 0) return [];
    
    // Group by year
    const byYear: Record<string, any> = {};
    cutoffs.forEach(c => {
      if (!c.year || !c.aiq_rank) return;
      if (!byYear[c.year]) byYear[c.year] = { name: c.year };
      
      // We take Round 1 or the most representative round (or lowest rank) for simplicity
      const cat = c.category_code || c.category;
      if (!byYear[c.year][cat] || byYear[c.year][cat] > c.aiq_rank) {
        byYear[c.year][cat] = c.aiq_rank;
      }
    });

    return Object.values(byYear).sort((a: any, b: any) => a.name - b.name);
  }, [cutoffs]);

  const categories = useMemo(() => {
    if (chartData.length === 0) return [];
    const keys = new Set<string>();
    chartData.forEach(d => {
      Object.keys(d).forEach(k => {
        if (k !== 'name') keys.add(k);
      });
    });
    return Array.from(keys);
  }, [chartData]);

  const colors = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#ec4899'];

  return (
    <div className="h-80 w-full mt-6">
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {categories.map((cat, idx) => (
                <linearGradient key={cat} id={`color${cat}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="name" stroke="#666" tick={{ fill: '#888' }} axisLine={false} tickLine={false} />
            <YAxis stroke="#666" tick={{ fill: '#888' }} axisLine={false} tickLine={false} reversed />
            <Tooltip 
              contentStyle={{ backgroundColor: '#141a24', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
            {categories.map((cat, idx) => (
              <Area 
                key={cat}
                type="monotone" 
                dataKey={cat} 
                stroke={colors[idx % colors.length]} 
                fillOpacity={1} 
                fill={`url(#color${cat})`} 
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-gray-500">
          Not enough historical data to generate trend chart.
        </div>
      )}
    </div>
  );
}
