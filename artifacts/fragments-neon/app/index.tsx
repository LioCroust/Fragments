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
import Svg, { Circle, Image as SvgImage, Line, Polygon, Polyline, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

const COLS = 24;
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
type Enemy = Point & {
  kind: EnemyKind;
  vx: number;
  vy: number;
  phase: number;
  spin: number;
};

type Game = {
  width: number;
  height: number;
  cell: number;
  rows: number;
  grid: number[][];
  player: Point;
  inputDir: Direction;
  cutDir: Direction;
  trail: Point[];
  qix: Point & { vx: number; vy: number; phase: number };
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
  qix: Point & { phase: number };
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

const qixPoints = (qix: Point & { phase: number }, radius: number, arm: number) => {
  const points: Point[] = [];
  const segments = 8 + (arm % 4);
  for (let i = 0; i <= segments; i += 1) {
    const angle = qix.phase * 0.8 + arm * 0.7 + (i / segments) * Math.PI * 2;
    const wave = Math.sin(qix.phase * 3 + i * 1.7 + arm) * 0.28;
    points.push({
      x: qix.x + Math.cos(angle) * radius * (1 + wave),
      y: qix.y + Math.sin(angle) * radius * (1 + wave),
    });
  }
  return points;
};

const pointsToString = (points: Point[]) => points.map((point) => `${point.x},${point.y}`).join(' ');

const spriteFrames: Record<EnemyKind, any[]> = {
  SHIP: [
    require('../assets/images/enemy-ship-frame-0.png'),
    require('../assets/images/enemy-ship-frame-1.png'),
    require('../assets/images/enemy-ship-frame-2.png'),
    require('../assets/images/enemy-ship-frame-3.png'),
    require('../assets/images/enemy-ship-frame-4.png'),
    require('../assets/images/enemy-ship-frame-5.png'),
  ],
  DRAGON: [
    require('../assets/images/enemy-dragon-frame-0.png'),
    require('../assets/images/enemy-dragon-frame-1.png'),
    require('../assets/images/enemy-dragon-frame-2.png'),
    require('../assets/images/enemy-dragon-frame-3.png'),
    require('../assets/images/enemy-dragon-frame-4.png'),
    require('../assets/images/enemy-dragon-frame-5.png'),
  ],
  SEVEN: [
    require('../assets/images/enemy-seven-branch-frame-0.png'),
    require('../assets/images/enemy-seven-branch-frame-1.png'),
    require('../assets/images/enemy-seven-branch-frame-2.png'),
    require('../assets/images/enemy-seven-branch-frame-3.png'),
    require('../assets/images/enemy-seven-branch-frame-4.png'),
    require('../assets/images/enemy-seven-branch-frame-5.png'),
  ],
  SPIDER: [
    require('../assets/images/enemy-spider-frame-0.png'),
    require('../assets/images/enemy-spider-frame-1.png'),
    require('../assets/images/enemy-spider-frame-2.png'),
    require('../assets/images/enemy-spider-frame-3.png'),
    require('../assets/images/enemy-spider-frame-4.png'),
    require('../assets/images/enemy-spider-frame-5.png'),
  ],
};

const enemyFrameIndex = (enemy: Enemy) => Math.floor(enemy.phase * 7) % 6;

const enemySpriteSize = (kind: EnemyKind, cell: number) => {
  if (kind === 'DRAGON') return { width: cell * 3.65, height: cell * 4.4 };
  if (kind === 'SEVEN') return { width: cell * 4.4, height: cell * 4.4 };
  if (kind === 'SPIDER') return { width: cell * 4.3, height: cell * 4.05 };
  return { width: cell * 3.15, height: cell * 4.4 };
};

const enemyRadius = (enemy: Enemy, cell: number) => {
  if (enemy.kind === 'DRAGON') return cell * 1.35;
  if (enemy.kind === 'SPIDER') return cell * 1.15;
  if (enemy.kind === 'SEVEN') return cell * 1.5;
  return cell * 1.25;
};

const createEnemies = (width: number, height: number, cell: number, level: number): Enemy[] => {
  const safeX = (ratio: number) => clamp(width * ratio, cell * 4, width - cell * 4);
  const safeY = (ratio: number) => clamp(height * ratio, cell * 4, height - cell * 4);
  const speed = 1 + Math.min(level - 1, 4) * 0.06;
  return [
    { kind: 'SHIP', x: safeX(0.28), y: safeY(0.28), vx: 38 * speed, vy: 25 * speed, phase: 0.4, spin: 0.2 },
    { kind: 'DRAGON', x: safeX(0.73), y: safeY(0.31), vx: -29 * speed, vy: 34 * speed, phase: 2.1, spin: -0.15 },
    { kind: 'SEVEN', x: safeX(0.30), y: safeY(0.64), vx: 27 * speed, vy: -31 * speed, phase: 4.3, spin: 0.35 },
    { kind: 'SPIDER', x: safeX(0.72), y: safeY(0.68), vx: -34 * speed, vy: -22 * speed, phase: 5.7, spin: -0.28 },
  ];
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
    cutDir: ZERO,
    trail: [],
    qix: { x: 0, y: 0, vx: 70, vy: 54, phase: 0 },
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
    const rows = Math.max(24, Math.floor(height / cell));
    const grid: number[][] = [];
    let totalEmpty = 0;

    for (let y = 0; y < rows; y += 1) {
      const row: number[] = [];
      for (let x = 0; x < COLS; x += 1) {
        const safe = x < 2 || x >= COLS - 2 || y < 2 || y >= rows - 2;
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
      player: { x: 2.5 * cell, y: (rows - 2.5) * cell },
      inputDir: ZERO,
      cutDir: ZERO,
      trail: [],
      qix: {
        x: width * 0.52,
        y: height * 0.46,
        vx: 62 + previousLevel * 8,
        vy: 48 + previousLevel * 6,
        phase: 0,
      },
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
        // A new cardinal swipe can redirect an active cut at 90 degrees.
        // Releasing still leaves the drone travelling until it reaches safety.
        if (g.trail.length > 0) g.cutDir = direction;
      },
      onPanResponderRelease: () => {
        const g = gameRef.current;
        if (g.trail.length === 0) g.inputDir = ZERO;
      },
      onPanResponderTerminate: () => {
        const g = gameRef.current;
        if (g.trail.length === 0) g.inputDir = ZERO;
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

    const capture = (g: Game) => {
      const qx = clamp(Math.floor(g.qix.x / g.cell), 0, COLS - 1);
      const qy = clamp(Math.floor(g.qix.y / g.cell), 0, g.rows - 1);
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

    const moveEnemies = (g: Game, dt: number, now: number) => {
      g.enemies.forEach((enemy) => {
        enemy.phase += dt * (enemy.kind === 'DRAGON' ? 2.3 : enemy.kind === 'SPIDER' ? 3.1 : 1.7);
        enemy.spin += dt * (enemy.kind === 'SEVEN' ? 0.42 : enemy.kind === 'SHIP' ? 0.18 : -0.08);

        const nextX = enemy.x + enemy.vx * dt;
        const nextY = enemy.y + enemy.vy * dt;
        const margin = g.cell * 3.15;
        const cellAt = (x: number, y: number) => {
          const cx = clamp(Math.floor(x / g.cell), 0, COLS - 1);
          const cy = clamp(Math.floor(y / g.cell), 0, g.rows - 1);
          return g.grid[cy]?.[cx] ?? CLAIMED;
        };
        const blockedX = nextX < margin || nextX > g.width - margin || cellAt(nextX, enemy.y) === CLAIMED;
        const blockedY = nextY < margin || nextY > g.height - margin || cellAt(enemy.x, nextY) === CLAIMED;
        if (blockedX) enemy.vx *= -1;
        else enemy.x = nextX;
        if (blockedY) enemy.vy *= -1;
        else enemy.y = nextY;

        const radius = enemyRadius(enemy, g.cell);
        if (Math.hypot(enemy.x - g.player.x, enemy.y - g.player.y) < radius + g.cell * 0.42) explode(g, now);
        for (let i = 1; i < g.trail.length; i += 1) {
          if (distanceToSegment(enemy, g.trail[i - 1], g.trail[i]) < radius * 0.7) {
            explode(g, now);
            break;
          }
        }
      });
    };

    const update = (g: Game, dt: number, now: number) => {
      g.frame += 1;
      g.qix.phase += dt * 4;

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

      const direction = g.trail.length > 0 ? g.cutDir : g.inputDir;
      const speed = 118;
      const distance = speed * dt;
      if (direction.x !== 0 || direction.y !== 0) {
        const steps = Math.max(1, Math.ceil(distance));
        const stepX = (direction.x * distance) / steps;
        const stepY = (direction.y * distance) / steps;

        for (let i = 0; i < steps; i += 1) {
          g.player.x = clamp(g.player.x + stepX, 0, g.width - g.cell);
          g.player.y = clamp(g.player.y + stepY, 0, g.height - g.cell);
          const x = clamp(Math.floor(g.player.x / g.cell), 0, COLS - 1);
          const y = clamp(Math.floor(g.player.y / g.cell), 0, g.rows - 1);
          const state = g.grid[y][x];

          if (state === EMPTY) {
            if (g.trail.length === 0) g.cutDir = direction;
            g.grid[y][x] = TRAIL;
            g.trail.push({ x: x * g.cell + g.cell / 2, y: y * g.cell + g.cell / 2 });
            for (let spark = 0; spark < 18; spark += 1) addParticle(g, g.cutDir);
          } else if (state === TRAIL) {
            const recent = g.trail.slice(-6);
            if (!recent.some((point) => Math.floor(point.x / g.cell) === x && Math.floor(point.y / g.cell) === y)) {
              explode(g, now);
              break;
            }
          } else if (state === CLAIMED) {
            if (g.trail.length > 3) {
              capture(g);
              break;
            }
            if (g.trail.length > 0) {
              g.trail.forEach((point) => {
                const tx = Math.floor(point.x / g.cell);
                const ty = Math.floor(point.y / g.cell);
                if (g.grid[ty]?.[tx] === TRAIL) g.grid[ty][tx] = EMPTY;
              });
              g.trail = [];
            }
          }
        }
      }

      moveEnemies(g, dt, now);
      if (g.status !== 'PLAYING') return;

      const qixNext = {
        x: g.qix.x + g.qix.vx * dt,
        y: g.qix.y + g.qix.vy * dt,
      };
      const qixCellX = clamp(Math.floor(qixNext.x / g.cell), 0, COLS - 1);
      const qixCellY = clamp(Math.floor(qixNext.y / g.cell), 0, g.rows - 1);
      if (qixNext.x < g.cell * 2 || qixNext.x > g.width - g.cell * 2 || g.grid[qixCellY][qixCellX] === CLAIMED) {
        g.qix.vx *= -1;
      } else {
        g.qix.x = qixNext.x;
      }
      if (qixNext.y < g.cell * 2 || qixNext.y > g.height - g.cell * 2 || g.grid[qixCellY][qixCellX] === CLAIMED) {
        g.qix.vy *= -1;
      } else {
        g.qix.y = qixNext.y;
      }

      if (Math.hypot(g.qix.x - g.player.x, g.qix.y - g.player.y) < g.cell * 1.35) explode(g, now);
      for (let i = 1; i < g.trail.length; i += 1) {
        if (distanceToSegment(g.qix, g.trail[i - 1], g.trail[i]) < g.cell * 0.7) {
          explode(g, now);
          break;
        }
      }
    };

    const drawCanvas = (g: Game) => {
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
      context.strokeStyle = 'rgba(0,243,255,0.15)';
      context.lineWidth = 0.65;
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
      context.lineWidth = 3;
      context.strokeRect(g.cell * 1.5, g.cell * 1.5, g.width - g.cell * 3, g.height - g.cell * 3);
      context.shadowBlur = 0;

      if (g.trail.length > 1) {
        context.strokeStyle = '#ff5500';
        context.shadowColor = '#ff5500';
        context.shadowBlur = 18;
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(g.trail[0].x, g.trail[0].y);
        g.trail.slice(1).forEach((point) => context.lineTo(point.x, point.y));
        context.stroke();
      }

      g.particles.forEach((particle) => {
        context.globalAlpha = clamp(particle.life / 0.4, 0, 1);
        context.fillStyle = particle.color;
        context.fillRect(particle.x, particle.y, particle.size, particle.size);
      });
      context.globalAlpha = 1;

      g.enemies.forEach((enemy) => {
        const frame = enemyFrameIndex(enemy);
        const image = spriteImagesRef.current[`${enemy.kind}:${frame}`];
        if (!image) return;
        const size = enemySpriteSize(enemy.kind, g.cell);
        const rotation = enemy.kind === 'SHIP'
          ? Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2
          : enemy.kind === 'SEVEN'
            ? enemy.spin
            : 0;
        context.save();
        context.translate(enemy.x, enemy.y);
        context.rotate(rotation);
        context.globalCompositeOperation = 'lighter';
        context.globalAlpha = 0.98;
        context.shadowColor = enemy.kind === 'SHIP' || enemy.kind === 'SPIDER' ? '#00f3ff' : '#ff0077';
        context.shadowBlur = 18;
        context.drawImage(image, -size.width / 2, -size.height / 2, size.width, size.height);
        context.restore();
      });

      for (let arm = 0; arm < 10; arm += 1) {
        const points = qixPoints(g.qix, g.cell * (2.3 + (arm % 3) * 0.35), arm);
        context.strokeStyle = arm % 2 === 0 ? '#7b00ff' : '#ff0077';
        context.shadowColor = context.strokeStyle;
        context.shadowBlur = 14;
        context.lineWidth = 1.5 + (arm % 3) * 0.5;
        context.beginPath();
        context.moveTo(g.qix.x, g.qix.y);
        points.forEach((point) => context.lineTo(point.x, point.y));
        context.stroke();
      }
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

      const angle = Math.atan2(g.trail.length > 0 ? g.cutDir.y : g.inputDir.y, g.trail.length > 0 ? g.cutDir.x : g.inputDir.x);
      context.save();
      context.translate(g.player.x, g.player.y);
      context.rotate(Number.isNaN(angle) ? 0 : angle);
      context.fillStyle = '#ffffff';
      context.shadowColor = '#00f3ff';
      context.shadowBlur = 20;
      context.beginPath();
      context.moveTo(g.cell * 1.35, 0);
      context.lineTo(-g.cell * 0.85, -g.cell * 0.75);
      context.lineTo(-g.cell * 0.35, 0);
      context.lineTo(-g.cell * 0.85, g.cell * 0.75);
      context.closePath();
      context.fill();
      context.fillStyle = '#00f3ff';
      context.beginPath();
      context.arc(0, 0, g.cell * 0.34, 0, Math.PI * 2);
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
        drawCanvas(g);
        if (Platform.OS !== 'web' && g.frame % 2 === 0) {
          setNativeSnapshot({
            width: g.width,
            height: g.height,
            cell: g.cell,
            rows: g.rows,
            claimed: makeClaimedRuns(g.grid),
            trail: [...g.trail],
            player: { ...g.player },
            direction: g.trail.length > 0 ? g.cutDir : g.inputDir,
            qix: { x: g.qix.x, y: g.qix.y, phase: g.qix.phase },
             enemies: g.enemies.map((enemy) => ({ ...enemy })),
            particles: g.particles.slice(-150),
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
    for (let x = 0; x <= COLS; x += 1) {
      gridLines.push(<Line key={`v${x}`} x1={x * snapshot.cell} y1={0} x2={x * snapshot.cell} y2={snapshot.height} stroke="#00f3ff" opacity={0.13} strokeWidth={0.6} />);
    }
    for (let y = 0; y <= snapshot.rows; y += 1) {
      gridLines.push(<Line key={`h${y}`} x1={0} y1={y * snapshot.cell} x2={snapshot.width} y2={y * snapshot.cell} stroke="#00f3ff" opacity={0.13} strokeWidth={0.6} />);
    }
    const angle = Math.atan2(snapshot.direction.y, snapshot.direction.x);
    const playerPoints = [
      [snapshot.player.x + Math.cos(angle) * snapshot.cell * 1.35, snapshot.player.y + Math.sin(angle) * snapshot.cell * 1.35],
      [snapshot.player.x + Math.cos(angle + 2.5) * snapshot.cell, snapshot.player.y + Math.sin(angle + 2.5) * snapshot.cell],
      [snapshot.player.x + Math.cos(angle - 2.5) * snapshot.cell, snapshot.player.y + Math.sin(angle - 2.5) * snapshot.cell],
    ].map((point) => point.join(',')).join(' ');
    return (
      <Svg style={StyleSheet.absoluteFill}>
        <Rect width={snapshot.width} height={snapshot.height} fill="#000000" />
        {gridLines}
        {snapshot.claimed.map((run, index) => (
          <Rect key={`claimed${index}`} x={run.x * snapshot.cell} y={run.y * snapshot.cell} width={run.w * snapshot.cell} height={snapshot.cell} fill="#00f3ff" opacity={0.1} />
        ))}
        <Rect x={snapshot.cell * 1.5} y={snapshot.cell * 1.5} width={snapshot.width - snapshot.cell * 3} height={snapshot.height - snapshot.cell * 3} fill="none" stroke="#00f3ff" strokeWidth={3} opacity={0.95} />
        {snapshot.trail.length > 1 && <Polyline points={pointsToString(snapshot.trail)} fill="none" stroke="#ff5500" strokeWidth={5} />}
        {snapshot.particles.map((particle, index) => <Circle key={`spark${index}`} cx={particle.x} cy={particle.y} r={particle.size} fill={particle.color} opacity={clamp(particle.life / 0.4, 0, 1)} />)}
         {snapshot.enemies.map((enemy, enemyIndex) => {
           const frame = enemyFrameIndex(enemy);
           const size = enemySpriteSize(enemy.kind, snapshot.cell);
           return (
             <SvgImage
               key={`enemy-sprite-${enemyIndex}`}
               href={spriteFrames[enemy.kind][frame]}
               x={enemy.x - size.width / 2}
               y={enemy.y - size.height / 2}
               width={size.width}
               height={size.height}
               opacity={0.98}
             />
           );
         })}
        {Array.from({ length: 10 }).map((_, arm) => <Polyline key={`qix${arm}`} points={pointsToString([{ x: snapshot.qix.x, y: snapshot.qix.y }, ...qixPoints(snapshot.qix, snapshot.cell * (2.3 + (arm % 3) * 0.35), arm)])} fill="none" stroke={arm % 2 === 0 ? '#7b00ff' : '#ff0077'} strokeWidth={2} />)}
        {snapshot.scanY > 0 && <Line x1={0} y1={snapshot.scanY} x2={snapshot.width} y2={snapshot.scanY} stroke="#ffffff" strokeWidth={2} />}
        <Polygon points={playerPoints} fill="#ffffff" stroke="#00f3ff" strokeWidth={2} />
        <Circle cx={snapshot.player.x} cy={snapshot.player.y} r={snapshot.cell * 0.34} fill="#00f3ff" />
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