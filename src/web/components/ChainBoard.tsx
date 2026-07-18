import React from 'react';
import type { Board, SlotId, Dir } from '../../models/Board.js';
import { assignDirections } from '../../models/Board.js';
import { useElementSize } from '../hooks/useElementSize.js';
import Tile from './Tile.js';

export type SlotState = 'none' | 'legal' | 'illegal';
export type SelectionKind = 'STONE' | null;

interface ChainBoardProps {
  board: Board;
  legalSlotIds: ReadonlySet<SlotId>;
  selectionKind: SelectionKind;
  onCommit: (slotId: SlotId) => void;
  highlightedEdgeId?: string | null;
  highlightedNodeId?: string | null;
  activeSpellType?: 'MAGNET' | 'GILD' | null;
  onSelectNode?: (nodeId: string) => void;
  spellEffect?: { id: string; type: 'GILD' | 'MAGNET' } | null;
  isGathering?: boolean;
  /** The hand just resolved and its played tiles are dissolving upward off the board, one beat
   *  before the actual board state drains them — distinct from `isGathering` (a round-end
   *  transition that flies tiles toward the deck box instead). */
  isExiting?: boolean;
  onSelectEdge?: (edgeId: string) => void;
  activeConsumable?: string | null;
}

const SLOT_CLASS: Record<SlotState, string> = {
  none: 'border-dashed border-stone-300 text-stone-300 dark:border-stone-600 dark:text-stone-600',
  legal: 'cursor-pointer border-solid border-emerald-500 bg-emerald-50 text-emerald-500 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50',
  illegal: 'cursor-not-allowed border-solid border-rose-400 bg-rose-50 text-rose-400 dark:bg-rose-900/20',
};

function SlotButton({ state, onClick }: { state: SlotState; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={state === 'legal' ? onClick : undefined}
      disabled={state !== 'legal'}
      className={[
        'flex h-14 w-14 rounded-lg text-2xl',
        'items-center justify-center border-2 font-bold transition',
        SLOT_CLASS[state],
      ].join(' ')}
    >
      {state === 'legal' ? '+' : '×'}
    </button>
  );
}

// Direction geometry (Dir, assignDirections) now lives in Board.ts, shared with
// detectHandType()'s branching classification so the two can never drift apart.
type Vec = readonly [number, number];
const VECTOR: Record<Dir, Vec> = { E: [1, 0], S: [0, 1], W: [-1, 0], N: [0, -1] };

interface OpenSlotCell {
  pos: Vec;
}

/**
 * Walks the graph and assigns every node a full grid coordinate, plus a target cell for every
 * still-OPEN slot (one step over in its direction — classic domino end-to-end, tiles touch
 * directly with no seam element between them now that there's no operator).
 */
function layoutGraph(
  board: Board
): { positions: Map<string, Vec>; openSlotCells: Map<SlotId, OpenSlotCell>; nodeDirs: Map<string, Dir[]> } {
  const positions = new Map<string, Vec>();
  const openSlotCells = new Map<SlotId, OpenSlotCell>();
  const nodeDirs = new Map<string, Dir[]>();
  const rootId = board.getRootNodeId();
  if (rootId === null) return { positions, openSlotCells, nodeDirs };

  const nodesById = new Map(board.getNodes().map((n) => [n.nodeId, n]));

  function visit(nodeId: string, pos: Vec, incoming: Dir | null): void {
    positions.set(nodeId, pos);
    const node = nodesById.get(nodeId)!;
    const dirs = assignDirections(node.isDouble, incoming);
    nodeDirs.set(nodeId, dirs);

    board.getSlots(nodeId).forEach((slot, i) => {
      // Slot #0 of a non-root node is the side that attaches back to its parent — that
      // connection is already rendered from the parent's own edge lookup, so skip it here.
      if (incoming !== null && i === 0) return;

      const dir = dirs[i];
      const [dx, dy] = VECTOR[dir];

      if (slot.state === 'CLOSED') {
        const edge = board.getEdgeFromSlot(slot.slotId)!;
        visit(edge.childNodeId, [pos[0] + dx, pos[1] + dy], dir);
      } else {
        openSlotCells.set(slot.slotId, { pos: [pos[0] + dx, pos[1] + dy] });
      }
    });
  }

  visit(rootId, [0, 0], null);
  return { positions, openSlotCells, nodeDirs };
}

/**
 * A non-double stone's two values each point in a real direction (west/east or north/south).
 * Tile.tsx always draws its `left`/`right` props on the west/east (or north/south, if vertical)
 * side of the box — so the value that touches its neighbor must be the one actually passed as
 * the side facing that neighbor, not just `leftVal`/`rightVal` in raw data order.
 */
function orientForDisplay(
  node: { leftVal: number; rightVal: number; isDouble: boolean },
  dirs: Dir[] | undefined
): { left: number; right: number; vertical: boolean } {
  if (node.isDouble || !dirs) return { left: node.leftVal, right: node.rightVal, vertical: false };
  const [dir0, dir1] = dirs; // dir0 goes with leftVal, dir1 goes with rightVal
  if (dir0 === 'N' || dir0 === 'S') {
    // vertical: whichever value points N is the "top" one
    return dir0 === 'N'
      ? { left: node.leftVal, right: node.rightVal, vertical: true }
      : { left: node.rightVal, right: node.leftVal, vertical: true };
  }
  // horizontal: whichever value points W is the "left" one
  return dir0 === 'W'
    ? { left: node.leftVal, right: node.rightVal, vertical: false }
    : { left: node.rightVal, right: node.leftVal, vertical: false };
}

// Every grid track is a uniform tile-sized cell — dominoes touch directly end-to-end now that
// there's no operator badge sitting on the seam between them.
const NODE_COL = 113; // matches Tile's rendered footprint (h-18/w-13 boxes side by side)
const NODE_ROW = 152; // matches Tile's vertical footprint when stacked N/S

/** Builds the per-track pixel sizes, cumulative offsets, and a center() lookup for one axis. */
function buildAxis(minCoord: number, maxCoord: number, nodeSize: number) {
  const count = maxCoord - minCoord + 1;
  const sizes: number[] = Array.from({ length: count }, () => nodeSize);
  const offsets: number[] = [0];
  for (const s of sizes) offsets.push(offsets[offsets.length - 1] + s);
  const total = offsets[offsets.length - 1];
  const center = (c: number) => offsets[c - minCoord] + sizes[c - minCoord] / 2;
  return { sizes, total, center };
}

export default function ChainBoard({
  board,
  legalSlotIds,
  selectionKind,
  onCommit,
  highlightedEdgeId,
  highlightedNodeId,
  activeSpellType,
  onSelectNode,
  spellEffect,
  isGathering = false,
  isExiting = false,
  onSelectEdge,
  activeConsumable,
}: ChainBoardProps) {
  const rootId = board.getRootNodeId();
  const { positions, openSlotCells, nodeDirs } = layoutGraph(board);
  const { ref: containerRef, size: containerSize } = useElementSize<HTMLDivElement>();

  if (rootId === null) {
    const showRootSlot = selectionKind === 'STONE';
    const rootSlotState: SlotState = showRootSlot ? (legalSlotIds.has('ROOT') ? 'legal' : 'illegal') : 'none';
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-stone-950/20 p-4 shadow-inner">
        {showRootSlot ? (
          <SlotButton state={rootSlotState} onClick={() => onCommit('ROOT')} />
        ) : (
          <span className="text-sm text-stone-300/70">Masa boş — bir taş seç.</span>
        )}
      </div>
    );
  }

  const allPoints: Vec[] = [...positions.values(), ...[...openSlotCells.values()].map((c) => c.pos)];
  const minX = Math.min(...allPoints.map((p) => p[0]));
  const maxX = Math.max(...allPoints.map((p) => p[0]));
  const minY = Math.min(...allPoints.map((p) => p[1]));
  const maxY = Math.max(...allPoints.map((p) => p[1]));
  const cell = ([x, y]: Vec) => ({
    gridColumn: x - minX + 1,
    gridRow: y - minY + 1,
    position: 'relative' as const,
    zIndex: 1,
  });

  const xAxis = buildAxis(minX, maxX, NODE_COL);
  const yAxis = buildAxis(minY, maxY, NODE_ROW);
  const pixelCenter = ([x, y]: Vec): Vec => [xAxis.center(x), yAxis.center(y)];

  const nodes = board.getNodes();
  const nodeById = new Map(nodes.map((n) => [n.nodeId, n]));

  const contentWidth = xAxis.total;
  const contentHeight = yAxis.total;

  // Proportional zoom: always scale to fit within the container — no scrollbars ever.
  // Uses a very low floor so even massive chains remain visible, and caps at 1.35x.
  const minScale = 0.15;
  const maxScale = 1.35;
  const autoScale =
    containerSize.width > 0 && containerSize.height > 0
      ? Math.min(
          containerSize.width / contentWidth,
          containerSize.height / contentHeight
        )
      : 1;
  const scale = Math.max(minScale, Math.min(maxScale, autoScale)) * 0.88;

  const edges = board.getEdges();

  const isLoop = board.detectHandType() === 'LOOP';
  let loopCenter: { x: number; y: number } | null = null;
  if (isLoop && nodes.length > 0) {
    const sumX = nodes.reduce((sum, n) => {
      const pos = positions.get(n.nodeId);
      return sum + (pos ? pos[0] : 0);
    }, 0);
    const sumY = nodes.reduce((sum, n) => {
      const pos = positions.get(n.nodeId);
      return sum + (pos ? pos[1] : 0);
    }, 0);
    const avgGridX = sumX / nodes.length;
    const avgGridY = sumY / nodes.length;
    loopCenter = {
      x: xAxis.center(avgGridX),
      y: yAxis.center(avgGridY),
    };
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full overflow-hidden rounded-xl bg-stone-950/30 p-2 shadow-inner justify-center items-center"
    >
      <div
        style={{
          width: `${contentWidth * scale}px`,
          height: `${contentHeight * scale}px`,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <div
          className="grid place-items-center"
          style={{
            gridTemplateColumns: xAxis.sizes.map((s) => `${s}px`).join(' '),
            gridTemplateRows: yAxis.sizes.map((s) => `${s}px`).join(' '),
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${contentWidth}px`,
            height: `${contentHeight}px`,
          }}
        >
        {/* Energy-line layer: connects every placed edge behind the tiles, glowing/flowing while unfrozen. */}
        <svg
          className={`absolute inset-0 transition-opacity duration-300 ${isGathering ? 'opacity-0' : ''} ${activeConsumable === 'consumable_scissors' ? 'z-20' : 'pointer-events-none z-0'}`}
          width={contentWidth}
          height={contentHeight}
          style={{ overflow: 'visible' }}
        >
          {edges.map((edge) => {
            const parentPos = positions.get(edge.parentNodeId);
            const childPos = positions.get(edge.childNodeId);
            if (!parentPos || !childPos) return null;
            const [x1, y1] = pixelCenter(parentPos);
            const [x2, y2] = pixelCenter(childPos);
            const isHighlighted = highlightedEdgeId === edge.edgeId;

            const parentNode = nodeById.get(edge.parentNodeId);
            const childNode = nodeById.get(edge.childNodeId);
            const isAmber = (parentNode?.modifier === 'AMBER' || childNode?.modifier === 'AMBER') && !edge.frozen;

            return (
              <React.Fragment key={edge.edgeId}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  strokeLinecap="round"
                  className={edge.frozen ? '' : 'energy-line'}
                  stroke={
                    isHighlighted
                      ? 'rgba(52,211,153,0.95)'
                      : edge.frozen
                        ? 'rgba(100,116,139,0.35)'
                        : 'rgba(217,158,74,0.8)'
                  }
                  strokeWidth={isHighlighted ? 6 : edge.frozen ? 3 : 4.5}
                  strokeDasharray={edge.frozen ? undefined : '9 7'}
                />
                {isAmber && (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#fbbf24"
                    strokeWidth={7}
                    className="animate-pulse"
                    opacity={0.85}
                    style={{ filter: 'drop-shadow(0 0 10px #f59e0b)' }}
                  />
                )}
                {/* Thick clickable overlay line for scissors spell */}
                {activeConsumable === 'consumable_scissors' && (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    strokeLinecap="round"
                    stroke="rgba(244,63,94,0.15)"
                    strokeWidth={24}
                    className="cursor-pointer hover:stroke-rose-500/70 transition duration-150 pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectEdge) onSelectEdge(edge.edgeId);
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </svg>

        {/* Dynamic connection matching sparkles */}
        {edges.map((edge) => {
          if (edge.frozen) return null;
          const parentPos = positions.get(edge.parentNodeId);
          const childPos = positions.get(edge.childNodeId);
          if (!parentPos || !childPos) return null;
          const [x1, y1] = pixelCenter(parentPos);
          const [x2, y2] = pixelCenter(childPos);
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          
          return (
            <div key={`sparks-${edge.edgeId}`} className="absolute pointer-events-none" style={{ left: 0, top: 0, zIndex: 10 }}>
              {Array.from({ length: 5 }).map((_, i) => {
                const angle = (i * 2 * Math.PI) / 5;
                const dist = 12 + Math.random() * 15;
                const dx = `${Math.cos(angle) * dist}px`;
                const dy = `${Math.sin(angle) * dist}px`;
                return (
                  <span
                    key={i}
                    className="spark-particle"
                    style={{
                      left: `${midX}px`,
                      top: `${midY}px`,
                      ['--dx' as any]: dx,
                      ['--dy' as any]: dy,
                      animationDelay: `${Math.random() * 80}ms`,
                    }}
                  />
                );
              })}
            </div>
          );
        })}

        {/* Swirling Portal Loop Vortex behind nodes */}
        {isLoop && loopCenter && (
          <div
            className="vortex-glow"
            style={{
              left: `${loopCenter.x}px`,
              top: `${loopCenter.y}px`,
              transform: 'translate(-50%, -50%)',
              position: 'absolute',
              zIndex: 0,
            }}
          />
        )}

        {[...positions.entries()].map(([nodeId, pos], index) => {
          const node = nodeById.get(nodeId)!;
          const { left, right, vertical } = orientForDisplay(node, nodeDirs.get(nodeId));
          const isLeaf = !edges.some((e) => e.parentNodeId === nodeId);
          const isMagnetTarget = activeSpellType === 'MAGNET' && isLeaf;

          const animationClass = isGathering ? 'animate-gather-board' : isExiting ? 'animate-tile-submit-exit' : '';
          const gatherDelay = isGathering ? `${index * 60}ms` : isExiting ? `${index * 70}ms` : undefined;

          const isChild = edges.some((e) => e.childNodeId === nodeId);
          const isParent = edges.some((e) => e.parentNodeId === nodeId);
          const leftConnected = isChild;
          const rightConnected = isParent || (!isChild && edges.length > 0);

          return (
            <div
              key={`node-${nodeId}`}
              data-node-id={nodeId}
              style={{
                ...cell(pos),
                animationDelay: gatherDelay,
                animationFillMode: isGathering || isExiting ? 'forwards' : undefined,
              }}
              className={animationClass}
            >
              <Tile
                left={left}
                right={right}
                leftUpgrade={node.leftUpgrade}
                rightUpgrade={node.rightUpgrade}
                vertical={vertical}
                animateIn
                frozen={node.frozen}
                isDouble={node.isDouble}
                isGolden={node.isGolden}
                modifier={(node as any).modifier}
                highlighted={highlightedNodeId === nodeId || isMagnetTarget}
                onClick={isMagnetTarget && onSelectNode ? () => onSelectNode(nodeId) : undefined}
                spellEffect={spellEffect?.id === nodeId && spellEffect.type === 'MAGNET' ? 'MAGNET' : null}
                leftConnected={leftConnected}
                rightConnected={rightConnected}
              />
            </div>
          );
        })}

        {selectionKind === 'STONE' &&
          [...openSlotCells.entries()].map(([slotId, { pos }]) => {
            const state: SlotState = legalSlotIds.has(slotId) ? 'legal' : 'illegal';
            return (
              <div key={slotId} style={cell(pos)}>
                <SlotButton state={state} onClick={() => onCommit(slotId)} />
              </div>
            );
          })}
      </div>
    </div>
  </div>
  );
}
