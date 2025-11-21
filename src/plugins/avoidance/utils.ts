import type { BentoCard } from '@/types/bento'

export const getUnitsForCard = (card: BentoCard) => {
  if (card.units) return card.units
  const map: Record<string, { w: number; h: number }> = {
    small: { w: 1, h: 1 },
    medium: { w: 2, h: 1 },
    large: { w: 1, h: 2 },
    wide: { w: 2, h: 2 }
  }
  const size = (card.size as any) || 'wide'
  return map[size] || { w: 2, h: 2 }
}

export const toGridXY = (left: number, top: number, unit: number, gap: number) => {
  const cell = unit + gap
  const x = Math.max(0, Math.floor(left / cell))
  const y = Math.max(0, Math.floor(top / cell))
  return { x, y }
}

export const buildOccupancy = (cards: BentoCard[], columns: number) => {
  let maxY = 0
  for (const c of cards) {
    const u = getUnitsForCard(c)
    maxY = Math.max(maxY, c.position.y + u.h)
  }
  const rows = Math.max(1, maxY + 4)
  const occ: number[][] = Array.from({ length: rows }, () => Array.from({ length: columns }, () => 0))
  for (const c of cards) {
    const u = getUnitsForCard(c)
    for (let dy = 0; dy < u.h; dy++) {
      for (let dx = 0; dx < u.w; dx++) {
        const gx = c.position.x + dx
        const gy = c.position.y + dy
        if (gy >= 0 && gy < rows && gx >= 0 && gx < columns) occ[gy][gx] = 1
      }
    }
  }
  return occ
}

export const canPlace = (occ: number[][], columns: number, x: number, y: number, w: number, h: number) => {
  if (x < 0 || y < 0 || x + w > columns) {
    if (import.meta.env.MODE === 'development' && (x >= 0 || y >= 0)) {
      console.log(`[canPlace] 边界检查失败: x=${x}, y=${y}, w=${w}, h=${h}, columns=${columns}`)
    }
    return false
  }
  for (let dy = 0; dy < h; dy++) {
    const row = occ[y + dy]
    if (!row) {
      // 行越界视为可扩展空行（允许向下探测）
      if (import.meta.env.MODE === 'development') {
        console.log(`[canPlace] 行越界: y+dy=${y + dy}，视为可用`)
      }
      continue
    }
    for (let dx = 0; dx < w; dx++) {
      if (row[x + dx] === 1) {
        if (import.meta.env.MODE === 'development') {
          console.log(`[canPlace] 位置被占用: (${x + dx},${y + dy})`)
        }
        return false
      }
    }
  }
  if (import.meta.env.MODE === 'development') {
    console.log(`[canPlace] 位置可用: (${x},${y},${w},${h})`)
  }
  return true
}

export const aabbOverlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  )
}

export const bfsNearest = (occ: number[][], columns: number, start: { x: number; y: number }, size: { w: number; h: number }, limit = 800) => {
  const q: Array<{ x: number; y: number }> = []
  const seen = new Set<string>()
  q.push({ x: start.x, y: start.y })
  seen.add(`${start.x},${start.y}`)
  let steps = 0
  
  if (import.meta.env.MODE === 'development') {
    console.log(`[bfsNearest] 开始搜索，起始位置 (${start.x},${start.y})，尺寸 ${size.w}x${size.h}，网格大小 ${columns}x${occ.length}`)
  }
  
  while (q.length && steps < limit) {
    const cur = q.shift()!
    const canPlaceResult = canPlace(occ, columns, cur.x, cur.y, size.w, size.h)
    
    if (import.meta.env.MODE === 'development' && steps < 10) {
      console.log(`[bfsNearest] 检查位置 (${cur.x},${cur.y}): ${canPlaceResult}`)
    }
    
    if (canPlaceResult) {
      if (import.meta.env.MODE === 'development') {
        console.log(`[bfsNearest] 找到可用位置 (${cur.x},${cur.y})，步数: ${steps}`)
      }
      return cur
    }
    
    const nexts = [
      { x: cur.x, y: cur.y - 1 },
      { x: cur.x, y: cur.y + 1 },
      { x: cur.x - 1, y: cur.y },
      { x: cur.x + 1, y: cur.y }
    ]
    for (const n of nexts) {
      const key = `${n.x},${n.y}`
      if (!seen.has(key) && (n.x >= 0 && n.x < columns && n.y >= 0 && n.y < occ.length + 8)) {
        seen.add(key)
        q.push(n)
      }
    }
    steps++
  }
  
  if (import.meta.env.MODE === 'development') {
    console.log(`[bfsNearest] 未找到可用位置，搜索步数: ${steps}`)
  }
  
  return null
}
