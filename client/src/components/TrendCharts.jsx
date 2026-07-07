import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

function TrendChart({ data, dataKey, name, color, unit }) {
  // Compute trend (oldest vs newest)
  const trend = useMemo(() => {
    if (data.length < 2) return null;
    const oldest = data[0][dataKey];
    const newest = data[data.length - 1][dataKey];
    if (oldest == null || newest == null) return null;
    
    const diff = newest - oldest;
    if (oldest === 0 && diff !== 0) return { direction: diff > 0 ? 'up' : 'down', text: '—' };
    if (oldest === 0 && diff === 0) return { direction: 'flat', text: '0%' };
    
    const pct = (diff / oldest) * 100;
    const direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
    return { direction, pct: Math.abs(pct).toFixed(1) + '%' };
  }, [data, dataKey]);

  return (
    <div style={{
      background: 'var(--color-surface-alt)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
      border: '1px solid var(--color-border-soft)'
    }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
        <p style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{name}</p>
        {trend && trend.direction !== 'flat' && (
          <span style={{ 
            fontSize: 'var(--font-xs)', 
            fontWeight: 700,
            color: trend.direction === 'up' ? 'var(--color-primary)' : 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem'
          }}>
            {trend.direction === 'up' ? '↑' : '↓'} {trend.pct}
          </span>
        )}
      </div>
      
      <div style={{ width: '100%', height: 160 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-soft)" vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              tick={{ fontSize: 10, fill: 'var(--color-text-dim)' }} 
              tickFormatter={(ts) => {
                const d = new Date(ts);
                return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:00`;
              }}
              minTickGap={30}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'var(--color-text-dim)' }} 
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}${unit || ''}`}
            />
            <Tooltip 
              contentStyle={{ background: 'var(--color-surface-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}
              labelFormatter={(ts) => new Date(ts).toLocaleString()}
              formatter={(val) => [`${val} ${unit || ''}`, name]}
            />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function TrendCharts({ readings }) {
  // Recharts expects chronological order (oldest to newest for left-to-right plotting)
  // Our backend returns newest first, so we reverse it.
  const chartData = useMemo(() => {
    if (!readings || readings.length === 0) return [];
    return [...readings].reverse();
  }, [readings]);

  if (chartData.length === 0) {
    return (
      <div className="card text-center" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-5)' }}>
        <p className="text-muted text-sm">Not enough data to display trends.</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: 'var(--space-3)',
      marginBottom: 'var(--space-5)'
    }}>
      <TrendChart data={chartData} dataKey="moisture" name="Soil Moisture" color="var(--color-accent)" unit="%" />
      <TrendChart data={chartData} dataKey="temperature" name="Temperature" color="var(--color-warning)" unit="°C" />
      <TrendChart data={chartData} dataKey="ph" name="Soil pH" color="var(--color-primary)" unit="" />
      <TrendChart data={chartData} dataKey="nitrogen" name="Nitrogen (N)" color="var(--color-primary)" unit=" mg" />
      <TrendChart data={chartData} dataKey="phosphorus" name="Phosphorus (P)" color="var(--color-warning)" unit=" mg" />
      <TrendChart data={chartData} dataKey="potassium" name="Potassium (K)" color="var(--color-accent)" unit=" mg" />
    </div>
  );
}
