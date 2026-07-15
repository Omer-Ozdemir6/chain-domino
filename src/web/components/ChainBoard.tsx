import { useCallback, useRef, useState } from 'react';
import type { Board, SlotId } from '../../models/Board.js';
import Tile from './Tile.js';
import OperatorTile from './OperatorTile.js';

export type SlotState = 'none' | 'legal' | 'illegal';
export type SelectionKind = 'STONE' | 'OPERATOR' | null;

interface ChainBoardProps {
  board: Board;
  legalSlotIds: ReadonlySet<SlotId>;
  selectionKind: SelectionKind;
  onCommit: (slotId: SlotId) => void;
  highlightedEdgeId?: string | null;
  highlightedNodeId?: string | null;
  activeSpellType?: 'MAGNET' | 'BREAKER' | 'GILD' | null;
  onSelectNode?: (nodeId: string) => void;
  onSelectOperatorSlot?: (slotId: SlotId) => void;
}

const SLOT_CLASS: Record<SlotState, string> = {
  none: 'border-dashed border-slate-300 text-slate-300 dark:border-slate-600 dark:text-slate-600',
  legal: 'cursor-pointer border-solid border-emerald-500 bg-emerald-50 text-emerald-500 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50',
  illegal: 'cursor-not-allowed border-solid border-rose-400 bg-rose-50 text-rose-400 dark:bg-rose-900/20',
};

function SlotButton({ state, onClick }: { state: SlotState; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={state === 'legal' ? onClick : undefined}
      disabled={state !== 'legal'}
      className={`flex h-14 w-14 items-center justify-center rounded-lg border-2 text-2xl font-bold transition ${SLOT_CLASS[state]}`}
    >
      {state === 'legal' ? '+' : '×'}
    </button>
  );
}

// Four cardinal directions a connection can grow in. Only doubles (spinners) ever use more
// than two of them; a plain stone always attaches on one side and continues straight ahead.
type Dir = 'E' | 'S' | 'W' | 'N';
type Vec = readonly [number, number];
const VECTOR: Record<Dir, Vec> = { E: [1, 0], S: [0, 1], W: [-1, 0], N: [0, -1] };
const OPPOSITE: Record<Dir, Dir> = { E: 'W', W: 'E', S: 'N', N: 'S' };
const ALL_DIRS: Dir[] = ['E', 'S', 'W', 'N'];

function assignDirections(isDouble: boolean, incoming: Dir | null): Dir[] {
  if (incoming === null) {
    return isDouble ? ALL_DIRS : ['E', 'W'];
  }
  const attach = OPPOSITE[incoming]; // slot #0 always faces back toward the parent
  return isDouble ? [attach, ...ALL_DIRS.filter((d) => d !== attach)] : [attach, incoming];
}

interface SlotCell {
  pos: Vec;
  dir: Dir;
}

/**
 * Walks the graph and assigns every node a full grid coordinate and every slot a midpoint
 * coordinate (halfway between a node and where its neighbor sits), so operators render right
 * on the seam between two touching tiles instead of floating on a connector line.
 */
function layoutGraph(
  board: Board
): { positions: Map<string, Vec>; slotCells: Map<SlotId, SlotCell>; nodeDirs: Map<string, Dir[]> } {
  const positions = new Map<string, Vec>();
  const slotCells = new Map<SlotId, SlotCell>();
  const nodeDirs = new Map<string, Dir[]>();
  const rootId = board.getRootNodeId();
  if (rootId === null) return { positions, slotCells, nodeDirs };

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
      const midpoint: Vec = [pos[0] + dx, pos[1] + dy];
      slotCells.set(slot.slotId, { pos: midpoint, dir });

      if (slot.state === 'CLOSED') {
        const edge = board.getEdgeFromSlot(slot.slotId)!;
        visit(edge.childNodeId, [pos[0] + 2 * dx, pos[1] + 2 * dy], dir);
      }
    });
  }

  visit(rootId, [0, 0], null);
  return { positions, slotCells, nodeDirs };
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

// Sized to hug the tiles' actual rendered footprint (109x76 horizontal, 56x149 vertical for
// h-18/w-13 Tile boxes) so dominoes sit edge-to-edge like a real chain instead of floating apart.
const COL_SIZE = 113;
const ROW_SIZE = 152;

/**
 * Tracks an element's content-box size so the board can scale itself to always fit inside it.
 * Uses a callback ref (not useRef + useLayoutEffect) because ChainBoard conditionally renders
 * a different subtree for the empty-board state — the DOM node this ref attaches to can change
 * identity (null -> element, or one element -> another) without the component ever unmounting,
 * and only a callback ref reliably re-fires an observer setup when that happens.
 */
function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((el: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    observerRef.current = observer;
  }, []);

  return { ref, size };
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
  onSelectOperatorSlot,
}: ChainBoardProps) {
  const rootId = board.getRootNodeId();
  const { positions, slotCells, nodeDirs } = layoutGraph(board);
  const { ref: containerRef, size: containerSize } = useElementSize<HTMLDivElement>();

  if (rootId === null) {
    const showRootSlot = selectionKind === 'STONE';
    const rootSlotState: SlotState = showRootSlot ? (legalSlotIds.has('ROOT') ? 'legal' : 'illegal') : 'none';
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-white/60 p-4 shadow-inner dark:bg-slate-900/40">
        {showRootSlot ? (
          <SlotButton state={rootSlotState} onClick={() => onCommit('ROOT')} />
        ) : (
          <span className="text-sm text-slate-400 dark:text-slate-500">Masa boş — bir taş seç.</span>
        )}
      </div>
    );
  }

  const allPoints: Vec[] = [
    ...positions.values(),
    ...[...slotCells.values()].flatMap((c) => {
      const [dx, dy] = VECTOR[c.dir];
      // Reserve the cell one step beyond the midpoint too, for a PENDING slot's future closing stone.
      return [c.pos, [c.pos[0] + dx, c.pos[1] + dy]] as Vec[];
    }),
  ];
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
  const pixelCenter = ([x, y]: Vec): Vec => [(x - minX + 0.5) * COL_SIZE, (y - minY + 0.5) * ROW_SIZE];

  const nodes = board.getNodes();
  const nodeById = new Map(nodes.map((n) => [n.nodeId, n]));

  const contentWidth = (maxX - minX + 1) * COL_SIZE;
  const contentHeight = (maxY - minY + 1) * ROW_SIZE;
  
  // Proportional zoom: fits both width and height, caps at 1.35x zoom and 0.35x shrink, with 10% breathing room
  const minScale = 0.55;
  const maxScale = 1.35;
  const autoScale =
    containerSize.width > 0 && containerSize.height > 0
      ? Math.min(
          containerSize.width / contentWidth,
          containerSize.height / contentHeight
        )
      : 1;
  const scale = Math.max(minScale, Math.min(maxScale, autoScale)) * 0.9;

  const edges = board.getEdges();

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full overflow-hidden rounded-xl bg-slate-950/30 p-2 shadow-inner justify-center items-center"
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
            gridTemplateColumns: `repeat(${maxX - minX + 1}, ${COL_SIZE}px)`,
            gridTemplateRows: `repeat(${maxY - minY + 1}, ${ROW_SIZE}px)`,
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
          className="pointer-events-none absolute inset-0"
          width={contentWidth}
          height={contentHeight}
          style={{ zIndex: 0, overflow: 'visible' }}
        >
          {edges.map((edge) => {
            const parentPos = positions.get(edge.parentNodeId);
            const childPos = positions.get(edge.childNodeId);
            if (!parentPos || !childPos) return null;
            const [x1, y1] = pixelCenter(parentPos);
            const [x2, y2] = pixelCenter(childPos);
            const isHighlighted = highlightedEdgeId === edge.edgeId;
            return (
              <line
                key={edge.edgeId}
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
                      : 'rgba(56,189,248,0.75)'
                }
                strokeWidth={isHighlighted ? 6 : edge.frozen ? 3 : 4.5}
                strokeDasharray={edge.frozen ? undefined : '9 7'}
              />
            );
          })}
        </svg>

        {[...positions.entries()].map(([nodeId, pos]) => {
          const node = nodeById.get(nodeId)!;
          const { left, right, vertical } = orientForDisplay(node, nodeDirs.get(nodeId));
          const isLeaf = !edges.some((e) => e.parentNodeId === nodeId);
          const isMagnetTarget = activeSpellType === 'MAGNET' && isLeaf;

          return (
            <div key={`node-${nodeId}`} style={cell(pos)}>
              <Tile
                left={left}
                right={right}
                vertical={vertical}
                animateIn
                frozen={node.frozen}
                isDouble={node.isDouble}
                isGolden={node.isGolden}
                highlighted={highlightedNodeId === nodeId || isMagnetTarget}
                onClick={isMagnetTarget && onSelectNode ? () => onSelectNode(nodeId) : undefined}
              />
            </div>
          );
        })}

        {[...slotCells.entries()].map(([slotId, { pos, dir }]) => {
          const slots = board.getSlots(slotId.slice(0, slotId.lastIndexOf('#')));
          const slot = slots.find((s) => s.slotId === slotId);
          if (!slot) return null;

          if (slot.state === 'CLOSED') {
            const edge = board.getEdgeFromSlot(slotId)!;
            const isHighlighted = highlightedEdgeId === edge.edgeId;
            return (
              <div key={slotId} style={cell(pos)} className="relative">
                {isHighlighted && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center z-0">
                    <span className="animate-impact-ring w-16 h-16 rounded-full border-4 border-emerald-400" />
                  </span>
                )}
                <OperatorTile
                  symbol={edge.operator.symbol}
                  animateIn
                  frozen={edge.frozen}
                  highlighted={isHighlighted}
                />
              </div>
            );
          }

          if (slot.state === 'PENDING') {
            const showButton = selectionKind === 'STONE';
            const state: SlotState = legalSlotIds.has(slotId) ? 'legal' : 'illegal';
            const [dx, dy] = VECTOR[dir];
            const closingPos: Vec = [pos[0] + dx, pos[1] + dy];
            const isBreakerTarget = activeSpellType === 'BREAKER';

            return [
              <div key={slotId} style={cell(pos)}>
                <OperatorTile
                  symbol={slot.pendingOperator!.symbol}
                  highlighted={isBreakerTarget}
                  onClick={isBreakerTarget && onSelectOperatorSlot ? () => onSelectOperatorSlot(slotId) : undefined}
                />
              </div>,
              showButton && (
                <div key={`${slotId}-close`} style={cell(closingPos)}>
                  <SlotButton state={state} onClick={() => onCommit(slotId)} />
                </div>
              ),
            ];
          }

          // OPEN
          if (selectionKind !== 'OPERATOR') return null;
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
