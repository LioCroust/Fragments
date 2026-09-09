import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image as RNImage,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  Line,
  Polygon,
  Polyline,
  Rect,
} from 'react-native-svg';
import { setAudioModeAsync, setIsAudioActiveAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  buildOrthogonalCaptureRegions,
  captureRegionsOverlapCircle,
} from '../components/captureGeometry';

const COLS = 12;
const PERIMETER_HORIZONTAL_INSET_CELLS = 0.65;
const PERIMETER_VERTICAL_INSET_CELLS = 2;
const PERIMETER_STROKE_WIDTH = 3;
const PLAYER_RADIUS_CELLS = 0.82;
const ZONE_COLOR = '#00f3ff';
const INITIAL_MAP_OPACITY = 0.07;
const CAPTURED_ZONE_OPACITY = 0.15;
const CAPTURED_ZONE_LAYER_OPACITY = (
  CAPTURED_ZONE_OPACITY - INITIAL_MAP_OPACITY
) / (1 - INITIAL_MAP_OPACITY);
const LEVEL_CAPTURE_TARGET = 80;
const HUD_COLORS = {
  cyan: '#00f3ff',
  lime: '#b8ff4a',
  amber: '#ffb02e',
  magenta: '#ff2bb5',
  warmWhite: '#fff3d6',
  panel: 'rgba(8, 10, 18, 0.92)',
  panelMuted: 'rgba(8, 10, 18, 0.78)',
} as const;
const ZERO = { x: 0 as const, y: 0 as const };
const pickupChimeSource = require('../assets/audio/pickup.mp3');
const cockpitInteriorSource = require('../assets/images/prism-warbird-interior-neon-console.png');
const cuttingSpriteSource = require('../assets/images/cutting-sprite-sheet.png');
const BEST_SCORE_STORAGE_KEY = 'fragments-neon:best-score';
const CUTTING_SPRITE_ENABLED = true;
const CUTTING_SPRITE_FRAME_COUNT = 8;
const CUTTING_SPRITE_FRAME_WIDTH = 160;
const CUTTING_SPRITE_FRAME_HEIGHT = 96;
const CUTTING_SPRITE_FRAME_DURATION = 3;

type Direction = { x: -1 | 0 | 1; y: -1 | 0 | 1 };
type Point = { x: number; y: number };
type Mode = 'SLOW';
type Particle = Point & {
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
  streak?: boolean;
};
type SmokePuff = Point & {
  life: number;
  maxLife: number;
  size: number;
  driftX: number;
  driftY: number;
};
type EnemyKind = 'SHIP' | 'DRAGON' | 'SEVEN' | 'SPIDER';
type EnemyBehavior = 'PLANNED' | 'PRESET';
type EnemyPattern = 'SWEEP' | 'ZIGZAG';
type Enemy = Point & {
  kind: EnemyKind;
  behavior: EnemyBehavior;
  pattern: EnemyPattern;
  vx: number;
  vy: number;
  speed: number;
  agility: number;
  phase: number;
  spin: number;
  routePhase: number;
  thinkTimer: number;
  targetX: number;
  targetY: number;
  blockedTime: number;
  respawnAt: number;
  edgeTurnTimer: number;
  edgeDirectionX: number;
  edgeDirectionY: number;
  lastSafeX?: number;
  lastSafeY?: number;
};

type Diamond = Point & {
  phase: number;
  collected: boolean;
};

const ENEMY_SCORE: Record<EnemyKind, number> = {
  SHIP: 180,
  DRAGON: 420,
  SEVEN: 620,
  SPIDER: 800,
};
const DIAMOND_SCORE = 750;

type Game = {
  width: number;
  height: number;
  cell: number;
  rows: number;
  player: Point;
  inputDir: Direction;
  facingDir: Direction;
  hasMoveCommand: boolean;
  cutDir: Direction;
  cutCoordinate: number;
  trail: Point[];
  protectedTrails: Point[][];
  enemies: Enemy[];
  diamond: Diamond;
  particles: Particle[];
  smokePuffs: SmokePuff[];
  smokeAccumulator: number;
  claimedPolygons: Point[][];
  pendingCapturePolygons: Point[][];
  fillQueue: number[];
  fillCursor: number;
  scanY: number;
  mode: Mode;
  score: number;
  shields: number;
  capturedArea: number;
  totalPlayableArea: number;
  pendingCaptureArea: number;
  level: number;
  frame: number;
  trailScoreAccumulator: number;
  initialized: boolean;
  status: 'PLAYING' | 'RESPAWN';
  respawnAt: number;
};

type Hud = {
  score: number;
  bestScore: number;
  shields: number;
  capture: number;
  level: number;
  mode: Mode;
  feedback: string;
};

type Snapshot = {
  width: number;
  height: number;
  cell: number;
  rows: number;
  trail: Point[];
  protectedTrails: Point[][];
  player: Point;
  direction: Direction;
  enemies: Enemy[];
  diamond: Diamond;
  particles: Particle[];
  smokePuffs: SmokePuff[];
  claimedPolygons: Point[][];
  pendingCapturePolygons: Point[][];
  scanY: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const cardinalDirection = (dx: number, dy: number): Direction => {
  if (Math.abs(dx) >= Math.abs(dy)) return { x: dx >= 0 ? 1 : -1, y: 0 };
  return { x: 0, y: dy >= 0 ? 1 : -1 };
};

const distanceToSegment = (point: Point, a: Point, b: Point) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy || 1;
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared, 0, 1);
  const closest = { x: a.x + t * dx, y: a.y + t * dy };
  return Math.hypot(point.x - closest.x, point.y - closest.y);
};

const pointTouchesOldTrail = (
  point: Point,
  trail: Point[],
  cell: number,
  direction: Direction,
) => {
  // Ignore the continuous laser immediately behind the drone. The player
  // must be at least one cell away along the trail before a crossing can be
  // considered a real self-collision.
  const trailingClearance = cell * 1.15;
  const collisionDistance = cell * 0.24;
  let distanceBehindDrone = 0;

  for (let index = trail.length - 2; index >= 0; index -= 1) {
    const start = trail[index];
    const end = trail[index + 1];
    distanceBehindDrone += Math.hypot(end.x - start.x, end.y - start.y);
    if (distanceBehindDrone < trailingClearance) continue;

    // Segments that are entirely behind the drone in its current travel
    // direction are the path it is following, not a crossing. Without this
    // check, leaving a claimed zone immediately looked like a self-hit after
    // roughly one cell of movement.
    const startBehind = (start.x - point.x) * direction.x + (start.y - point.y) * direction.y < 0;
    const endBehind = (end.x - point.x) * direction.x + (end.y - point.y) * direction.y < 0;
    if (startBehind && endBehind) continue;

    if (distanceToSegment(point, start, end) <= collisionDistance) return true;
  }
  return false;
};

const pointsToString = (points: Point[]) => points.map((point) => `${point.x},${point.y}`).join(' ');

const perimeterBounds = (width: number, height: number, cell: number) => ({
  left: cell * PERIMETER_HORIZONTAL_INSET_CELLS,
  top: cell * PERIMETER_VERTICAL_INSET_CELLS,
  right: width - cell * PERIMETER_HORIZONTAL_INSET_CELLS,
  bottom: height - cell * PERIMETER_VERTICAL_INSET_CELLS,
});

const perimeterPointAt = (bounds: ReturnType<typeof perimeterBounds>, progress: number): Point => {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const perimeter = width * 2 + height * 2;
  let distance = ((progress % 1) + 1) % 1 * perimeter;
  if (distance <= width) return { x: bounds.left + distance, y: bounds.top };
  distance -= width;
  if (distance <= height) return { x: bounds.right, y: bounds.top + distance };
  distance -= height;
  if (distance <= width) return { x: bounds.right - distance, y: bounds.bottom };
  distance -= width;
  return { x: bounds.left, y: bounds.bottom - distance };
};

const distanceToPerimeter = (point: Point, bounds: ReturnType<typeof perimeterBounds>) => Math.min(
  Math.abs(point.x - bounds.left),
  Math.abs(point.x - bounds.right),
  Math.abs(point.y - bounds.top),
  Math.abs(point.y - bounds.bottom),
);

const polygonHasSelfIntersection = (polygon: Point[]) => {
  if (polygon.length < 4) return false;
  for (let firstIndex = 0; firstIndex < polygon.length; firstIndex += 1) {
    const firstStart = polygon[firstIndex];
    const firstEnd = polygon[(firstIndex + 1) % polygon.length];
    for (let secondIndex = firstIndex + 1; secondIndex < polygon.length; secondIndex += 1) {
      if (
        secondIndex === firstIndex
        || secondIndex === (firstIndex + 1) % polygon.length
        || firstIndex === (secondIndex + 1) % polygon.length
      ) continue;
      const secondStart = polygon[secondIndex];
      const secondEnd = polygon[(secondIndex + 1) % polygon.length];
      if (segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)) return true;
    }
  }
  return false;
};

const polygonArea = (polygon: Point[]) => Math.abs(polygon.reduce((area, point, index) => {
  const next = polygon[(index + 1) % polygon.length];
  return area + point.x * next.y - next.x * point.y;
}, 0) * 0.5);

const clipPolygonAboveY = (polygon: Point[], maxY: number) => {
  if (polygon.length < 3) return [];
  const clipped: Point[] = [];
  polygon.forEach((current, index) => {
    const previous = polygon[(index - 1 + polygon.length) % polygon.length];
    const currentInside = current.y <= maxY;
    const previousInside = previous.y <= maxY;

    if (currentInside !== previousInside) {
      const dy = current.y - previous.y;
      const progress = Math.abs(dy) < 1e-9 ? 0 : (maxY - previous.y) / dy;
      clipped.push({
        x: previous.x + (current.x - previous.x) * progress,
        y: maxY,
      });
    }
    if (currentInside) clipped.push(current);
  });
  return clipped;
};

const polygonHorizontalIntervals = (polygon: Point[], y: number): Array<[number, number]> => {
  const intersections: number[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if ((start.y > y) === (end.y > y)) continue;
    const progress = (y - start.y) / (end.y - start.y);
    intersections.push(start.x + (end.x - start.x) * progress);
  }
  intersections.sort((first, second) => first - second);
  const intervals: Array<[number, number]> = [];
  for (let index = 0; index + 1 < intersections.length; index += 2) {
    intervals.push([intersections[index], intersections[index + 1]]);
  }
  return intervals;
};

const claimedUnionArea = (
  polygons: Point[][],
  bounds: ReturnType<typeof perimeterBounds>,
  cell: number,
) => {
  if (polygons.length === 0) return 0;
  const step = Math.max(1.5, cell * 0.08);
  const minY = bounds.top;
  const maxY = bounds.bottom;
  let area = 0;

  for (let y = minY + step * 0.5; y < maxY; y += step) {
    const intervals: Array<[number, number]> = [];
    polygons.forEach((polygon) => {
      const intersections: number[] = [];
      for (let index = 0; index < polygon.length; index += 1) {
        const start = polygon[index];
        const end = polygon[(index + 1) % polygon.length];
        if ((start.y > y) === (end.y > y)) continue;
        const progress = (y - start.y) / (end.y - start.y);
        intersections.push(start.x + (end.x - start.x) * progress);
      }
      intersections.sort((first, second) => first - second);
      for (let index = 0; index + 1 < intersections.length; index += 2) {
        intervals.push([
          clamp(intersections[index], bounds.left, bounds.right),
          clamp(intersections[index + 1], bounds.left, bounds.right),
        ]);
      }
    });
    intervals.sort((first, second) => first[0] - second[0]);
    let coveredStart = -1;
    let coveredEnd = -1;
    intervals.forEach(([start, end]) => {
      if (end <= start) return;
      if (coveredStart < 0) {
        coveredStart = start;
        coveredEnd = end;
      } else if (start <= coveredEnd) {
        coveredEnd = Math.max(coveredEnd, end);
      } else {
        area += (coveredEnd - coveredStart) * step;
        coveredStart = start;
        coveredEnd = end;
      }
    });
    if (coveredStart >= 0) {
      area += (coveredEnd - coveredStart) * step;
    }
  }

  return Math.min(area, (bounds.right - bounds.left) * (bounds.bottom - bounds.top));
};

const polygonBoundaryDistance = (point: Point, polygon: Point[]) => {
  let nearest = Number.POSITIVE_INFINITY;
  for (let index = 0; index < polygon.length; index += 1) {
    nearest = Math.min(
      nearest,
      distanceToSegment(point, polygon[index], polygon[(index + 1) % polygon.length]),
    );
  }
  return nearest;
};

const polygonCentroid = (polygon: Point[]) => polygon.reduce(
  (center, point) => ({ x: center.x + point.x / polygon.length, y: center.y + point.y / polygon.length }),
  { x: 0, y: 0 },
);

const buildContinuousCapturePolygon = (
  trail: Point[],
  bounds: ReturnType<typeof perimeterBounds>,
  cell: number,
  claimedPolygons: Point[][],
) => {
  if (trail.length < 3) return null;
  const perimeterSamples = 128;
  const perimeterLoop = Array.from(
    { length: perimeterSamples },
    (_, index) => perimeterPointAt(bounds, index / perimeterSamples),
  );
  const start = trail[0];
  const end = trail[trail.length - 1];

  const boundaryLoops = [perimeterLoop, ...claimedPolygons];
  const startLoopIndex = boundaryLoops.findIndex((loop) => polygonBoundaryDistance(start, loop) <= cell * 1.5);
  const endLoopIndex = boundaryLoops.findIndex((loop) => polygonBoundaryDistance(end, loop) <= cell * 1.5);
  const nearestBoundaryIndex = (boundaryLoop: Point[], point: Point) => {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    boundaryLoop.forEach((boundaryPoint, index) => {
      const distance = Math.hypot(point.x - boundaryPoint.x, point.y - boundaryPoint.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    return nearestIndex;
  };
  const boundaryArc = (
    boundaryLoop: Point[],
    from: number,
    to: number,
    step = 1,
    fromPoint?: Point,
    toPoint?: Point,
  ) => {
    const points: Point[] = [];
    let index = from;
    for (let count = 0; count <= boundaryLoop.length; count += 1) {
      points.push(boundaryLoop[index]);
      if (index === to) break;
      index = (index + step + boundaryLoop.length) % boundaryLoop.length;
    }
    if (fromPoint) points[0] = fromPoint;
    if (toPoint) points[points.length - 1] = toPoint;
    return points;
  };
  const boundaryArcs = (
    boundaryLoop: Point[],
    from: number,
    to: number,
    fromPoint?: Point,
    toPoint?: Point,
  ) => [
    boundaryArc(boundaryLoop, from, to, 1, fromPoint, toPoint),
    boundaryArc(boundaryLoop, from, to, -1, fromPoint, toPoint),
  ];
  const perimeterContactIndices = (boundaryLoop: Point[]) => {
    const contact = boundaryLoop.map((point) => distanceToPerimeter(point, bounds) <= cell * 0.55);
    if (contact.every(Boolean)) return [];
    return contact.flatMap((isContact, index) => {
      if (!isContact) return [];
      const previous = contact[(index - 1 + contact.length) % contact.length];
      const next = contact[(index + 1) % contact.length];
      return !previous || !next ? [index] : [];
    });
  };
  let candidates: Point[][] = [];
  if (startLoopIndex >= 0 && startLoopIndex === endLoopIndex) {
    const boundaryLoop = boundaryLoops[startLoopIndex];
    const startIndex = nearestBoundaryIndex(boundaryLoop, start);
    const endIndex = nearestBoundaryIndex(boundaryLoop, end);
    candidates = [
      [...trail, ...boundaryArc(boundaryLoop, endIndex, startIndex, 1, end, start).slice(1)],
      [...trail.slice().reverse(), ...boundaryArc(boundaryLoop, startIndex, endIndex, 1, start, end).slice(1)],
    ].filter((polygon) => polygonArea(polygon) > cell * cell * 0.04);
  } else if (
    startLoopIndex >= 0
    && endLoopIndex >= 0
    && (startLoopIndex === 0) !== (endLoopIndex === 0)
  ) {
    // A new cut can start on an existing claimed boundary and finish on the
    // perimeter (or the reverse). The two loops are connected where the
    // claimed polygon meets the perimeter. Build candidates through each
    // such junction instead of dropping the cut as an unclosed trail.
    const startIsPerimeter = startLoopIndex === 0;
    const nonPerimeterLoopIndex = startIsPerimeter ? endLoopIndex : startLoopIndex;
    const nonPerimeterLoop = boundaryLoops[nonPerimeterLoopIndex];
    const junctionIndices = perimeterContactIndices(nonPerimeterLoop);
    const nonPerimeterPoint = startIsPerimeter ? end : start;
    const nonPerimeterIndex = nearestBoundaryIndex(nonPerimeterLoop, nonPerimeterPoint);
    const perimeterPoint = startIsPerimeter ? start : end;
    const perimeterIndex = nearestBoundaryIndex(perimeterLoop, perimeterPoint);

    junctionIndices.forEach((junctionIndex) => {
      const junctionPerimeterIndex = nearestBoundaryIndex(
        perimeterLoop,
        nonPerimeterLoop[junctionIndex],
      );
      const junctionPoint = {
        x: perimeterLoop[junctionPerimeterIndex].x,
        y: perimeterLoop[junctionPerimeterIndex].y,
      };
      if (startIsPerimeter) {
        boundaryArcs(
          nonPerimeterLoop,
          nonPerimeterIndex,
          junctionIndex,
          nonPerimeterPoint,
          nonPerimeterLoop[junctionIndex],
        ).forEach((nonPerimeterArc) => {
          boundaryArcs(
            perimeterLoop,
            junctionPerimeterIndex,
            perimeterIndex,
            perimeterLoop[junctionPerimeterIndex],
            perimeterPoint,
          ).forEach((perimeterArc) => {
            const normalizedNonPerimeterArc = [
              ...nonPerimeterArc.slice(0, -1),
              junctionPoint,
            ];
            const normalizedPerimeterArc = [
              junctionPoint,
              ...perimeterArc.slice(1),
            ];
            candidates.push([
              ...trail,
              ...normalizedNonPerimeterArc.slice(1),
              ...normalizedPerimeterArc.slice(1),
            ]);
          });
        });
      } else {
          boundaryArcs(
            perimeterLoop,
            perimeterIndex,
            junctionPerimeterIndex,
            perimeterPoint,
            perimeterLoop[junctionPerimeterIndex],
          ).forEach((perimeterArc) => {
            boundaryArcs(
              nonPerimeterLoop,
              junctionIndex,
              nonPerimeterIndex,
              nonPerimeterLoop[junctionIndex],
              nonPerimeterPoint,
            ).forEach((nonPerimeterArc) => {
            const normalizedPerimeterArc = [
              ...perimeterArc.slice(0, -1),
              junctionPoint,
            ];
            const normalizedNonPerimeterArc = [
              junctionPoint,
              ...nonPerimeterArc.slice(1),
            ];
            candidates.push([
              ...trail,
              ...normalizedPerimeterArc.slice(1),
              ...normalizedNonPerimeterArc.slice(1),
            ]);
          });
        });
      }
    });
    candidates = candidates.filter((polygon) => polygonArea(polygon) > cell * cell * 0.04);
  } else {
    // A cut can close by crossing an earlier part of its own red path
    // instead of returning to the perimeter or a protected boundary.
    for (let index = trail.length - 3; index >= 1; index -= 1) {
      const segmentStart = trail[index - 1];
      const segmentEnd = trail[index];
      const dx = segmentEnd.x - segmentStart.x;
      const dy = segmentEnd.y - segmentStart.y;
      const lengthSquared = dx * dx + dy * dy || 1;
      const progress = clamp(
        ((end.x - segmentStart.x) * dx + (end.y - segmentStart.y) * dy) / lengthSquared,
        0,
        1,
      );
      const crossing = {
        x: segmentStart.x + dx * progress,
        y: segmentStart.y + dy * progress,
      };
      if (Math.hypot(end.x - crossing.x, end.y - crossing.y) <= cell * 0.7) {
        const selfClosed = [crossing, ...trail.slice(index)];
        if (polygonArea(selfClosed) > cell * cell * 0.04) {
          candidates = [selfClosed];
        }
        break;
      }
    }
  }
  if (candidates.length === 0) return null;

  const normalizedCandidates = candidates.map((polygon) => {
    const normalized: Point[] = [];
    polygon.forEach((point) => {
      const previous = normalized[normalized.length - 1];
      if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > cell * 0.03) {
        normalized.push(point);
      }
    });
    if (
      normalized.length > 1
      && Math.hypot(normalized[0].x - normalized[normalized.length - 1].x, normalized[0].y - normalized[normalized.length - 1].y) <= cell * 0.03
    ) {
      normalized.pop();
    }
    return normalized;
  }).filter((polygon) => polygon.length >= 3 && !polygonHasSelfIntersection(polygon));
  if (normalizedCandidates.length === 0) return null;

  return normalizedCandidates.reduce((smallest, polygon) => (
    polygonArea(polygon) < polygonArea(smallest) ? polygon : smallest
  ));
};

const pointInsidePerimeter = (point: Point, bounds: ReturnType<typeof perimeterBounds>) => (
  point.x > bounds.left && point.x < bounds.right
  && point.y > bounds.top && point.y < bounds.bottom
);

const perimeterContact = (
  point: Point,
  direction: Direction,
  bounds: ReturnType<typeof perimeterBounds>,
) => ({
  x: direction.x < 0 ? bounds.left : direction.x > 0 ? bounds.right : point.x,
  y: direction.y < 0 ? bounds.top : direction.y > 0 ? bounds.bottom : point.y,
});

// When a cut starts outside the arena, the first trail point is on the
// perimeter behind the drone, opposite to its travel direction.
const perimeterEntryContact = (
  point: Point,
  direction: Direction,
  bounds: ReturnType<typeof perimeterBounds>,
) => ({
  x: direction.x < 0 ? bounds.right : direction.x > 0 ? bounds.left : point.x,
  y: direction.y < 0 ? bounds.bottom : direction.y > 0 ? bounds.top : point.y,
});

const playerBodyRadius = (cell: number) => cell * 0.34;
const playerSpriteSize = (cell: number) => ({ width: cell * 1.18, height: cell * 1.68 });
const OUTER_STOP_GAP = 5;

const playerOuterBounds = (
  bounds: ReturnType<typeof perimeterBounds>,
  cell: number,
) => {
  const radius = playerBodyRadius(cell);
  return {
    left: bounds.left - radius - OUTER_STOP_GAP,
    right: bounds.right + radius + OUTER_STOP_GAP,
    top: bounds.top - radius - OUTER_STOP_GAP,
    bottom: bounds.bottom + radius + OUTER_STOP_GAP,
  };
};

const spriteFrames: Record<EnemyKind, any[]> = {
  SHIP: [
    require('../assets/images/enemy-ship-final-frame-0.png'),
    require('../assets/images/enemy-ship-final-frame-1.png'),
    require('../assets/images/enemy-ship-final-frame-2.png'),
    require('../assets/images/enemy-ship-final-frame-3.png'),
    require('../assets/images/enemy-ship-final-frame-4.png'),
    require('../assets/images/enemy-ship-final-frame-5.png'),
  ],
  DRAGON: [
    require('../assets/images/enemy-dragon-final-frame-0.png'),
    require('../assets/images/enemy-dragon-final-frame-1.png'),
    require('../assets/images/enemy-dragon-final-frame-2.png'),
    require('../assets/images/enemy-dragon-final-frame-3.png'),
    require('../assets/images/enemy-dragon-final-frame-4.png'),
    require('../assets/images/enemy-dragon-final-frame-5.png'),
  ],
  SEVEN: [
    require('../assets/images/enemy-seven-branch-final-frame-0.png'),
    require('../assets/images/enemy-seven-branch-final-frame-1.png'),
    require('../assets/images/enemy-seven-branch-final-frame-2.png'),
    require('../assets/images/enemy-seven-branch-final-frame-3.png'),
    require('../assets/images/enemy-seven-branch-final-frame-4.png'),
    require('../assets/images/enemy-seven-branch-final-frame-5.png'),
  ],
  SPIDER: [
    require('../assets/images/enemy-spider-final-frame-0.png'),
    require('../assets/images/enemy-spider-final-frame-1.png'),
    require('../assets/images/enemy-spider-final-frame-2.png'),
    require('../assets/images/enemy-spider-final-frame-3.png'),
    require('../assets/images/enemy-spider-final-frame-4.png'),
    require('../assets/images/enemy-spider-final-frame-5.png'),
  ],
};
const diamondSource = require('../assets/images/neon-diamond-fragment.png');
const playerSource = require('../assets/images/player-drone-prism-arrow.png');

const createDiamond = (width: number, height: number, cell: number): Diamond => {
  const bounds = perimeterBounds(width, height, cell);
  return {
    x: bounds.left + cell * (1.5 + Math.random() * Math.max(1, (bounds.right - bounds.left) / cell - 3)),
    y: bounds.top + cell * (1.5 + Math.random() * Math.max(1, (bounds.bottom - bounds.top) / cell - 3)),
    phase: Math.random() * Math.PI * 2,
    collected: false,
  };
};

const enemyFrameIndex = (enemy: Enemy) => Math.floor(enemy.phase * 7) % 6;

const enemyAnimationTransform = (enemy: Enemy, cell: number) => {
  const phase = enemy.phase;
  const directionRotation = enemy.kind === 'SHIP'
    ? Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2
    : enemy.kind === 'DRAGON'
      ? enemy.spin + Math.sin(phase * 0.45) * 0.035
    : enemy.kind === 'SEVEN'
      ? enemy.spin
      : 0;
  const sway = enemy.kind === 'DRAGON'
    ? Math.sin(phase * 0.75) * 0.06
    : enemy.kind === 'SPIDER'
      ? Math.sin(phase * 1.2) * 0.035
      : 0;
  return {
    rotation: directionRotation + sway,
    scale: 1 + Math.sin(phase * (enemy.kind === 'SPIDER' ? 1.6 : 1.25)) * 0.035,
    offsetY: Math.sin(phase * 1.05) * cell * 0.08,
  };
};

const enemyGlowColor = (kind: EnemyKind) => {
  return kind === 'DRAGON' ? '#ffffff' : '#b8faff';
};

const drawEnemySpriteWithGlow = (
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  size: { width: number; height: number },
  glowColor: string,
) => {
  const x = -size.width / 2;
  const y = -size.height / 2;

  context.save();
  context.globalCompositeOperation = 'lighter';
  context.shadowColor = glowColor;
  context.globalAlpha = 0.07;
  context.shadowBlur = 8;
  context.drawImage(image, x, y, size.width, size.height);
  context.restore();

  context.save();
  context.globalCompositeOperation = 'source-over';
  context.globalAlpha = 0.97;
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.drawImage(image, x, y, size.width, size.height);
  context.restore();

  context.save();
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = 0.12;
  context.shadowColor = glowColor;
  context.shadowBlur = 2;
  context.drawImage(image, x, y, size.width, size.height);
  context.restore();
};

const cuttingPoint = (player: Point, direction: Direction, cell: number) => ({
  x: player.x - direction.x * cell * 0.78,
  y: player.y - direction.y * cell * 0.78,
});

const drawCuttingEffectCanvas = (
  context: CanvasRenderingContext2D,
  player: Point,
  direction: Direction,
  cell: number,
  frame: number,
) => {
  if (direction.x === 0 && direction.y === 0) return;
  const point = cuttingPoint(player, direction, cell);
  const pulse = 0.72 + Math.sin(frame * 0.42) * 0.2;
  const angle = Math.atan2(direction.y, direction.x);

  context.save();
  context.translate(point.x, point.y);
  context.rotate(angle);
  context.globalCompositeOperation = 'lighter';

  // A narrow molten kerf sits directly on the red trail. It is deliberately
  // linear rather than circular so the effect reads as sheet-metal cutting.
  context.shadowColor = '#ff6a22';
  context.shadowBlur = 13 + pulse * 8;
  context.globalAlpha = 0.34 + pulse * 0.2;
  context.fillStyle = '#ff6a22';
  context.fillRect(-cell * 0.5, -cell * 0.08, cell * 0.88, cell * 0.16);

  context.shadowColor = '#fff1b0';
  context.shadowBlur = 5 + pulse * 4;
  context.globalAlpha = 0.78 + pulse * 0.18;
  context.fillStyle = '#fff5cf';
  context.fillRect(cell * 0.03, -cell * 0.035, cell * 0.26, cell * 0.07);

  // A compact embedded nozzle, kept on the line instead of drawing a torch body.
  context.shadowColor = '#ff8a2c';
  context.shadowBlur = 5;
  context.globalAlpha = 0.86;
  context.fillStyle = '#9b542f';
  context.fillRect(cell * 0.25, -cell * 0.12, cell * 0.16, cell * 0.24);
  context.fillStyle = '#f7c56f';
  context.fillRect(cell * 0.39, -cell * 0.045, cell * 0.08, cell * 0.09);
  context.restore();
};

const drawCuttingSpriteCanvas = (
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  player: Point,
  direction: Direction,
  cell: number,
  frame: number,
) => {
  if (direction.x === 0 && direction.y === 0) return;
  const point = cuttingPoint(player, direction, cell);
  const angle = Math.atan2(direction.y, direction.x);
  const width = cell * 1.62;
  const height = width * CUTTING_SPRITE_FRAME_HEIGHT / CUTTING_SPRITE_FRAME_WIDTH;

  context.save();
  context.translate(point.x, point.y);
  context.rotate(angle);
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = 0.94;
  context.drawImage(
    image,
    frame * CUTTING_SPRITE_FRAME_WIDTH,
    0,
    CUTTING_SPRITE_FRAME_WIDTH,
    CUTTING_SPRITE_FRAME_HEIGHT,
    -width / 2,
    -height / 2,
    width,
    height,
  );
  context.restore();
};

const enemySpriteSize = (kind: EnemyKind, cell: number) => {
  if (kind === 'DRAGON') return { width: cell * 1.7, height: cell * 1.7 };
  if (kind === 'SEVEN') return { width: cell * 3.5, height: cell * 3.5 };
  if (kind === 'SPIDER') return { width: cell * 3.5, height: cell * 3.5 };
  return { width: cell * 1.9, height: cell * 1.9 };
};

const enemyRadius = (enemy: Enemy, cell: number) => {
  if (enemy.kind === 'DRAGON') return cell * 0.6;
  if (enemy.kind === 'SPIDER') return cell * 1.0;
  if (enemy.kind === 'SEVEN') return cell * 1.32;
  return cell * 0.8;
};

const enemyVisualRadius = (enemy: Enemy, cell: number) => {
  const sprite = enemySpriteSize(enemy.kind, cell);
  return Math.max(enemyRadius(enemy, cell), Math.hypot(sprite.width, sprite.height) * 0.5) + PERIMETER_STROKE_WIDTH * 0.5;
};

const enemySpriteFootprint = (enemy: Enemy, cell: number, x: number, y: number) => {
  const sprite = enemySpriteSize(enemy.kind, cell);
  const motion = enemyAnimationTransform(enemy, cell);
  const halfWidth = sprite.width * motion.scale * 0.5;
  const halfHeight = sprite.height * motion.scale * 0.5;
  const step = Math.max(3, cell * 0.22);
  const cos = Math.cos(motion.rotation);
  const sin = Math.sin(motion.rotation);
  const points: Point[] = [];

  for (let localY = -halfHeight; localY <= halfHeight + step * 0.5; localY += step) {
    for (let localX = -halfWidth; localX <= halfWidth + step * 0.5; localX += step) {
      points.push({
        x: x + localX * cos - localY * sin,
        y: y + motion.offsetY + localX * sin + localY * cos,
      });
    }
  }
  return points;
};

const enemySpriteCorners = (enemy: Enemy, cell: number, x: number, y: number) => {
  const sprite = enemySpriteSize(enemy.kind, cell);
  const motion = enemyAnimationTransform(enemy, cell);
  const halfWidth = sprite.width * motion.scale * 0.5;
  const halfHeight = sprite.height * motion.scale * 0.5;
  const cos = Math.cos(motion.rotation);
  const sin = Math.sin(motion.rotation);
  return [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ].map((point) => ({
    x: x + point.x * cos - point.y * sin,
    y: y + motion.offsetY + point.x * sin + point.y * cos,
  }));
};

const pointInPolygon = (point: Point, polygon: Point[]) => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const intersects = (
      (currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y))
        / (previousPoint.y - currentPoint.y || 1e-9) + currentPoint.x
    );
    if (intersects) inside = !inside;
  }
  return inside;
};

const pointInsideClaimedSurface = (point: Point, claimedPolygons: Point[][], tolerance = 0) => (
  claimedPolygons.some((polygon) => (
    pointInPolygon(point, polygon) || (
      tolerance > 0 && polygonBoundaryDistance(point, polygon) <= tolerance
    )
  ))
);

const claimedBoundaryExitContact = (
  from: Point,
  to: Point,
  claimedPolygons: Point[][],
  tolerance: number,
) => {
  if (
    !pointInsideClaimedSurface(from, claimedPolygons, tolerance)
    || pointInsideClaimedSurface(to, claimedPolygons, tolerance)
  ) {
    return null;
  }

  const cross = (first: Point, second: Point) => first.x * second.y - first.y * second.x;
  const direction = { x: to.x - from.x, y: to.y - from.y };
  let nearestProgress = Number.POSITIVE_INFINITY;

  claimedPolygons.forEach((polygon) => {
    if (
      !pointInPolygon(from, polygon)
      && polygonBoundaryDistance(from, polygon) > tolerance
    ) {
      return;
    }

    for (let index = 0; index < polygon.length; index += 1) {
      const edgeStart = polygon[index];
      const edgeEnd = polygon[(index + 1) % polygon.length];
      const edge = { x: edgeEnd.x - edgeStart.x, y: edgeEnd.y - edgeStart.y };
      const denominator = cross(direction, edge);
      if (Math.abs(denominator) < 1e-8) continue;

      const offset = { x: edgeStart.x - from.x, y: edgeStart.y - from.y };
      const progress = cross(offset, edge) / denominator;
      const edgeProgress = cross(offset, direction) / denominator;
      if (
        progress >= -1e-6
        && progress <= 1 + 1e-6
        && edgeProgress >= -1e-6
        && edgeProgress <= 1 + 1e-6
      ) {
        nearestProgress = Math.min(nearestProgress, Math.max(0, progress));
      }
    }
  });

  if (!Number.isFinite(nearestProgress)) {
    let low = 0;
    let high = 1;
    for (let iteration = 0; iteration < 24; iteration += 1) {
      const progress = (low + high) * 0.5;
      const midpoint = {
        x: from.x + direction.x * progress,
        y: from.y + direction.y * progress,
      };
      if (pointInsideClaimedSurface(midpoint, claimedPolygons)) low = progress;
      else high = progress;
    }
    nearestProgress = high;
  }

  return {
    x: from.x + direction.x * nearestProgress,
    y: from.y + direction.y * nearestProgress,
  };
};

const segmentsIntersect = (firstStart: Point, firstEnd: Point, secondStart: Point, secondEnd: Point) => {
  const orientation = (a: Point, b: Point, c: Point) => (
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  );
  const first = orientation(firstStart, firstEnd, secondStart);
  const second = orientation(firstStart, firstEnd, secondEnd);
  const third = orientation(secondStart, secondEnd, firstStart);
  const fourth = orientation(secondStart, secondEnd, firstEnd);
  return ((first > 0 && second < 0) || (first < 0 && second > 0))
    && ((third > 0 && fourth < 0) || (third < 0 && fourth > 0));
};

const polygonsIntersect = (first: Point[], second: Point[]) => {
  if (first.some((point) => pointInPolygon(point, second))
    || second.some((point) => pointInPolygon(point, first))) {
    return true;
  }
  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    const firstStart = first[firstIndex];
    const firstEnd = first[(firstIndex + 1) % first.length];
    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      const secondStart = second[secondIndex];
      const secondEnd = second[(secondIndex + 1) % second.length];
      if (
        segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)
        || distanceToSegment(firstStart, secondStart, secondEnd) <= 0.001
        || distanceToSegment(secondStart, firstStart, firstEnd) <= 0.001
      ) {
        return true;
      }
    }
  }
  return false;
};

const pathTouchesPolygon = (path: Point[], polygon: Point[], strokeRadius: number) => {
  if (path.length < 2 || polygon.length < 3) return false;
  const edges = polygon.map((corner, index) => ({
    start: corner,
    end: polygon[(index + 1) % polygon.length],
  }));
  return path.slice(1).some((pathEnd, index) => {
    const pathStart = path[index];
    if (pointInPolygon(pathStart, polygon) || pointInPolygon(pathEnd, polygon)) return true;
    return edges.some((edge) => (
      segmentsIntersect(edge.start, edge.end, pathStart, pathEnd)
      || distanceToSegment(edge.start, pathStart, pathEnd) <= strokeRadius
      || distanceToSegment(edge.end, pathStart, pathEnd) <= strokeRadius
    ));
  });
};

const createEnemies = (width: number, height: number, cell: number, level: number): Enemy[] => {
  const safeX = (ratio: number) => clamp(width * ratio, cell * 4, width - cell * 4);
  const safeY = (ratio: number) => clamp(height * ratio, cell * 4, height - cell * 4);
  const levelSpeed = 1 + Math.min(level - 1, 4) * 0.045;
  const enemies: Enemy[] = [
    { kind: 'SHIP', behavior: 'PRESET', pattern: 'SWEEP', x: safeX(0.28), y: safeY(0.28), vx: 56 * levelSpeed, vy: 38 * levelSpeed, speed: 64 * levelSpeed, agility: 0.92, phase: 0.4, spin: 0.2, routePhase: 0.3, thinkTimer: 0, targetX: 0, targetY: 0, blockedTime: 0, respawnAt: 0, edgeTurnTimer: 0, edgeDirectionX: 0, edgeDirectionY: 0 },
    { kind: 'DRAGON', behavior: 'PLANNED', pattern: 'SWEEP', x: safeX(0.73), y: safeY(0.31), vx: -31 * levelSpeed, vy: 37 * levelSpeed, speed: 48 * levelSpeed, agility: 0.66, phase: 2.1, spin: -0.15, routePhase: 1.4, thinkTimer: 0, targetX: 0, targetY: 0, blockedTime: 0, respawnAt: 0, edgeTurnTimer: 0, edgeDirectionX: 0, edgeDirectionY: 0 },
    { kind: 'SEVEN', behavior: 'PRESET', pattern: 'ZIGZAG', x: safeX(0.30), y: safeY(0.64), vx: 48 * levelSpeed, vy: -38 * levelSpeed, speed: 64 * levelSpeed, agility: 0.78, phase: 4.3, spin: 0.35, routePhase: 2.6, thinkTimer: 0, targetX: 0, targetY: 0, blockedTime: 0, respawnAt: 0, edgeTurnTimer: 0, edgeDirectionX: 0, edgeDirectionY: 0 },
    { kind: 'SPIDER', behavior: 'PLANNED', pattern: 'ZIGZAG', x: safeX(0.72), y: safeY(0.68), vx: -25 * levelSpeed, vy: -19 * levelSpeed, speed: 36 * levelSpeed, agility: 0.82, phase: 5.7, spin: -0.28, routePhase: 4.2, thinkTimer: 0, targetX: 0, targetY: 0, blockedTime: 0, respawnAt: 0, edgeTurnTimer: 0, edgeDirectionX: 0, edgeDirectionY: 0 },
  ];
  return enemies.slice(0, clamp(Math.floor(level), 1, enemies.length));
};

const createShipSmokePuffs = (enemy: Enemy, cell: number, count = 4): SmokePuff[] => {
  const velocityLength = Math.hypot(enemy.vx, enemy.vy) || 1;
  const backwardX = -enemy.vx / velocityLength;
  const backwardY = -enemy.vy / velocityLength;
  const sideX = -backwardY;
  const sideY = backwardX;

  return Array.from({ length: count }, (_, index) => {
    const sideOffset = (Math.random() - 0.5) * cell * 0.34;
    const trailOffset = cell * (0.92 + index * 0.2);
    const maxLife = 0.43 + Math.random() * 0.17;
    const smokeSpeed = Math.max(20, velocityLength * (0.48 + Math.random() * 0.16));
    return {
      x: enemy.x + backwardX * trailOffset + sideX * sideOffset,
      y: enemy.y + backwardY * trailOffset + sideY * sideOffset,
      life: maxLife,
      maxLife,
      size: cell * (0.13 + Math.random() * 0.1),
      driftX: backwardX * smokeSpeed + sideX * (Math.random() - 0.5) * 13,
      driftY: backwardY * smokeSpeed + sideY * (Math.random() - 0.5) * 13,
    };
  });
};

type NativeArenaStaticProps = {
  width: number;
  height: number;
  cell: number;
  rows: number;
  claimedPolygons: Point[][];
  protectedTrails: Point[][];
  claimedCount: number;
  protectedTrailCount: number;
};

const NativeArenaStatic = React.memo(({
  width,
  height,
  cell,
  rows,
  claimedPolygons,
  protectedTrails,
  claimedCount,
  protectedTrailCount,
}: NativeArenaStaticProps) => {
  const gridLines = [];
  for (let x = 0; x <= COLS; x += 1) {
    gridLines.push(
      <Line
        key={`v${x}`}
        x1={x * cell}
        y1={0}
        x2={x * cell}
        y2={height}
        stroke="#00f3ff"
        opacity={0.11}
        strokeWidth={0.6}
      />,
    );
  }
  for (let y = 0; y <= rows; y += 1) {
    gridLines.push(
      <Line
        key={`h${y}`}
        x1={0}
        y1={y * cell}
        x2={width}
        y2={y * cell}
        stroke="#00f3ff"
        opacity={0.11}
        strokeWidth={0.6}
      />,
    );
  }
    const bounds = perimeterBounds(width, height, cell);
  return (
    <>
      <Rect width={width} height={height} fill="#000000" />
      <Rect
        x={bounds.left}
        y={bounds.top}
        width={bounds.right - bounds.left}
        height={bounds.bottom - bounds.top}
        fill={ZONE_COLOR}
        opacity={INITIAL_MAP_OPACITY}
      />
      <G opacity={CAPTURED_ZONE_LAYER_OPACITY}>
        {claimedPolygons.slice(0, claimedCount).map((polygon, index) => (
          <Polygon
            key={`claimed-polygon-${index}`}
            points={pointsToString(polygon)}
            fill={ZONE_COLOR}
          />
        ))}
      </G>
      {gridLines}
      <Rect
        x={bounds.left}
        y={bounds.top}
        width={bounds.right - bounds.left}
        height={bounds.bottom - bounds.top}
        fill="none"
        stroke="#00f3ff"
        strokeWidth={PERIMETER_STROKE_WIDTH}
        opacity={0.95}
      />
      {protectedTrails.slice(0, protectedTrailCount).map((trail, index) => (
        trail.length > 1 && (
          <Polyline
            key={`protected-trail-${index}`}
            points={pointsToString(trail)}
            fill="none"
            stroke="#ff5500"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      ))}
    </>
  );
});

const NativeArenaDynamic = ({ snapshot }: { snapshot: Snapshot }) => {
  const angle = Math.atan2(snapshot.direction.y, snapshot.direction.x);
  const playerRotationDegrees = angle * (180 / Math.PI) + 90;
  const playerSize = playerSpriteSize(snapshot.cell);
  const activeCut = snapshot.trail.length > 0
    && (snapshot.direction.x !== 0 || snapshot.direction.y !== 0);
  const cutPoint = cuttingPoint(snapshot.player, snapshot.direction, snapshot.cell);
  const cutPulse = 0.72 + Math.sin(Date.now() * 0.012) * 0.2;
  const cutFrame = Math.floor(Date.now() / 55) % CUTTING_SPRITE_FRAME_COUNT;
  const cutSpriteWidth = snapshot.cell * 1.62;
  const cutSpriteHeight = cutSpriteWidth * CUTTING_SPRITE_FRAME_HEIGHT / CUTTING_SPRITE_FRAME_WIDTH;
  const scanIntervals = snapshot.pendingCapturePolygons.flatMap((polygon) => (
    polygonHorizontalIntervals(polygon, snapshot.scanY)
  ));
  return (
    <>
      {!snapshot.diamond.collected && (
        <SvgImage
          href={diamondSource}
          x={snapshot.diamond.x - snapshot.cell * 0.75}
          y={snapshot.diamond.y - snapshot.cell * 0.75}
          width={snapshot.cell * 1.5}
          height={snapshot.cell * 1.5}
          opacity={0.98}
        />
      )}
      {CUTTING_SPRITE_ENABLED && activeCut && (
        <>
          <Defs>
            <ClipPath id="cutting-sprite-frame-clip">
              <Rect
                x={-cutSpriteWidth / 2}
                y={-cutSpriteHeight / 2}
                width={cutSpriteWidth}
                height={cutSpriteHeight}
              />
            </ClipPath>
          </Defs>
          <G transform={`translate(${cutPoint.x} ${cutPoint.y}) rotate(${angle * (180 / Math.PI)})`}>
            <G clipPath="url(#cutting-sprite-frame-clip)">
              <SvgImage
                href={cuttingSpriteSource}
                x={-cutSpriteWidth / 2 - cutFrame * cutSpriteWidth}
                y={-cutSpriteHeight / 2}
                width={cutSpriteWidth * CUTTING_SPRITE_FRAME_COUNT}
                height={cutSpriteHeight}
                opacity={0.94}
              />
            </G>
          </G>
        </>
      )}
      {!CUTTING_SPRITE_ENABLED && activeCut && (
        <G transform={`translate(${cutPoint.x} ${cutPoint.y}) rotate(${angle * (180 / Math.PI)})`}>
          <Line
            x1={-snapshot.cell * 0.5}
            y1={0}
            x2={snapshot.cell * 0.38}
            y2={0}
            stroke="#ff6a22"
            strokeWidth={snapshot.cell * 0.16}
            strokeLinecap="round"
            opacity={0.34 + cutPulse * 0.2}
          />
          <Line
            x1={snapshot.cell * 0.03}
            y1={0}
            x2={snapshot.cell * 0.29}
            y2={0}
            stroke="#fff5cf"
            strokeWidth={snapshot.cell * 0.07}
            strokeLinecap="round"
            opacity={0.78 + cutPulse * 0.18}
          />
          <Polygon
            points={`${snapshot.cell * 0.24},${-snapshot.cell * 0.12} ${snapshot.cell * 0.42},${-snapshot.cell * 0.09} ${snapshot.cell * 0.42},${snapshot.cell * 0.09} ${snapshot.cell * 0.24},${snapshot.cell * 0.12}`}
            fill="#9b542f"
            opacity={0.86}
          />
          <Line
            x1={snapshot.cell * 0.4}
            y1={0}
            x2={snapshot.cell * 0.5}
            y2={0}
            stroke="#f7c56f"
            strokeWidth={snapshot.cell * 0.09}
            strokeLinecap="round"
          />
        </G>
      )}
      {snapshot.particles.map((particle, index) => (
        particle.streak ? (
          <Line
            key={`spark${index}`}
            x1={particle.x}
            y1={particle.y}
            x2={particle.x - particle.vx * 0.018}
            y2={particle.y - particle.vy * 0.018}
            stroke={particle.color}
            strokeWidth={particle.size * 1.35}
            strokeLinecap="round"
            opacity={clamp(particle.life / 0.4, 0, 1)}
          />
        ) : (
          <Circle
            key={`spark${index}`}
            cx={particle.x}
            cy={particle.y}
            r={particle.size}
            fill={particle.color}
            opacity={clamp(particle.life / 0.4, 0, 1)}
          />
        )
      ))}
      {snapshot.enemies.map((enemy, enemyIndex) => {
        if (enemy.respawnAt > Date.now()) return null;
        const frame = enemyFrameIndex(enemy);
        const size = enemySpriteSize(enemy.kind, snapshot.cell);
        const motion = enemyAnimationTransform(enemy, snapshot.cell);
        const centerY = enemy.y + motion.offsetY;
        const rotationDegrees = motion.rotation * (180 / Math.PI);
        return (
          <G
            key={`enemy-sprite-${enemyIndex}`}
            transform={`translate(${enemy.x} ${centerY}) rotate(${rotationDegrees}) scale(${motion.scale}) translate(${-enemy.x} ${-enemy.y})`}
          >
            <SvgImage
              href={spriteFrames[enemy.kind][frame]}
              x={enemy.x - size.width / 2}
              y={enemy.y - size.height / 2}
              width={size.width}
              height={size.height}
              opacity={0.98}
            />
          </G>
        );
      })}
      {scanIntervals.map(([startX, endX], index) => (
        <Line
          key={`capture-scan-${index}`}
          x1={startX}
          y1={snapshot.scanY}
          x2={endX}
          y2={snapshot.scanY}
          stroke="#ffffff"
          strokeWidth={2}
        />
      ))}
      {snapshot.smokePuffs.map((puff, index) => {
        const opacity = clamp(puff.life / puff.maxLife, 0, 1);
        return (
          <G key={`smoke-${index}`} opacity={opacity * 0.22}>
            <Circle cx={puff.x} cy={puff.y} r={puff.size} fill="#00f3ff" />
            <Circle cx={puff.x} cy={puff.y} r={puff.size * 0.42} fill="#ffffff" opacity={0.55} />
          </G>
        );
      })}
      <G transform={`translate(${snapshot.player.x} ${snapshot.player.y}) rotate(${playerRotationDegrees})`}>
        <SvgImage
          href={playerSource}
          x={-playerSize.width / 2}
          y={-playerSize.height / 2}
          width={playerSize.width}
          height={playerSize.height}
          opacity={0.98}
        />
      </G>
    </>
  );
};

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const canvasRef = useRef<any>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const gameRef = useRef<Game>({
    width: 0,
    height: 0,
    cell: 0,
    rows: 0,
    player: { x: 0, y: 0 },
    inputDir: ZERO,
    facingDir: { x: 0, y: 1 },
    hasMoveCommand: false,
    cutDir: ZERO,
    cutCoordinate: 0,
    trail: [],
    protectedTrails: [],
    enemies: [],
    diamond: { x: 0, y: 0, phase: 0, collected: false },
    particles: [],
    smokePuffs: [],
    smokeAccumulator: 0,
    claimedPolygons: [],
    pendingCapturePolygons: [],
    fillQueue: [],
    fillCursor: 0,
    scanY: 0,
    mode: 'SLOW',
    score: 0,
    shields: 3,
    capturedArea: 0,
    totalPlayableArea: 1,
    pendingCaptureArea: 0,
    level: 1,
    frame: 0,
    trailScoreAccumulator: 0,
    initialized: false,
    status: 'PLAYING',
    respawnAt: 0,
  });

  const [hud, setHud] = useState<Hud>({
    score: 0,
    bestScore: 0,
    shields: 3,
    capture: 0,
    level: 1,
    mode: 'SLOW',
    feedback: '',
  });
  const [nativeSnapshot, setNativeSnapshot] = useState<Snapshot | null>(null);
  const spriteImagesRef = useRef<Record<string, any>>({});
  const diamondImageRef = useRef<any>(null);
  const playerImageRef = useRef<any>(null);
  const cuttingSpriteImageRef = useRef<any>(null);
  const bestScoreRef = useRef(0);
  const bestScoreHydratedRef = useRef(false);
  const pickupChimePlayer = useAudioPlayer(pickupChimeSource, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const audioSessionReadyRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(BEST_SCORE_STORAGE_KEY)
      .then((storedScore) => {
        if (cancelled) return;
        const parsedScore = Number.parseInt(storedScore ?? '0', 10);
        const bestScore = Number.isFinite(parsedScore) ? Math.max(0, parsedScore) : 0;
        bestScoreRef.current = bestScore;
        bestScoreHydratedRef.current = true;
        setHud((current) => ({ ...current, bestScore }));
      })
      .catch((error: unknown) => {
        bestScoreHydratedRef.current = true;
        if (__DEV__) console.warn('Unable to load best score', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    pickupChimePlayer.muted = false;
    pickupChimePlayer.volume = 0.78;
    audioSessionReadyRef.current = setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'duckOthers',
    })
      .then(() => setIsAudioActiveAsync(true))
      .catch((error: unknown) => {
        if (__DEV__) console.warn('Unable to initialize native audio session', error);
      });
  }, [pickupChimePlayer]);

  const playPickupChime = useCallback(() => {
    void audioSessionReadyRef.current.then(async () => {
      pickupChimePlayer.muted = false;
      pickupChimePlayer.volume = 0.78;
      try {
        await pickupChimePlayer.seekTo(0);
      } catch {
        // A freshly loaded native player is already positioned at the start.
      }
      pickupChimePlayer.play();
    }).catch((error: unknown) => {
      if (__DEV__) console.warn('Unable to play pickup chime', error);
    });
  }, [pickupChimePlayer]);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;

    let cancelled = false;
    Object.entries(spriteFrames).forEach(([kind, frames]) => {
      frames.forEach((source, frame) => {
        const resolved = (RNImage as any).resolveAssetSource?.(source);
        const uri = resolved?.uri ?? source?.uri ?? source;
        const image = new (globalThis as any).Image();
        image.decoding = 'async';
        image.onload = () => {
          if (!cancelled) spriteImagesRef.current[`${kind}:${frame}`] = image;
        };
        image.src = uri;
      });
    });
    const resolvedDiamond = (RNImage as any).resolveAssetSource?.(diamondSource);
    const diamondImage = new (globalThis as any).Image();
    diamondImage.decoding = 'async';
    diamondImage.onload = () => {
      if (!cancelled) diamondImageRef.current = diamondImage;
    };
    diamondImage.src = resolvedDiamond?.uri ?? diamondSource;
    const resolvedPlayer = (RNImage as any).resolveAssetSource?.(playerSource);
    const playerImage = new (globalThis as any).Image();
    playerImage.decoding = 'async';
    playerImage.onload = () => {
      if (!cancelled) playerImageRef.current = playerImage;
    };
    playerImage.src = resolvedPlayer?.uri ?? playerSource;
    const resolvedCuttingSprite = (RNImage as any).resolveAssetSource?.(cuttingSpriteSource);
    const cuttingSpriteImage = new (globalThis as any).Image();
    cuttingSpriteImage.decoding = 'async';
    cuttingSpriteImage.onload = () => {
      if (!cancelled) cuttingSpriteImageRef.current = cuttingSpriteImage;
    };
    cuttingSpriteImage.src = resolvedCuttingSprite?.uri ?? cuttingSpriteSource;

    return () => {
      cancelled = true;
      spriteImagesRef.current = {};
      diamondImageRef.current = null;
      playerImageRef.current = null;
      cuttingSpriteImageRef.current = null;
    };
  }, []);

  const resetGame = useCallback((preserveStats = false, resetBoard = false) => {
    const g = gameRef.current;
    const { width, height } = sizeRef.current;
    if (width <= 0 || height <= 0) return;

    const previousScore = preserveStats ? g.score : 0;
    const previousShields = preserveStats ? g.shields : 3;
    const previousLevel = preserveStats ? g.level : 1;
    const previousClaimedPolygons = preserveStats && !resetBoard
      ? g.claimedPolygons.map((polygon) => polygon.map((point) => ({ ...point })))
      : [];
    const previousProtectedTrails = preserveStats && !resetBoard
      ? g.protectedTrails.map((trail) => trail.map((point) => ({ ...point })))
      : [];
    const previousCapturedArea = preserveStats && !resetBoard ? g.capturedArea : 0;
    const cell = width / COLS;
    const bounds = perimeterBounds(width, height, cell);
    const rows = Math.max(18, Math.floor(height / cell));
    const totalPlayableArea = Math.max(1, (bounds.right - bounds.left) * (bounds.bottom - bounds.top));
    const enemies = createEnemies(width, height, cell, previousLevel);

    gameRef.current = {
      ...g,
      width,
      height,
      cell,
      rows,
      player: { x: bounds.left + cell, y: bounds.bottom + cell * PLAYER_RADIUS_CELLS },
      inputDir: ZERO,
      facingDir: { x: 0, y: -1 },
      hasMoveCommand: false,
      cutDir: ZERO,
      cutCoordinate: 0,
      trail: [],
      protectedTrails: previousProtectedTrails,
      enemies,
      diamond: createDiamond(width, height, cell),
      particles: [],
      smokePuffs: enemies
        .filter((enemy) => enemy.kind === 'SHIP')
        .flatMap((enemy) => createShipSmokePuffs(enemy, cell)),
      smokeAccumulator: 0,
      claimedPolygons: previousClaimedPolygons,
      pendingCapturePolygons: [],
      fillQueue: [],
      fillCursor: 0,
      scanY: 0,
      mode: 'SLOW',
      score: previousScore,
      shields: previousShields,
      capturedArea: previousCapturedArea,
      totalPlayableArea,
      pendingCaptureArea: 0,
      level: previousLevel,
      frame: 0,
      trailScoreAccumulator: 0,
      initialized: true,
      status: 'PLAYING',
      respawnAt: 0,
    };
    setHud({
      score: previousScore,
      bestScore: bestScoreRef.current,
      shields: previousShields,
      capture: preserveStats && !resetBoard
        ? Math.min(
          LEVEL_CAPTURE_TARGET,
          Math.floor(clamp(previousCapturedArea / totalPlayableArea, 0, 1) * 100),
        )
        : 0,
      level: previousLevel,
      mode: 'SLOW',
      feedback: '',
    });
  }, []);

  const handleArenaLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    const previous = sizeRef.current;
    const changed = Math.abs(previous.width - width) > 1 || Math.abs(previous.height - height) > 1;
    sizeRef.current = { width, height };
    if (changed && gameRef.current.initialized) resetGame(true);
  }, [resetGame]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const g = gameRef.current;
        if (g.status !== 'PLAYING' || Math.hypot(gesture.dx, gesture.dy) < 10) return;
        const direction = cardinalDirection(gesture.dx, gesture.dy);
        g.inputDir = direction;
        g.hasMoveCommand = true;
        // A new cardinal swipe can redirect an active cut at 90 degrees.
        // Releasing still leaves the drone travelling until it reaches safety.
        if (g.trail.length > 0) {
          g.cutDir = direction;
          g.cutCoordinate = direction.x !== 0
            ? g.player.y
            : g.player.x;
        }
      },
      onPanResponderRelease: () => {
        // Keep the selected direction latched. This lets a short inward
        // swipe cross the outer safe band and enter the empty playfield.
      },
      onPanResponderTerminate: () => {
        // Keep the selected direction latched for the same safe-band entry.
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  useEffect(() => {
    let animationFrame = 0;
    let lastTime = Date.now();

    const addParticle = (g: Game, direction: Direction) => {
      if (g.particles.length >= (CUTTING_SPRITE_ENABLED ? 56 : 96)) return;
      const backwards = Math.atan2(-direction.y, -direction.x);
      // Spread around the backward axis so sparks visibly fan above and below
      // the cut instead of forming a single narrow exhaust line.
      const angle = backwards + (Math.random() - 0.5) * (Math.PI * 0.92);
      const speed = 95 + Math.random() * 225;
      const colorsForSpark = ['#ffffff', '#fff35c', '#ff8a00', '#ff5500'];
      g.particles.push({
        x: g.player.x - direction.x * g.cell * 0.76,
        y: g.player.y - direction.y * g.cell * 0.76,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.24,
        size: 1 + Math.random() * 1.8,
        color: colorsForSpark[Math.floor(Math.random() * colorsForSpark.length)],
        streak: true,
      });
    };

    const explode = (g: Game, now: number) => {
      if (g.status !== 'PLAYING') return;
      for (let i = 0; i < 170; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 300;
        g.particles.push({
          x: g.player.x,
          y: g.player.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.6 + Math.random() * 0.5,
          size: 1.5 + Math.random() * 4,
          color: i % 3 === 0 ? '#ffffff' : '#ff6a00',
        });
      }
      g.trail = [];
      g.inputDir = ZERO;
      g.cutDir = ZERO;
      g.shields -= 1;
      g.status = 'RESPAWN';
      g.respawnAt = now + (g.shields > 0 ? 520 : 1050);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    };

    const capture = (g: Game) => {
      const captureResult = buildOrthogonalCaptureRegions({
        trail: g.trail,
        protectedTrails: g.protectedTrails,
        claimedPolygons: g.claimedPolygons,
        bounds: perimeterBounds(g.width, g.height, g.cell),
        contactTolerance: g.cell * 0.4,
      });
      if (!captureResult || captureResult.regions.length === 0) {
        g.trail = [];
        return;
      }

      g.protectedTrails.push(captureResult.protectedTrail);
      g.pendingCapturePolygons = captureResult.regions;
      g.pendingCaptureArea = captureResult.area;
      g.inputDir = ZERO;
      g.cutDir = ZERO;
      g.hasMoveCommand = false;
      // These are only timing units for the scan animation. They are not
      // cells and never participate in collision, capture, or scoring.
      g.fillQueue = Array.from({
        length: Math.max(18, Math.min(240, Math.ceil(captureResult.area / Math.max(1, g.cell * g.cell * 0.65)))),
      }, (_, index) => index);
      g.trail = [];
      g.fillCursor = 0;
      g.scanY = Math.min(...captureResult.regions.flatMap((polygon) => polygon.map((point) => point.y)));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    };

    const spawnPointAfterBurst = (g: Game, enemy: Enemy) => {
      const bounds = perimeterBounds(g.width, g.height, g.cell);
      const visualRadius = enemyVisualRadius(enemy, g.cell);
      const preferredSeeds = [
        { x: 0.5, y: 0.3 },
        { x: 0.28, y: 0.3 },
        { x: 0.72, y: 0.3 },
        { x: 0.5, y: 0.5 },
        { x: 0.28, y: 0.5 },
        { x: 0.72, y: 0.5 },
        { x: 0.5, y: 0.7 },
        { x: 0.28, y: 0.7 },
        { x: 0.72, y: 0.7 },
      ];
      const gridSeeds = Array.from({ length: 9 }, (_, row) => (
        Array.from({ length: 9 }, (_, column) => ({
          x: (column + 0.5) / 9,
          y: (row + 0.5) / 9,
        }))
      )).flat();
      const candidates = [...preferredSeeds, ...gridSeeds].map((seed) => ({
        x: bounds.left + (bounds.right - bounds.left) * seed.x,
        y: bounds.top + (bounds.bottom - bounds.top) * seed.y,
      }));
      const candidateIsUsable = (point: Point) => {
        const x = clamp(point.x, bounds.left + visualRadius, bounds.right - visualRadius);
        const y = clamp(point.y, bounds.top + visualRadius, bounds.bottom - visualRadius);
        const spriteCorners = enemySpriteCorners(enemy, g.cell, x, y);
        const spriteFootprint = enemySpriteFootprint(enemy, g.cell, x, y);
        const outsideClaimedSurface = spriteFootprint.every((spritePoint) => (
          !pointInsideClaimedSurface(spritePoint, g.claimedPolygons, g.cell * 0.08)
        ));
        const noClaimedPolygonOverlap = g.claimedPolygons.every((polygon) => (
          !polygonsIntersect(spriteCorners, polygon)
        ));
        const noProtectedBoundaryContact = g.protectedTrails.every((protectedTrail) => (
          !pathTouchesPolygon(
            protectedTrail,
            spriteCorners,
            PERIMETER_STROKE_WIDTH * 0.5,
          )
        ));
        if (!outsideClaimedSurface || !noClaimedPolygonOverlap || !noProtectedBoundaryContact) return null;
        return { x, y };
      };

      const candidate = candidates
        .map(candidateIsUsable)
        .find((point): point is Point => point !== null);
      if (!candidate) return false;
      enemy.x = candidate.x;
      enemy.y = candidate.y;
      return true;
    };

    const burstEnemy = (g: Game, enemy: Enemy, now: number) => {
      const colors = ['#ffffff', '#00f3ff', '#ff5500', '#ff2bb5', '#b8ff4a'];
      for (let i = 0; i < 200; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 45 + Math.random() * 260;
        const life = 0.55 + Math.random() * 0.85;
        g.particles.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 55,
          vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 55,
          life,
          size: 0.45 + Math.random() * 1.65,
          color: colors[i % colors.length],
        });
      }
      g.score += ENEMY_SCORE[enemy.kind];
      enemy.blockedTime = 0;
      enemy.respawnAt = now + 900;
      enemy.vx = 0;
      enemy.vy = 0;
      if (enemy.kind === 'SHIP') {
        // Smoke is only emitted by the ship. Remove the old trail while it
        // is off-screen so it cannot remain at the previous spawn point.
        g.smokePuffs.length = 0;
        g.smokeAccumulator = 0;
      }
    };

    const moveEnemies = (g: Game, dt: number, now: number) => {
      const bounds = perimeterBounds(g.width, g.height, g.cell);
      let activeSmokeCount = 0;
      for (let index = 0; index < g.smokePuffs.length; index += 1) {
        const puff = g.smokePuffs[index];
        puff.x += puff.driftX * dt;
        puff.y += puff.driftY * dt;
        puff.life -= dt;
        puff.size += g.cell * dt * 0.08;
        if (puff.life > 0) {
          g.smokePuffs[activeSmokeCount] = puff;
          activeSmokeCount += 1;
        }
      }
      g.smokePuffs.length = activeSmokeCount;
      g.enemies.forEach((enemy) => {
        if (enemy.respawnAt > now) return;
        if (enemy.respawnAt > 0) {
          if (!spawnPointAfterBurst(g, enemy)) {
            enemy.respawnAt = now + 250;
            return;
          }
          enemy.respawnAt = 0;
          enemy.blockedTime = 0;
          enemy.edgeTurnTimer = 0;
          enemy.edgeDirectionX = 0;
          enemy.edgeDirectionY = 0;
          enemy.vx = enemy.kind === 'DRAGON' ? -enemy.speed * 0.55 : enemy.speed * 0.55;
          enemy.vy = enemy.kind === 'SPIDER' ? -enemy.speed * 0.45 : enemy.speed * 0.45;
          enemy.targetX = enemy.x;
          enemy.targetY = enemy.y;
          enemy.thinkTimer = 0;
          if (enemy.kind === 'SHIP') {
            g.smokePuffs.push(...createShipSmokePuffs(enemy, g.cell, 5));
          }
        }

        enemy.phase += dt * (enemy.kind === 'DRAGON' ? 2.3 : enemy.kind === 'SPIDER' ? 3.1 : 1.7);
        enemy.spin += dt * (enemy.kind === 'DRAGON' ? -1.15 : enemy.kind === 'SEVEN' ? 0.42 : enemy.kind === 'SHIP' ? 0.18 : -0.08);
        enemy.routePhase += dt * (enemy.pattern === 'ZIGZAG' ? 2.1 : 0.85);
        enemy.edgeTurnTimer = Math.max(0, enemy.edgeTurnTimer - dt);

        // Do not add a safety rectangle around the sprite here. The exact
        // transformed footprint below is the collision boundary.
        const minX = bounds.left;
        const maxX = bounds.right;
        const minY = bounds.top;
        const maxY = bounds.bottom;
        const bodyRadius = Math.max(enemyRadius(enemy, g.cell) * 0.9, g.cell * 0.72);
        const enemyTouchesProtectedBoundary = (x: number, y: number) => {
          const corners = enemySpriteCorners(enemy, g.cell, x, y);
          return g.protectedTrails.some((protectedTrail) => (
            pathTouchesPolygon(protectedTrail, corners, PERIMETER_STROKE_WIDTH * 0.5)
          ));
        };
        const spriteFitsInsidePerimeter = (x: number, y: number) => (
          enemySpriteCorners(enemy, g.cell, x, y).every((corner) => (
            corner.x >= bounds.left
            && corner.x <= bounds.right
            && corner.y >= bounds.top
            && corner.y <= bounds.bottom
          ))
        );
        const enemyFitsAt = (x: number, y: number) => {
          if (!spriteFitsInsidePerimeter(x, y)) return false;
          const spriteCorners = enemySpriteCorners(enemy, g.cell, x, y);
          return g.claimedPolygons.every((polygon) => !polygonsIntersect(spriteCorners, polygon))
            && !enemyTouchesProtectedBoundary(x, y);
        };
        const enemyCanMoveAt = (x: number, y: number) => {
          if (!spriteFitsInsidePerimeter(x, y)) return false;
          const spriteCorners = enemySpriteCorners(enemy, g.cell, x, y);
          return g.claimedPolygons.every((polygon) => !polygonsIntersect(spriteCorners, polygon))
            && !enemyTouchesProtectedBoundary(x, y);
        };
        const enemyTouchesTrail = (x: number, y: number) => {
          if (g.trail.length < 2) return false;
          const corners = enemySpriteCorners(enemy, g.cell, x, y);
          const edges = corners.map((corner, index) => ({
            start: corner,
            end: corners[(index + 1) % corners.length],
          }));
          const trailStrokeRadius = PERIMETER_STROKE_WIDTH * 0.5;
          return g.trail.slice(1).some((trailPoint, index) => {
            const trailStart = g.trail[index];
            const trailEnd = trailPoint;
            if (pointInPolygon(trailStart, corners) || pointInPolygon(trailEnd, corners)) return true;
            return edges.some((edge) => (
              segmentsIntersect(edge.start, edge.end, trailStart, trailEnd)
              || distanceToSegment(edge.start, trailStart, trailEnd) <= trailStrokeRadius
              || distanceToSegment(edge.end, trailStart, trailEnd) <= trailStrokeRadius
            ));
          });
        };
        const enemySweepTouchesTrail = (
          fromX: number,
          fromY: number,
          toX: number,
          toY: number,
        ) => {
          if (g.trail.length < 2) return false;
          const movementStart = { x: fromX, y: fromY };
          const movementEnd = { x: toX, y: toY };
          const collisionRadius = enemyRadius(enemy, g.cell) + PERIMETER_STROKE_WIDTH * 0.5;
          return g.trail.slice(1).some((trailPoint, index) => {
            const trailStart = g.trail[index];
            const trailEnd = trailPoint;
            if (segmentsIntersect(movementStart, movementEnd, trailStart, trailEnd)) return true;
            return Math.min(
              distanceToSegment(movementStart, trailStart, trailEnd),
              distanceToSegment(movementEnd, trailStart, trailEnd),
              distanceToSegment(trailStart, movementStart, movementEnd),
              distanceToSegment(trailEnd, movementStart, movementEnd),
            ) <= collisionRadius;
          });
        };
        if (enemyTouchesTrail(enemy.x, enemy.y)) {
          explode(g, now);
          return;
        }
        const fullyEnclosedAt = (x: number, y: number) => (
          pointInsideClaimedSurface({ x, y }, g.claimedPolygons, g.cell * 0.08)
          && enemySpriteFootprint(enemy, g.cell, x, y)
            .every((point) => pointInsideClaimedSurface(point, g.claimedPolygons, g.cell * 0.08))
        );
        const recoverShipFromSoftContact = () => {
          if (enemyFitsAt(enemy.x, enemy.y) || fullyEnclosedAt(enemy.x, enemy.y)) return;
          const candidates: { x: number; y: number; distance: number }[] = [];
          if (
            enemy.lastSafeX !== undefined
            && enemy.lastSafeY !== undefined
            && enemyFitsAt(enemy.lastSafeX, enemy.lastSafeY)
          ) {
            candidates.push({
              x: enemy.lastSafeX,
              y: enemy.lastSafeY,
              distance: Math.hypot(enemy.lastSafeX - enemy.x, enemy.lastSafeY - enemy.y),
            });
          }
          const angleOffset = Math.random() * Math.PI * 2;
          const radii = [0.08, 0.16, 0.28, 0.44, 0.68, 0.95].map((ratio) => g.cell * ratio);
          radii.forEach((radius) => {
            for (let index = 0; index < 20; index += 1) {
              const angle = angleOffset + (Math.PI * 2 * index) / 20;
              const x = enemy.x + Math.cos(angle) * radius;
              const y = enemy.y + Math.sin(angle) * radius;
              if (enemyFitsAt(x, y)) {
                candidates.push({ x, y, distance: radius });
              }
            }
          });
          const nearest = candidates.sort((first, second) => first.distance - second.distance)[0];
          if (nearest) {
            enemy.x = nearest.x;
            enemy.y = nearest.y;
            enemy.lastSafeX = nearest.x;
            enemy.lastSafeY = nearest.y;
          }
        };
        const bounceShipRandomly = () => {
          if (fullyEnclosedAt(enemy.x, enemy.y)) return;
          recoverShipFromSoftContact();
          const currentAngle = Math.atan2(enemy.vy, enemy.vx);
          const candidateDistances = [0.12, 0.24, 0.42, 0.68].map((ratio) => g.cell * ratio);
          const candidates = candidateDistances.flatMap((distance) => (
            Array.from({ length: 16 }, (_, index) => {
              const angle = currentAngle + Math.PI * 2 * (index / 16) + (Math.random() - 0.5) * 0.18;
              return {
                angle,
                distance,
                valid: enemyFitsAt(
                  enemy.x + Math.cos(angle) * distance,
                  enemy.y + Math.sin(angle) * distance,
                ),
              };
            })
          )).filter((candidate) => candidate.valid);
          const nearestDistance = candidates.reduce(
            (nearest, candidate) => Math.min(nearest, candidate.distance),
            Number.POSITIVE_INFINITY,
          );
          const validAngles = candidates
            .filter((candidate) => candidate.distance <= nearestDistance + g.cell * 0.14)
            .map((candidate) => candidate.angle);
          const angle = validAngles.length > 0
            ? validAngles[Math.floor(Math.random() * validAngles.length)]
            : currentAngle + Math.PI;
          enemy.vx = Math.cos(angle) * enemy.speed * 0.82;
          enemy.vy = Math.sin(angle) * enemy.speed * 0.82;
          enemy.edgeTurnTimer = 0;
          enemy.routePhase += Math.PI * (0.55 + Math.random() * 0.7);
        };
        if (enemyFitsAt(enemy.x, enemy.y)) {
          enemy.lastSafeX = enemy.x;
          enemy.lastSafeY = enemy.y;
        }

        const distanceToPlayer = Math.hypot(enemy.x - g.player.x, enemy.y - g.player.y);
        const maxDistance = Math.hypot(g.width, g.height) * 0.56;
        const farSlowdown = clamp(1 - distanceToPlayer / maxDistance, 0.42, 1);
        const currentLength = Math.hypot(enemy.vx, enemy.vy) || enemy.speed;
        let desiredSpeed = enemy.speed;
        let desiredVelocity: Point;

        if (enemy.behavior === 'PLANNED') {
          enemy.thinkTimer -= dt;
          if (enemy.thinkTimer <= 0) {
            const playerDirection = g.trail.length > 0
              ? g.cutDir
              : (g.inputDir.x !== 0 || g.inputDir.y !== 0 ? g.inputDir : g.facingDir);
            const isDragon = enemy.kind === 'DRAGON';
            const predictionTime = isDragon
              ? (g.trail.length > 0 ? 0.42 : 0.68)
              : 0;
            const predictedPlayer = {
              x: clamp(g.player.x + playerDirection.x * 118 * predictionTime, minX, maxX),
              y: clamp(g.player.y + playerDirection.y * 118 * predictionTime, minY, maxY),
            };
            const planningCenter = isDragon ? predictedPlayer : g.player;
            const playerAngle = Math.atan2(planningCenter.y - enemy.y, planningCenter.x - enemy.x);
            const orbitDirection = enemy.kind === 'DRAGON' ? 1 : -1;
            const idealDistance = Math.min(g.width, g.height) * (isDragon ? 0.2 : 0.18);
            let bestScore = Number.POSITIVE_INFINITY;
            let bestTarget = { x: planningCenter.x, y: planningCenter.y };

            for (let candidateIndex = 0; candidateIndex < (isDragon ? 12 : 8); candidateIndex += 1) {
              const candidateAngle = playerAngle
                + orbitDirection * (isDragon ? 0.28 + candidateIndex * 0.44 : 0.55 + candidateIndex * 0.62)
                + Math.sin(enemy.routePhase) * (isDragon ? 0.08 : 0.12);
              const candidateRadius = idealDistance * (
                isDragon
                  ? 0.76 + (candidateIndex % 4) * 0.1
                  : 0.82 + (candidateIndex % 3) * 0.13
              );
              const candidate = {
                x: clamp(planningCenter.x + Math.cos(candidateAngle) * candidateRadius, minX, maxX),
                y: clamp(planningCenter.y + Math.sin(candidateAngle) * candidateRadius, minY, maxY),
              };
              const playerDistance = Math.hypot(candidate.x - planningCenter.x, candidate.y - planningCenter.y);
              const headingDistance = Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y);
              const blockedPenalty = enemyCanMoveAt(candidate.x, candidate.y) ? 0 : 10000;
              const forwardProjection = (
                (candidate.x - g.player.x) * playerDirection.x
                + (candidate.y - g.player.y) * playerDirection.y
              );
              const interceptionPenalty = isDragon
                ? Math.max(0, -forwardProjection) * 0.65
                : 0;
              const score = blockedPenalty
                + Math.abs(playerDistance - idealDistance) * (isDragon ? 2.8 : 2)
                + headingDistance * (isDragon ? 0.055 : 0.08)
                + interceptionPenalty;
              if (score < bestScore) {
                bestScore = score;
                bestTarget = candidate;
              }
            }

            enemy.targetX = bestTarget.x;
            enemy.targetY = bestTarget.y;
            enemy.thinkTimer = isDragon ? 0.38 : 0.56;
          }

          const targetVector = {
            x: enemy.targetX - enemy.x,
            y: enemy.targetY - enemy.y,
          };
          const targetLength = Math.hypot(targetVector.x, targetVector.y) || 1;
          const planningBias = enemy.kind === 'DRAGON' ? 0.82 : 0.76;
          desiredVelocity = {
            x: (enemy.vx / currentLength) * (1 - planningBias) + (targetVector.x / targetLength) * planningBias,
            y: (enemy.vy / currentLength) * (1 - planningBias) + (targetVector.y / targetLength) * planningBias,
          };
          desiredSpeed *= farSlowdown;
        } else {
          const currentHeading = Math.atan2(enemy.vy, enemy.vx);
          const routeBend = enemy.pattern === 'SWEEP'
            ? Math.sin(enemy.routePhase * 0.75) * 0.58
            : Math.sin(enemy.routePhase * 1.35) * 1.1;
          const routeHeading = currentHeading + routeBend * dt;
          desiredVelocity = { x: Math.cos(routeHeading), y: Math.sin(routeHeading) };
        }

        if (enemy.edgeTurnTimer > 0) {
          desiredVelocity = {
            x: enemy.edgeDirectionX,
            y: enemy.edgeDirectionY,
          };
        }

        const desiredLength = Math.hypot(desiredVelocity.x, desiredVelocity.y) || 1;
        const steeringRate = enemy.kind === 'DRAGON'
          ? 4.1
          : (enemy.behavior === 'PLANNED' ? 3.4 : 2.2);
        const steering = clamp(enemy.agility * dt * steeringRate, 0, 1);
        enemy.vx += ((desiredVelocity.x / desiredLength) * desiredSpeed - enemy.vx) * steering;
        enemy.vy += ((desiredVelocity.y / desiredLength) * desiredSpeed - enemy.vy) * steering;

        const nextX = enemy.x + enemy.vx * dt;
        const nextY = enemy.y + enemy.vy * dt;
        const previousEnemyX = enemy.x;
        const previousEnemyY = enemy.y;
        const canMoveFull = enemyCanMoveAt(nextX, nextY);
        const canMoveX = enemyCanMoveAt(nextX, enemy.y);
        const canMoveY = enemyCanMoveAt(enemy.x, nextY);
        const blockedX = nextX < minX || nextX > maxX || !canMoveX;
        const blockedY = nextY < minY || nextY > maxY || !canMoveY;
        const turnAwayFromBlueEdge = (hitX: boolean, hitY: boolean) => {
          if (!hitX && !hitY) return;
          const centerDirectionX = Math.sign(g.width * 0.5 - enemy.x) || (Math.sin(enemy.routePhase) >= 0 ? 1 : -1);
          const centerDirectionY = Math.sign(g.height * 0.5 - enemy.y) || (Math.cos(enemy.routePhase) >= 0 ? 1 : -1);
          const travelDirectionX = Math.sign(enemy.vx) || centerDirectionX;
          const travelDirectionY = Math.sign(enemy.vy) || centerDirectionY;
          enemy.edgeDirectionX = hitX
            ? -travelDirectionX
            : centerDirectionX * 0.72;
          enemy.edgeDirectionY = hitY
            ? -travelDirectionY
            : centerDirectionY * 0.72;
          const edgeDirectionLength = Math.hypot(enemy.edgeDirectionX, enemy.edgeDirectionY) || 1;
          enemy.edgeDirectionX /= edgeDirectionLength;
          enemy.edgeDirectionY /= edgeDirectionLength;
          enemy.edgeTurnTimer = 1.15;
          enemy.routePhase += Math.PI * 0.65;
          enemy.vx = enemy.edgeDirectionX * enemy.speed * 0.78;
          enemy.vy = enemy.edgeDirectionY * enemy.speed * 0.78;
        };
        if (enemy.kind === 'SHIP' && !canMoveFull) {
          bounceShipRandomly();
        } else if (canMoveFull) {
          enemy.x = nextX;
          enemy.y = nextY;
          enemy.lastSafeX = enemy.x;
          enemy.lastSafeY = enemy.y;
        } else if (canMoveX) {
          enemy.x = nextX;
          enemy.lastSafeX = enemy.x;
          enemy.lastSafeY = enemy.y;
          if (blockedY) turnAwayFromBlueEdge(false, true);
          else enemy.vy *= -1;
        } else if (canMoveY) {
          enemy.y = nextY;
          enemy.lastSafeX = enemy.x;
          enemy.lastSafeY = enemy.y;
          if (blockedX) turnAwayFromBlueEdge(true, false);
          else enemy.vx *= -1;
        } else {
          if (blockedX || blockedY) {
            enemy.x = clamp(enemy.x, minX, maxX);
            enemy.y = clamp(enemy.y, minY, maxY);
            turnAwayFromBlueEdge(blockedX, blockedY);
          } else {
            const escapeDistance = Math.max(g.cell * 0.72, bodyRadius * 1.18);
            const escapeDirections = [
              { x: 0, y: -1 },
              { x: 0, y: 1 },
              { x: -1, y: 0 },
              { x: 1, y: 0 },
              { x: -0.7, y: -0.7 },
              { x: 0.7, y: -0.7 },
              { x: -0.7, y: 0.7 },
              { x: 0.7, y: 0.7 },
            ];
            const escape = escapeDirections
              .map((direction) => ({
                x: clamp(enemy.x + direction.x * escapeDistance, minX, maxX),
                y: clamp(enemy.y + direction.y * escapeDistance, minY, maxY),
                alignment: direction.x * enemy.vx + direction.y * enemy.vy,
              }))
              .filter((candidate) => enemyCanMoveAt(candidate.x, candidate.y))
              .sort((first, second) => second.alignment - first.alignment)[0];

            if (escape) {
              const escapeX = escape.x - enemy.x;
              const escapeY = escape.y - enemy.y;
              const escapeLength = Math.hypot(escapeX, escapeY) || 1;
              enemy.x = escape.x;
              enemy.y = escape.y;
              enemy.vx = (escapeX / escapeLength) * enemy.speed * 0.55;
              enemy.vy = (escapeY / escapeLength) * enemy.speed * 0.55;
            } else {
              enemy.vx *= -1;
              enemy.vy *= -1;
            }
          }
        }

        const centerIsSafe = pointInsideClaimedSurface(
          { x: enemy.x, y: enemy.y },
          g.claimedPolygons,
          g.cell * 0.08,
        );
        const enclosed = centerIsSafe
          && enemySpriteFootprint(enemy, g.cell, enemy.x, enemy.y)
            .every((point) => pointInsideClaimedSurface(point, g.claimedPolygons, g.cell * 0.08));
        if (enclosed) {
          enemy.blockedTime += dt;
          if (enemy.blockedTime > 0.38 && enemy.respawnAt <= now) burstEnemy(g, enemy, now);
        } else {
          enemy.blockedTime = Math.max(0, enemy.blockedTime - dt * 1.8);
        }

        const droneIsActive = g.trail.length > 0 || pointInsidePerimeter(g.player, bounds);
        const collisionRadius = enemyRadius(enemy, g.cell) + playerBodyRadius(g.cell);
        if (droneIsActive && Math.hypot(enemy.x - g.player.x, enemy.y - g.player.y) < collisionRadius) {
          explode(g, now);
        }
        if (
          enemyTouchesTrail(enemy.x, enemy.y)
          || enemySweepTouchesTrail(previousEnemyX, previousEnemyY, enemy.x, enemy.y)
        ) {
          explode(g, now);
        }

        if (enemy.kind === 'SHIP') {
          const velocityLength = Math.hypot(enemy.vx, enemy.vy);
          if (velocityLength > 8) {
            g.smokeAccumulator += dt;
            if (g.smokeAccumulator >= 0.04) {
              g.smokePuffs.push(...createShipSmokePuffs(enemy, g.cell, 1));
              g.smokeAccumulator = 0;
            }
          }
        }
      });

      for (let firstIndex = 0; firstIndex < g.enemies.length; firstIndex += 1) {
        const first = g.enemies[firstIndex];
        if (first.respawnAt > now) continue;
        for (let secondIndex = firstIndex + 1; secondIndex < g.enemies.length; secondIndex += 1) {
          const second = g.enemies[secondIndex];
          if (second.respawnAt > now) continue;
          const dx = second.x - first.x;
          const dy = second.y - first.y;
          const distance = Math.hypot(dx, dy) || 0.001;
          const firstRadius = enemyVisualRadius(first, g.cell) * 0.68;
          const secondRadius = enemyVisualRadius(second, g.cell) * 0.68;
          const minimumDistance = firstRadius + secondRadius;
          if (distance >= minimumDistance) continue;

          const normalX = dx / distance;
          const normalY = dy / distance;
          const correction = (minimumDistance - distance) * 0.52;
          first.x = clamp(first.x - normalX * correction, bounds.left + firstRadius, bounds.right - firstRadius);
          first.y = clamp(first.y - normalY * correction, bounds.top + firstRadius, bounds.bottom - firstRadius);
          second.x = clamp(second.x + normalX * correction, bounds.left + secondRadius, bounds.right - secondRadius);
          second.y = clamp(second.y + normalY * correction, bounds.top + secondRadius, bounds.bottom - secondRadius);

          const relativeVelocity = (second.vx - first.vx) * normalX + (second.vy - first.vy) * normalY;
          if (relativeVelocity < 0) {
            first.vx += relativeVelocity * normalX * 0.7;
            first.vy += relativeVelocity * normalY * 0.7;
            second.vx -= relativeVelocity * normalX * 0.7;
            second.vy -= relativeVelocity * normalY * 0.7;
          }
        }
      }
    };

    const update = (g: Game, dt: number, now: number) => {
      g.frame += 1;
      let activeParticleCount = 0;
      for (let index = 0; index < g.particles.length; index += 1) {
        const particle = g.particles[index];
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= 0.95;
        particle.vy *= 0.95;
        particle.life -= dt;
        if (particle.life > 0) {
          g.particles[activeParticleCount] = particle;
          activeParticleCount += 1;
        }
      }
      g.particles.length = activeParticleCount;

      if (g.status === 'RESPAWN') {
        if (now >= g.respawnAt) {
          if (g.shields <= 0) resetGame(false);
          else resetGame(true);
        }
        return;
      }

      if (g.fillQueue.length > 0) {
        const unitsPerFrame = Math.max(5, Math.min(22, Math.ceil(g.fillQueue.length / 26)));
        g.fillCursor = Math.min(g.fillQueue.length, g.fillCursor + unitsPerFrame);
        const pendingPoints = g.pendingCapturePolygons.flat();
        if (pendingPoints.length > 0) {
          const minY = Math.min(...pendingPoints.map((point) => point.y));
          const maxY = Math.max(...pendingPoints.map((point) => point.y));
          const progress = g.fillCursor / Math.max(1, g.fillQueue.length);
          g.scanY = minY + (maxY - minY) * progress;
        }
        if (g.fillCursor >= g.fillQueue.length) {
          const completedPolygons = g.pendingCapturePolygons;
          if (completedPolygons.length > 0) {
            g.claimedPolygons.push(...completedPolygons);
            g.capturedArea = Math.min(
              g.totalPlayableArea,
              g.claimedPolygons.reduce((area, polygon) => area + polygonArea(polygon), 0),
            );
            if (
              !g.diamond.collected
              && captureRegionsOverlapCircle(g.diamond, g.cell * 0.55, completedPolygons)
            ) {
              g.diamond.collected = true;
              g.score += DIAMOND_SCORE;
              for (let particleIndex = 0; particleIndex < 90; particleIndex += 1) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 35 + Math.random() * 180;
                g.particles.push({
                  x: g.diamond.x,
                  y: g.diamond.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  life: 0.45 + Math.random() * 0.55,
                  size: 1 + Math.random() * 2.8,
                  color: ['#ffffff', '#00f3ff', '#ff2bb5', '#b8ff4a'][particleIndex % 4],
                });
              }
            }
            g.enemies.forEach((enemy) => {
              if (enemy.respawnAt > now) return;
              const motion = enemyAnimationTransform(enemy, g.cell);
              const enemyPoints = [
                { x: enemy.x, y: enemy.y + motion.offsetY },
                ...enemySpriteCorners(enemy, g.cell, enemy.x, enemy.y),
              ];
              const enemyInside = completedPolygons.some((polygon) => (
                enemyPoints.some((point) => (
                  pointInPolygon(point, polygon)
                  || polygonBoundaryDistance(point, polygon) <= g.cell * 0.12
                ))
              ));
              if (enemyInside) burstEnemy(g, enemy, now);
            });
            g.score += Math.max(100, Math.round((g.pendingCaptureArea / (g.cell * g.cell)) * 20));
            if (g.level === 1 && g.capturedArea / g.totalPlayableArea >= LEVEL_CAPTURE_TARGET / 100) {
              g.level = 2;
              resetGame(true, true);
              return;
            }
          }
          g.fillQueue = [];
          g.fillCursor = 0;
          g.scanY = 0;
          g.pendingCapturePolygons = [];
          g.pendingCaptureArea = 0;
          playPickupChime();
        }
        return;
      }

      const direction = g.trail.length > 0
        ? g.cutDir
        : (g.inputDir.x !== 0 || g.inputDir.y !== 0)
          ? g.inputDir
          : g.hasMoveCommand
            ? g.facingDir
            : ZERO;
      if (direction.x !== 0 || direction.y !== 0) g.facingDir = direction;
      const speed = 118;
      const distance = speed * dt;
      if (direction.x !== 0 || direction.y !== 0) {
        const steps = Math.max(1, Math.ceil(distance));
        const stepX = (direction.x * distance) / steps;
        const stepY = (direction.y * distance) / steps;

        for (let i = 0; i < steps; i += 1) {
          const bounds = perimeterBounds(g.width, g.height, g.cell);
          const previous = { ...g.player };
          const activeTrail = g.trail.length > 0;
          let next = {
            x: g.player.x + stepX,
            y: g.player.y + stepY,
          };

          if (activeTrail) {
            if (direction.x !== 0) next.y = g.cutCoordinate;
            if (direction.y !== 0) next.x = g.cutCoordinate;
          }

          const reachedPerimeter = activeTrail && (
            (direction.x < 0 && next.x <= bounds.left)
            || (direction.x > 0 && next.x >= bounds.right)
            || (direction.y < 0 && next.y <= bounds.top)
            || (direction.y > 0 && next.y >= bounds.bottom)
          );
          if (reachedPerimeter) {
            const contact = perimeterContact(next, direction, bounds);
            g.player = contact;
            if (g.trail.length > 2) {
              g.trail.push(contact);
              capture(g);
            } else {
              g.trail = [];
            }
            break;
          }

          // Keep the outer playable band narrow: the drone can stop only a
          // few pixels outside the blue perimeter, never at the phone edge.
          const outerBounds = playerOuterBounds(bounds, g.cell);
          next.x = clamp(next.x, outerBounds.left, outerBounds.right);
          next.y = clamp(next.y, outerBounds.top, outerBounds.bottom);
          g.player = next;
          if (activeTrail) {
            g.trailScoreAccumulator += Math.hypot(g.player.x - previous.x, g.player.y - previous.y);
            const trailPoints = Math.floor(g.trailScoreAccumulator / 8);
            if (trailPoints > 0) {
              g.score += trailPoints;
              g.trailScoreAccumulator -= trailPoints * 8;
            }
          }

          if (activeTrail && pointTouchesOldTrail(g.player, g.trail, g.cell, direction)) {
            // Touching an earlier red segment closes the shape. Keep the
            // completed boundary visible while the enclosed area fills cyan.
            g.trail.push({ ...g.player });
            capture(g);
            break;
          }

          const inside = pointInsidePerimeter(g.player, bounds);
          if (!inside) continue;

          const onClaimedSurface = pointInsideClaimedSurface(
            g.player,
            g.claimedPolygons,
            g.cell * 0.18,
          );
          if (!onClaimedSurface) {
            if (g.trail.length === 0) {
              g.cutDir = direction;
              g.cutCoordinate = direction.x !== 0 ? g.player.y : g.player.x;
              g.score += 1;
              // A cut can start by leaving an already claimed region. Snap
              // its anchor to the actual boundary crossing; using the prior
              // frame's point leaves a wedge between the fill and the trail
              // after successive captures.
              const claimedExit = claimedBoundaryExitContact(
                previous,
                g.player,
                g.claimedPolygons,
                g.cell * 0.18,
              );
              const trailStart = claimedExit
                ?? (pointInsidePerimeter(previous, bounds)
                  ? previous
                  : perimeterEntryContact(previous, direction, bounds));
              g.trail.push(trailStart);
            }
            g.trail.push({ ...g.player });
            // The atlas already contains its sparks. Avoid allocating or
            // rendering dynamic cut particles in the optimized mode.
            const sparkCount = CUTTING_SPRITE_ENABLED ? 1 : 4;
            for (let spark = 0; spark < sparkCount; spark += 1) addParticle(g, g.cutDir);
          } else if (g.trail.length > 2) {
            g.trail.push({ ...g.player });
            capture(g);
            break;
          } else {
            // Captured surfaces are freely walkable by the drone.
            g.inputDir = direction;
          }
        }
      }

      moveEnemies(g, dt, now);
      if (g.status !== 'PLAYING') return;

    };

    const drawCanvas = (g: Game, now: number) => {
      const canvas = canvasRef.current;
      if (!canvas || Platform.OS !== 'web') return;
      const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const pixelWidth = Math.max(1, Math.floor(g.width * ratio));
      const pixelHeight = Math.max(1, Math.floor(g.height * ratio));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, g.width, g.height);
      context.fillStyle = '#000000';
      context.fillRect(0, 0, g.width, g.height);

       context.globalCompositeOperation = 'source-over';
       context.globalAlpha = INITIAL_MAP_OPACITY;
       context.fillStyle = ZONE_COLOR;
       context.fillRect(
         g.cell * PERIMETER_HORIZONTAL_INSET_CELLS,
         g.cell * PERIMETER_VERTICAL_INSET_CELLS,
         g.width - g.cell * PERIMETER_HORIZONTAL_INSET_CELLS * 2,
         g.height - g.cell * PERIMETER_VERTICAL_INSET_CELLS * 2,
       );
       context.globalAlpha = CAPTURED_ZONE_LAYER_OPACITY;
       context.fillStyle = ZONE_COLOR;
       context.beginPath();
       g.claimedPolygons.forEach((polygon) => {
         if (polygon.length < 3) return;
         context.moveTo(polygon[0].x, polygon[0].y);
         polygon.slice(1).forEach((point) => context.lineTo(point.x, point.y));
         context.closePath();
       });
       context.fill();
       context.globalAlpha = 1;
      context.strokeStyle = 'rgba(0,243,255,0.11)';
      context.lineWidth = 0.65;
      const bounds = perimeterBounds(g.width, g.height, g.cell);
       for (let x = 0; x <= COLS; x += 1) {
        context.beginPath();
         context.moveTo(x * g.cell, 0);
         context.lineTo(x * g.cell, g.height);
        context.stroke();
      }
       for (let y = 0; y <= g.rows; y += 1) {
        context.beginPath();
         context.moveTo(0, y * g.cell);
         context.lineTo(g.width, y * g.cell);
        context.stroke();
      }

      context.globalCompositeOperation = 'lighter';
      context.strokeStyle = '#00f3ff';
      context.shadowColor = '#00f3ff';
      context.shadowBlur = 15;
      context.lineWidth = PERIMETER_STROKE_WIDTH;
      context.strokeRect(
        bounds.left,
        bounds.top,
        bounds.right - bounds.left,
        bounds.bottom - bounds.top,
      );
      context.shadowBlur = 0;

       if (g.protectedTrails.length > 0 || g.trail.length > 1) {
        context.strokeStyle = '#ff5500';
        context.shadowColor = '#ff5500';
        context.shadowBlur = 18;
        context.lineWidth = 5;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        const drawTrail = (trail: Point[]) => {
          if (trail.length < 2) return;
          context.beginPath();
          context.moveTo(trail[0].x, trail[0].y);
          trail.slice(1).forEach((point) => context.lineTo(point.x, point.y));
          context.stroke();
        };
         g.protectedTrails.forEach(drawTrail);
        drawTrail(g.trail);
        context.lineCap = 'butt';
        context.lineJoin = 'miter';
      }

      if (g.trail.length > 0) {
        const cuttingSpriteImage = cuttingSpriteImageRef.current;
        if (CUTTING_SPRITE_ENABLED && cuttingSpriteImage) {
          drawCuttingSpriteCanvas(
            context,
            cuttingSpriteImage,
            g.player,
            g.cutDir,
            g.cell,
            Math.floor(g.frame / CUTTING_SPRITE_FRAME_DURATION) % CUTTING_SPRITE_FRAME_COUNT,
          );
        } else {
          // Reversible fallback: set CUTTING_SPRITE_ENABLED to false to use
          // the original procedural point and full SVG spark treatment.
          drawCuttingEffectCanvas(context, g.player, g.cutDir, g.cell, g.frame);
        }
      }

      context.globalCompositeOperation = 'lighter';
      g.particles.forEach((particle) => {
        context.globalAlpha = clamp(particle.life / 0.4, 0, 1);
        if (particle.streak) {
          context.strokeStyle = particle.color;
          context.lineWidth = particle.size * 1.35;
          context.lineCap = 'round';
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(
            particle.x - particle.vx * 0.018,
            particle.y - particle.vy * 0.018,
          );
          context.stroke();
        } else {
          context.fillStyle = particle.color;
          context.fillRect(particle.x, particle.y, particle.size, particle.size);
        }
      });
      context.lineCap = 'butt';
      context.globalAlpha = 1;

      context.globalCompositeOperation = 'lighter';
       g.smokePuffs.forEach((puff) => {
         const lifeRatio = clamp(puff.life / puff.maxLife, 0, 1);
         const gradient = context.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.size);
         gradient.addColorStop(0, `rgba(255,255,255,${lifeRatio * 0.2})`);
         gradient.addColorStop(0.3, `rgba(0,243,255,${lifeRatio * 0.16})`);
         gradient.addColorStop(0.72, `rgba(255,43,181,${lifeRatio * 0.08})`);
         gradient.addColorStop(1, 'rgba(0,243,255,0)');
         context.fillStyle = gradient;
         context.beginPath();
         context.arc(puff.x, puff.y, puff.size, 0, Math.PI * 2);
         context.fill();
       });

       context.globalCompositeOperation = 'lighter';
      const diamondImage = diamondImageRef.current;
      if (!g.diamond.collected && diamondImage) {
        const diamondSize = g.cell * 1.5;
         context.save();
         context.translate(g.diamond.x, g.diamond.y);
         drawEnemySpriteWithGlow(
           context,
           diamondImage,
           { width: diamondSize, height: diamondSize },
           '#ffffff',
         );
         context.restore();
      }
      g.enemies.forEach((enemy) => {
        if (enemy.respawnAt > now) return;
        const frame = enemyFrameIndex(enemy);
        const image = spriteImagesRef.current[`${enemy.kind}:${frame}`];
        if (!image) return;
        const size = enemySpriteSize(enemy.kind, g.cell);
        const motion = enemyAnimationTransform(enemy, g.cell);
        context.save();
        context.translate(enemy.x, enemy.y + motion.offsetY);
        context.rotate(motion.rotation);
        context.scale(motion.scale, motion.scale);
        drawEnemySpriteWithGlow(context, image, size, enemyGlowColor(enemy.kind));
        context.restore();
      });
      context.shadowBlur = 0;

      if (g.fillQueue.length > 0) {
        const scanIntervals = g.pendingCapturePolygons.flatMap((polygon) => (
          polygonHorizontalIntervals(polygon, g.scanY)
        ));
        context.save();
        context.globalCompositeOperation = 'source-over';
        context.strokeStyle = '#ffffff';
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.lineWidth = 2;
        scanIntervals.forEach(([startX, endX]) => {
          context.beginPath();
          context.moveTo(startX, g.scanY);
          context.lineTo(endX, g.scanY);
          context.stroke();
        });
        context.restore();
      }

       const angle = Math.atan2(g.trail.length > 0 ? g.cutDir.y : g.facingDir.y, g.trail.length > 0 ? g.cutDir.x : g.facingDir.x);
      context.save();
      context.translate(g.player.x, g.player.y);
       context.rotate((Number.isNaN(angle) ? 0 : angle) + Math.PI / 2);

       const playerImage = playerImageRef.current;
       if (playerImage) {
         drawEnemySpriteWithGlow(
           context,
           playerImage,
           playerSpriteSize(g.cell),
           '#00f3ff',
         );
       }
      context.restore();
      context.globalCompositeOperation = 'source-over';
    };

    const loop = () => {
      const now = Date.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const g = gameRef.current;
      if (!g.initialized && sizeRef.current.width > 0) resetGame(false);
      if (g.initialized) {
        update(g, dt, now);
        if (bestScoreHydratedRef.current && g.score > bestScoreRef.current) {
          bestScoreRef.current = g.score;
          void AsyncStorage.setItem(BEST_SCORE_STORAGE_KEY, String(g.score)).catch((error: unknown) => {
            if (__DEV__) console.warn('Unable to save best score', error);
          });
        }
        drawCanvas(g, now);
        if (Platform.OS !== 'web') {
          setNativeSnapshot({
            width: g.width,
            height: g.height,
            cell: g.cell,
            rows: g.rows,
            trail: g.trail,
             protectedTrails: g.protectedTrails,
            player: { ...g.player },
             direction: g.trail.length > 0 ? g.cutDir : g.facingDir,
             enemies: g.enemies.map((enemy) => ({ ...enemy })),
             diamond: { ...g.diamond },
              particles: g.particles.slice(-200),
             // Keep native SVG state immutable between frames. The game loop
             // mutates live puff objects in place, which can otherwise leave
             // Expo Go rendering the previous coordinates on Android.
             smokePuffs: g.smokePuffs.map((puff) => ({ ...puff })),
             claimedPolygons: g.claimedPolygons,
             pendingCapturePolygons: g.pendingCapturePolygons,
            scanY: g.scanY,
          });
        }
        if (g.frame % 6 === 0) {
          setHud({
            score: g.score,
            bestScore: bestScoreRef.current,
            shields: Math.max(0, g.shields),
            capture: Math.min(
              LEVEL_CAPTURE_TARGET,
              Math.floor(clamp(g.capturedArea / g.totalPlayableArea, 0, 1) * 100),
            ),
            level: g.level,
            mode: g.mode,
             feedback: g.status === 'RESPAWN' ? 'DRONE EN EXPANSION' : '',
          });
        }
      }
      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrame);
  }, [resetGame, playPickupChime]);

  const renderNativeArena = () => {
    if (Platform.OS === 'web' || !nativeSnapshot) return null;
    const snapshot = nativeSnapshot;
    return (
      <Svg style={StyleSheet.absoluteFill}>
        <NativeArenaStatic
          width={snapshot.width}
          height={snapshot.height}
          cell={snapshot.cell}
          rows={snapshot.rows}
          claimedPolygons={snapshot.claimedPolygons}
          protectedTrails={snapshot.protectedTrails}
          claimedCount={snapshot.claimedPolygons.length}
          protectedTrailCount={snapshot.protectedTrails.length}
        />
        {snapshot.trail.length > 1 && (
          <Polyline
            points={pointsToString(snapshot.trail)}
            fill="none"
            stroke="#ff5500"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        <NativeArenaDynamic snapshot={snapshot} />
      </Svg>
    );
  };

  const zoneProgress = clamp(hud.capture / LEVEL_CAPTURE_TARGET, 0, 1);
  const shieldSegments = Array.from({ length: 3 });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.cockpitHeader} pointerEvents="none">
        <RNImage
          source={cockpitInteriorSource}
          style={styles.cockpitInterior}
          resizeMode="cover"
          accessibilityLabel="Intérieur du cockpit Prism Warbird vu depuis le siège du pilote"
        />
        <View style={styles.cockpitShade} />
      </View>

      <View style={styles.arena} onLayout={handleArenaLayout} testID="game-arena">
        {Platform.OS === 'web'
          ? React.createElement('canvas' as any, {
              ref: canvasRef,
              style: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
            })
          : renderNativeArena()}
      </View>

      <View style={[styles.hud, { paddingTop: Math.max(insets.top, 12) }]} pointerEvents="none">
        <View style={styles.hudSignalRail}>
          <View style={[styles.signalDot, { backgroundColor: HUD_COLORS.cyan }]} />
          <View style={[styles.signalDot, { backgroundColor: HUD_COLORS.lime }]} />
          <View style={[styles.signalDot, { backgroundColor: HUD_COLORS.amber }]} />
          <View style={[styles.signalDot, { backgroundColor: HUD_COLORS.magenta }]} />
          <Text style={styles.signalLabel}>REACTOR / FLIGHT SYSTEMS</Text>
          <Text style={styles.signalLabel}>SECTEUR {hud.level.toString().padStart(2, '0')}</Text>
        </View>

        <View style={styles.hudDeck}>
          <View style={[styles.hudCard, styles.sectorCard]}>
            <Text style={[styles.cardLabel, { color: HUD_COLORS.cyan }]}>SECTEUR</Text>
            <Text style={[styles.sectorValue, { color: HUD_COLORS.cyan }]}>
              {hud.level.toString().padStart(2, '0')}
            </Text>
            <Text style={[styles.cardMeta, { color: HUD_COLORS.cyan }]}>VECTOR / LOCK</Text>
          </View>

          <View style={[styles.hudCard, styles.scoreCard]}>
            <Text style={[styles.cardLabel, { color: HUD_COLORS.warmWhite }]}>SCORE</Text>
            <Text style={[styles.scoreValue, { color: HUD_COLORS.warmWhite }]}>
              {hud.score.toString().padStart(6, '0')}
            </Text>
            <Text style={[styles.cardMeta, { color: HUD_COLORS.amber }]}>
              MEILLEUR SCORE : {hud.bestScore.toString().padStart(6, '0')}
            </Text>
          </View>

          <View style={[styles.hudCard, styles.shieldCard]}>
            <Text style={[styles.cardLabel, { color: HUD_COLORS.lime }]}>BOUCLIERS</Text>
            <Text style={[styles.shieldValue, { color: HUD_COLORS.lime }]}>{hud.shields}</Text>
            <View style={styles.shieldSegments} accessibilityLabel={`${hud.shields} boucliers actifs`}>
              {shieldSegments.map((_, index) => (
                <View
                  key={`shield-${index}`}
                  style={[
                    styles.shieldSegment,
                    index < hud.shields
                      ? { backgroundColor: [HUD_COLORS.cyan, HUD_COLORS.lime, HUD_COLORS.amber][index] }
                      : styles.shieldSegmentInactive,
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.cardMeta, { color: HUD_COLORS.lime }]}>ARMOR LOCK</Text>
          </View>
        </View>

        <View style={styles.zoneModule}>
          <View style={[styles.hudCard, styles.zoneCard]}>
            <Text style={[styles.cardLabel, { color: HUD_COLORS.amber }]}>ZONE SÉCURISÉE</Text>
            <View style={styles.zoneValueRow}>
              <Text style={[styles.zoneValue, { color: HUD_COLORS.amber }]}>{hud.capture}</Text>
              <Text style={[styles.zoneTarget, { color: HUD_COLORS.warmWhite }]}>/ {LEVEL_CAPTURE_TARGET}</Text>
            </View>
            <View style={styles.zoneProgressRail}>
              <View style={[styles.zoneProgressFill, { width: `${zoneProgress * 100}%` }]} />
              <View style={styles.zoneProgressTicks}>
                {[0, 1, 2, 3, 4].map((tick) => <View key={`zone-tick-${tick}`} style={styles.zoneProgressTick} />)}
              </View>
            </View>
          </View>
        </View>

        {hud.feedback !== '' && <Text style={[styles.feedback, { color: '#ff8a00' }]}>{hud.feedback}</Text>}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  arena: {
    position: 'absolute',
    top: 174,
    left: 0,
    right: 0,
    bottom: 4,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  cockpitHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    zIndex: 1,
    overflow: 'hidden',
    backgroundColor: '#050509',
  },
  cockpitInterior: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  cockpitShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
  },
  hud: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    zIndex: 2,
  },
  hudSignalRail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 7,
    paddingHorizontal: 6,
  },
  signalDot: {
    width: 5,
    height: 5,
    borderRadius: 1,
    shadowColor: '#ffffff',
    shadowRadius: 5,
    shadowOpacity: 0.8,
  },
  signalLabel: {
    color: '#7e879b',
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 1,
    marginLeft: 3,
  },
  hudDeck: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 6,
    minHeight: 86,
  },
  hudCard: {
    borderWidth: 1,
    borderRadius: 3,
    backgroundColor: HUD_COLORS.panel,
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: '#000000',
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sectorCard: {
    width: '24%',
    minHeight: 60,
    borderColor: HUD_COLORS.cyan,
    transform: [{ translateY: 2 }, { rotate: '-1deg' }],
  },
  scoreCard: {
    width: '48%',
    minHeight: 92,
    marginHorizontal: -5,
    zIndex: 2,
    borderColor: HUD_COLORS.amber,
    backgroundColor: 'rgba(10, 12, 20, 0.96)',
    transform: [{ translateY: 8 }],
  },
  shieldCard: {
    width: '27%',
    minHeight: 70,
    borderColor: HUD_COLORS.lime,
    transform: [{ translateY: 1 }, { rotate: '1deg' }],
  },
  cardLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 1.6,
  },
  cardMeta: {
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 0.8,
    marginTop: 3,
  },
  sectorValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 29,
    letterSpacing: 1,
    lineHeight: 32,
  },
  scoreValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 31,
    letterSpacing: 2,
    lineHeight: 35,
    textShadowColor: HUD_COLORS.amber,
    textShadowRadius: 9,
    textShadowOffset: { width: 0, height: 0 },
  },
  shieldValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    lineHeight: 27,
  },
  shieldSegments: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 1,
    minHeight: 5,
  },
  shieldSegment: {
    width: 16,
    height: 5,
    borderRadius: 1,
    shadowColor: '#ffffff',
    shadowOpacity: 0.85,
    shadowRadius: 4,
  },
  shieldSegmentInactive: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
  },
  zoneModule: {
    alignItems: 'center',
    marginTop: -1,
    zIndex: 3,
  },
  zoneCard: {
    width: '56%',
    minHeight: 65,
    borderColor: HUD_COLORS.amber,
    backgroundColor: HUD_COLORS.panelMuted,
    transform: [{ translateY: -3 }],
  },
  zoneValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  zoneValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    lineHeight: 31,
    letterSpacing: 1,
  },
  zoneTarget: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: 1,
    marginLeft: 4,
  },
  zoneProgressRail: {
    width: '100%',
    height: 7,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#667085',
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  zoneProgressFill: {
    height: '100%',
    backgroundColor: HUD_COLORS.cyan,
    shadowColor: HUD_COLORS.cyan,
    shadowOpacity: 1,
    shadowRadius: 7,
  },
  zoneProgressTicks: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  zoneProgressTick: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
  feedback: {
    alignSelf: 'center',
    marginTop: 6,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.8,
  },
});