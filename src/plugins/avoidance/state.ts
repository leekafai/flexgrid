export const avoidanceState = {
  lastDispatchTs: 0,
  lastMoves: new Map<string, { x: number; y: number; ts: number }>(),
  activeAvoid: new Map<string, { orig: { x: number; y: number }; moved: { x: number; y: number }; areaKey: string }>(),
  activeAreaKey: '',
  prevShadowRect: null as { left: number; top: number; areaKey: string } | null,
  prevCoveredIds: new Set<string>(),
  reservations: new Map<string, { x: number; y: number; w: number; h: number }>(),
  originals: new Map<string, { x: number; y: number }>(),
  activeTargetId: '',
  overlapStartTs: new Map<string, number>(),
  dragOriginalPosition: null as { x: number; y: number } | null,
};

export function resetAvoidanceState() {
  avoidanceState.lastDispatchTs = 0;
  avoidanceState.lastMoves.clear();
  avoidanceState.activeAvoid.clear();
  avoidanceState.activeAreaKey = '';
  avoidanceState.prevShadowRect = null;
  avoidanceState.prevCoveredIds.clear();
  avoidanceState.reservations.clear();
  avoidanceState.originals.clear();
  avoidanceState.activeTargetId = '';
  avoidanceState.overlapStartTs.clear();
  avoidanceState.dragOriginalPosition = null;
}