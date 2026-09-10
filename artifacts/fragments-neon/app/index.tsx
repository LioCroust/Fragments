import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image as RNImage,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
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
const LATE_SECTOR_MAP_OPACITY = 0.035;
const CAPTURED_ZONE_OPACITY = 0.15;
const CAPTURED_ZONE_LAYER_OPACITY = (
  CAPTURED_ZONE_OPACITY - INITIAL_MAP_OPACITY
) / (1 - INITIAL_MAP_OPACITY);
const LEVEL_CAPTURE_TARGET = 80;
const MAX_LEVEL = 50;
// Temporary QA control. __DEV__ hides it automatically from production builds.
const DEBUG_SECTOR_SELECTOR_ENABLED = __DEV__;
const CONTACT_FREEZE_DURATION = 1000;
const BOMB_SCORE = 1200;
const BOMB_RADIUS_CELLS = 0.5;
const HUD_COLORS = {
  cyan: '#00f3ff',
  lime: '#b8ff4a',
  amber: '#ffb02e',
  magenta: '#ff2bb5',
  warmWhite: '#fff3d6',
  panel: 'rgba(8, 10, 18, 0.92)',
  panelMuted: 'rgba(8, 10, 18, 0.78)',
} as const;
const initialMapOpacityForLevel = (level: number) => (
  level >= 11 ? LATE_SECTOR_MAP_OPACITY : INITIAL_MAP_OPACITY
);
const ZERO = { x: 0 as const, y: 0 as const };
const pickupChimeSource = require('../assets/audio/pickup.mp3');
const diamondCaptureSource = require('../assets/audio/diamond-capture.wav');
const shieldLossExplosionSource = require('../assets/audio/shield-loss-explosion.wav');
const sectorTransitionVictorySource = require('../assets/audio/sector-transition-victory-joyful.wav');
const sevenFireShotSource = require('../assets/audio/seven-fire-shot.mp3');
const cockpitInteriorSource = require('../assets/images/prism-warbird-interior-neon-console.png');
const cuttingSpriteSource = require('../assets/images/cutting-sprite-sheet.png');
const shipSmokeSpriteSource = require('../assets/images/ship-smoke-sprite-sheet.png');
const coreReactorSpriteSource = require('../assets/images/core-reactor-sprite-sheet.png');
const sevenFireOrbSource = require('../assets/images/seven-fire-orb.png');
const diamondSpriteSource = require('../assets/images/neon-diamond-fragment-sprite-sheet.png');
const spiderWebSource = require('../assets/images/spider-web-destination.png');
const sector1SpaceBackgroundSource = require('../assets/images/sector-1-space-background.png');
const sector2SpaceBackgroundSource = require('../assets/images/sector-2-space-background.png');
const sector3SpaceBackgroundSource = require('../assets/images/sector-3-space-background.png');
const level4SpaceBackgroundSource = require('../assets/images/level-4-space-background.png');
const level5GridBackgroundSource = require('../assets/images/level-5-grid-background.png');
const level6SpaceBackgroundSource = require('../assets/images/level-6-space-background.png');
const level7GridBackgroundSource = require('../assets/images/level-7-grid-background.png');
const level8SpaceBackgroundSource = require('../assets/images/level-8-space-background.png');
const level9GridBackgroundSource = require('../assets/images/level-9-grid-background.png');
const level10SpaceBackgroundSource = require('../assets/images/level-10-space-background.png');
const sector11BackgroundSource = require('../assets/images/sector-11-zone.png');
const sector12BackgroundSource = require('../assets/images/sector-12-zone-warm.png');
const sector13BackgroundSource = require('../assets/images/sector-13-zone.png');
const sector14BackgroundSource = require('../assets/images/sector-14-zone.png');
const sector15BackgroundSource = require('../assets/images/sector-15-zone.png');
const sector16BackgroundSource = require('../assets/images/sector-16-zone.png');
const sector17BackgroundSource = require('../assets/images/sector-17-zone.png');
const sector18BackgroundSource = require('../assets/images/sector-18-zone.png');
const sector19BackgroundSource = require('../assets/images/sector-19-zone.png');
const sector20BackgroundSource = require('../assets/images/sector-20-zone.png');
const sector21BackgroundSource = require('../assets/images/sector-21-zone.png');
const sector22BackgroundSource = require('../assets/images/sector-22-zone.png');
const sector23BackgroundSource = require('../assets/images/sector-23-zone.png');
const sector24BackgroundSource = require('../assets/images/sector-24-zone.png');
const sector25BackgroundSource = require('../assets/images/sector-25-zone.png');
const sector26BackgroundSource = require('../assets/images/sector-26-zone.png');
const sector27BackgroundSource = require('../assets/images/sector-27-zone.png');
const sector28BackgroundSource = require('../assets/images/sector-28-zone.png');
const sector29BackgroundSource = require('../assets/images/sector-29-zone.png');
const sector30BackgroundSource = require('../assets/images/sector-30-zone.png');
const sector31BackgroundSource = require('../assets/images/sector-31-zone.png');
const sector32BackgroundSource = require('../assets/images/sector-32-zone.png');
const sector33BackgroundSource = require('../assets/images/sector-33-zone.png');
const sector34BackgroundSource = require('../assets/images/sector-34-zone.png');
const sector35BackgroundSource = require('../assets/images/sector-35-zone.png');
const sector36BackgroundSource = require('../assets/images/sector-36-zone.png');
const sector37BackgroundSource = require('../assets/images/sector-37-zone.png');
const sector38BackgroundSource = require('../assets/images/sector-38-zone.png');
const sector39BackgroundSource = require('../assets/images/sector-39-zone.png');
const sector40BackgroundSource = require('../assets/images/sector-40-zone.png');
const sector41BackgroundSource = require('../assets/images/sector-41-zone.png');
const sector42BackgroundSource = require('../assets/images/sector-42-zone.png');
const sector43BackgroundSource = require('../assets/images/sector-43-zone.png');
const sector44BackgroundSource = require('../assets/images/sector-44-zone.png');
const sector45BackgroundSource = require('../assets/images/sector-45-zone.png');
const sector46BackgroundSource = require('../assets/images/sector-46-zone.png');
const sector47BackgroundSource = require('../assets/images/sector-47-zone.png');
const sector48BackgroundSource = require('../assets/images/sector-48-zone.png');
const sector49BackgroundSource = require('../assets/images/sector-49-zone.png');
const sector50BackgroundSource = require('../assets/images/sector-50-zone.png');

const LEVEL_BACKGROUND_SOURCES: Record<number, any> = {
  1: sector1SpaceBackgroundSource,
  2: sector2SpaceBackgroundSource,
  3: sector3SpaceBackgroundSource,
  4: level4SpaceBackgroundSource,
  5: level5GridBackgroundSource,
  6: level6SpaceBackgroundSource,
  7: level7GridBackgroundSource,
  8: level8SpaceBackgroundSource,
  9: level9GridBackgroundSource,
  10: level10SpaceBackgroundSource,
  11: sector11BackgroundSource,
  12: sector12BackgroundSource,
  13: sector13BackgroundSource,
  14: sector14BackgroundSource,
  15: sector15BackgroundSource,
  16: sector16BackgroundSource,
  17: sector17BackgroundSource,
  18: sector18BackgroundSource,
  19: sector19BackgroundSource,
  20: sector20BackgroundSource,
  21: sector21BackgroundSource,
  22: sector22BackgroundSource,
  23: sector23BackgroundSource,
  24: sector24BackgroundSource,
  25: sector25BackgroundSource,
  26: sector26BackgroundSource,
  27: sector27BackgroundSource,
  28: sector28BackgroundSource,
  29: sector29BackgroundSource,
  30: sector30BackgroundSource,
  31: sector31BackgroundSource,
  32: sector32BackgroundSource,
  33: sector33BackgroundSource,
  34: sector34BackgroundSource,
  35: sector35BackgroundSource,
  36: sector36BackgroundSource,
  37: sector37BackgroundSource,
  38: sector38BackgroundSource,
  39: sector39BackgroundSource,
  40: sector40BackgroundSource,
  41: sector41BackgroundSource,
  42: sector42BackgroundSource,
  43: sector43BackgroundSource,
  44: sector44BackgroundSource,
  45: sector45BackgroundSource,
  46: sector46BackgroundSource,
  47: sector47BackgroundSource,
  48: sector48BackgroundSource,
  49: sector49BackgroundSource,
  50: sector50BackgroundSource,
};

const backgroundSourceForLevel = (level: number) => (
  LEVEL_BACKGROUND_SOURCES[Math.min(MAX_LEVEL, Math.max(1, level))]
);
const BEST_SCORE_STORAGE_KEY = 'fragments-neon:best-score';
const CUTTING_SPRITE_ENABLED = true;
const CUTTING_SPRITE_FRAME_COUNT = 8;
const CUTTING_SPRITE_FRAME_WIDTH = 160;
const CUTTING_SPRITE_FRAME_HEIGHT = 96;
const CUTTING_SPRITE_FRAME_DURATION = 3;
type SmokeRenderMode = 'SPRITE' | 'PARTICLES';
let SHIP_SMOKE_RENDER_MODE: SmokeRenderMode = 'SPRITE';
const isParticleSmokeMode = (mode: SmokeRenderMode) => mode === 'PARTICLES';
const SHIP_SMOKE_SPRITE_FRAME_COUNT = 8;
const SHIP_SMOKE_SPRITE_FRAME_SIZE = 128;
const SHIP_SMOKE_SPRITE_FRAME_DURATION = 4;
const CORE_REACTOR_SPRITE_FRAME_COUNT = 8;
const CORE_REACTOR_SPRITE_FRAME_SIZE = 256;
const CORE_REACTOR_SPRITE_FRAME_DURATION = 5;
const DIAMOND_SPRITE_FRAME_COUNT = 4;
const DIAMOND_SPRITE_FRAME_SIZE = 256;
const DIAMOND_SPRITE_FRAME_DURATION = 7;
const SEVEN_PROJECTILE_COUNT = 7;
const SEVEN_PROJECTILE_INTERVAL = 7;
const SEVEN_PROJECTILE_SPEED = 42;
const SEVEN_PROJECTILE_MAX_LIFE = 9;
const SEVEN_PROJECTILE_RADIUS_CELLS = 0.16;
const SEVEN_PROJECTILE_SIZE_CELLS = 0.82;
const SHIP_ROTATION_SPEED = 8.5;

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
type FusionSpark = Point & {
  previousX: number;
  previousY: number;
  pathDistance: number;
  lateralOffset: number;
  lateralVelocity: number;
  forwardSpeed: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  streak: boolean;
};
type FusionSequence = {
  path: Point[];
  cumulativeLengths: number[];
  totalLength: number;
  elapsed: number;
  travelDuration: number;
  impact: Point;
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
  visualRotation?: number;
  sevenFireTimer?: number;
  spiderThreadTimer?: number;
  spiderGrade?: number;
  isBoss?: boolean;
  bossTier?: number;
  isMini?: boolean;
  splitLevel?: number;
  lastSafeX?: number;
  lastSafeY?: number;
};

type EnemySpawnSpec = {
  baseIndex: number;
  spiderGrade?: number;
  isBoss?: boolean;
  bossTier?: number;
};

const BOSS_SECTOR_KINDS: Record<number, EnemyKind> = {
  10: 'SHIP',
  20: 'DRAGON',
  30: 'SEVEN',
  40: 'SPIDER',
  50: 'SPIDER',
};

const BOSS_KIND_LABELS: Record<EnemyKind, string> = {
  SHIP: 'VAISSEAU',
  DRAGON: 'DRAGON',
  SEVEN: 'SEVEN',
  SPIDER: 'ARAIGNÉE',
};

const ENEMY_KIND_PLURAL_LABELS: Record<EnemyKind, string> = {
  SHIP: 'VAISSEAUX',
  DRAGON: 'DRAGONS',
  SEVEN: 'SEVEN',
  SPIDER: 'ARAIGNÉES',
};

const ENEMY_DEPLOYED_BANNER_LABELS: Record<EnemyKind, string> = {
  SHIP: '2 VAISSEAUX DÉPLOYÉS',
  DRAGON: '2 DRAGONS DÉPLOYÉS',
  SEVEN: '2 SEVEN DÉPLOYÉS',
  SPIDER: '2 ARAIGNÉES DÉPLOYÉES',
};

const ENEMY_SPLIT_BANNER_LABELS: Record<EnemyKind, string> = {
  SHIP: 'VAISSEAU FRACTURÉ',
  DRAGON: 'DRAGON FRACTURÉ',
  SEVEN: 'SEVEN FRACTURÉ',
  SPIDER: 'ARAIGNÉE FRACTURÉE',
};

const isBossSector = (level: number) => Boolean(BOSS_SECTOR_KINDS[level]);
const bossKindForSector = (level: number) => BOSS_SECTOR_KINDS[level];

type Diamond = Point & {
  phase: number;
  collected: boolean;
};

type Bomb = Point & {
  destroyed: boolean;
};

type SevenProjectile = Point & {
  vx: number;
  vy: number;
  life: number;
  radius: number;
};

type PlayerMissile = Point & {
  vx: number;
  vy: number;
  life: number;
  radius: number;
  angle: number;
};

type SpiderThread = {
  start: Point;
  end: Point;
  target: Point;
  vx: number;
  vy: number;
  projectileSpeed: number;
  webSizeCells: number;
  webRadiusCells: number;
  slowFactor: number;
  threadLengthCells: number;
  activeDuration: number;
  ownerIndex: number;
  remaining: number;
  anchored: boolean;
};

const ENEMY_SCORE: Record<EnemyKind, number> = {
  SHIP: 180,
  DRAGON: 420,
  SEVEN: 620,
  SPIDER: 800,
};
const DIAMOND_SCORE = 750;
const RECORD_BANNER_MINIMUM_BEST_SCORE = 100;
const MAX_SMOKE_PUFFS = 28;
const DRAGON_NOMINAL_SPEED = 32;
const DRAGON_ATTACK_SPEED = 78;
const dragonSpeedFor = (enemy: Enemy, attacking: boolean) => {
  const bossMultiplier = enemy.isBoss
    ? 1.16 + Math.min(0.16, (enemy.bossTier ?? 1) * 0.035)
    : 1;
  return (attacking ? DRAGON_ATTACK_SPEED : DRAGON_NOMINAL_SPEED) * bossMultiplier;
};
type SpiderDifficulty = {
  initialDelay: number;
  cooldown: number;
  projectileSpeed: number;
  extraLeadTime: number;
  activeDuration: number;
  threadLengthCells: number;
  slowFactor: number;
  webSizeCells: number;
  webRadiusCells: number;
};

const SPIDER_GRADE_CONFIG: Record<number, SpiderDifficulty> = {
  1: {
    initialDelay: 3.2,
    cooldown: 7,
    projectileSpeed: 300,
    extraLeadTime: 0.1,
    activeDuration: 2.4,
    threadLengthCells: 1.45,
    slowFactor: 0.45,
    webSizeCells: 2.25,
    webRadiusCells: 0.9,
  },
  2: {
    initialDelay: 2.7,
    cooldown: 6,
    projectileSpeed: 350,
    extraLeadTime: 0.13,
    activeDuration: 2.8,
    threadLengthCells: 1.55,
    slowFactor: 0.35,
    webSizeCells: 2.45,
    webRadiusCells: 0.98,
  },
  3: {
    initialDelay: 2.1,
    cooldown: 4.8,
    projectileSpeed: 420,
    extraLeadTime: 0.18,
    activeDuration: 3.2,
    threadLengthCells: 1.65,
    slowFactor: 0.25,
    webSizeCells: 2.65,
    webRadiusCells: 1.08,
  },
  4: {
    initialDelay: 1.8,
    cooldown: 4,
    projectileSpeed: 500,
    extraLeadTime: 0.22,
    activeDuration: 3.7,
    threadLengthCells: 1.75,
    slowFactor: 0.18,
    webSizeCells: 2.85,
    webRadiusCells: 1.18,
  },
  5: {
    initialDelay: 1.6,
    cooldown: 3.3,
    projectileSpeed: 570,
    extraLeadTime: 0.25,
    activeDuration: 4.1,
    threadLengthCells: 1.85,
    slowFactor: 0.12,
    webSizeCells: 3,
    webRadiusCells: 1.26,
  },
};

const spiderDifficultyFor = (grade = 3, bossTier = 0): SpiderDifficulty => {
  const base = SPIDER_GRADE_CONFIG[clamp(grade, 1, 5)] ?? SPIDER_GRADE_CONFIG[3];
  if (bossTier <= 0) return base;
  const bossPressure = 1 + Math.min(0.24, 0.06 + (bossTier - 1) * 0.045);
  return {
    ...base,
    initialDelay: Math.max(1.1, base.initialDelay * 0.78),
    cooldown: Math.max(2.5, base.cooldown / bossPressure),
    projectileSpeed: base.projectileSpeed * bossPressure,
    extraLeadTime: base.extraLeadTime + 0.035,
    activeDuration: base.activeDuration + 0.25,
    webSizeCells: base.webSizeCells + 0.14,
    webRadiusCells: base.webRadiusCells + 0.06,
  };
};

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
  diamonds: Diamond[];
  bombs: Bomb[];
  projectiles: SevenProjectile[];
  missiles: PlayerMissile[];
  spiderThreads: SpiderThread[];
  particles: Particle[];
  fusionSparks: FusionSpark[];
  fusion: FusionSequence | null;
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
  status: 'PLAYING' | 'FUSING' | 'RESPAWN';
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

type Banner = {
  kind: 'RECORD' | 'DIAMOND' | 'BOMB' | 'SECTOR' | 'BOSS' | 'ENEMY' | 'BOSS_SPLIT' | 'SPLIT' | 'CLEAN' | 'GAME_OVER';
  score?: number;
  points?: number;
  level?: number;
  bossKind?: EnemyKind;
  enemyKind?: EnemyKind;
};

type Snapshot = {
  width: number;
  height: number;
  cell: number;
  rows: number;
  level: number;
  frame: number;
  trail: Point[];
  protectedTrails: Point[][];
  player: Point;
  direction: Direction;
  enemies: Enemy[];
  diamonds: Diamond[];
  bombs: Bomb[];
  projectiles: SevenProjectile[];
  missiles: PlayerMissile[];
  spiderThreads: SpiderThread[];
  particles: Particle[];
  fusionSparks: FusionSpark[];
  fusionHead: Point | null;
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

const polylineMetrics = (points: Point[]) => {
  const cumulativeLengths = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulativeLengths.push(
      cumulativeLengths[index - 1] + Math.hypot(
        points[index].x - points[index - 1].x,
        points[index].y - points[index - 1].y,
      ),
    );
  }
  return {
    cumulativeLengths,
    totalLength: cumulativeLengths[cumulativeLengths.length - 1] ?? 0,
  };
};

const pointOnPolyline = (
  points: Point[],
  cumulativeLengths: number[],
  distance: number,
) => {
  if (points.length === 0) return { point: { x: 0, y: 0 }, tangent: { x: 1, y: 0 } };
  if (points.length === 1) return { point: { ...points[0] }, tangent: { x: 1, y: 0 } };
  const totalLength = cumulativeLengths[cumulativeLengths.length - 1] ?? 0;
  const targetDistance = clamp(distance, 0, totalLength);
  let segmentIndex = 1;
  while (
    segmentIndex < cumulativeLengths.length - 1
    && cumulativeLengths[segmentIndex] < targetDistance
  ) {
    segmentIndex += 1;
  }
  const start = points[segmentIndex - 1];
  const end = points[segmentIndex];
  const segmentLength = cumulativeLengths[segmentIndex] - cumulativeLengths[segmentIndex - 1] || 1;
  const progress = clamp(
    (targetDistance - cumulativeLengths[segmentIndex - 1]) / segmentLength,
    0,
    1,
  );
  const tangentLength = Math.hypot(end.x - start.x, end.y - start.y) || 1;
  return {
    point: {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
    },
    tangent: {
      x: (end.x - start.x) / tangentLength,
      y: (end.y - start.y) / tangentLength,
    },
  };
};

const closestPointOnPolyline = (point: Point, points: Point[]) => {
  const metrics = polylineMetrics(points);
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestPoint = points[0] ?? point;
  let bestPathDistance = 0;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy || 1;
    const progress = clamp(
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
      0,
      1,
    );
    const candidate = {
      x: start.x + dx * progress,
      y: start.y + dy * progress,
    };
    const candidateDistance = Math.hypot(point.x - candidate.x, point.y - candidate.y);
    if (candidateDistance < bestDistance) {
      bestDistance = candidateDistance;
      bestPoint = candidate;
      bestPathDistance = metrics.cumulativeLengths[index - 1]
        + Math.sqrt(lengthSquared) * progress;
    }
  }
  return {
    point: bestPoint,
    pathDistance: bestPathDistance,
  };
};

const distanceBetweenSegments = (firstStart: Point, firstEnd: Point, secondStart: Point, secondEnd: Point) => (
  Math.min(
    distanceToSegment(firstStart, secondStart, secondEnd),
    distanceToSegment(firstEnd, secondStart, secondEnd),
    distanceToSegment(secondStart, firstStart, firstEnd),
    distanceToSegment(secondEnd, firstStart, firstEnd),
  )
);

const spiderThreadIsActive = (thread: SpiderThread) => (
  thread.anchored && thread.remaining > 0
);

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
  const arenaWidth = bounds.left + bounds.right;
  const arenaHeight = bounds.top + bounds.bottom;
  const radius = playerBodyRadius(cell);
  const spriteSize = playerSpriteSize(cell);
  const physicalLeft = radius + OUTER_STOP_GAP;
  const physicalRight = arenaWidth - radius - OUTER_STOP_GAP;
  const physicalTop = radius + OUTER_STOP_GAP;
  const physicalBottom = arenaHeight - radius - OUTER_STOP_GAP;
  return {
    // The outer band is limited to the drone's own half-length. This keeps
    // the nose/tail from reaching the HUD while retaining a real safe band
    // outside the blue perimeter on every side.
    left: Math.max(physicalLeft, bounds.left - spriteSize.width * 0.5),
    right: Math.min(physicalRight, bounds.right + spriteSize.width * 0.5),
    top: Math.max(physicalTop, bounds.top - spriteSize.height * 0.5),
    bottom: Math.min(physicalBottom, bounds.bottom + spriteSize.height * 0.5),
  };
};

const playerPerimeterSafetyPoint = (
  point: Point,
  direction: Direction,
  bounds: ReturnType<typeof perimeterBounds>,
  cell: number,
) => {
  const radius = playerBodyRadius(cell);
  const safePoint = { ...point };
  if (direction.x < 0) {
    safePoint.x = bounds.left - radius - OUTER_STOP_GAP;
  } else if (direction.x > 0) {
    safePoint.x = bounds.right + radius + OUTER_STOP_GAP;
  }
  if (direction.y < 0) {
    safePoint.y = bounds.top - radius - OUTER_STOP_GAP;
  } else if (direction.y > 0) {
    safePoint.y = bounds.bottom + radius + OUTER_STOP_GAP;
  }
  return safePoint;
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
const playerMissileSource = require('../assets/images/player-missile-transparent.png');

const createDiamond = (width: number, height: number, cell: number): Diamond => {
  const bounds = perimeterBounds(width, height, cell);
  return {
    x: bounds.left + cell * (1.5 + Math.random() * Math.max(1, (bounds.right - bounds.left) / cell - 3)),
    y: bounds.top + cell * (1.5 + Math.random() * Math.max(1, (bounds.bottom - bounds.top) / cell - 3)),
    phase: Math.random() * Math.PI * 2,
    collected: false,
  };
};

const createDiamonds = (width: number, height: number, cell: number, count: number) => {
  const diamonds: Diamond[] = [];
  const minimumDistance = cell * 3.2;
  for (let index = 0; index < count; index += 1) {
    let candidate = createDiamond(width, height, cell);
    for (let attempt = 0; attempt < 24; attempt += 1) {
      if (diamonds.every((diamond) => Math.hypot(diamond.x - candidate.x, diamond.y - candidate.y) >= minimumDistance)) {
        break;
      }
      candidate = createDiamond(width, height, cell);
    }
    diamonds.push(candidate);
  }
  return diamonds;
};

const diamondCountForLevel = (level: number) => {
  if (isBossSector(level)) return 0;
  return level <= 2 ? 0 : level <= 12 ? 1 : level <= 24 ? 2 : 1;
};

const enemyFrameIndex = (enemy: Enemy) => Math.floor(enemy.phase * 7) % 6;

const shortestAngleDelta = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

const rotateAngleTowards = (current: number, target: number, maxDelta: number) => {
  const delta = shortestAngleDelta(target - current);
  return current + clamp(delta, -maxDelta, maxDelta);
};

const enemyAnimationTransform = (enemy: Enemy, cell: number) => {
  const phase = enemy.phase;
  const directionRotation = enemy.kind === 'SHIP'
    ? (enemy.visualRotation ?? Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2)
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
    scale: (enemy.isBoss ? 1.58 : 1)
      + Math.sin(phase * (enemy.kind === 'SPIDER' ? 1.6 : 1.25)) * 0.035,
    offsetY: Math.sin(phase * 1.05) * cell * 0.08,
  };
};

const shipSmokePosition = (enemy: Enemy, cell: number): Point => {
  const velocityLength = Math.hypot(enemy.vx, enemy.vy) || 1;
  const shipScale = enemy.isMini ? 0.5 : 1;
  return {
    x: enemy.x - (enemy.vx / velocityLength) * cell * 0.92 * shipScale,
    y: enemy.y - (enemy.vy / velocityLength) * cell * 0.92 * shipScale,
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

const enemySpriteSize = (kind: EnemyKind, cell: number, isMini = false) => {
  const miniScale = isMini ? 0.5 : 1;
  if (kind === 'DRAGON') return { width: cell * 2.25 * miniScale, height: cell * 2.25 * miniScale };
  if (kind === 'SEVEN') return { width: cell * 3.5 * miniScale, height: cell * 3.5 * miniScale };
  if (kind === 'SPIDER') return { width: cell * 2.2 * miniScale, height: cell * 2.2 * miniScale };
  return { width: cell * 1.9 * miniScale, height: cell * 1.9 * miniScale };
};

const enemyRadius = (enemy: Enemy, cell: number) => {
  const miniScale = enemy.isMini ? 0.5 : 1;
  const baseRadius = enemy.kind === 'DRAGON'
    ? cell * 0.78 * miniScale
    : enemy.kind === 'SPIDER'
      ? cell * 0.88 * miniScale
      : enemy.kind === 'SEVEN'
        ? cell * 1.32 * miniScale
        : cell * 0.8 * miniScale;
  return baseRadius * (enemy.isBoss ? 1.08 : 1);
};

const enemyVisualRadius = (enemy: Enemy, cell: number) => {
  const sprite = enemySpriteSize(enemy.kind, cell, enemy.isMini);
  return Math.max(enemyRadius(enemy, cell), Math.hypot(sprite.width, sprite.height) * 0.5) + PERIMETER_STROKE_WIDTH * 0.5;
};

const enemySpriteFootprint = (enemy: Enemy, cell: number, x: number, y: number) => {
  const sprite = enemySpriteSize(enemy.kind, cell, enemy.isMini);
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
  const sprite = enemySpriteSize(enemy.kind, cell, enemy.isMini);
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

type CollisionCircle = {
  center: Point;
  radius: number;
};

// The PNGs have transparent space and very different silhouettes. These
// normalized sample circles follow the visible body/limbs instead of treating
// every sprite as a solid square.
const enemyCollisionProfiles: Record<EnemyKind, Array<[number, number, number]>> = {
  SHIP: [
    [0, -0.76, 0.13],
    [-0.48, -0.18, 0.1],
    [0.48, -0.18, 0.1],
    [0, 0, 0.2],
    [0, 0.58, 0.13],
  ],
  DRAGON: [
    [-0.72, -0.22, 0.15],
    [-0.45, -0.56, 0.11],
    [0, -0.7, 0.12],
    [0.46, -0.52, 0.11],
    [0.7, -0.14, 0.12],
    [0.56, 0.35, 0.12],
    [0.16, 0.61, 0.12],
    [-0.24, 0.51, 0.11],
    [-0.48, 0.24, 0.1],
    [0.02, -0.23, 0.09],
    [0.3, -0.14, 0.09],
    [0.33, 0.12, 0.09],
    [0.1, 0.27, 0.09],
    [-0.12, 0.12, 0.08],
  ],
  SEVEN: [
    [0, 0, 0.2],
    [0, -0.42, 0.09],
    [0, -0.78, 0.13],
    [0.36, -0.22, 0.09],
    [0.72, -0.42, 0.13],
    [0.36, 0.22, 0.09],
    [0.72, 0.42, 0.13],
    [0, 0.42, 0.09],
    [0, 0.78, 0.13],
    [-0.36, 0.22, 0.09],
    [-0.72, 0.42, 0.13],
    [-0.36, -0.22, 0.09],
    [-0.72, -0.42, 0.13],
  ],
  SPIDER: [
    [0, 0, 0.22],
    [-0.25, -0.3, 0.08],
    [-0.5, -0.58, 0.07],
    [-0.72, -0.78, 0.08],
    [0.25, -0.3, 0.08],
    [0.5, -0.58, 0.07],
    [0.72, -0.78, 0.08],
    [-0.4, -0.04, 0.08],
    [-0.72, -0.2, 0.07],
    [-0.82, -0.4, 0.08],
    [0.4, -0.04, 0.08],
    [0.72, -0.2, 0.07],
    [0.82, -0.4, 0.08],
    [-0.4, 0.18, 0.08],
    [-0.72, 0.38, 0.07],
    [-0.8, 0.62, 0.08],
    [0.4, 0.18, 0.08],
    [0.72, 0.38, 0.07],
    [0.8, 0.62, 0.08],
    [-0.24, 0.3, 0.08],
    [-0.38, 0.55, 0.07],
    [-0.5, 0.78, 0.08],
    [0.24, 0.3, 0.08],
    [0.38, 0.55, 0.07],
    [0.5, 0.78, 0.08],
  ],
};

const enemyCollisionCircles = (
  enemy: Enemy,
  cell: number,
  x: number,
  y: number,
): CollisionCircle[] => {
  const sprite = enemySpriteSize(enemy.kind, cell, enemy.isMini);
  const motion = enemyAnimationTransform(enemy, cell);
  const halfWidth = sprite.width * motion.scale * 0.5;
  const halfHeight = sprite.height * motion.scale * 0.5;
  const cos = Math.cos(motion.rotation);
  const sin = Math.sin(motion.rotation);
  const radiusScale = Math.min(sprite.width, sprite.height) * motion.scale * 0.5;

  return enemyCollisionProfiles[enemy.kind].map(([localX, localY, radius]) => ({
    center: {
      x: x + localX * halfWidth * cos - localY * halfHeight * sin,
      y: y + motion.offsetY + localX * halfWidth * sin + localY * halfHeight * cos,
    },
    radius: radius * radiusScale,
  }));
};

const bombRadius = (cell: number) => cell * BOMB_RADIUS_CELLS;
const bombVisualRadius = (cell: number) => cell * 0.72;

const bombTouchesSegment = (
  bomb: Bomb,
  cell: number,
  start: Point,
  end: Point,
) => distanceToSegment(bomb, start, end) <= bombRadius(cell) + PERIMETER_STROKE_WIDTH * 0.5;

const bombTouchesTrail = (bomb: Bomb, cell: number, trail: Point[]) => (
  trail.slice(1).some((trailPoint, index) => (
    bombTouchesSegment(bomb, cell, trail[index], trailPoint)
  ))
);

const sevenProjectileRadius = (cell: number) => cell * SEVEN_PROJECTILE_RADIUS_CELLS;
const sevenProjectileSize = (cell: number) => cell * SEVEN_PROJECTILE_SIZE_CELLS;
const PLAYER_MISSILE_SPEED = 270;
const PLAYER_MISSILE_MAX_LIFE = 3.5;
const PLAYER_MISSILE_RADIUS_CELLS = 0.2;
const PLAYER_MISSILE_SIZE_CELLS = 1.12;
const playerMissileRadius = (cell: number) => cell * PLAYER_MISSILE_RADIUS_CELLS;
const playerMissileSize = (cell: number) => cell * PLAYER_MISSILE_SIZE_CELLS;

const createPlayerMissileVolley = (player: Point, cell: number): PlayerMissile[] => (
  [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ].map((direction) => ({
    x: player.x,
    y: player.y,
    vx: direction.x * PLAYER_MISSILE_SPEED,
    vy: direction.y * PLAYER_MISSILE_SPEED,
    life: PLAYER_MISSILE_MAX_LIFE,
    radius: playerMissileRadius(cell),
    angle: Math.atan2(direction.y, direction.x) + Math.PI / 2,
  }))
);

const createSevenVolley = (enemy: Enemy, cell: number): SevenProjectile[] => (
  Array.from({ length: SEVEN_PROJECTILE_COUNT }, (_, index) => {
    const angle = enemy.spin + (Math.PI * 2 * index) / SEVEN_PROJECTILE_COUNT;
    return {
      x: enemy.x,
      y: enemy.y,
      vx: Math.cos(angle) * SEVEN_PROJECTILE_SPEED,
      vy: Math.sin(angle) * SEVEN_PROJECTILE_SPEED,
      life: SEVEN_PROJECTILE_MAX_LIFE,
      radius: sevenProjectileRadius(cell),
    };
  })
);

const sevenProjectileTouchesBlueBoundary = (
  projectile: SevenProjectile,
  from: Point,
  to: Point,
  bounds: ReturnType<typeof perimeterBounds>,
  protectedTrails: Point[][],
) => {
  const collisionDistance = projectile.radius + PERIMETER_STROKE_WIDTH * 0.5;
  if (
    !pointInsidePerimeter(to, bounds)
    || distanceToPerimeter(to, bounds) <= collisionDistance
  ) {
    return true;
  }
  return protectedTrails.some((trail) => (
    trail.slice(1).some((trailPoint, index) => (
      distanceBetweenSegments(from, to, trail[index], trailPoint) <= collisionDistance
    ))
  ));
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
  const clampedLevel = Math.min(MAX_LEVEL, Math.max(1, level));
  const levelSpeed = 1 + Math.min(clampedLevel - 1, 24) * 0.018;
  const enemies: Enemy[] = [
    { kind: 'SHIP', behavior: 'PRESET', pattern: 'SWEEP', x: safeX(0.28), y: safeY(0.28), vx: 56 * levelSpeed, vy: 38 * levelSpeed, speed: 64 * levelSpeed, agility: 0.92, phase: 0.4, spin: 0.2, routePhase: 0.3, thinkTimer: 0, targetX: 0, targetY: 0, blockedTime: 0, respawnAt: 0, edgeTurnTimer: 0, edgeDirectionX: 0, edgeDirectionY: 0 },
    { kind: 'DRAGON', behavior: 'PLANNED', pattern: 'SWEEP', x: safeX(0.73), y: safeY(0.31), vx: -25.69, vy: 30.66, speed: DRAGON_NOMINAL_SPEED, agility: 0.66, phase: 2.1, spin: -0.15, routePhase: 1.4, thinkTimer: 0, targetX: 0, targetY: 0, blockedTime: 0, respawnAt: 0, edgeTurnTimer: 0, edgeDirectionX: 0, edgeDirectionY: 0 },
    { kind: 'SHIP', behavior: 'PRESET', pattern: 'ZIGZAG', x: safeX(0.72), y: safeY(0.3), vx: -49 * levelSpeed, vy: 32 * levelSpeed, speed: 62 * levelSpeed, agility: 0.9, phase: 1.6, spin: -0.22, routePhase: 1.1, thinkTimer: 0, targetX: 0, targetY: 0, blockedTime: 0, respawnAt: 0, edgeTurnTimer: 0, edgeDirectionX: 0, edgeDirectionY: 0 },
    { kind: 'SEVEN', behavior: 'PRESET', pattern: 'ZIGZAG', x: safeX(0.30), y: safeY(0.64), vx: 48 * levelSpeed, vy: -38 * levelSpeed, speed: 64 * levelSpeed, agility: 0.78, phase: 4.3, spin: 0.35, routePhase: 2.6, thinkTimer: 0, targetX: 0, targetY: 0, blockedTime: 0, respawnAt: 0, edgeTurnTimer: 0, edgeDirectionX: 0, edgeDirectionY: 0, sevenFireTimer: SEVEN_PROJECTILE_INTERVAL },
    { kind: 'SPIDER', behavior: 'PLANNED', pattern: 'ZIGZAG', x: safeX(0.72), y: safeY(0.68), vx: -25 * levelSpeed, vy: -19 * levelSpeed, speed: 36 * levelSpeed, agility: 0.82, phase: 5.7, spin: -0.28, routePhase: 4.2, thinkTimer: 0, targetX: 0, targetY: 0, blockedTime: 0, respawnAt: 0, edgeTurnTimer: 0, edgeDirectionX: 0, edgeDirectionY: 0, spiderThreadTimer: SPIDER_GRADE_CONFIG[1].initialDelay, spiderGrade: 1 },
  ];
  const rosterByLevel: Record<number, EnemySpawnSpec[]> = {};
  for (let sector = 1; sector <= MAX_LEVEL; sector += 1) {
    const bossKind = bossKindForSector(sector);
    if (bossKind) {
      const baseIndex = enemies.findIndex((enemy) => enemy.kind === bossKind);
      rosterByLevel[sector] = [{
        baseIndex,
        isBoss: true,
        bossTier: sector / 10,
        spiderGrade: bossKind === 'SPIDER' ? (sector === 10 ? 3 : 5) : undefined,
      }];
      continue;
    }
    const cycle = sector % 10;
    const spiderGrade = sector < 10 ? undefined : sector < 20 ? 2 : sector < 30 ? 3 : 5;
    const spider = sector >= 5
      ? [{ baseIndex: 4, spiderGrade: Math.max(1, Math.min(5, spiderGrade ?? 1)) }]
      : [];
    rosterByLevel[sector] = cycle <= 2
      ? [{ baseIndex: 0 }]
      : cycle === 3
        ? [{ baseIndex: 1 }]
        : cycle === 4
          ? [{ baseIndex: 0 }, { baseIndex: 1 }]
          : cycle === 5
            ? [{ baseIndex: 0 }, ...spider]
            : cycle === 6
              ? [{ baseIndex: 1 }, { baseIndex: 3 }]
              : cycle === 7
                ? [{ baseIndex: 0 }, { baseIndex: 1 }, ...spider]
                : cycle === 8
                  ? [{ baseIndex: 0 }, { baseIndex: 3 }]
                  : [{ baseIndex: 1 }, { baseIndex: 3 }, ...spider];
  }
  return (rosterByLevel[clampedLevel] ?? rosterByLevel[1]).map((spec) => {
    const enemy = { ...enemies[spec.baseIndex], ...spec };
    const bossSpeed = spec.isBoss ? 1.24 + (spec.bossTier ?? 1) * 0.035 : 1;
    const spiderDifficulty = enemy.kind === 'SPIDER'
      ? spiderDifficultyFor(spec.spiderGrade ?? enemy.spiderGrade ?? 1, spec.bossTier)
      : undefined;
    return {
      ...enemy,
      speed: enemy.speed * bossSpeed,
      vx: enemy.vx * bossSpeed,
      vy: enemy.vy * bossSpeed,
      spiderThreadTimer: spiderDifficulty?.initialDelay,
      visualRotation: enemy.kind === 'SHIP' ? Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2 : undefined,
    };
  });
};

const createBombs = (width: number, height: number, cell: number, level: number): Bomb[] => {
  if (isBossSector(level)) return [];

  const spawnChance = level <= 4
    ? 0.34
    : level <= 9
      ? 0.55
      : level <= 19
        ? 0.63
        : level <= 29
          ? 0.7
          : level <= 39
            ? 0.76
            : 0.82;
  if (Math.random() >= spawnChance) return [];

  const bombCount = level < 15
    ? 1
    : level < 25
      ? 1 + (Math.random() < 0.35 ? 1 : 0)
      : level < 30
        ? 1 + (Math.random() < 0.48 ? 1 : 0) + (Math.random() < 0.12 ? 1 : 0)
        : level < 40
          ? 1
            + (Math.random() < 0.58 ? 1 : 0)
            + (Math.random() < 0.34 ? 1 : 0)
            + (Math.random() < 0.18 ? 1 : 0)
          : 1
            + (Math.random() < 0.64 ? 1 : 0)
            + (Math.random() < 0.48 ? 1 : 0)
            + (Math.random() < 0.3 ? 1 : 0)
            + (Math.random() < 0.16 ? 1 : 0);
  const bounds = perimeterBounds(width, height, cell);
  const minX = bounds.left + bombVisualRadius(cell);
  const maxX = bounds.right - bombVisualRadius(cell);
  const minY = bounds.top + bombVisualRadius(cell);
  const maxY = bounds.bottom - bombVisualRadius(cell);

  return Array.from({ length: bombCount }, () => ({
    x: minX + Math.random() * Math.max(0, maxX - minX),
    y: minY + Math.random() * Math.max(0, maxY - minY),
    destroyed: false,
  }));
};

const enemyIsDestroyed = (enemy: Enemy) => enemy.respawnAt === Number.POSITIVE_INFINITY;

const sectorHasLiveTargets = (enemies: Enemy[], bombs: Bomb[]) => (
  enemies.some((enemy) => !enemyIsDestroyed(enemy))
  || bombs.some((bomb) => !bomb.destroyed)
);

const preserveDestroyedEnemies = (enemies: Enemy[], previousEnemies: Enemy[]) => {
  const destroyedByKind: Record<EnemyKind, boolean[]> = {
    SHIP: [],
    DRAGON: [],
    SEVEN: [],
    SPIDER: [],
  };
  previousEnemies.forEach((enemy) => {
    destroyedByKind[enemy.kind].push(enemyIsDestroyed(enemy));
  });

  const occurrenceByKind: Record<EnemyKind, number> = {
    SHIP: 0,
    DRAGON: 0,
    SEVEN: 0,
    SPIDER: 0,
  };
  enemies.forEach((enemy) => {
    const occurrence = occurrenceByKind[enemy.kind];
    if (destroyedByKind[enemy.kind][occurrence]) {
      enemy.respawnAt = Number.POSITIVE_INFINITY;
      enemy.vx = 0;
      enemy.vy = 0;
    }
    occurrenceByKind[enemy.kind] += 1;
  });
};

const placeEnemiesInOpenSurface = (
  enemies: Enemy[],
  width: number,
  height: number,
  cell: number,
  claimedPolygons: Point[][],
  protectedTrails: Point[][],
  activeTrail: Point[],
  player: Point,
) => {
  const bounds = perimeterBounds(width, height, cell);
  const occupiedSprites: Point[][] = [];
  const preferredSeeds = [
    { x: 0.5, y: 0.28 },
    { x: 0.25, y: 0.28 },
    { x: 0.75, y: 0.28 },
    { x: 0.5, y: 0.52 },
    { x: 0.25, y: 0.52 },
    { x: 0.75, y: 0.52 },
    { x: 0.5, y: 0.76 },
    { x: 0.25, y: 0.76 },
    { x: 0.75, y: 0.76 },
  ];
  const gridSeeds = Array.from({ length: 11 }, (_, row) => (
    Array.from({ length: 11 }, (_, column) => ({
      x: (column + 0.5) / 11,
      y: (row + 0.5) / 11,
    }))
  )).flat();

  enemies.forEach((enemy) => {
    if (enemyIsDestroyed(enemy)) return;
    const visualRadius = enemyVisualRadius(enemy, cell);
    const currentPosition = { x: enemy.x, y: enemy.y };
    const candidates = [
      currentPosition,
      ...preferredSeeds.map((seed) => ({
        x: bounds.left + (bounds.right - bounds.left) * seed.x,
        y: bounds.top + (bounds.bottom - bounds.top) * seed.y,
      })),
      ...gridSeeds.map((seed) => ({
        x: bounds.left + (bounds.right - bounds.left) * seed.x,
        y: bounds.top + (bounds.bottom - bounds.top) * seed.y,
      })),
    ];
    const candidate = candidates.find((point) => {
      const x = clamp(point.x, bounds.left + visualRadius, bounds.right - visualRadius);
      const y = clamp(point.y, bounds.top + visualRadius, bounds.bottom - visualRadius);
      const spriteCorners = enemySpriteCorners(enemy, cell, x, y);
      const spriteFootprint = enemySpriteFootprint(enemy, cell, x, y);
      const inDarkSurface = spriteFootprint.every((spritePoint) => (
        !pointInsideClaimedSurface(spritePoint, claimedPolygons, cell * 0.08)
      ));
      const clearOfClaimedPolygons = claimedPolygons.every((polygon) => (
        !polygonsIntersect(spriteCorners, polygon)
      ));
      const clearOfProtectedTrails = protectedTrails.every((protectedTrail) => (
        !pathTouchesPolygon(protectedTrail, spriteCorners, PERIMETER_STROKE_WIDTH * 0.5)
      ));
      const clearOfActiveTrail = activeTrail.length < 2
        || !pathTouchesPolygon(activeTrail, spriteCorners, PERIMETER_STROKE_WIDTH * 0.5);
      const clearOfPlayer = Math.hypot(x - player.x, y - player.y)
        > visualRadius + playerBodyRadius(cell) * 1.5;
      const clearOfOtherEnemies = occupiedSprites.every((occupiedSprite) => (
        !polygonsIntersect(spriteCorners, occupiedSprite)
      ));
      return (
        inDarkSurface
        && clearOfClaimedPolygons
        && clearOfProtectedTrails
        && clearOfActiveTrail
        && clearOfPlayer
        && clearOfOtherEnemies
      );
    });

    if (!candidate) {
      // Never place an enemy in a captured surface as a fallback.
      enemy.respawnAt = Number.POSITIVE_INFINITY;
      enemy.vx = 0;
      enemy.vy = 0;
      return;
    }
    enemy.x = clamp(candidate.x, bounds.left + visualRadius, bounds.right - visualRadius);
    enemy.y = clamp(candidate.y, bounds.top + visualRadius, bounds.bottom - visualRadius);
    occupiedSprites.push(enemySpriteCorners(enemy, cell, enemy.x, enemy.y));
  });
};

const placeBombsInOpenSurface = (
  bombs: Bomb[],
  enemies: Enemy[],
  width: number,
  height: number,
  cell: number,
  claimedPolygons: Point[][],
  protectedTrails: Point[][],
  activeTrail: Point[],
  player: Point,
) => {
  const bounds = perimeterBounds(width, height, cell);
  const seeds = [
    { x: 0.52, y: 0.46 },
    { x: 0.46, y: 0.34 },
    { x: 0.66, y: 0.52 },
    { x: 0.34, y: 0.52 },
    { x: 0.52, y: 0.68 },
    { x: 0.7, y: 0.3 },
    { x: 0.3, y: 0.3 },
  ];
  const placedBombs: Bomb[] = [];
  const protectedTrailTouches = (point: Point) => protectedTrails.some((trail) => (
    trail.slice(1).some((trailPoint, index) => (
      distanceToSegment(point, trail[index], trailPoint)
        <= bombRadius(cell) + PERIMETER_STROKE_WIDTH * 0.5
    ))
  ));

  bombs.forEach((bomb) => {
    if (bomb.destroyed) return;
    const candidates = [
      { x: bomb.x, y: bomb.y },
      ...seeds.map((seed) => ({
        x: bounds.left + (bounds.right - bounds.left) * seed.x,
        y: bounds.top + (bounds.bottom - bounds.top) * seed.y,
      })),
    ];
    const candidate = candidates.find((point) => {
      const x = clamp(point.x, bounds.left + bombVisualRadius(cell), bounds.right - bombVisualRadius(cell));
      const y = clamp(point.y, bounds.top + bombVisualRadius(cell), bounds.bottom - bombVisualRadius(cell));
      const candidatePoint = { x, y };
      const clearOfClaimed = !pointInsideClaimedSurface(candidatePoint, claimedPolygons, cell * 0.12);
      const clearOfProtected = !protectedTrailTouches(candidatePoint);
      const clearOfActiveTrail = activeTrail.length < 2 || !bombTouchesSegment(
        { ...bomb, x, y },
        cell,
        activeTrail[0],
        activeTrail[activeTrail.length - 1],
      );
      const clearOfPlayer = Math.hypot(x - player.x, y - player.y)
        > bombVisualRadius(cell) + playerBodyRadius(cell) * 1.8;
      const clearOfEnemies = enemies
        .filter((enemy) => !enemyIsDestroyed(enemy))
        .every((enemy) => (
          Math.hypot(x - enemy.x, y - enemy.y)
            > bombVisualRadius(cell) + enemyVisualRadius(enemy, cell) * 0.8
        ));
      const clearOfOtherBombs = placedBombs.every((otherBomb) => (
        Math.hypot(x - otherBomb.x, y - otherBomb.y) > bombVisualRadius(cell) * 2
      ));
      return clearOfClaimed
        && clearOfProtected
        && clearOfActiveTrail
        && clearOfPlayer
        && clearOfEnemies
        && clearOfOtherBombs;
    });
    if (candidate) {
      bomb.x = clamp(candidate.x, bounds.left + bombVisualRadius(cell), bounds.right - bombVisualRadius(cell));
      bomb.y = clamp(candidate.y, bounds.top + bombVisualRadius(cell), bounds.bottom - bombVisualRadius(cell));
    }
    placedBombs.push(bomb);
  });
};

const createShipSmokePuffs = (enemy: Enemy, cell: number, count = 4): SmokePuff[] => {
  const velocityLength = Math.hypot(enemy.vx, enemy.vy) || 1;
  const shipScale = enemy.isMini ? 0.5 : 1;
  const backwardX = -enemy.vx / velocityLength;
  const backwardY = -enemy.vy / velocityLength;
  const sideX = -backwardY;
  const sideY = backwardX;

  return Array.from({ length: count }, (_, index) => {
    const sideOffset = (Math.random() - 0.5) * cell * 0.34 * shipScale;
    const trailOffset = cell * (0.92 + index * 0.2) * shipScale;
    const maxLife = 0.43 + Math.random() * 0.17;
    const smokeSpeed = Math.max(20, velocityLength * (0.48 + Math.random() * 0.16));
    return {
      x: enemy.x + backwardX * trailOffset + sideX * sideOffset,
      y: enemy.y + backwardY * trailOffset + sideY * sideOffset,
      life: maxLife,
      maxLife,
      size: cell * (0.13 + Math.random() * 0.1) * shipScale,
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
  level: number;
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
  level,
  claimedPolygons,
  protectedTrails,
  claimedCount,
  protectedTrailCount,
}: NativeArenaStaticProps) => {
  const backgroundSource = backgroundSourceForLevel(level);
  const gridLines = [];
  if (level === 1) {
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
  } else if (level === 2) {
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const radiusX = width * 0.48;
    const radiusY = height * 0.46;
    for (let ring = 1; ring <= 7; ring += 1) {
      gridLines.push(
        <Circle
          key={`orbit-ring-${ring}`}
          cx={centerX}
          cy={centerY}
          r={Math.min(radiusX, radiusY) * (ring / 7)}
          fill="none"
          stroke="#2bb9cf"
          opacity={0.035 + ring * 0.004}
          strokeWidth={0.65}
        />,
      );
    }
    for (let ray = 0; ray < 16; ray += 1) {
      const angle = (Math.PI * 2 * ray) / 16;
      gridLines.push(
        <Line
          key={`orbit-ray-${ray}`}
          x1={centerX}
          y1={centerY}
          x2={centerX + Math.cos(angle) * radiusX}
          y2={centerY + Math.sin(angle) * radiusY}
          stroke="#2bb9cf"
          opacity={0.045}
          strokeWidth={0.55}
        />,
      );
    }
  } else if (level === 3) {
    const spacing = cell * 2.4;
    for (let offset = -height; offset < width + height; offset += spacing) {
      gridLines.push(
        <Line
          key={`fractured-a-${offset}`}
          x1={offset}
          y1={0}
          x2={offset + height}
          y2={height}
          stroke="#746bff"
          opacity={0.045}
          strokeWidth={0.65}
        />,
      );
      gridLines.push(
        <Line
          key={`fractured-b-${offset}`}
          x1={offset}
          y1={height}
          x2={offset + height}
          y2={0}
          stroke="#746bff"
          opacity={0.03}
          strokeWidth={0.65}
        />,
      );
    }
  }
    const bounds = perimeterBounds(width, height, cell);
  return (
    <>
      <SvgImage
        href={backgroundSource}
        x={0}
        y={0}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid slice"
      />
      <Rect
        x={bounds.left}
        y={bounds.top}
        width={bounds.right - bounds.left}
        height={bounds.bottom - bounds.top}
        fill={ZONE_COLOR}
        opacity={initialMapOpacityForLevel(level)}
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
  const arenaBounds = perimeterBounds(snapshot.width, snapshot.height, snapshot.cell);
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
  const diamondFrame = Math.floor(snapshot.frame / DIAMOND_SPRITE_FRAME_DURATION)
    % DIAMOND_SPRITE_FRAME_COUNT;
  const scanIntervals = snapshot.pendingCapturePolygons.flatMap((polygon) => (
    polygonHorizontalIntervals(polygon, snapshot.scanY)
  ));
  return (
    <>
      {snapshot.diamonds.map((diamond, index) => (
        !diamond.collected && (
          <G
            key={`diamond-${index}`}
            transform={`translate(${diamond.x} ${diamond.y + Math.sin(snapshot.frame * 0.05 + diamond.phase) * snapshot.cell * 0.08})`}
          >
            <Defs>
              <ClipPath id={`diamond-sprite-clip-${index}`}>
                <Rect
                  x={-snapshot.cell * 0.75}
                  y={-snapshot.cell * 0.75}
                  width={snapshot.cell * 1.5}
                  height={snapshot.cell * 1.5}
                />
              </ClipPath>
            </Defs>
            <G clipPath={`url(#diamond-sprite-clip-${index})`}>
              <SvgImage
                href={diamondSpriteSource}
                x={-snapshot.cell * 0.75 - diamondFrame * snapshot.cell * 1.5}
                y={-snapshot.cell * 0.75}
                width={snapshot.cell * 1.5 * DIAMOND_SPRITE_FRAME_COUNT}
                height={snapshot.cell * 1.5}
                opacity={0.98}
              />
            </G>
          </G>
        )
      ))}
      {SHIP_SMOKE_RENDER_MODE === 'SPRITE' && (
        <>
          <Defs>
            <ClipPath id="ship-smoke-sprite-frame-clip">
              <Rect
                x={-snapshot.cell * 0.9}
                y={-snapshot.cell * 0.9}
                width={snapshot.cell * 1.8}
                height={snapshot.cell * 1.8}
              />
            </ClipPath>
          </Defs>
          {snapshot.enemies
            .filter((enemy) => enemy.kind === 'SHIP' && enemy.respawnAt <= Date.now())
            .map((enemy, index) => {
              const smokePosition = shipSmokePosition(enemy, snapshot.cell);
              const motion = enemyAnimationTransform(enemy, snapshot.cell);
              const smokeSize = snapshot.cell * (enemy.isMini ? 0.9 : 1.8);
              const frame = Math.floor(Date.now() / 55) % SHIP_SMOKE_SPRITE_FRAME_COUNT;
              return (
                <G
                  key={`ship-smoke-sprite-${index}`}
                  transform={`translate(${smokePosition.x} ${smokePosition.y + motion.offsetY}) rotate(${motion.rotation * (180 / Math.PI)})`}
                  opacity={0.58}
                >
                  <G clipPath="url(#ship-smoke-sprite-frame-clip)">
                    <SvgImage
                      href={shipSmokeSpriteSource}
                      x={-smokeSize / 2 - frame * smokeSize}
                      y={-smokeSize / 2}
                      width={smokeSize * SHIP_SMOKE_SPRITE_FRAME_COUNT}
                      height={smokeSize}
                    />
                  </G>
                </G>
              );
            })}
        </>
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
      {snapshot.fusionHead && (
        <>
          <Circle
            cx={snapshot.fusionHead.x}
            cy={snapshot.fusionHead.y}
            r={snapshot.cell * 0.23}
            fill="#ff6a16"
            opacity={0.28}
          />
          <Circle
            cx={snapshot.fusionHead.x}
            cy={snapshot.fusionHead.y}
            r={snapshot.cell * 0.1}
            fill="#fff5bd"
            opacity={0.92}
          />
        </>
      )}
      {snapshot.fusionSparks.map((spark, index) => (
        spark.streak ? (
          <Line
            key={`fusion-spark-${index}`}
            x1={spark.x}
            y1={spark.y}
            x2={spark.previousX}
            y2={spark.previousY}
            stroke={spark.color}
            strokeWidth={spark.size}
            strokeLinecap="round"
            opacity={clamp(spark.life / spark.maxLife, 0, 1)}
          />
        ) : (
          <Circle
            key={`fusion-spark-${index}`}
            cx={spark.x}
            cy={spark.y}
            r={spark.size}
            fill={spark.color}
            opacity={clamp(spark.life / spark.maxLife, 0, 1)}
          />
        )
      ))}
      {snapshot.spiderThreads.map((thread, index) => {
        const active = spiderThreadIsActive(thread);
        const webSize = snapshot.cell * thread.webSizeCells;
        return (
          <G key={`spider-thread-${index}`} opacity={active ? 0.82 : 0.92}>
            {!thread.anchored && (
              <>
                <Line
                  x1={thread.start.x}
                  y1={thread.start.y}
                  x2={thread.end.x}
                  y2={thread.end.y}
                  stroke="#fff3d6"
                  strokeWidth={2.8}
                  strokeLinecap="round"
                />
                <Line
                  x1={thread.start.x}
                  y1={thread.start.y}
                  x2={thread.end.x}
                  y2={thread.end.y}
                  stroke="#ff2bb5"
                  strokeWidth={1.15}
                  strokeLinecap="round"
                />
              </>
            )}
            {thread.anchored && (
              <SvgImage
                href={spiderWebSource}
                x={thread.target.x - webSize / 2}
                y={thread.target.y - webSize / 2}
                width={webSize}
                height={webSize}
                opacity={clamp(0.6 + thread.remaining * 0.08, 0.6, 0.88)}
              />
            )}
            {!thread.anchored && (
              <Line
                x1={thread.start.x}
                y1={thread.start.y}
                x2={thread.end.x}
                y2={thread.end.y}
                stroke="#00f3ff"
                strokeWidth={0.72}
                strokeLinecap="round"
              />
            )}
            {!thread.anchored && (
              <Circle cx={thread.end.x} cy={thread.end.y} r={3.2} fill="#fff3d6" />
            )}
          </G>
        );
      })}
      {snapshot.bombs.map((bomb, bombIndex) => {
        if (bomb.destroyed) return null;
        const frame = Math.floor(snapshot.frame / CORE_REACTOR_SPRITE_FRAME_DURATION)
          % CORE_REACTOR_SPRITE_FRAME_COUNT;
        const spriteSize = snapshot.cell * 1.45;
        return (
          <G key={`bomb-${bombIndex}`} transform={`translate(${bomb.x} ${bomb.y})`}>
            <Defs>
              <ClipPath id={`core-reactor-sprite-clip-${bombIndex}`}>
                <Rect
                  x={-spriteSize / 2}
                  y={-spriteSize / 2}
                  width={spriteSize}
                  height={spriteSize}
                />
              </ClipPath>
            </Defs>
            <G clipPath={`url(#core-reactor-sprite-clip-${bombIndex})`}>
              <SvgImage
                href={coreReactorSpriteSource}
                x={-spriteSize / 2 - frame * spriteSize}
                y={-spriteSize / 2}
                width={spriteSize * CORE_REACTOR_SPRITE_FRAME_COUNT}
                height={spriteSize}
                opacity={0.98}
              />
            </G>
          </G>
        );
      })}
      {snapshot.projectiles.map((projectile, projectileIndex) => {
        const spriteSize = sevenProjectileSize(snapshot.cell);
        return (
          <SvgImage
            key={`seven-projectile-${projectileIndex}`}
            href={sevenFireOrbSource}
            x={projectile.x - spriteSize / 2}
            y={projectile.y - spriteSize / 2}
            width={spriteSize}
            height={spriteSize}
            opacity={0.96}
          />
        );
      })}
      {snapshot.missiles.map((missile, missileIndex) => {
        if (!pointInsidePerimeter(missile, arenaBounds)) return null;
        const spriteSize = playerMissileSize(snapshot.cell);
        const rotationDegrees = missile.angle * (180 / Math.PI);
        return (
          <SvgImage
            key={`player-missile-${missileIndex}`}
            href={playerMissileSource}
            x={missile.x - spriteSize / 2}
            y={missile.y - spriteSize / 2}
            width={spriteSize}
            height={spriteSize}
            opacity={0.98}
            transform={`rotate(${rotationDegrees} ${missile.x} ${missile.y})`}
          />
        );
      })}
      {snapshot.enemies.map((enemy, enemyIndex) => {
        if (enemy.respawnAt > Date.now()) return null;
        const frame = enemyFrameIndex(enemy);
        const size = enemySpriteSize(enemy.kind, snapshot.cell, enemy.isMini);
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
      {isParticleSmokeMode(SHIP_SMOKE_RENDER_MODE) && snapshot.smokePuffs.map((puff, index) => {
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

const DebugSectorSelector = ({
  currentSector,
  onSelect,
  bottomInset,
}: {
  currentSector: number;
  onSelect: (sector: number) => void;
  bottomInset: number;
}) => {
  if (!DEBUG_SECTOR_SELECTOR_ENABLED) return null;
  return (
    <View style={[styles.debugSectorSelector, { bottom: bottomInset }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.debugSectorContent}
      >
        {Array.from({ length: MAX_LEVEL }, (_, index) => {
          const sector = index + 1;
          const selected = sector === currentSector;
          return (
            <Pressable
              key={`debug-sector-${sector}`}
              style={[
                styles.debugSectorButton,
                selected && styles.debugSectorButtonSelected,
              ]}
              onPress={() => onSelect(sector)}
              accessibilityRole="button"
              accessibilityLabel={`Téléporter au secteur ${sector}`}
              accessibilityState={{ selected }}
              testID={`debug-sector-${sector}`}
            >
              <Text
                style={[
                  styles.debugSectorButtonText,
                  selected && styles.debugSectorButtonTextSelected,
                ]}
              >
                {sector}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
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
    diamonds: [],
    bombs: [],
    projectiles: [],
    missiles: [],
    spiderThreads: [],
    particles: [],
    fusionSparks: [],
    fusion: null,
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
  const [banner, setBanner] = useState<Banner | null>(null);
  const [nativeSnapshot, setNativeSnapshot] = useState<Snapshot | null>(null);
  const spriteImagesRef = useRef<Record<string, any>>({});
  const coreReactorImageRef = useRef<any>(null);
  const sevenFireOrbImageRef = useRef<any>(null);
  const playerMissileImageRef = useRef<any>(null);
  const spiderWebImageRef = useRef<any>(null);
  const diamondSpriteImageRef = useRef<any>(null);
  const playerImageRef = useRef<any>(null);
  const cuttingSpriteImageRef = useRef<any>(null);
  const shipSmokeSpriteImageRef = useRef<any>(null);
  const sectorBackgroundImageRefs = useRef<Record<number, any>>({});
  const bestScoreRef = useRef(0);
  const bestScoreHydratedRef = useRef(false);
  const recordBannerShownRef = useRef(false);
  const bannerQueueRef = useRef<Banner[]>([]);
  const bannerAnimatingRef = useRef(false);
  const bannerSequenceRef = useRef(0);
  const bannerTranslateX = useRef(new Animated.Value(-520)).current;
  const pickupChimePlayer = useAudioPlayer(pickupChimeSource, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const diamondCapturePlayer = useAudioPlayer(diamondCaptureSource, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const shieldLossExplosionPlayer = useAudioPlayer(shieldLossExplosionSource, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const sectorTransitionVictoryPlayer = useAudioPlayer(sectorTransitionVictorySource, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const sevenFireShotPlayer = useAudioPlayer(sevenFireShotSource, {
    downloadFirst: true,
    keepAudioSessionActive: true,
  });
  const audioSessionReadyRef = useRef<Promise<void>>(Promise.resolve());
  const audioUnlockedRef = useRef(Platform.OS !== 'web');

  const playShieldLossExplosion = useCallback(() => {
    if (!audioUnlockedRef.current) return;
    void audioSessionReadyRef.current.then(async () => {
      shieldLossExplosionPlayer.muted = false;
      shieldLossExplosionPlayer.volume = 0.92;
      try {
        await shieldLossExplosionPlayer.seekTo(0);
      } catch {
        // A freshly loaded native player is already positioned at the start.
      }
      shieldLossExplosionPlayer.play();
    }).catch((error: unknown) => {
      if (__DEV__) console.warn('Unable to play shield loss explosion', error);
    });
  }, [shieldLossExplosionPlayer]);

  const playSectorTransition = useCallback(() => {
    if (!audioUnlockedRef.current) return;
    void audioSessionReadyRef.current.then(async () => {
      sectorTransitionVictoryPlayer.muted = false;
      sectorTransitionVictoryPlayer.volume = 0.9;
      try {
        await sectorTransitionVictoryPlayer.seekTo(0);
      } catch {
        // A freshly loaded native player is already positioned at the start.
      }
      sectorTransitionVictoryPlayer.play();
    }).catch((error: unknown) => {
      if (__DEV__) console.warn('Unable to play sector transition sound', error);
    });
  }, [sectorTransitionVictoryPlayer]);

  const playDiamondCapture = useCallback(() => {
    if (!audioUnlockedRef.current) return;
    void audioSessionReadyRef.current.then(async () => {
      diamondCapturePlayer.muted = false;
      diamondCapturePlayer.volume = 0.88;
      try {
        await diamondCapturePlayer.seekTo(0);
      } catch {
        // A freshly loaded native player is already positioned at the start.
      }
      diamondCapturePlayer.play();
    }).catch((error: unknown) => {
      if (__DEV__) console.warn('Unable to play diamond capture sound', error);
    });
  }, [diamondCapturePlayer]);

  const enqueueBanner = useCallback((nextBanner: Banner) => {
    bannerQueueRef.current.push(nextBanner);
    if (bannerAnimatingRef.current) return;

    const playNextBanner = () => {
      const next = bannerQueueRef.current.shift();
      if (!next) {
        bannerAnimatingRef.current = false;
        setBanner(null);
        return;
      }

      bannerAnimatingRef.current = true;
      const sequence = bannerSequenceRef.current + 1;
      bannerSequenceRef.current = sequence;
      setBanner(next);
      bannerTranslateX.stopAnimation();
      bannerTranslateX.setValue(-(Math.max(sizeRef.current.width, 360) + 120));

      Animated.sequence([
        Animated.timing(bannerTranslateX, {
          toValue: 0,
          duration: 145,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(820),
        Animated.timing(bannerTranslateX, {
          toValue: -30,
          duration: 60,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(bannerTranslateX, {
          toValue: Math.max(sizeRef.current.width, 360) + 120,
          duration: 145,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished || bannerSequenceRef.current !== sequence) return;
        setBanner(null);
        playNextBanner();
      });
    };

    playNextBanner();
  }, [bannerTranslateX]);

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
    diamondCapturePlayer.muted = false;
    diamondCapturePlayer.volume = 0.88;
    shieldLossExplosionPlayer.muted = false;
    shieldLossExplosionPlayer.volume = 0.92;
    sectorTransitionVictoryPlayer.muted = false;
    sectorTransitionVictoryPlayer.volume = 0.9;
    sevenFireShotPlayer.muted = false;
    sevenFireShotPlayer.volume = 0.55;
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
  }, [
    diamondCapturePlayer,
    pickupChimePlayer,
    sectorTransitionVictoryPlayer,
    shieldLossExplosionPlayer,
    sevenFireShotPlayer,
  ]);

  const playPickupChime = useCallback(() => {
    if (!audioUnlockedRef.current) return;
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

  const playSevenFireShot = useCallback(() => {
    if (!audioUnlockedRef.current) return;
    void audioSessionReadyRef.current.then(async () => {
      sevenFireShotPlayer.muted = false;
      sevenFireShotPlayer.volume = 0.55;
      try {
        await sevenFireShotPlayer.seekTo(0);
      } catch {
        // A freshly loaded native player is already positioned at the start.
      }
      sevenFireShotPlayer.play();
    }).catch((error: unknown) => {
      if (__DEV__) console.warn('Unable to play Seven fire shot', error);
    });
  }, [sevenFireShotPlayer]);

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
    const resolvedDiamond = (RNImage as any).resolveAssetSource?.(diamondSpriteSource);
    const diamondImage = new (globalThis as any).Image();
    diamondImage.decoding = 'async';
    diamondImage.onload = () => {
      if (!cancelled) diamondSpriteImageRef.current = diamondImage;
    };
    diamondImage.src = resolvedDiamond?.uri ?? diamondSpriteSource;
    const resolvedCoreReactorSprite = (RNImage as any).resolveAssetSource?.(coreReactorSpriteSource);
    const coreReactorImage = new (globalThis as any).Image();
    coreReactorImage.decoding = 'async';
    coreReactorImage.onload = () => {
      if (!cancelled) coreReactorImageRef.current = coreReactorImage;
    };
    coreReactorImage.src = resolvedCoreReactorSprite?.uri ?? coreReactorSpriteSource;
    const resolvedSevenFireOrb = (RNImage as any).resolveAssetSource?.(sevenFireOrbSource);
    const sevenFireOrbImage = new (globalThis as any).Image();
    sevenFireOrbImage.decoding = 'async';
    sevenFireOrbImage.onload = () => {
      if (!cancelled) sevenFireOrbImageRef.current = sevenFireOrbImage;
    };
    sevenFireOrbImage.src = resolvedSevenFireOrb?.uri ?? sevenFireOrbSource;
    const resolvedPlayerMissile = (RNImage as any).resolveAssetSource?.(playerMissileSource);
    const playerMissileImage = new (globalThis as any).Image();
    playerMissileImage.decoding = 'async';
    playerMissileImage.onload = () => {
      if (!cancelled) playerMissileImageRef.current = playerMissileImage;
    };
    playerMissileImage.src = resolvedPlayerMissile?.uri ?? playerMissileSource;
    const resolvedSpiderWeb = (RNImage as any).resolveAssetSource?.(spiderWebSource);
    const spiderWebImage = new (globalThis as any).Image();
    spiderWebImage.decoding = 'async';
    spiderWebImage.onload = () => {
      if (!cancelled) spiderWebImageRef.current = spiderWebImage;
    };
    spiderWebImage.src = resolvedSpiderWeb?.uri ?? spiderWebSource;
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
    const resolvedShipSmokeSprite = (RNImage as any).resolveAssetSource?.(shipSmokeSpriteSource);
    const shipSmokeSpriteImage = new (globalThis as any).Image();
    shipSmokeSpriteImage.decoding = 'async';
    shipSmokeSpriteImage.onload = () => {
      if (!cancelled) shipSmokeSpriteImageRef.current = shipSmokeSpriteImage;
    };
    shipSmokeSpriteImage.src = resolvedShipSmokeSprite?.uri ?? shipSmokeSpriteSource;
    Object.entries(LEVEL_BACKGROUND_SOURCES).forEach(([level, source]) => {
      const resolvedBackground = (RNImage as any).resolveAssetSource?.(source);
      const backgroundImage = new (globalThis as any).Image();
      backgroundImage.decoding = 'async';
      backgroundImage.onload = () => {
        if (!cancelled) sectorBackgroundImageRefs.current[Number(level)] = backgroundImage;
      };
      backgroundImage.src = resolvedBackground?.uri ?? source;
    });

    return () => {
      cancelled = true;
      spriteImagesRef.current = {};
      coreReactorImageRef.current = null;
      diamondSpriteImageRef.current = null;
      sevenFireOrbImageRef.current = null;
      playerMissileImageRef.current = null;
      spiderWebImageRef.current = null;
      playerImageRef.current = null;
      cuttingSpriteImageRef.current = null;
      shipSmokeSpriteImageRef.current = null;
      sectorBackgroundImageRefs.current = {};
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
    const previousDiamonds = preserveStats && !resetBoard
      ? g.diamonds.map((diamond) => ({ ...diamond }))
      : createDiamonds(width, height, width / COLS, diamondCountForLevel(previousLevel));
    const previousEnemies = preserveStats && !resetBoard ? g.enemies : [];
    const preserveBombLayout = preserveStats && !resetBoard;
    const previousBombs = preserveBombLayout
      ? g.bombs.map((bomb) => ({ ...bomb }))
      : [];
    const previousSplitShips = preserveStats && !resetBoard
      ? previousEnemies
        .filter((enemy) => (
          enemy.kind === 'SHIP'
          && (enemy.isMini || enemy.splitLevel !== undefined)
          && !enemyIsDestroyed(enemy)
        ))
        .map((enemy) => ({ ...enemy }))
      : [];
    if (!preserveStats) recordBannerShownRef.current = false;
    const cell = width / COLS;
    const bounds = perimeterBounds(width, height, cell);
    const rows = Math.max(18, Math.floor(height / cell));
    const totalPlayableArea = Math.max(1, (bounds.right - bounds.left) * (bounds.bottom - bounds.top));
    const enemies = createEnemies(width, height, cell, previousLevel);
    preserveDestroyedEnemies(
      enemies,
      previousEnemies.filter((enemy) => !enemy.isMini && enemy.splitLevel === undefined),
    );
    if (previousSplitShips.length > 0) {
      enemies.push(...previousSplitShips);
    }
    // A respawn resumes the same sector state, including the exact bomb
    // roster and destroyed flags. Only a new sector/game creates a new draw.
    const bombs = preserveBombLayout
      ? previousBombs
      : createBombs(width, height, cell, previousLevel);
    const respawnPlayer = {
      x: bounds.left + cell,
      y: bounds.bottom + cell * PLAYER_RADIUS_CELLS,
    };
    placeEnemiesInOpenSurface(
      enemies,
      width,
      height,
      cell,
      previousClaimedPolygons,
      previousProtectedTrails,
      [],
      respawnPlayer,
    );
    if (!preserveBombLayout) {
      placeBombsInOpenSurface(
        bombs,
        enemies,
        width,
        height,
        cell,
        previousClaimedPolygons,
        previousProtectedTrails,
        [],
        respawnPlayer,
      );
    }

    gameRef.current = {
      ...g,
      width,
      height,
      cell,
      rows,
      player: respawnPlayer,
      inputDir: ZERO,
      facingDir: { x: 0, y: -1 },
      hasMoveCommand: false,
      cutDir: ZERO,
      cutCoordinate: 0,
      trail: [],
      protectedTrails: previousProtectedTrails,
      enemies,
      diamonds: previousDiamonds,
      bombs,
      projectiles: [],
      missiles: [],
      spiderThreads: [],
      particles: [],
      fusionSparks: [],
      fusion: null,
      smokePuffs: SHIP_SMOKE_RENDER_MODE === 'PARTICLES'
        ? enemies
          .filter((enemy) => enemy.kind === 'SHIP' && !enemyIsDestroyed(enemy))
          .flatMap((enemy) => createShipSmokePuffs(enemy, cell, 2))
        : [],
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
    if (resetBoard && isBossSector(previousLevel)) {
      enqueueBanner({
        kind: 'BOSS',
        level: previousLevel,
        bossKind: bossKindForSector(previousLevel),
      });
    }
  }, [enqueueBanner]);

  const teleportToSector = useCallback((sector: number) => {
    const g = gameRef.current;
    if (!g.initialized) return;
    g.level = Math.round(clamp(sector, 1, MAX_LEVEL));
    resetGame(true, true);
  }, [resetGame]);

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
      onPanResponderGrant: () => {
        audioUnlockedRef.current = true;
      },
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
      g.shields -= 1;
      g.status = 'RESPAWN';
      g.respawnAt = now + CONTACT_FREEZE_DURATION;
      playShieldLossExplosion();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    };

    const addFusionSpark = (
      g: Game,
      sequence: FusionSequence,
      pathDistance: number,
      initialSpread = 1,
    ) => {
      if (g.fusionSparks.length >= 180) return;
      const sample = pointOnPolyline(
        sequence.path,
        sequence.cumulativeLengths,
        pathDistance,
      );
      const normal = { x: -sample.tangent.y, y: sample.tangent.x };
      const lateralOffset = (Math.random() - 0.5) * g.cell * 0.2 * initialSpread;
      const life = 0.22 + Math.random() * 0.38;
      const x = sample.point.x + normal.x * lateralOffset;
      const y = sample.point.y + normal.y * lateralOffset;
      g.fusionSparks.push({
        x,
        y,
        previousX: x,
        previousY: y,
        pathDistance,
        lateralOffset,
        lateralVelocity: (Math.random() - 0.5) * g.cell * (2.6 + Math.random() * 4.2) * initialSpread,
        forwardSpeed: g.cell * (1.1 + Math.random() * 2.9),
        life,
        maxLife: life,
        size: g.cell * (0.018 + Math.random() * 0.038),
        color: ['#ffffff', '#fff5b0', '#ffd447', '#ff8a22', '#ff4b16'][Math.floor(Math.random() * 5)],
        streak: Math.random() > 0.22,
      });
    };

    const startFusionDeath = (g: Game, impactPoint: Point) => {
      if (g.status !== 'PLAYING') return;
      if (g.trail.length < 2) {
        explode(g, Date.now());
        return;
      }

      const metrics = polylineMetrics(g.trail);
      const closest = closestPointOnPolyline(impactPoint, g.trail);
      const path = [closest.point];
      for (let index = 1; index < g.trail.length; index += 1) {
        if (metrics.cumulativeLengths[index] > closest.pathDistance + 0.01) {
          path.push({ ...g.trail[index] });
        }
      }
      const lastPathPoint = path[path.length - 1];
      if (
        !lastPathPoint
        || Math.hypot(lastPathPoint.x - g.player.x, lastPathPoint.y - g.player.y) > g.cell * 0.08
      ) {
        path.push({ ...g.player });
      }
      const pathData = polylineMetrics(path);
      const travelDuration = clamp(pathData.totalLength / 300, 0.58, 1.35);
      const sequence: FusionSequence = {
        path,
        cumulativeLengths: pathData.cumulativeLengths,
        totalLength: pathData.totalLength,
        elapsed: 0,
        travelDuration,
        impact: { ...closest.point },
      };

      g.fusion = sequence;
      g.fusionSparks = [];
      g.inputDir = ZERO;
      g.hasMoveCommand = false;
      g.facingDir = g.cutDir;
      g.status = 'FUSING';
      for (let index = 0; index < 32; index += 1) {
        addFusionSpark(
          g,
          sequence,
          Math.random() * Math.min(g.cell * 0.55, sequence.totalLength),
          1.7,
        );
      }
    };

    const updateFusionDeath = (g: Game, dt: number, now: number) => {
      const sequence = g.fusion;
      if (!sequence) {
        g.status = 'PLAYING';
        return;
      }
      sequence.elapsed += dt;
      const headDistance = sequence.totalLength * clamp(
        sequence.elapsed / sequence.travelDuration,
        0,
        1,
      );

      let activeSparkCount = 0;
      for (let index = 0; index < g.fusionSparks.length; index += 1) {
        const spark = g.fusionSparks[index];
        spark.previousX = spark.x;
        spark.previousY = spark.y;
        spark.pathDistance = Math.min(
          sequence.totalLength,
          spark.pathDistance + spark.forwardSpeed * dt,
        );
        spark.lateralOffset += spark.lateralVelocity * dt;
        spark.lateralVelocity *= 0.93;
        spark.life -= dt;
        const sample = pointOnPolyline(
          sequence.path,
          sequence.cumulativeLengths,
          spark.pathDistance,
        );
        const normal = { x: -sample.tangent.y, y: sample.tangent.x };
        spark.x = sample.point.x + normal.x * spark.lateralOffset;
        spark.y = sample.point.y + normal.y * spark.lateralOffset;
        if (spark.life > 0) {
          g.fusionSparks[activeSparkCount] = spark;
          activeSparkCount += 1;
        }
      }
      g.fusionSparks.length = activeSparkCount;

      const sparksToEmit = sequence.elapsed < sequence.travelDuration ? 7 : 2;
      for (let index = 0; index < sparksToEmit; index += 1) {
        addFusionSpark(
          g,
          sequence,
          Math.max(0, headDistance - Math.random() * g.cell * 0.62),
          1,
        );
      }

      if (sequence.elapsed >= sequence.travelDuration + 0.24) {
        g.fusion = null;
        g.fusionSparks = [];
        g.status = 'PLAYING';
        explode(g, now);
      }
    };

    const neutralizeBomb = (g: Game, bomb: Bomb) => {
      if (bomb.destroyed) return;
      bomb.destroyed = true;
      g.score += BOMB_SCORE;
      enqueueBanner({ kind: 'BOMB', points: BOMB_SCORE });
      for (let index = 0; index < 120; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 35 + Math.random() * 190;
        g.particles.push({
          x: bomb.x,
          y: bomb.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.45 + Math.random() * 0.65,
          size: 0.8 + Math.random() * 2.8,
          color: ['#ffffff', '#ffb02e', '#ff5500', '#00f3ff'][index % 4],
          streak: index % 3 === 0,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const checkBombContact = (g: Game, now: number) => {
      if (g.status !== 'PLAYING') return;
      const playerContactRadius = bombRadius(g.cell) + playerBodyRadius(g.cell);
      const bomb = g.bombs.find((candidate) => (
        !candidate.destroyed
        && (
          Math.hypot(candidate.x - g.player.x, candidate.y - g.player.y) <= playerContactRadius
          || bombTouchesTrail(candidate, g.cell, g.trail)
        )
      ));
      if (bomb) explode(g, now);
    };

    const moveProjectiles = (g: Game, dt: number, now: number) => {
      if (g.status !== 'PLAYING') return;
      const bounds = perimeterBounds(g.width, g.height, g.cell);
      let activeProjectileCount = 0;
      for (let index = 0; index < g.projectiles.length; index += 1) {
        const projectile = g.projectiles[index];
        const from = { x: projectile.x, y: projectile.y };
        projectile.x += projectile.vx * dt;
        projectile.y += projectile.vy * dt;
        projectile.life -= dt;

        const touchesDrone = distanceToSegment(
          g.player,
          from,
          projectile,
        ) <= projectile.radius + playerBodyRadius(g.cell);
        if (touchesDrone) {
          explode(g, now);
          return;
        }

        const blockedByBlue = sevenProjectileTouchesBlueBoundary(
          projectile,
          from,
          projectile,
          bounds,
          g.protectedTrails,
        );
        if (blockedByBlue || projectile.life <= 0) continue;

        g.projectiles[activeProjectileCount] = projectile;
        activeProjectileCount += 1;
      }
      g.projectiles.length = activeProjectileCount;
    };

    const capture = (g: Game, exitDirection?: Direction) => {
      const captureResult = buildOrthogonalCaptureRegions({
        trail: g.trail,
        protectedTrails: g.protectedTrails,
        claimedPolygons: g.claimedPolygons,
        bounds: perimeterBounds(g.width, g.height, g.cell),
        contactTolerance: g.cell * 0.4,
      });
      if (!captureResult || captureResult.regions.length === 0) {
        g.trail = [];
        if (exitDirection) {
          g.player = playerPerimeterSafetyPoint(
            g.player,
            exitDirection,
            perimeterBounds(g.width, g.height, g.cell),
            g.cell,
          );
          g.facingDir = exitDirection;
          g.inputDir = ZERO;
          g.cutDir = ZERO;
          g.hasMoveCommand = false;
        }
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
      if (exitDirection) {
        // Leave the blue perimeter immediately, then stop just behind it
        // instead of continuing toward the physical edge of the arena.
        g.player = playerPerimeterSafetyPoint(
          g.player,
          exitDirection,
          perimeterBounds(g.width, g.height, g.cell),
          g.cell,
        );
        g.facingDir = exitDirection;
        g.inputDir = ZERO;
        g.cutDir = ZERO;
        g.hasMoveCommand = false;
      }
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
        const noActiveTrailContact = g.trail.length < 2
          || !pathTouchesPolygon(g.trail, spriteCorners, PERIMETER_STROKE_WIDTH * 0.5);
        const awayFromPlayer = Math.hypot(x - g.player.x, y - g.player.y)
          > visualRadius + playerBodyRadius(g.cell) * 1.5;
        if (
          !outsideClaimedSurface
          || !noClaimedPolygonOverlap
          || !noProtectedBoundaryContact
          || !noActiveTrailContact
          || !awayFromPlayer
        ) return null;
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

    const splitEnemyIntoEnemies = (
      g: Game,
      enemy: Enemy,
      childIsMiniShip: boolean,
    ): Enemy[] => {
      const bounds = perimeterBounds(g.width, g.height, g.cell);
      const heading = Math.atan2(enemy.vy, enemy.vx);
      const perpendicular = {
        x: -Math.sin(heading),
        y: Math.cos(heading),
      };
      const separation = g.cell * 0.72;
      const childTemplate = {
        ...enemy,
        isMini: childIsMiniShip,
        splitLevel: 1,
        isBoss: false,
        bossTier: undefined,
        respawnAt: 0,
        blockedTime: 0,
        edgeTurnTimer: 0,
        edgeDirectionX: 0,
        edgeDirectionY: 0,
      };
      const childRadius = enemyVisualRadius(childTemplate, g.cell);

      return [-1, 1].map((side, index) => {
        const x = clamp(
          enemy.x + perpendicular.x * separation * side,
          bounds.left + childRadius,
          bounds.right - childRadius,
        );
        const y = clamp(
          enemy.y + perpendicular.y * separation * side,
          bounds.top + childRadius,
          bounds.bottom - childRadius,
        );
        const miniHeading = heading + side * 0.42;
        return {
          ...childTemplate,
          x,
          y,
          vx: Math.cos(miniHeading) * enemy.speed,
          vy: Math.sin(miniHeading) * enemy.speed,
          phase: enemy.phase + 0.6 + index * 0.8,
          spin: enemy.spin + side * 0.16,
          routePhase: enemy.routePhase + side * 0.35,
          targetX: x,
          targetY: y,
          visualRotation: miniHeading + Math.PI / 2,
        };
      });
    };

    const burstEnemy = (
      g: Game,
      enemy: Enemy,
      now: number,
      fromMissile = false,
    ) => {
      const splitOnMissile = fromMissile
        && !enemy.isMini;
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
      // A destroyed enemy stays permanently inactive for this sector. The
      // next sector creates a fresh enemy roster through resetGame.
      const splitShips = splitOnMissile
        ? splitEnemyIntoEnemies(g, enemy, !enemy.isBoss)
        : [];
      enemy.respawnAt = Number.POSITIVE_INFINITY;
      enemy.vx = 0;
      enemy.vy = 0;
      if (splitOnMissile) {
        g.enemies.push(...splitShips);
        enqueueBanner({
          kind: enemy.isBoss ? 'BOSS_SPLIT' : 'SPLIT',
          points: ENEMY_SCORE[enemy.kind],
          enemyKind: enemy.kind,
        });
      } else {
        enqueueBanner({
          kind: 'ENEMY',
          points: ENEMY_SCORE[enemy.kind],
          enemyKind: enemy.kind,
        });
      }
      if (g.enemies.every((candidate) => enemyIsDestroyed(candidate))) {
        enqueueBanner({ kind: 'CLEAN' });
      }
      if (enemy.kind === 'SHIP') {
        // Smoke is only emitted by the ship. Remove the old trail while it
        // is off-screen so it cannot remain at the previous spawn point.
        g.smokePuffs.length = 0;
        g.smokeAccumulator = 0;
        if (SHIP_SMOKE_RENDER_MODE === 'PARTICLES' && splitShips.length > 0) {
          g.smokePuffs.push(...splitShips.flatMap((splitShip) => (
            createShipSmokePuffs(splitShip, g.cell, 3)
          )));
        }
      }
    };

    const launchPlayerMissiles = (g: Game) => {
      if (!sectorHasLiveTargets(g.enemies, g.bombs)) {
        g.missiles.length = 0;
        return;
      }
      g.missiles.push(...createPlayerMissileVolley(g.player, g.cell));
    };

    const movePlayerMissiles = (g: Game, dt: number, now: number) => {
      if (g.status !== 'PLAYING') return;
      let activeMissileCount = 0;
      for (let index = 0; index < g.missiles.length; index += 1) {
        const missile = g.missiles[index];
        const from = { x: missile.x, y: missile.y };
        const to = {
          x: missile.x + missile.vx * dt,
          y: missile.y + missile.vy * dt,
        };
        missile.x = to.x;
        missile.y = to.y;
        missile.life -= dt;

        let hitTarget = false;
        for (const enemy of g.enemies) {
          if (enemyIsDestroyed(enemy) || enemy.respawnAt > now) continue;
          const touched = enemyCollisionCircles(enemy, g.cell, enemy.x, enemy.y).some(({ center, radius }) => (
            distanceToSegment(center, from, to) <= radius + missile.radius
          ));
          if (touched) {
            burstEnemy(g, enemy, now, true);
            hitTarget = true;
            break;
          }
        }
        if (!hitTarget) {
          const bomb = g.bombs.find((candidate) => (
            !candidate.destroyed
            && distanceToSegment(candidate, from, to)
              <= bombRadius(g.cell) + missile.radius
          ));
          if (bomb) {
            neutralizeBomb(g, bomb);
            hitTarget = true;
          }
        }

        if (
          !hitTarget
          && missile.life > 0
        ) {
          g.missiles[activeMissileCount] = missile;
          activeMissileCount += 1;
        }
      }
      g.missiles.length = activeMissileCount;
    };

    const moveEnemies = (g: Game, dt: number, now: number) => {
      const bounds = perimeterBounds(g.width, g.height, g.cell);
      g.spiderThreads ??= [];
      let activeThreadCount = 0;
      for (let index = 0; index < g.spiderThreads.length; index += 1) {
        const thread = g.spiderThreads[index];
        const owner = g.enemies[thread.ownerIndex];
        if (!thread.anchored) {
          const travelDistance = thread.projectileSpeed * dt;
          const distanceToTarget = Math.hypot(
            thread.target.x - thread.end.x,
            thread.target.y - thread.end.y,
          );
          if (distanceToTarget <= travelDistance) {
            const directionLength = Math.hypot(thread.vx, thread.vy) || 1;
            const perpendicularX = -thread.vy / directionLength;
            const perpendicularY = thread.vx / directionLength;
            const halfLength = g.cell * thread.threadLengthCells * 0.5;
            const clampThreadPoint = (point: Point): Point => ({
              x: clamp(point.x, bounds.left + g.cell * 0.16, bounds.right - g.cell * 0.16),
              y: clamp(point.y, bounds.top + g.cell * 0.16, bounds.bottom - g.cell * 0.16),
            });
            thread.start = clampThreadPoint({
              x: thread.target.x - perpendicularX * halfLength,
              y: thread.target.y - perpendicularY * halfLength,
            });
            thread.end = clampThreadPoint({
              x: thread.target.x + perpendicularX * halfLength,
              y: thread.target.y + perpendicularY * halfLength,
            });
            thread.anchored = true;
            thread.remaining = thread.activeDuration;
          } else {
            thread.end = {
              x: thread.end.x + thread.vx * dt,
              y: thread.end.y + thread.vy * dt,
            };
          }
        } else {
          thread.remaining -= dt;
        }
        if (
          thread.remaining > 0
          && (!owner || !enemyIsDestroyed(owner))
        ) {
          g.spiderThreads[activeThreadCount] = thread;
          activeThreadCount += 1;
        }
      }
      g.spiderThreads.length = activeThreadCount;
      if (SHIP_SMOKE_RENDER_MODE === 'PARTICLES') {
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
      }
      g.enemies.forEach((enemy, enemyIndex) => {
        if (g.status !== 'PLAYING') return;
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
          if (enemy.kind === 'SPIDER') {
            enemy.spiderThreadTimer = spiderDifficultyFor(enemy.spiderGrade, enemy.bossTier).initialDelay;
          }
          enemy.targetX = enemy.x;
          enemy.targetY = enemy.y;
          enemy.thinkTimer = 0;
          if (SHIP_SMOKE_RENDER_MODE === 'PARTICLES' && enemy.kind === 'SHIP') {
            g.smokePuffs.push(...createShipSmokePuffs(enemy, g.cell, 5));
          }
        }

        enemy.phase += dt * (enemy.kind === 'DRAGON' ? 2.3 : enemy.kind === 'SPIDER' ? 3.1 : 1.7);
        enemy.spin += dt * (enemy.kind === 'DRAGON' ? -1.15 : enemy.kind === 'SEVEN' ? 0.42 : enemy.kind === 'SHIP' ? 0.18 : -0.08);
        enemy.routePhase += dt * (enemy.pattern === 'ZIGZAG' ? 2.1 : 0.85);
        if (enemy.kind === 'SEVEN') {
          enemy.sevenFireTimer = (enemy.sevenFireTimer ?? SEVEN_PROJECTILE_INTERVAL) - dt;
        }
        if (enemy.kind === 'SPIDER') {
          enemy.spiderThreadTimer = (
            enemy.spiderThreadTimer
            ?? spiderDifficultyFor(enemy.spiderGrade, enemy.bossTier).initialDelay
          ) - dt;
        }
        enemy.edgeTurnTimer = Math.max(0, enemy.edgeTurnTimer - dt);

        // Do not add a safety rectangle around the sprite here. The exact
        // transformed footprint below is the collision boundary.
        const minX = bounds.left;
        const maxX = bounds.right;
        const minY = bounds.top;
        const maxY = bounds.bottom;
        const bodyRadius = Math.max(
          enemyRadius(enemy, g.cell) * 0.9,
          g.cell * (enemy.isMini ? 0.36 : 0.72),
        );
        const trailTouchesEnemyBody = (trail: Point[], x: number, y: number) => {
          if (trail.length < 2) return false;
          const collisionCircles = enemyCollisionCircles(enemy, g.cell, x, y);
          const trailStrokeRadius = PERIMETER_STROKE_WIDTH * 0.5;
          return collisionCircles.some(({ center, radius }) => (
            trail.slice(1).some((trailPoint, index) => (
              distanceToSegment(
                center,
                trail[index],
                trailPoint,
              ) <= radius + trailStrokeRadius
            ))
          ));
        };
        const enemyTouchesProtectedBoundary = (x: number, y: number) => (
          g.protectedTrails.some((protectedTrail) => (
            trailTouchesEnemyBody(protectedTrail, x, y)
          ))
        );
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
        const enemyTouchesActiveTrail = (x: number, y: number) => (
          trailTouchesEnemyBody(g.trail, x, y)
        );
        const enemySweepTouchesTrail = (
          trail: Point[],
          fromX: number,
          fromY: number,
          toX: number,
          toY: number,
        ) => {
          if (trail.length < 2) return false;
          const fromCircles = enemyCollisionCircles(enemy, g.cell, fromX, fromY);
          const toCircles = enemyCollisionCircles(enemy, g.cell, toX, toY);
          const trailStrokeRadius = PERIMETER_STROKE_WIDTH * 0.5;
          return fromCircles.some((fromCircle, index) => {
            const toCircle = toCircles[index];
            return trail.slice(1).some((trailPoint, trailIndex) => (
              distanceBetweenSegments(
                fromCircle.center,
                toCircle.center,
                trail[trailIndex],
                trailPoint,
              ) <= fromCircle.radius + trailStrokeRadius
            ));
          });
        };
        const enemySweepTouchesProtectedTrail = (
          fromX: number,
          fromY: number,
          toX: number,
          toY: number,
        ) => g.protectedTrails.some((protectedTrail) => (
          enemySweepTouchesTrail(protectedTrail, fromX, fromY, toX, toY)
        ));
        if (enemyTouchesActiveTrail(enemy.x, enemy.y)) {
          startFusionDeath(g, enemy);
          return;
        }
        const fullyEnclosedAt = (x: number, y: number) => (
          pointInsideClaimedSurface({ x, y }, g.claimedPolygons, g.cell * 0.08)
          && enemySpriteFootprint(enemy, g.cell, x, y)
            .every((point) => pointInsideClaimedSurface(point, g.claimedPolygons, g.cell * 0.08))
        );
        const recoverEnemyFromSoftContact = () => {
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
          recoverEnemyFromSoftContact();
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
        if (!fullyEnclosedAt(enemy.x, enemy.y) && !enemyFitsAt(enemy.x, enemy.y)) {
          // Protected red trails remain solid barriers, but never become a
          // deadlock: move the enemy back to its last valid surface or to
          // the nearest valid point beside the line.
          recoverEnemyFromSoftContact();
        }
        if (enemyFitsAt(enemy.x, enemy.y)) {
          enemy.lastSafeX = enemy.x;
          enemy.lastSafeY = enemy.y;
        }

        const distanceToPlayer = Math.hypot(enemy.x - g.player.x, enemy.y - g.player.y);
        const maxDistance = Math.hypot(g.width, g.height) * 0.56;
        const farSlowdown = clamp(1 - distanceToPlayer / maxDistance, 0.42, 1);
        const currentLength = Math.hypot(enemy.vx, enemy.vy) || enemy.speed;
        const isDragon = enemy.kind === 'DRAGON';
        const dragonIsCutting = isDragon && g.trail.length > 0;
        let desiredSpeed = isDragon
          ? dragonSpeedFor(enemy, dragonIsCutting)
          : enemy.speed;
        let desiredVelocity: Point;

        if (enemy.behavior === 'PLANNED') {
          enemy.thinkTimer -= dt;
          if (enemy.thinkTimer <= 0) {
            const playerDirection = g.trail.length > 0
              ? g.cutDir
              : (g.inputDir.x !== 0 || g.inputDir.y !== 0 ? g.inputDir : g.facingDir);
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
            const idealDistance = Math.min(g.width, g.height) * (
              isDragon
                ? (g.trail.length > 0 ? 0.075 : 0.11)
                : 0.18
            );
            let bestScore = Number.POSITIVE_INFINITY;
            let bestTarget = { x: planningCenter.x, y: planningCenter.y };

            for (let candidateIndex = 0; candidateIndex < (isDragon ? 12 : 8); candidateIndex += 1) {
              const candidateAngle = playerAngle
                + orbitDirection * (isDragon ? 0.16 + candidateIndex * 0.28 : 0.55 + candidateIndex * 0.62)
                + Math.sin(enemy.routePhase) * (isDragon ? 0.08 : 0.12);
              const candidateRadius = idealDistance * (
                isDragon
                  ? 0.52 + (candidateIndex % 4) * 0.07
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
          const planningBias = enemy.kind === 'DRAGON' ? 0.9 : 0.76;
          desiredVelocity = {
            x: (enemy.vx / currentLength) * (1 - planningBias) + (targetVector.x / targetLength) * planningBias,
            y: (enemy.vy / currentLength) * (1 - planningBias) + (targetVector.y / targetLength) * planningBias,
          };
          // The Dragon stays readable while cruising and only accelerates
          // during a cut, without the extreme burst used by early tuning.
          if (!isDragon) desiredSpeed *= farSlowdown;
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

        const previousEnemyX = enemy.x;
        const previousEnemyY = enemy.y;
        const nextX = enemy.x + enemy.vx * dt;
        const nextY = enemy.y + enemy.vy * dt;
        const canMoveFull = enemyCanMoveAt(nextX, nextY)
          && !enemySweepTouchesProtectedTrail(enemy.x, enemy.y, nextX, nextY);
        const canMoveX = enemyCanMoveAt(nextX, enemy.y)
          && !enemySweepTouchesProtectedTrail(enemy.x, enemy.y, nextX, enemy.y);
        const canMoveY = enemyCanMoveAt(enemy.x, nextY)
          && !enemySweepTouchesProtectedTrail(enemy.x, enemy.y, enemy.x, nextY);
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

        if (enemy.kind === 'SHIP') {
          const velocityLength = Math.hypot(enemy.vx, enemy.vy);
          if (velocityLength > 0.01) {
            const targetRotation = Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2;
            enemy.visualRotation = enemy.visualRotation === undefined
              ? targetRotation
              : rotateAngleTowards(
                enemy.visualRotation,
                targetRotation,
                SHIP_ROTATION_SPEED * dt,
              );
          }
        }

        if (enemySweepTouchesTrail(g.trail, previousEnemyX, previousEnemyY, enemy.x, enemy.y)) {
          startFusionDeath(g, enemy);
          return;
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
          return;
        }
        if (enemy.kind === 'SEVEN' && (enemy.sevenFireTimer ?? 0) <= 0) {
          g.projectiles.push(...createSevenVolley(enemy, g.cell));
          playSevenFireShot();
          enemy.sevenFireTimer = SEVEN_PROJECTILE_INTERVAL;
        }
        if (
          enemy.kind === 'SPIDER'
          && (enemy.spiderThreadTimer ?? 0) <= 0
          && !g.spiderThreads.some((thread) => thread.ownerIndex === enemyIndex)
        ) {
          const droneDirection = g.trail.length > 0
            ? g.cutDir
            : (g.inputDir.x !== 0 || g.inputDir.y !== 0)
              ? g.inputDir
              : g.hasMoveCommand
                ? g.facingDir
                : ZERO;
          const droneVelocity = {
            x: droneDirection.x * 118,
            y: droneDirection.y * 118,
          };
          const offsetX = g.player.x - enemy.x;
          const offsetY = g.player.y - enemy.y;
          const velocitySquared = droneVelocity.x ** 2 + droneVelocity.y ** 2;
          const spiderDifficulty = spiderDifficultyFor(enemy.spiderGrade, enemy.bossTier);
          const projectileSpeed = spiderDifficulty.projectileSpeed;
          const projectileSquared = projectileSpeed ** 2;
          const quadraticA = velocitySquared - projectileSquared;
          const quadraticB = 2 * (offsetX * droneVelocity.x + offsetY * droneVelocity.y);
          const quadraticC = offsetX ** 2 + offsetY ** 2;
          const discriminant = quadraticB ** 2 - 4 * quadraticA * quadraticC;
          const roots = discriminant >= 0 && Math.abs(quadraticA) > 0.001
            ? [
                (-quadraticB - Math.sqrt(discriminant)) / (2 * quadraticA),
                (-quadraticB + Math.sqrt(discriminant)) / (2 * quadraticA),
              ].filter((root) => root > 0)
            : [];
          const interceptTime = roots.length > 0
            ? Math.min(...roots)
            : Math.max(0, Math.hypot(offsetX, offsetY) / projectileSpeed);
          const isDroneMoving = droneVelocity.x !== 0 || droneVelocity.y !== 0;
          const flightTime = clamp(
            interceptTime + (isDroneMoving ? spiderDifficulty.extraLeadTime : 0),
            0.22,
            1.15,
          );
          const target = {
            x: g.player.x + droneVelocity.x * flightTime,
            y: g.player.y + droneVelocity.y * flightTime,
          };
          const clampThreadPoint = (point: Point): Point => ({
            x: clamp(
              point.x,
              bounds.left + g.cell * spiderDifficulty.webSizeCells * 0.5,
              bounds.right - g.cell * spiderDifficulty.webSizeCells * 0.5,
            ),
            y: clamp(
              point.y,
              bounds.top + g.cell * spiderDifficulty.webSizeCells * 0.5,
              bounds.bottom - g.cell * spiderDifficulty.webSizeCells * 0.5,
            ),
          });
          const clampedTarget = clampThreadPoint(target);
          const launchX = clampedTarget.x - enemy.x;
          const launchY = clampedTarget.y - enemy.y;
          const launchLength = Math.hypot(launchX, launchY) || 1;
          const launchVx = (launchX / launchLength) * projectileSpeed;
          const launchVy = (launchY / launchLength) * projectileSpeed;
          const actualFlightTime = Math.max(
            0.2,
            Math.hypot(launchX, launchY) / projectileSpeed,
          );
          g.spiderThreads.push({
            start: { x: enemy.x, y: enemy.y },
            end: { x: enemy.x, y: enemy.y },
            target: clampedTarget,
            vx: launchVx,
            vy: launchVy,
            projectileSpeed,
            webSizeCells: spiderDifficulty.webSizeCells,
            webRadiusCells: spiderDifficulty.webRadiusCells,
            slowFactor: spiderDifficulty.slowFactor,
            threadLengthCells: spiderDifficulty.threadLengthCells,
            activeDuration: spiderDifficulty.activeDuration,
            ownerIndex: enemyIndex,
            remaining: spiderDifficulty.activeDuration + actualFlightTime,
            anchored: false,
          });
          enemy.spiderThreadTimer = spiderDifficulty.cooldown;
        }

        if (SHIP_SMOKE_RENDER_MODE === 'PARTICLES' && enemy.kind === 'SHIP') {
          const velocityLength = Math.hypot(enemy.vx, enemy.vy);
          if (velocityLength > 8) {
            g.smokeAccumulator += dt;
            if (g.smokeAccumulator >= 0.07) {
              if (g.smokePuffs.length < MAX_SMOKE_PUFFS) {
                g.smokePuffs.push(...createShipSmokePuffs(enemy, g.cell, 1));
              }
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
      // Keep hot-reloaded sessions compatible with the new web state.
      g.spiderThreads ??= [];
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

      if (g.status === 'FUSING') {
        updateFusionDeath(g, dt, now);
        return;
      }

      if (g.status === 'RESPAWN') {
        if (now >= g.respawnAt) {
          if (g.shields <= 0) {
            enqueueBanner({ kind: 'GAME_OVER', score: g.score });
            resetGame(false);
          } else {
            resetGame(true);
          }
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
          let diamondCaptured = false;
          if (completedPolygons.length > 0) {
            g.claimedPolygons.push(...completedPolygons);
            g.capturedArea = Math.min(
              g.totalPlayableArea,
              g.claimedPolygons.reduce((area, polygon) => area + polygonArea(polygon), 0),
            );
            g.bombs.forEach((bomb) => {
              if (
                !bomb.destroyed
                && captureRegionsOverlapCircle(bomb, bombRadius(g.cell), completedPolygons)
              ) {
                neutralizeBomb(g, bomb);
              }
            });
            g.diamonds.forEach((diamond) => {
              if (
                diamond.collected
                || !captureRegionsOverlapCircle(diamond, g.cell * 0.55, completedPolygons)
              ) {
                return;
              }
              diamond.collected = true;
              g.score += DIAMOND_SCORE;
              diamondCaptured = true;
              playDiamondCapture();
              enqueueBanner({ kind: 'DIAMOND', points: DIAMOND_SCORE });
              for (let particleIndex = 0; particleIndex < 90; particleIndex += 1) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 35 + Math.random() * 180;
                g.particles.push({
                  x: diamond.x,
                  y: diamond.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  life: 0.45 + Math.random() * 0.55,
                  size: 1 + Math.random() * 2.8,
                  color: ['#ffffff', '#00f3ff', '#ff2bb5', '#b8ff4a'][particleIndex % 4],
                });
              }
            });
            g.enemies.forEach((enemy) => {
              if (enemy.respawnAt > now) return;
              const enemyPoints = enemySpriteFootprint(enemy, g.cell, enemy.x, enemy.y);
              const enemyInside = completedPolygons.some((polygon) => (
                enemyPoints.length > 0
                && enemyPoints.every((point) => pointInPolygon(point, polygon))
              ));
              if (enemyInside) burstEnemy(g, enemy, now);
            });
            g.score += Math.max(100, Math.round((g.pendingCaptureArea / (g.cell * g.cell)) * 20));
            if (g.level < MAX_LEVEL && g.capturedArea / g.totalPlayableArea >= LEVEL_CAPTURE_TARGET / 100) {
              const nextLevel = Math.min(MAX_LEVEL, g.level + 1);
              enqueueBanner({ kind: 'SECTOR', level: nextLevel });
              playSectorTransition();
              g.level = nextLevel;
              resetGame(true, true);
              return;
            }
            if (sectorHasLiveTargets(g.enemies, g.bombs)) {
              launchPlayerMissiles(g);
            } else {
              g.missiles.length = 0;
            }
          }
          g.fillQueue = [];
          g.fillCursor = 0;
          g.scanY = 0;
          g.pendingCapturePolygons = [];
          g.pendingCaptureArea = 0;
          if (!diamondCaptured) playPickupChime();
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
      const baseSpeed = 118;
      const baseDistance = baseSpeed * dt;
      if (direction.x !== 0 || direction.y !== 0) {
        const steps = Math.max(1, Math.ceil(baseDistance));

        for (let i = 0; i < steps; i += 1) {
          const bounds = perimeterBounds(g.width, g.height, g.cell);
          const previous = { ...g.player };
          const activeTrail = g.trail.length > 0;
          const probe = {
            x: g.player.x + direction.x * (baseDistance / steps),
            y: g.player.y + direction.y * (baseDistance / steps),
          };
          const caughtInSpiderWeb = g.spiderThreads.some((thread) => (
            spiderThreadIsActive(thread)
            && (
              thread.anchored
                ? Math.hypot(probe.x - thread.target.x, probe.y - thread.target.y)
                  <= playerBodyRadius(g.cell) + g.cell * thread.webRadiusCells
                : distanceBetweenSegments(
                  g.player,
                  probe,
                  thread.start,
                  thread.end,
                ) <= playerBodyRadius(g.cell) + g.cell * 0.12
            )
          ));
          const movementDistance = (
            (caughtInSpiderWeb ? baseSpeed * (
              g.spiderThreads.find((thread) => spiderThreadIsActive(thread)
                && thread.anchored
                && Math.hypot(probe.x - thread.target.x, probe.y - thread.target.y)
                  <= playerBodyRadius(g.cell) + g.cell * thread.webRadiusCells
              )?.slowFactor ?? 0.25
            ) : baseSpeed) * dt
          ) / steps;
          const stepX = direction.x * movementDistance;
          const stepY = direction.y * movementDistance;
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
              capture(g, direction);
            } else {
              g.trail = [];
              g.player = playerPerimeterSafetyPoint(
                g.player,
                direction,
                bounds,
                g.cell,
              );
              g.facingDir = direction;
              g.inputDir = ZERO;
              g.cutDir = ZERO;
              g.hasMoveCommand = false;
            }
            break;
          }

          // Keep the outer playable band narrow: the drone can stop only a
          // few pixels outside the blue perimeter, never at the phone edge.
          const outerBounds = playerOuterBounds(bounds, g.cell);
          next.x = clamp(next.x, outerBounds.left, outerBounds.right);
          next.y = clamp(next.y, outerBounds.top, outerBounds.bottom);
          g.player = next;
           const movementHitBomb = g.bombs.some((bomb) => (
             !bomb.destroyed && bombTouchesSegment(bomb, g.cell, previous, g.player)
           ));
           if (movementHitBomb) {
             explode(g, now);
             break;
           }
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

      movePlayerMissiles(g, dt, now);
      if (g.status !== 'PLAYING') return;
      moveProjectiles(g, dt, now);
      if (g.status !== 'PLAYING') return;
      checkBombContact(g, now);
      if (g.status !== 'PLAYING') return;
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
      context.globalAlpha = 1;
      const background = sectorBackgroundImageRefs.current[g.level];
      if (background) {
        const sourceWidth = background.naturalWidth || background.width;
        const sourceHeight = background.naturalHeight || background.height;
        const scale = Math.max(g.width / sourceWidth, g.height / sourceHeight);
        const drawWidth = sourceWidth * scale;
        const drawHeight = sourceHeight * scale;
        context.drawImage(
          background,
          (g.width - drawWidth) * 0.5,
          (g.height - drawHeight) * 0.5,
          drawWidth,
          drawHeight,
        );
      } else {
        context.fillStyle = '#000000';
        context.fillRect(0, 0, g.width, g.height);
      }

       context.globalCompositeOperation = 'source-over';
        context.globalAlpha = initialMapOpacityForLevel(g.level);
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
       const bounds = perimeterBounds(g.width, g.height, g.cell);
        if (g.level === 1) {
          context.strokeStyle = 'rgba(0,243,255,0.11)';
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
        } else if (g.level === 2) {
          const centerX = g.width * 0.5;
          const centerY = g.height * 0.5;
          const radiusX = g.width * 0.48;
          const radiusY = g.height * 0.46;
          context.strokeStyle = 'rgba(43,185,207,0.055)';
          context.lineWidth = 0.65;
          for (let ring = 1; ring <= 7; ring += 1) {
            context.beginPath();
            context.ellipse(
              centerX,
              centerY,
              Math.min(radiusX, radiusY) * (ring / 7),
              Math.min(radiusX, radiusY) * (ring / 7),
              0,
              0,
              Math.PI * 2,
            );
            context.stroke();
          }
          for (let ray = 0; ray < 16; ray += 1) {
            const angle = (Math.PI * 2 * ray) / 16;
            context.beginPath();
            context.moveTo(centerX, centerY);
            context.lineTo(
              centerX + Math.cos(angle) * radiusX,
              centerY + Math.sin(angle) * radiusY,
            );
            context.stroke();
          }
        } else {
          const spacing = g.cell * 2.4;
          context.strokeStyle = 'rgba(116,107,255,0.04)';
          context.lineWidth = 0.65;
          for (let offset = -g.height; offset < g.width + g.height; offset += spacing) {
            context.beginPath();
            context.moveTo(offset, 0);
            context.lineTo(offset + g.height, g.height);
            context.stroke();
            context.beginPath();
            context.moveTo(offset, g.height);
            context.lineTo(offset + g.height, 0);
            context.stroke();
          }
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
      if (g.fusion) {
        const headDistance = g.fusion.totalLength * clamp(
          g.fusion.elapsed / g.fusion.travelDuration,
          0,
          1,
        );
        const fusionHead = pointOnPolyline(
          g.fusion.path,
          g.fusion.cumulativeLengths,
          headDistance,
        ).point;
        context.shadowColor = '#ff6a16';
        context.shadowBlur = g.cell * 0.28;
        context.fillStyle = '#ff6a16';
        context.globalAlpha = 0.3;
        context.beginPath();
        context.arc(fusionHead.x, fusionHead.y, g.cell * 0.23, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = g.cell * 0.08;
        context.fillStyle = '#fff5bd';
        context.globalAlpha = 0.92;
        context.beginPath();
        context.arc(fusionHead.x, fusionHead.y, g.cell * 0.1, 0, Math.PI * 2);
        context.fill();
      }
      g.fusionSparks.forEach((spark) => {
        context.globalAlpha = clamp(spark.life / spark.maxLife, 0, 1);
        context.strokeStyle = spark.color;
        context.fillStyle = spark.color;
        if (spark.streak) {
          context.lineWidth = spark.size;
          context.lineCap = 'round';
          context.beginPath();
          context.moveTo(spark.x, spark.y);
          context.lineTo(spark.previousX, spark.previousY);
          context.stroke();
        } else {
          context.fillRect(
            spark.x - spark.size * 0.5,
            spark.y - spark.size * 0.5,
            spark.size,
            spark.size,
          );
        }
      });
      context.lineCap = 'butt';
      context.globalAlpha = 1;

       context.globalCompositeOperation = 'lighter';
       if (SHIP_SMOKE_RENDER_MODE === 'PARTICLES') {
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
       } else {
         const smokeImage = shipSmokeSpriteImageRef.current;
         if (smokeImage) {
           const smokeFrame = Math.floor(g.frame / SHIP_SMOKE_SPRITE_FRAME_DURATION)
             % SHIP_SMOKE_SPRITE_FRAME_COUNT;
           g.enemies.forEach((enemy) => {
             if (enemy.kind !== 'SHIP' || enemy.respawnAt > now) return;
             const smokePosition = shipSmokePosition(enemy, g.cell);
             const motion = enemyAnimationTransform(enemy, g.cell);
              const smokeSize = g.cell * (enemy.isMini ? 0.9 : 1.8);
             context.save();
             context.globalAlpha = 0.58;
             context.translate(smokePosition.x, smokePosition.y + motion.offsetY);
             context.rotate(motion.rotation);
             context.drawImage(
               smokeImage,
               smokeFrame * SHIP_SMOKE_SPRITE_FRAME_SIZE,
               0,
               SHIP_SMOKE_SPRITE_FRAME_SIZE,
               SHIP_SMOKE_SPRITE_FRAME_SIZE,
               -smokeSize / 2,
               -smokeSize / 2,
               smokeSize,
               smokeSize,
             );
             context.restore();
           });
         }
       }

         context.globalCompositeOperation = 'lighter';
          const spiderWebImage = spiderWebImageRef.current;
          g.spiderThreads.forEach((thread) => {
            const active = spiderThreadIsActive(thread);
            if (thread.anchored && spiderWebImage) {
              const webSize = g.cell * thread.webSizeCells;
              context.save();
              context.globalAlpha = clamp(0.6 + thread.remaining * 0.08, 0.6, 0.88);
              context.shadowColor = '#00f3ff';
              context.shadowBlur = g.cell * 0.16;
              context.drawImage(
                spiderWebImage,
                thread.target.x - webSize / 2,
                thread.target.y - webSize / 2,
                webSize,
                webSize,
              );
              context.restore();
              return;
            }
            context.save();
            context.globalAlpha = active ? 0.82 : 0.94;
            context.lineCap = 'round';
            context.setLineDash([]);
            context.strokeStyle = '#fff3d6';
            context.shadowColor = '#ff2bb5';
            context.shadowBlur = 9;
            context.lineWidth = 2.8;
            context.beginPath();
            context.moveTo(thread.start.x, thread.start.y);
            context.lineTo(thread.end.x, thread.end.y);
            context.stroke();
            context.shadowColor = '#00f3ff';
            context.shadowBlur = 4;
            context.strokeStyle = '#00f3ff';
            context.lineWidth = 0.72;
            context.beginPath();
            context.moveTo(thread.start.x, thread.start.y);
            context.lineTo(thread.end.x, thread.end.y);
            context.stroke();
            context.shadowColor = '#fff3d6';
            context.shadowBlur = 7;
            context.fillStyle = '#fff3d6';
            context.beginPath();
            context.arc(thread.end.x, thread.end.y, 3.2, 0, Math.PI * 2);
            context.fill();
            context.restore();
          });
        const diamondImage = diamondSpriteImageRef.current;
        if (diamondImage) {
         const diamondSize = g.cell * 1.5;
          const diamondFrame = Math.floor(g.frame / DIAMOND_SPRITE_FRAME_DURATION)
            % DIAMOND_SPRITE_FRAME_COUNT;
         g.diamonds.forEach((diamond) => {
           if (diamond.collected) return;
           context.save();
           context.translate(
             diamond.x,
             diamond.y + Math.sin(g.frame * 0.05 + diamond.phase) * g.cell * 0.08,
           );
            context.globalCompositeOperation = 'source-over';
            context.shadowColor = 'transparent';
            context.shadowBlur = 0;
            context.drawImage(
              diamondImage,
              diamondFrame * DIAMOND_SPRITE_FRAME_SIZE,
              0,
              DIAMOND_SPRITE_FRAME_SIZE,
              DIAMOND_SPRITE_FRAME_SIZE,
              -diamondSize / 2,
              -diamondSize / 2,
              diamondSize,
              diamondSize,
            );
           context.restore();
         });
       }
       const coreReactorImage = coreReactorImageRef.current;
       if (coreReactorImage) {
         const bombFrame = Math.floor(g.frame / CORE_REACTOR_SPRITE_FRAME_DURATION)
           % CORE_REACTOR_SPRITE_FRAME_COUNT;
         const bombSize = g.cell * 1.45;
         g.bombs.forEach((bomb) => {
           if (bomb.destroyed) return;
           context.save();
           context.globalCompositeOperation = 'source-over';
           context.globalAlpha = 0.98;
           context.drawImage(
             coreReactorImage,
             bombFrame * CORE_REACTOR_SPRITE_FRAME_SIZE,
             0,
             CORE_REACTOR_SPRITE_FRAME_SIZE,
             CORE_REACTOR_SPRITE_FRAME_SIZE,
             bomb.x - bombSize / 2,
             bomb.y - bombSize / 2,
             bombSize,
             bombSize,
           );
           context.restore();
         });
       }
       const sevenFireOrbImage = sevenFireOrbImageRef.current;
       if (sevenFireOrbImage) {
         const projectileSize = sevenProjectileSize(g.cell);
         context.globalCompositeOperation = 'lighter';
         context.globalAlpha = 0.96;
         g.projectiles.forEach((projectile) => {
           context.drawImage(
             sevenFireOrbImage,
             projectile.x - projectileSize / 2,
             projectile.y - projectileSize / 2,
             projectileSize,
             projectileSize,
           );
         });
         context.globalAlpha = 1;
       }
       const playerMissileImage = playerMissileImageRef.current;
       if (playerMissileImage) {
         const missileSize = playerMissileSize(g.cell);
         context.save();
         context.globalCompositeOperation = 'lighter';
         context.globalAlpha = 0.98;
         context.shadowColor = '#00f3ff';
         context.shadowBlur = g.cell * 0.22;
         g.missiles.forEach((missile) => {
           if (!pointInsidePerimeter(missile, bounds)) return;
           context.save();
           context.translate(missile.x, missile.y);
           context.rotate(missile.angle);
           context.drawImage(
             playerMissileImage,
             -missileSize / 2,
             -missileSize / 2,
             missileSize,
             missileSize,
           );
           context.restore();
         });
         context.restore();
       }
      g.enemies.forEach((enemy) => {
        if (enemy.respawnAt > now) return;
        const frame = enemyFrameIndex(enemy);
        const image = spriteImagesRef.current[`${enemy.kind}:${frame}`];
        if (!image) return;
         const size = enemySpriteSize(enemy.kind, g.cell, enemy.isMini);
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
          const previousBestScore = bestScoreRef.current;
          if (
            !recordBannerShownRef.current
            && previousBestScore >= RECORD_BANNER_MINIMUM_BEST_SCORE
          ) {
            recordBannerShownRef.current = true;
            enqueueBanner({ kind: 'RECORD', score: g.score });
          }
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
            level: g.level,
            frame: g.frame,
            trail: g.trail,
             protectedTrails: g.protectedTrails,
            player: { ...g.player },
             direction: g.trail.length > 0 ? g.cutDir : g.facingDir,
             enemies: g.enemies.map((enemy) => ({ ...enemy })),
              diamonds: g.diamonds.map((diamond) => ({ ...diamond })),
              bombs: g.bombs.map((bomb) => ({ ...bomb })),
               projectiles: g.projectiles.map((projectile) => ({ ...projectile })),
              missiles: g.missiles.map((missile) => ({ ...missile })),
              spiderThreads: g.spiderThreads.map((thread) => ({
                ...thread,
                start: { ...thread.start },
                end: { ...thread.end },
                target: { ...thread.target },
              })),
              particles: g.particles.slice(-200),
              fusionSparks: g.fusionSparks.map((spark) => ({ ...spark })),
              fusionHead: g.fusion
                ? pointOnPolyline(
                    g.fusion.path,
                    g.fusion.cumulativeLengths,
                    g.fusion.totalLength * clamp(
                      g.fusion.elapsed / g.fusion.travelDuration,
                      0,
                      1,
                    ),
                  ).point
                : null,
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
  }, [
    enqueueBanner,
    playDiamondCapture,
    playPickupChime,
    playSevenFireShot,
    playSectorTransition,
    playShieldLossExplosion,
    resetGame,
  ]);

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
          level={snapshot.level}
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
    <View style={styles.container}>
      <View style={styles.cockpitHeader} pointerEvents="none">
        <RNImage
          source={cockpitInteriorSource}
          style={styles.cockpitInterior}
          resizeMode="cover"
          accessibilityLabel="Intérieur du cockpit Prism Warbird vu depuis le siège du pilote"
        />
        <View style={styles.cockpitShade} />
      </View>

      <View
        style={styles.arena}
        onLayout={handleArenaLayout}
        testID="game-arena"
        {...panResponder.panHandlers}
      >
        {Platform.OS === 'web'
          ? React.createElement('canvas' as any, {
              ref: canvasRef,
              style: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
            })
          : renderNativeArena()}
        {banner && (
          <View style={styles.arcadeBannerLayer} pointerEvents="none">
            <Animated.View
              style={[
                styles.arcadeBanner,
                banner.kind === 'RECORD'
                  ? styles.recordBanner
                  : banner.kind === 'DIAMOND'
                    ? styles.diamondBanner
                    : banner.kind === 'BOMB'
                      ? styles.bombBanner
                      : banner.kind === 'SECTOR'
                        ? styles.sectorBanner
                        : banner.kind === 'BOSS'
                          ? styles.bossBanner
                      : banner.kind === 'CLEAN'
                        ? styles.cleanBanner
                          : banner.kind === 'GAME_OVER'
                            ? styles.gameOverBanner
                            : styles.enemyBanner,
                { transform: [{ translateX: bannerTranslateX }] },
              ]}
            >
              <View style={styles.bannerGloss} />
              <View style={styles.bannerAccent} />
              <Text
                style={[
                  styles.bannerTitle,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.62}
              >
                {banner.kind === 'RECORD'
                  ? 'NOUVEAU RECORD !'
                  : banner.kind === 'DIAMOND'
                    ? 'BONUS DIAMANT CAPTURÉ'
                    : banner.kind === 'BOMB'
                      ? 'BOMBE NEUTRALISÉE'
                      : banner.kind === 'SECTOR'
                        ? 'SECTEUR TERMINÉ'
                        : banner.kind === 'BOSS'
                          ? 'ALERTE BOSS'
                        : banner.kind === 'BOSS_SPLIT'
                          ? 'BOSS FRACTURÉ'
                        : banner.kind === 'SPLIT'
                          ? ENEMY_SPLIT_BANNER_LABELS[banner.enemyKind ?? 'SHIP']
                        : banner.kind === 'CLEAN'
                          ? 'SECTEUR NETTOYÉ !'
                          : banner.kind === 'GAME_OVER'
                            ? 'GAME OVER'
                            : 'ENNEMI DÉTRUIT'}
              </Text>
              <Text style={styles.bannerScore} numberOfLines={1}>
                {banner.kind === 'RECORD'
                  ? `SCORE DÉPASSÉ  •  ${(banner.score ?? 0).toString().padStart(6, '0')}`
                  : banner.kind === 'DIAMOND'
                    ? `+${banner.points ?? DIAMOND_SCORE} POINTS`
                    : banner.kind === 'BOMB'
                      ? `+${banner.points ?? BOMB_SCORE} POINTS`
                    : banner.kind === 'SECTOR'
                      ? `PASSAGE AU SECTEUR ${(banner.level ?? 2).toString().padStart(2, '0')}`
                      : banner.kind === 'BOSS'
                        ? `SECTEUR ${(banner.level ?? 10).toString().padStart(2, '0')}  •  ${BOSS_KIND_LABELS[banner.bossKind ?? 'SHIP']} BOSS`
                      : banner.kind === 'BOSS_SPLIT'
                        ? `+${banner.points ?? ENEMY_SCORE.SHIP} POINTS  •  ${ENEMY_DEPLOYED_BANNER_LABELS[banner.enemyKind ?? 'SHIP']}`
                      : banner.kind === 'SPLIT'
                        ? `+${banner.points ?? ENEMY_SCORE.SHIP} POINTS  •  2 MINI-${ENEMY_KIND_PLURAL_LABELS[banner.enemyKind ?? 'SHIP']}`
                      : banner.kind === 'CLEAN'
                          ? 'SÉCURISEZ 80%'
                          : banner.kind === 'GAME_OVER'
                            ? `SCORE FINAL  •  ${(banner.score ?? 0).toString().padStart(6, '0')}`
                            : `+${banner.points ?? 0} POINTS`}
              </Text>
            </Animated.View>
          </View>
        )}
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
            <Text
              style={[
                styles.cardLabel,
                { color: HUD_COLORS.cyan },
              ]}
            >
              SECTEUR
            </Text>
            <Text style={[styles.sectorValue, { color: HUD_COLORS.cyan }]}>
              {hud.level.toString().padStart(2, '0')}
            </Text>
            {isBossSector(hud.level) && (
              <Text style={[styles.bossSectorValue, { color: HUD_COLORS.cyan }]}>BOSS</Text>
            )}
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

      <DebugSectorSelector
        currentSector={hud.level}
        onSelect={teleportToSector}
        bottomInset={Math.max(insets.bottom, 6)}
      />
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
  debugSectorSelector: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 5,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 243, 255, 0.75)',
    borderRadius: 4,
    backgroundColor: 'rgba(4, 8, 18, 0.9)',
    shadowColor: '#00f3ff',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  debugSectorContent: {
    gap: 5,
    paddingRight: 2,
  },
  debugSectorButton: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(184, 255, 74, 0.55)',
    borderRadius: 2,
    backgroundColor: 'rgba(8, 18, 28, 0.92)',
  },
  debugSectorButtonSelected: {
    borderColor: '#ffb02e',
    backgroundColor: 'rgba(255, 176, 46, 0.18)',
    shadowColor: '#ffb02e',
    shadowOpacity: 0.85,
    shadowRadius: 7,
    elevation: 4,
  },
  debugSectorButtonText: {
    color: '#b8ff4a',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  debugSectorButtonTextSelected: {
    color: '#fff3d6',
    textShadowColor: '#ffb02e',
    textShadowRadius: 6,
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
  bossSectorValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 1.2,
    marginTop: 1,
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
  arcadeBannerLayer: {
    position: 'absolute',
    top: '41%',
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
  },
  arcadeBanner: {
    width: '80%',
    minHeight: 78,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderRadius: 4,
    shadowColor: '#ffffff',
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  recordBanner: {
    borderColor: HUD_COLORS.amber,
    backgroundColor: 'rgba(38, 15, 4, 0.44)',
  },
  diamondBanner: {
    borderColor: HUD_COLORS.cyan,
    backgroundColor: 'rgba(0, 24, 34, 0.46)',
  },
  bombBanner: {
    borderColor: '#ff6a22',
    backgroundColor: 'rgba(48, 12, 4, 0.52)',
  },
  sectorBanner: {
    borderColor: HUD_COLORS.magenta,
    backgroundColor: 'rgba(24, 4, 24, 0.46)',
  },
  bossBanner: {
    borderColor: '#ff2bb5',
    backgroundColor: 'rgba(54, 4, 34, 0.62)',
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  cleanBanner: {
    borderColor: HUD_COLORS.lime,
    backgroundColor: 'rgba(18, 34, 8, 0.46)',
  },
  gameOverBanner: {
    borderColor: '#ff5500',
    backgroundColor: 'rgba(42, 8, 3, 0.52)',
  },
  enemyBanner: {
    borderColor: HUD_COLORS.lime,
    backgroundColor: 'rgba(18, 34, 8, 0.46)',
  },
  bannerGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    opacity: 0.78,
  },
  bannerAccent: {
    width: 72,
    height: 3,
    marginBottom: 7,
    backgroundColor: HUD_COLORS.magenta,
    shadowColor: HUD_COLORS.magenta,
    shadowOpacity: 1,
    shadowRadius: 9,
  },
  bannerTitle: {
    maxWidth: '100%',
    color: HUD_COLORS.warmWhite,
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 1.4,
    textAlign: 'center',
    textShadowColor: HUD_COLORS.cyan,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  bannerScore: {
    marginTop: 4,
    color: HUD_COLORS.cyan,
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: 1.1,
    textAlign: 'center',
    textShadowColor: HUD_COLORS.cyan,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  feedback: {
    alignSelf: 'center',
    marginTop: 6,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.8,
  },
});