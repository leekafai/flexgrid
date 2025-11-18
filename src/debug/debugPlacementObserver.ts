type Rect = { left: number; top: number; width: number; height: number } | null

type Opts = {
  unit: number
  gap: number
  columns: number
  paddingLeft: number
  paddingTop: number
  timeoutMs?: number
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

const log = (entry: any) => {
  try {
    console.log('[DBG]', JSON.stringify(entry))
  } catch {}
}

export const attachPlacementObserver = (
  cardId: string,
  gridEl: HTMLElement,
  getModelPos: () => { x: number; y: number } | null,
  getShadowRect: () => Rect,
  opts: Opts
) => {
  // Always emit an attach marker for visibility
  try { console.log('[DBG]', JSON.stringify({ type: 'attach', id: cardId, ts: now() })) } catch {}
  let active = true
  const el = gridEl.querySelector(`.bento-grid__card[data-id="${cardId}"]`) as HTMLElement | null
  const startTs = now()
  log({ type: 'placementStart', id: cardId, ts: startTs, opts })
  if (!el) {
    return { detach: () => {} }
  }
  const observer = new MutationObserver(mutations => {
    if (!active) return
    for (const m of mutations) {
      if (m.type === 'attributes') {
        const cs = getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        log({
          type: 'mutation',
          id: cardId,
          ts: now(),
          name: m.attributeName,
          style: {
            left: cs.left,
            top: cs.top,
            transform: cs.transform,
            position: cs.position,
            zIndex: cs.zIndex,
            transition: cs.transition
          },
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          model: getModelPos(),
          shadow: getShadowRect()
        })
      }
    }
  })
  observer.observe(el, { attributes: true, attributeFilter: ['style', 'class'], attributeOldValue: true })
  let rafId = 0
  const poll = () => {
    if (!active) return
    const cs = getComputedStyle(el)
    const rect = el.getBoundingClientRect()
    log({
      type: 'stylePoll',
      id: cardId,
      ts: now(),
      style: { left: cs.left, top: cs.top, transform: cs.transform, position: cs.position, zIndex: cs.zIndex, transition: cs.transition },
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      model: getModelPos(),
      shadow: getShadowRect()
    })
    rafId = requestAnimationFrame(poll)
  }
  rafId = requestAnimationFrame(poll)
  const timer = window.setTimeout(() => detach(), Math.max(200, opts.timeoutMs ?? 800))
  const detach = () => {
    if (!active) return
    active = false
    window.clearTimeout(timer)
    if (rafId) cancelAnimationFrame(rafId)
    observer.disconnect()
    log({ type: 'placementEnd', id: cardId, ts: now() })
  }
  return { detach }
}
