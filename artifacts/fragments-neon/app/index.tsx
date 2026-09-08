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
import Svg, { Circle, G, Image as SvgImage, Line, Polygon, Polyline, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

const COLS = 12;
const PERIMETER_INSET_CELLS = 2;
const SAFE_BAND_CELLS = Math.round(PERIMETER_INSET_CELLS);
const PERIMETER_STROKE_WIDTH = 3;
const PLAYER_RADIUS_CELLS = 0.82;
const EMPTY = 0;
const CLAIMED = 1;
const TRAIL = 2;
const ZERO = { x: 0 as const, y: 0 as const };

type Direction = { x: -1 | 0 | 1; y: -1 | 0 | 1 };
type Point = { x: number; y: number };
type Cell = { x: number; y: number };
type Mode = 'SLOW';
type Particle = Point & { vx: number; vy: number; life: number; size: number; color: string };
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
};

type Game = {
  width: number;
  height: number;
  cell: number;
  rows: number;
  grid: number[][];
  player: Point;
  inputDir: Direction;
  facingDir: Direction;
  hasMoveCommand: boolean;
  cutDir: Direction;
  cutCoordinate: number;
  trail: Point[];
  enemies: Enemy[];
  particles: Particle[];
  fillQueue: Cell[];
  fillCursor: number;
  scanY: number;
  mode: Mode;
  score: number;
  shields: number;
  captured: number;
  totalEmpty: number;
  level: number;
  frame: number;
  initialized: boolean;
  status: 'PLAYING' | 'RESPAWN';
  respawnAt: number;
};

type Hud = {
  score: number;
  shields: number;
  capture: number;
  mode: Mode;
  feedback: string;
};

type Snapshot = {
  width: number;
  height: number;
  cell: number;
  rows: number;
  claimed: { x: number; y: number; w: number }[];
  trail: Point[];
  player: Point;
  direction: Direction;
  enemies: Enemy[];
  particles: Particle[];
  scanY: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const cardinalDirection = (dx: number, dy: number): Direction => {
  if (Math.abs(dx) >= Math.abs(dy)) return { x: dx >= 0 ? 1 : -1, y: 0 };
  return { x: 0, y: dy >= 0 ? 1 : -1 };
};

const makeClaimedRuns = (grid: number[][]) => {
  const runs: { x: number; y: number; w: number }[] = [];
  grid.forEach((row, y) => {
    let start = -1;
    row.forEach((value, x) => {
      if (value === CLAIMED && start < 0) start = x;
      if (value !== CLAIMED && start >= 0) {
        runs.push({ x: start, y, w: x - start });
        start = -1;
      }
    });
    if (start >= 0) runs.push({ x: start, y, w: row.length - start });
  });
  return runs;
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
  left: cell * PERIMETER_INSET_CELLS,
  top: cell * PERIMETER_INSET_CELLS,
  right: width - cell * PERIMETER_INSET_CELLS,
  bottom: height - cell * PERIMETER_INSET_CELLS,
});

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

const enemySpriteSize = (kind: EnemyKind, cell: number) => {
  if (kind === 'DRAGON') return { width: cell * 4.7, height: cell * 4.7 };
  if (kind === 'SEVEN') return { width: cell * 4.9, height: cell * 4.9 };
  if (kind === 'SPIDER') return { width: cell * 4.9, height: cell * 4.9 };
  return { width: cell * 3.5, height: cell * 3.5 };
};

const enemyRadius = (enemy: Enemy, cell: number) => {
  if (enemy.kind === 'DRAGON') return cell * 1.35;
  if (enemy.kind === 'SPIDER') return cell * 1.15;
  if (enemy.kind === 'SEVEN') return cell * 1.5;
  return cell * 1.25;
};

const enemyVisualRadius = (enemy: Enemy, cell: number) => {
  const sprite = enemySpriteSize(enemy.kind, cell);
  return Math.max(enemyRadius(enemy, cell), Math.hypot(sprite.width, sprite.height) * 0.5) + PERIMETER_STROKE_WIDTH * 0.5;
};

const enemyBoundaryMargins = (enemy: Enemy, cell: number) => {
  const sprite = enemySpriteSize(enemy.kind, cell);
  const motion = enemyAnimationTransform(enemy, cell);
  const rotation = motion.rotation;
  const halfWidth = sprite.width * 0.5;
  const halfHeight = sprite.height * 0.5;
  const rotatedHalfWidth = (
    Math.abs(Math.cos(rotation)) * halfWidth
    + Math.abs(Math.sin(rotation)) * halfHeight
  ) * motion.scale + PERIMETER_STROKE_WIDTH * 0.5;
  const rotatedHalfHeight = (
    Math.abs(Math.sin(rotation)) * halfWidth
    + Math.abs(Math.cos(rotation)) * halfHeight
  ) * motion.scale + PERIMETER_STROKE_WIDTH * 0.5;

  return {
    x: rotatedHalfWidth,
    y: rotatedHalfHeight,
    offsetY: motion.offsetY,
  };
};

const createEnemies = (width: number, height: number, cell: number, level: number): Enemy[] => {
  const safeX = (ratio: number) => clamp(width * ratio, cell * 4, width - cell * 4);
  const safeY = (ratio: number) => clamp(height * ratio, cell * 4, height - cell * 4);
  const levelSpeed = 1 + Math.min(level - 1, 4) * 0.045;
  const enemies: Enemy[] = [
    { kind: 'SHIP', behavior: 'PRESET', pattern: 'SWEEP', x: safeX(0.28), y: safeY(0.28), vx: 62 * levelSpeed, vy: 42 * levelSpeed, speed: 72 * levelSpeed, agility: 0.92, phase: 0.4, spin: 0.2, routePhase: 0.3, thinkTimer: 0, targetX: 0, targetY: 0, blockedTime: 0, respawnAt: 0, edgeTurnTimer: 0, edgeDirectionX: 0, edgeDirectionY: 0 },
    { kind: 'DRAGON', behavior: 'PLANNED', pattern: 'SWEEP', x: safeX(0.73), y: safeY(0.31), vx: -29 * levelSpeed, vy: 34 * levelSpeed, speed: 42 * levelSpeed, agility: 0.55, phase: 2.1, spin: -0.15, routePhase: 1.4, thinkTimer: 0, targetX: 0, targetY: 0, blockedTime: 0, respawnAt: 0, edgeTurnTimer: 0, edgeDirectionX: 0, edgeDirectionY: 0 },
    { kind: 'SEVEN', behavior: 'PRESET', pattern: 'ZIGZAG', x: safeX(0.30), y: safeY(0.64), vx: 48 * levelSpeed, vy: -38 * levelSpeed, speed: 64 * levelSpeed, agility: 0.78, phase: 4.3, spin: 0.35, routePhase: 2.6, thinkTimer: 0, targetX: 0, targetY: 0, blockedTime: 0, respawnAt: 0, edgeTurnTimer: 0, edgeDirectionX: 0, edgeDirectionY: 0 },
    { kind: 'SPIDER', behavior: 'PLANNED', pattern: 'ZIGZAG', x: safeX(0.72), y: safeY(0.68), vx: -25 * levelSpeed, vy: -19 * levelSpeed, speed: 36 * levelSpeed, agility: 0.82, phase: 5.7, spin: -0.28, routePhase: 4.2, thinkTimer: 0, targetX: 0, targetY: 0, blockedTime: 0, respawnAt: 0, edgeTurnTimer: 0, edgeDirectionX: 0, edgeDirectionY: 0 },
  ];
  return enemies.slice(0, clamp(Math.floor(level), 1, enemies.length));
};

export default function GameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const canvasRef = useRef<any>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const gameRef = useRef<Game>({
    width: 0,
    height: 0,
    cell: 0,
    rows: 0,
    grid: [],
    player: { x: 0, y: 0 },
    inputDir: ZERO,
    facingDir: { x: 0, y: 1 },
    hasMoveCommand: false,
    cutDir: ZERO,
    cutCoordinate: 0,
    trail: [],
    enemies: [],
    particles: [],
    fillQueue: [],
    fillCursor: 0,
    scanY: 0,
    mode: 'SLOW',
    score: 0,
    shields: 3,
    captured: 0,
    totalEmpty: 1,
    level: 1,
    frame: 0,
    initialized: false,
    status: 'PLAYING',
    respawnAt: 0,
  });

  const [hud, setHud] = useState<Hud>({
    score: 0,
    shields: 3,
    capture: 0,
    mode: 'SLOW',
    feedback: '',
  });
  const [nativeSnapshot, setNativeSnapshot] = useState<Snapshot | null>(null);
  const spriteImagesRef = useRef<Record<string, any>>({});

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

    return () => {
      cancelled = true;
      spriteImagesRef.current = {};
    };
  }, []);

  const resetGame = useCallback((preserveStats = false) => {
    const g = gameRef.current;
    const { width, height } = sizeRef.current;
    if (width <= 0 || height <= 0) return;

    const previousScore = preserveStats ? g.score : 0;
    const previousShields = preserveStats ? g.shields : 3;
    const previousLevel = preserveStats ? g.level : 1;
    const cell = width / COLS;
    const bounds = perimeterBounds(width, height, cell);
    const rows = Math.max(18, Math.floor(height / cell));
    const grid: number[][] = [];
    let totalEmpty = 0;

    for (let y = 0; y < rows; y += 1) {
      const row: number[] = [];
      for (let x = 0; x < COLS; x += 1) {
        const safe = x < SAFE_BAND_CELLS || x >= COLS - SAFE_BAND_CELLS || y < SAFE_BAND_CELLS || y >= rows - SAFE_BAND_CELLS;
        row.push(safe ? CLAIMED : EMPTY);
        if (!safe) totalEmpty += 1;
      }
      grid.push(row);
    }

    gameRef.current = {
      ...g,
      width,
      height,
      cell,
      rows,
      grid,
      player: { x: (SAFE_BAND_CELLS + 1) * cell, y: bounds.bottom + cell * PLAYER_RADIUS_CELLS },
      inputDir: ZERO,
      facingDir: { x: 0, y: -1 },
      hasMoveCommand: false,
      cutDir: ZERO,
      cutCoordinate: 0,
      trail: [],
      enemies: createEnemies(width, height, cell, previousLevel),
      particles: [],
      fillQueue: [],
      fillCursor: 0,
      scanY: 0,
      mode: 'SLOW',
      score: previousScore,
      shields: previousShields,
      captured: 0,
      totalEmpty,
      level: previousLevel,
      frame: 0,
      initialized: true,
      status: 'PLAYING',
      respawnAt: 0,
    };
    setHud({
      score: previousScore,
      shields: previousShields,
      capture: 0,
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
      if (g.particles.length > 460) return;
      const backwards = Math.atan2(-direction.y, -direction.x);
      const angle = backwards + (Math.random() - 0.5) * (Math.PI / 4);
      const speed = 80 + Math.random() * 210;
      const colorsForSpark = ['#ffffff', '#fff35c', '#ff8a00', '#ff5500'];
      g.particles.push({
        x: g.player.x - direction.x * g.cell * 0.8,
        y: g.player.y - direction.y * g.cell * 0.8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4,
        size: 1.2 + Math.random() * 2.5,
        color: colorsForSpark[Math.floor(Math.random() * colorsForSpark.length)],
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
      g.trail.forEach((point) => {
        const x = Math.floor(point.x / g.cell);
        const y = Math.floor(point.y / g.cell);
        if (g.grid[y]?.[x] === TRAIL) g.grid[y][x] = EMPTY;
      });
      g.trail = [];
      g.inputDir = ZERO;
      g.cutDir = ZERO;
      g.shields -= 1;
      g.status = 'RESPAWN';
      g.respawnAt = now + (g.shields > 0 ? 520 : 1050);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    };

    const cancelCut = (g: Game) => {
      g.trail.forEach((point) => {
        const x = Math.floor(point.x / g.cell);
        const y = Math.floor(point.y / g.cell);
        if (g.grid[y]?.[x] === TRAIL) g.grid[y][x] = EMPTY;
      });
      g.trail = [];
      g.cutDir = ZERO;
      g.cutCoordinate = 0;
    };

    const capture = (g: Game) => {
      const qx = clamp(Math.floor((g.width * 0.52) / g.cell), 0, COLS - 1);
      const qy = clamp(Math.floor((g.height * 0.46) / g.cell), 0, g.rows - 1);
      const visited = Array.from({ length: g.rows }, () => Array(COLS).fill(false));
      const queue: Cell[] = [];
      if (g.grid[qy]?.[qx] === EMPTY) {
        visited[qy][qx] = true;
        queue.push({ x: qx, y: qy });
      }
      const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      while (queue.length > 0) {
        const current = queue.shift()!;
        directions.forEach(([dx, dy]) => {
          const x = current.x + dx;
          const y = current.y + dy;
          if (x >= 0 && x < COLS && y >= 0 && y < g.rows && !visited[y][x] && g.grid[y][x] === EMPTY) {
            visited[y][x] = true;
            queue.push({ x, y });
          }
        });
      }

      g.fillQueue = [];
      for (let y = 0; y < g.rows; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
          if (g.grid[y][x] === EMPTY && !visited[y][x]) g.fillQueue.push({ x, y });
        }
      }
      g.trail.forEach((point) => g.fillQueue.push({ x: Math.floor(point.x / g.cell), y: Math.floor(point.y / g.cell) }));
      g.trail = [];
      g.fillCursor = 0;
      g.scanY = 0;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    };

    const spawnPointAfterBurst = (g: Game, enemy: Enemy) => {
      const bounds = perimeterBounds(g.width, g.height, g.cell);
      const visualRadius = enemyVisualRadius(enemy, g.cell);
      const candidates = [
        { x: g.width * 0.5, y: g.height * 0.34 },
        { x: g.width * 0.32, y: g.height * 0.5 },
        { x: g.width * 0.68, y: g.height * 0.5 },
        { x: g.width * 0.5, y: g.height * 0.66 },
      ];
      const candidate = candidates.find((point) => {
        const x = clamp(point.x, bounds.left + visualRadius, bounds.right - visualRadius);
        const y = clamp(point.y, bounds.top + visualRadius, bounds.bottom - visualRadius);
        const cx = clamp(Math.floor(x / g.cell), 0, COLS - 1);
        const cy = clamp(Math.floor(y / g.cell), 0, g.rows - 1);
        return g.grid[cy]?.[cx] !== CLAIMED;
      }) ?? candidates[0];
      enemy.x = clamp(candidate.x, bounds.left + visualRadius, bounds.right - visualRadius);
      enemy.y = clamp(candidate.y, bounds.top + visualRadius, bounds.bottom - visualRadius);
    };

    const burstEnemy = (g: Game, enemy: Enemy, now: number) => {
      const colors = ['#ffffff', '#00f3ff', '#ff5500', '#ff2bb5', '#b8ff4a'];
      for (let i = 0; i < 1000; i += 1) {
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
      enemy.blockedTime = 0;
      enemy.respawnAt = now + 900;
      enemy.vx = 0;
      enemy.vy = 0;
      spawnPointAfterBurst(g, enemy);
    };

    const moveEnemies = (g: Game, dt: number, now: number) => {
      const bounds = perimeterBounds(g.width, g.height, g.cell);
      g.enemies.forEach((enemy) => {
        if (enemy.respawnAt > now) return;
        if (enemy.respawnAt > 0) {
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
        }

        enemy.phase += dt * (enemy.kind === 'DRAGON' ? 2.3 : enemy.kind === 'SPIDER' ? 3.1 : 1.7);
        enemy.spin += dt * (enemy.kind === 'DRAGON' ? -1.15 : enemy.kind === 'SEVEN' ? 0.42 : enemy.kind === 'SHIP' ? 0.18 : -0.08);
        enemy.routePhase += dt * (enemy.pattern === 'ZIGZAG' ? 2.1 : 0.85);
        enemy.edgeTurnTimer = Math.max(0, enemy.edgeTurnTimer - dt);

        const visualRadius = enemyVisualRadius(enemy, g.cell) * (1 + Math.abs(Math.sin(enemy.phase * 1.25)) * 0.035);
        const boundaryMargins = enemyBoundaryMargins(enemy, g.cell);
        const minX = bounds.left + boundaryMargins.x;
        const maxX = bounds.right - boundaryMargins.x;
        const minY = bounds.top + boundaryMargins.y - boundaryMargins.offsetY;
        const maxY = bounds.bottom - boundaryMargins.y - boundaryMargins.offsetY;
        const cellAt = (x: number, y: number) => {
          const cx = clamp(Math.floor(x / g.cell), 0, COLS - 1);
          const cy = clamp(Math.floor(y / g.cell), 0, g.rows - 1);
          return g.grid[cy]?.[cx] ?? CLAIMED;
        };
        const bodyRadius = Math.max(enemyRadius(enemy, g.cell) * 0.9, g.cell * 0.72);
        const enemyFitsAt = (x: number, y: number) => {
          if (x < minX || x > maxX || y < minY || y > maxY) return false;
          const footprint = bodyRadius * 0.88;
          const samples = [
            [0, 0],
            [footprint, 0],
            [-footprint, 0],
            [0, footprint],
            [0, -footprint],
            [footprint * 0.7, footprint * 0.7],
            [-footprint * 0.7, footprint * 0.7],
            [footprint * 0.7, -footprint * 0.7],
            [-footprint * 0.7, -footprint * 0.7],
          ];
          return samples.every(([offsetX, offsetY]) => cellAt(x + offsetX, y + offsetY) !== CLAIMED);
        };

        const distanceToPlayer = Math.hypot(enemy.x - g.player.x, enemy.y - g.player.y);
        const maxDistance = Math.hypot(g.width, g.height) * 0.56;
        const farSlowdown = clamp(1 - distanceToPlayer / maxDistance, 0.42, 1);
        const currentLength = Math.hypot(enemy.vx, enemy.vy) || enemy.speed;
        let desiredSpeed = enemy.speed;
        let desiredVelocity: Point;

        if (enemy.behavior === 'PLANNED') {
          enemy.thinkTimer -= dt;
          if (enemy.thinkTimer <= 0) {
            const playerAngle = Math.atan2(g.player.y - enemy.y, g.player.x - enemy.x);
            const orbitDirection = enemy.kind === 'DRAGON' ? 1 : -1;
            const idealDistance = Math.min(g.width, g.height) * (enemy.kind === 'DRAGON' ? 0.25 : 0.18);
            let bestScore = Number.POSITIVE_INFINITY;
            let bestTarget = { x: g.player.x, y: g.player.y };

            for (let candidateIndex = 0; candidateIndex < 8; candidateIndex += 1) {
              const candidateAngle = playerAngle + orbitDirection * (0.55 + candidateIndex * 0.62) + Math.sin(enemy.routePhase) * 0.12;
              const candidateRadius = idealDistance * (0.82 + (candidateIndex % 3) * 0.13);
              const candidate = {
                x: clamp(g.player.x + Math.cos(candidateAngle) * candidateRadius, minX, maxX),
                y: clamp(g.player.y + Math.sin(candidateAngle) * candidateRadius, minY, maxY),
              };
              const candidateCell = cellAt(candidate.x, candidate.y);
              const playerDistance = Math.hypot(candidate.x - g.player.x, candidate.y - g.player.y);
              const headingDistance = Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y);
              const blockedPenalty = candidateCell === CLAIMED ? 10000 : 0;
              const score = blockedPenalty + Math.abs(playerDistance - idealDistance) * 2 + headingDistance * 0.08;
              if (score < bestScore) {
                bestScore = score;
                bestTarget = candidate;
              }
            }

            enemy.targetX = bestTarget.x;
            enemy.targetY = bestTarget.y;
            enemy.thinkTimer = enemy.kind === 'DRAGON' ? 0.72 : 0.56;
          }

          const targetVector = {
            x: enemy.targetX - enemy.x,
            y: enemy.targetY - enemy.y,
          };
          const targetLength = Math.hypot(targetVector.x, targetVector.y) || 1;
          const planningBias = enemy.kind === 'DRAGON' ? 0.68 : 0.76;
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
        const steering = clamp(enemy.agility * dt * (enemy.behavior === 'PLANNED' ? 3.4 : 2.2), 0, 1);
        enemy.vx += ((desiredVelocity.x / desiredLength) * desiredSpeed - enemy.vx) * steering;
        enemy.vy += ((desiredVelocity.y / desiredLength) * desiredSpeed - enemy.vy) * steering;

        const nextX = enemy.x + enemy.vx * dt;
        const nextY = enemy.y + enemy.vy * dt;
        const hitsBoundaryX = nextX < minX || nextX > maxX;
        const hitsBoundaryY = nextY < minY || nextY > maxY;
        const turnAwayFromBlueEdge = (hitX: boolean, hitY: boolean) => {
          if (!hitX && !hitY) return;
          const centerDirectionX = Math.sign(g.width * 0.5 - enemy.x) || (Math.sin(enemy.routePhase) >= 0 ? 1 : -1);
          const centerDirectionY = Math.sign(g.height * 0.5 - enemy.y) || (Math.cos(enemy.routePhase) >= 0 ? 1 : -1);
          enemy.edgeDirectionX = hitX
            ? (nextX < minX ? 1 : -1)
            : centerDirectionX * 0.72;
          enemy.edgeDirectionY = hitY
            ? (nextY < minY ? 1 : -1)
            : centerDirectionY * 0.72;
          const edgeDirectionLength = Math.hypot(enemy.edgeDirectionX, enemy.edgeDirectionY) || 1;
          enemy.edgeDirectionX /= edgeDirectionLength;
          enemy.edgeDirectionY /= edgeDirectionLength;
          enemy.edgeTurnTimer = 1.15;
          enemy.routePhase += Math.PI * 0.65;
          enemy.vx = enemy.edgeDirectionX * enemy.speed * 0.78;
          enemy.vy = enemy.edgeDirectionY * enemy.speed * 0.78;
        };
        const canMoveFull = enemyFitsAt(nextX, nextY);
        const canMoveX = enemyFitsAt(nextX, enemy.y);
        const canMoveY = enemyFitsAt(enemy.x, nextY);
        if (canMoveFull) {
          enemy.x = nextX;
          enemy.y = nextY;
        } else if (canMoveX) {
          enemy.x = nextX;
          if (hitsBoundaryY) turnAwayFromBlueEdge(false, true);
          else enemy.vy *= -1;
        } else if (canMoveY) {
          enemy.y = nextY;
          if (hitsBoundaryX) turnAwayFromBlueEdge(true, false);
          else enemy.vx *= -1;
        } else {
          if (hitsBoundaryX || hitsBoundaryY) {
            enemy.x = clamp(enemy.x, minX, maxX);
            enemy.y = clamp(enemy.y, minY, maxY);
            turnAwayFromBlueEdge(hitsBoundaryX, hitsBoundaryY);
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
              .filter((candidate) => enemyFitsAt(candidate.x, candidate.y))
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

        const probe = Math.max(g.cell * 0.6, visualRadius * 0.44);
        const centerIsSafe = cellAt(enemy.x, enemy.y) === CLAIMED;
        const enclosed = centerIsSafe && (
          cellAt(enemy.x - probe, enemy.y) === CLAIMED
          && cellAt(enemy.x + probe, enemy.y) === CLAIMED
          && cellAt(enemy.x, enemy.y - probe) === CLAIMED
          && cellAt(enemy.x, enemy.y + probe) === CLAIMED
        );
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
        for (let i = 1; i < g.trail.length; i += 1) {
          if (distanceToSegment(enemy, g.trail[i - 1], g.trail[i]) < enemyRadius(enemy, g.cell) + g.cell * 0.12) {
            explode(g, now);
            break;
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
      g.particles = g.particles
        .map((particle) => ({
          ...particle,
          x: particle.x + particle.vx * dt,
          y: particle.y + particle.vy * dt,
          vx: particle.vx * 0.95,
          vy: particle.vy * 0.95,
          life: particle.life - dt,
        }))
        .filter((particle) => particle.life > 0);

      if (g.status === 'RESPAWN') {
        if (now >= g.respawnAt) {
          if (g.shields <= 0) resetGame(false);
          else resetGame(true);
        }
        return;
      }

      if (g.fillQueue.length > 0) {
        const cellsPerFrame = Math.max(5, Math.min(22, Math.ceil(g.fillQueue.length / 26)));
        for (let i = 0; i < cellsPerFrame && g.fillCursor < g.fillQueue.length; i += 1) {
          const cell = g.fillQueue[g.fillCursor];
          if (g.grid[cell.y]?.[cell.x] !== CLAIMED) {
            g.grid[cell.y][cell.x] = CLAIMED;
            g.captured += 1;
          }
          g.fillCursor += 1;
        }
        g.scanY = (g.fillCursor / Math.max(1, g.fillQueue.length)) * g.height;
        if (g.fillCursor >= g.fillQueue.length) {
          g.fillQueue = [];
          g.fillCursor = 0;
          g.scanY = 0;
          g.score += Math.max(100, Math.floor(g.captured / 6));
        }
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

          // Physical screen edges are hard stops. Never wrap the drone from
          // one side of the screen to the other.
          const screenRadius = playerBodyRadius(g.cell);
          next.x = clamp(next.x, screenRadius, g.width - screenRadius);
          next.y = clamp(next.y, screenRadius, g.height - screenRadius);
          g.player = next;

          if (activeTrail && pointTouchesOldTrail(g.player, g.trail, g.cell, direction)) {
            // Touching the temporary red trail cancels this cut, but does not
            // destroy the drone or consume a shield.
            g.player = previous;
            cancelCut(g);
            break;
          }

          const inside = pointInsidePerimeter(g.player, bounds);
          if (!inside) continue;

          const x = clamp(Math.floor(g.player.x / g.cell), 0, COLS - 1);
          const y = clamp(Math.floor(g.player.y / g.cell), 0, g.rows - 1);
          const state = g.grid[y][x];

          if (state === EMPTY) {
            if (g.trail.length === 0) {
              g.cutDir = direction;
              g.cutCoordinate = direction.x !== 0 ? g.player.y : g.player.x;
              // A cut can start by leaving an already claimed zone. In that
              // case the trail begins at the actual transition point, not at
              // the outer perimeter. Only an outside-to-arena entry uses the
              // perimeter anchor.
              const trailStart = pointInsidePerimeter(previous, bounds)
                ? previous
                : perimeterEntryContact(previous, direction, bounds);
              g.trail.push(trailStart);
            }
            g.grid[y][x] = TRAIL;
            g.trail.push({ ...g.player });
            for (let spark = 0; spark < 18; spark += 1) addParticle(g, g.cutDir);
          } else if (state === TRAIL) {
            g.trail.push({ ...g.player });
          } else if (state === CLAIMED && g.trail.length === 0) {
            // Claimed cells are safe, walkable ground for the drone. They
            // only block enemies; never stop the player's exit toward empty
            // space or traversal along the captured area.
            g.inputDir = direction;
          } else if (state === CLAIMED && g.trail.length > 2) {
            const safeContact = {
              x: direction.x > 0 ? x * g.cell : direction.x < 0 ? (x + 1) * g.cell : g.player.x,
              y: direction.y > 0 ? y * g.cell : direction.y < 0 ? (y + 1) * g.cell : g.player.y,
            };
            g.player = safeContact;
            g.trail.push(safeContact);
            capture(g);
            break;
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
      context.strokeStyle = 'rgba(0,243,255,0.11)';
      context.lineWidth = 0.65;
      const bounds = perimeterBounds(g.width, g.height, g.cell);
      context.save();
      context.beginPath();
      context.rect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
      context.clip();
      for (let x = SAFE_BAND_CELLS; x <= COLS - SAFE_BAND_CELLS; x += 1) {
        context.beginPath();
        context.moveTo(x * g.cell, bounds.top);
        context.lineTo(x * g.cell, bounds.bottom);
        context.stroke();
      }
      for (let y = SAFE_BAND_CELLS; y <= g.rows - SAFE_BAND_CELLS; y += 1) {
        context.beginPath();
        context.moveTo(bounds.left, y * g.cell);
        context.lineTo(bounds.right, y * g.cell);
        context.stroke();
      }
      context.restore();

      context.fillStyle = 'rgba(0,243,255,0.10)';
      for (let y = 0; y < g.rows; y += 1) {
        for (let x = 0; x < COLS; x += 1) {
          if (g.grid[y][x] === CLAIMED) context.fillRect(x * g.cell, y * g.cell, g.cell + 0.5, g.cell + 0.5);
        }
      }

      context.globalCompositeOperation = 'lighter';
      context.strokeStyle = '#00f3ff';
      context.shadowColor = '#00f3ff';
      context.shadowBlur = 15;
      context.lineWidth = PERIMETER_STROKE_WIDTH;
      context.strokeRect(g.cell * PERIMETER_INSET_CELLS, g.cell * PERIMETER_INSET_CELLS, g.width - g.cell * PERIMETER_INSET_CELLS * 2, g.height - g.cell * PERIMETER_INSET_CELLS * 2);
      context.shadowBlur = 0;

      if (g.trail.length > 1) {
        context.strokeStyle = '#ff5500';
        context.shadowColor = '#ff5500';
        context.shadowBlur = 18;
        context.lineWidth = 5;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        context.moveTo(g.trail[0].x, g.trail[0].y);
        g.trail.slice(1).forEach((point) => context.lineTo(point.x, point.y));
        context.stroke();
        context.lineCap = 'butt';
        context.lineJoin = 'miter';
      }

      context.globalCompositeOperation = 'lighter';
      g.particles.forEach((particle) => {
        context.globalAlpha = clamp(particle.life / 0.4, 0, 1);
        context.fillStyle = particle.color;
        context.fillRect(particle.x, particle.y, particle.size, particle.size);
      });
      context.globalAlpha = 1;

      context.globalCompositeOperation = 'lighter';
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
        context.strokeStyle = '#ffffff';
        context.shadowColor = '#00f3ff';
        context.shadowBlur = 18;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(0, g.scanY);
        context.lineTo(g.width, g.scanY);
        context.stroke();
      }

       const angle = Math.atan2(g.trail.length > 0 ? g.cutDir.y : g.facingDir.y, g.trail.length > 0 ? g.cutDir.x : g.facingDir.x);
      context.save();
      context.translate(g.player.x, g.player.y);
      context.rotate(Number.isNaN(angle) ? 0 : angle);
      context.fillStyle = '#ffffff';
      context.shadowColor = '#00f3ff';
      context.shadowBlur = 20;
      context.beginPath();
      context.moveTo(g.cell * PLAYER_RADIUS_CELLS, 0);
      context.lineTo(-g.cell * 0.55, -g.cell * 0.48);
      context.lineTo(-g.cell * 0.24, 0);
      context.lineTo(-g.cell * 0.55, g.cell * 0.48);
      context.closePath();
      context.fill();
      context.fillStyle = '#00f3ff';
      context.beginPath();
      context.arc(0, 0, g.cell * 0.22, 0, Math.PI * 2);
      context.fill();
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
        drawCanvas(g, now);
        if (Platform.OS !== 'web' && g.frame % 2 === 0) {
          setNativeSnapshot({
            width: g.width,
            height: g.height,
            cell: g.cell,
            rows: g.rows,
            claimed: makeClaimedRuns(g.grid),
            trail: [...g.trail],
            player: { ...g.player },
             direction: g.trail.length > 0 ? g.cutDir : g.facingDir,
             enemies: g.enemies.map((enemy) => ({ ...enemy })),
             particles: g.particles.slice(-1000),
            scanY: g.scanY,
          });
        }
        if (g.frame % 6 === 0) {
          setHud({
            score: g.score,
            shields: Math.max(0, g.shields),
            capture: Math.floor((g.captured / g.totalEmpty) * 100),
            mode: g.mode,
            feedback: g.status === 'RESPAWN' ? 'DRONE EN EXPANSION' : g.fillQueue.length > 0 ? 'SECTEUR EN SYNCHRONISATION' : '',
          });
        }
      }
      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrame);
  }, [resetGame, colors]);

  const renderNativeArena = () => {
    if (Platform.OS === 'web' || !nativeSnapshot) return null;
    const snapshot = nativeSnapshot;
    const gridLines = [];
    const bounds = perimeterBounds(snapshot.width, snapshot.height, snapshot.cell);
    for (let x = SAFE_BAND_CELLS; x <= COLS - SAFE_BAND_CELLS; x += 1) {
      gridLines.push(<Line key={`v${x}`} x1={x * snapshot.cell} y1={bounds.top} x2={x * snapshot.cell} y2={bounds.bottom} stroke="#00f3ff" opacity={0.11} strokeWidth={0.6} />);
    }
    for (let y = SAFE_BAND_CELLS; y <= snapshot.rows - SAFE_BAND_CELLS; y += 1) {
      gridLines.push(<Line key={`h${y}`} x1={bounds.left} y1={y * snapshot.cell} x2={bounds.right} y2={y * snapshot.cell} stroke="#00f3ff" opacity={0.11} strokeWidth={0.6} />);
    }
    const angle = Math.atan2(snapshot.direction.y, snapshot.direction.x);
    const playerPoints = [
      [snapshot.player.x + Math.cos(angle) * snapshot.cell * PLAYER_RADIUS_CELLS, snapshot.player.y + Math.sin(angle) * snapshot.cell * PLAYER_RADIUS_CELLS],
      [snapshot.player.x + Math.cos(angle + 2.5) * snapshot.cell * 0.62, snapshot.player.y + Math.sin(angle + 2.5) * snapshot.cell * 0.62],
      [snapshot.player.x + Math.cos(angle - 2.5) * snapshot.cell * 0.62, snapshot.player.y + Math.sin(angle - 2.5) * snapshot.cell * 0.62],
    ].map((point) => point.join(',')).join(' ');
    return (
      <Svg style={StyleSheet.absoluteFill}>
        <Rect width={snapshot.width} height={snapshot.height} fill="#000000" />
        {gridLines}
        {snapshot.claimed.map((run, index) => (
          <Rect key={`claimed${index}`} x={run.x * snapshot.cell} y={run.y * snapshot.cell} width={run.w * snapshot.cell} height={snapshot.cell} fill="#00f3ff" opacity={0.1} />
        ))}
        <Rect x={snapshot.cell * PERIMETER_INSET_CELLS} y={snapshot.cell * PERIMETER_INSET_CELLS} width={snapshot.width - snapshot.cell * PERIMETER_INSET_CELLS * 2} height={snapshot.height - snapshot.cell * PERIMETER_INSET_CELLS * 2} fill="none" stroke="#00f3ff" strokeWidth={PERIMETER_STROKE_WIDTH} opacity={0.95} />
         {snapshot.trail.length > 1 && <Polyline points={pointsToString(snapshot.trail)} fill="none" stroke="#ff5500" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />}
        {snapshot.particles.map((particle, index) => <Circle key={`spark${index}`} cx={particle.x} cy={particle.y} r={particle.size} fill={particle.color} opacity={clamp(particle.life / 0.4, 0, 1)} />)}
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
        {snapshot.scanY > 0 && <Line x1={0} y1={snapshot.scanY} x2={snapshot.width} y2={snapshot.scanY} stroke="#ffffff" strokeWidth={2} />}
        <Polygon points={playerPoints} fill="#ffffff" stroke="#00f3ff" strokeWidth={2} />
        <Circle cx={snapshot.player.x} cy={snapshot.player.y} r={snapshot.cell * 0.22} fill="#00f3ff" />
      </Svg>
    );
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.arena} onLayout={handleArenaLayout} testID="game-arena">
        {Platform.OS === 'web'
          ? React.createElement('canvas' as any, {
              ref: canvasRef,
              style: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
            })
          : renderNativeArena()}
      </View>

      <View style={[styles.hud, { paddingTop: Math.max(insets.top, 12) }]} pointerEvents="none">
        <View style={styles.hudRow}>
          <Text style={[styles.hudText, { color: colors.primary }]}>SECTEUR 01</Text>
          <Text style={[styles.hudText, { color: colors.foreground }]}>{hud.score.toString().padStart(6, '0')}</Text>
        </View>
        <View style={styles.hudRow}>
          <Text style={[styles.hudSubtext, { color: colors.accent }]}>BOUCLIERS {hud.shields}</Text>
          <Text style={[styles.hudSubtext, { color: colors.secondary }]}>ZONE {hud.capture}%</Text>
        </View>
        {hud.feedback !== '' && <Text style={[styles.feedback, { color: '#ff8a00' }]}>{hud.feedback}</Text>}
      </View>

      <View style={[styles.slowStatus, { bottom: Math.max(insets.bottom, 14) + 18 }]}>
        <Text style={styles.slowStatusKicker}>MODE DE DÉCOUPE</Text>
        <Text style={styles.slowStatusLabel}>CHALUMEAU SLOW</Text>
        <Text style={styles.slowStatusHint}>PARTICULES ACTIVES · BONUS DE SCORE</Text>
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
    top: 72,
    left: 0,
    right: 0,
    bottom: 76,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  hud: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hudText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: 1.5,
  },
  hudSubtext: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  feedback: {
    alignSelf: 'center',
    marginTop: 8,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.8,
  },
  slowStatus: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    borderColor: '#ff5500',
    backgroundColor: 'rgba(255,85,0,0.08)',
  },
  slowStatusKicker: {
    color: '#9ba0b3',
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 1.2,
  },
  slowStatusLabel: {
    color: '#ff8a00',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: 2,
  },
  slowStatusHint: {
    color: '#9ba0b3',
    fontFamily: 'Inter_500Medium',
    fontSize: 8,
    letterSpacing: 0.7,
  },
});