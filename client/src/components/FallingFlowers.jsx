// client/src/components/FallingFlowers.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Decorative animated background — tiny lemon-green blossoms falling across
// the full viewport. Runs entirely on CSS animations, never blocks the JS
// thread, and uses pointer-events:none so it never interferes with the UI.
//
// Random values (position, speed, drift, size) are generated ONCE on mount
// via useMemo so there's no re-render cost.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from 'react'

// Number of petals — keep low for performance
const COUNT = 22

// Flower / blossom Unicode characters
const CHARS = ['✿', '❀', '✽', '❁', '⚘']

// Seeded random helper (just Math.random — called once on mount)
function rand(min, max) {
  return min + Math.random() * (max - min)
}

function FallingFlowers() {
  const petals = useMemo(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      id:       i,
      char:     CHARS[i % CHARS.length],
      left:     rand(0, 100),           // % across the screen
      size:     rand(8, 18),            // px font-size
      duration: rand(10, 22),           // seconds to fall full height
      delay:    -rand(0, 22),           // negative = already mid-fall on load
      drift:    (Math.random() < 0.5 ? -1 : 1) * rand(20, 70), // px horizontal drift
      spin:     rand(120, 400),         // degrees of rotation during fall
    }))
  , []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {petals.map(p => (
        <span
          key={p.id}
          style={{
            position:  'absolute',
            left:      `${p.left}%`,
            top:       '-30px',
            fontSize:  `${p.size}px`,
            color:     'var(--flower-color)',
            // Pass random values as CSS custom props picked up by the keyframe
            '--drift': `${p.drift}px`,
            '--spin':  `${p.spin}deg`,
            animation: `petalFall ${p.duration}s ${p.delay}s linear infinite`,
            willChange: 'transform, opacity',
            userSelect: 'none',
          }}
        >
          {p.char}
        </span>
      ))}
    </div>
  )
}

export default FallingFlowers
