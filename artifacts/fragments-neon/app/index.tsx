import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
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
import {
  Group as SkiaGroup,
  Image as SkiaImage,
  Skia,
  PaintStyle as SkiaPaintStyle,
  StrokeCap as SkiaStrokeCap,
  SkiaPictureView,
  useImage as useSkiaImage,
} from '@shopify/react-native-skia';
import { setAudioModeAsync, setIsAudioActiveAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  buildOrthogonalCaptureRegions,
  captureRegionsOverlapCircle,
} from '../components/captureGeometry';

const COLS = 12;
const INITIAL_BACKGROUND_PRELOAD_COUNT = 10;
const PERIMETER_HORIZONTAL_INSET_CELLS = 0.65;
// Keep a little more cockpit breathing room above and below the playfield on
// every sector, including the tutorial.
const PERIMETER_VERTICAL_INSET_CELLS = 1.35;
const PERIMETER_STROKE_WIDTH = 3;
const PLAYER_RADIUS_CELLS = 0.82;
const ZONE_COLOR = '#00f3ff';
const INITIAL_MAP_OPACITY = 0;
const CAPTURED_ZONE_OPACITY = 0.15;
const CAPTURED_ZONE_LAYER_OPACITY = (
  CAPTURED_ZONE_OPACITY - INITIAL_MAP_OPACITY
) / (1 - INITIAL_MAP_OPACITY);
const LEVEL_CAPTURE_TARGET = 80;
const MAX_LEVEL = 50;
const TUTORIAL_SECTOR = 0;
const TUTORIAL_SWIPE_REPETITIONS = 2;
// Keep the sector strip and tutorial controls available in the APK as well as
// during development. They are part of the game's tutorial/navigation UI.
const DEBUG_SECTOR_SELECTOR_ENABLED = true;
const SKIA_DYNAMIC_RENDER_ENABLED = true;
const NATIVE_PICTURE_PUBLISH_INTERVAL_MS = 16;
const NATIVE_GAME_LOOP_INTERVAL_MS = 1000 / 60;
const NATIVE_ASSET_PRELOAD_TIMEOUT_MS = 5000;
const NATIVE_INITIAL_START_FALLBACK_DELAY_MS = 2500;
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
const diagnosticLog = (event: string, details: Record<string, unknown> = {}) => {
  if (__DEV__) {
    console.log(`[Fragments][diagnostic] ${event}`, details);
  }
};
type PerformanceMetrics = {
  frames: number;
  updateMs: number;
  collisionMs: number;
  renderMs: number;
  nativeBuildMs: number;
  particleCount: number;
  peakParticles: number;
};
const ZERO = { x: 0 as const, y: 0 as const };
const pickupChimeSource = require('../assets/audio/pickup.mp3');
const diamondCaptureSource = require('../assets/audio/diamond-capture.wav');
const shieldLossExplosionSource = require('../assets/audio/shield-loss-explosion.wav');
const sectorTransitionVictorySource = require('../assets/audio/sector-transition-victory-joyful.wav');
const sevenFireShotSource = require('../assets/audio/seven-fire-shot.mp3');
const loadingCoverSource = require('../assets/images/loading-cover.png');
const cockpitInteriorSource = require('../assets/images/prism-warbird-interior-neon-console.png');
const cuttingSpriteSource = require('../assets/images/cutting-sprite-sheet.png');
const shipSmokeSpriteSource = require('../assets/images/ship-smoke-sprite-sheet.png');
const coreReactorSpriteSource = require('../assets/images/core-reactor-sprite-sheet.png');
const sevenFireOrbSource = require('../assets/images/seven-fire-orb.png');
const diamondSpriteSource = require('../assets/images/neon-diamond-fragment-sprite-sheet.png');
const speedBoostSource = require('../assets/images/speed-boost-sprite.png');
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
const GAME_SAVE_STORAGE_KEY = 'fragments-neon:game-progress:v1';
const LAST_PLAYED_SECTOR_STORAGE_KEY = 'fragments-neon:last-played-sector:v1';
const GAME_SAVE_INTERVAL_MS = 1200;
const GAME_SAVE_VERSION = 2 as const;
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
// Non-player artwork is intentionally rendered at 80% of the previous size
// to reduce fill-rate and SVG/Canvas work. Gameplay geometry stays unchanged.
const NON_PLAYER_RENDER_SCALE = 0.8;
const ENEMY_RENDER_SCALE = 0.88 * NON_PLAYER_RENDER_SCALE;
const BOSS_RENDER_SCALE = 1.72 * NON_PLAYER_RENDER_SCALE;
const PICKUP_VISUAL_SIZE_CELLS = 1.34 * NON_PLAYER_RENDER_SCALE;
const PLAYER_MOVE_SPEED = 126;
const SPEED_BOOST_MULTIPLIER = 2;
const SPEED_BOOST_DURATION_MS = 5000;
const SPEED_BOOST_RADIUS_CELLS = 0.72;
const PICKUP_FLOAT_AMPLITUDE_CELLS = 0.34;
const PICKUP_FLOAT_SPEED = 0.095;
const BOSS_SPEED_BOOST = 1.06;
const CAPTURE_INVINCIBILITY_DURATION = 10;
const SEVEN_PROJECTILE_COUNT = 7;
const SEVEN_PROJECTILE_INTERVAL = 7;
const SEVEN_PROJECTILE_SPEED = 42;
const SEVEN_PROJECTILE_MAX_LIFE = 9;
const SEVEN_PROJECTILE_RADIUS_CELLS = 0.16;
const SEVEN_PROJECTILE_SIZE_CELLS = 0.82 * NON_PLAYER_RENDER_SCALE;
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
  bounceCooldown?: number;
  visualRotation?: number;
  sevenFireTimer?: number;
  spiderThreadTimer?: number;
  spiderGrade?: number;
  isBoss?: boolean;
  bossTier?: number;
  isMini?: boolean;
  splitLevel?: number;
  curveStrength?: number;
  curvePhase?: number;
  lastSafeX?: number;
  lastSafeY?: number;
};

type EnemySpawnSpec = {
  baseIndex: number;
  spiderGrade?: number;
  isBoss?: boolean;
  bossTier?: number;
  speedScale?: number;
  curveStrength?: number;
  curvePhase?: number;
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

type SpeedBoost = Point & {
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
const MAX_PARTICLES = 60;
const MAX_FUSION_SPARKS = 40;
const MAX_SMOKE_PUFFS = 30;
const DRAGON_NOMINAL_SPEED = 28;
const DRAGON_ATTACK_SPEED = 68;
const dragonSpeedFor = (enemy: Enemy, attacking: boolean) => {
  const bossMultiplier = enemy.isBoss
    ? (1.16 + Math.min(0.16, (enemy.bossTier ?? 1) * 0.035)) * BOSS_SPEED_BOOST
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
  speedBoosts: SpeedBoost[];
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
  status: 'PLAYING' | 'FUSING' | 'RESPAWN' | 'SECTOR_TRANSITION';
  respawnAt: number;
  invincibleUntil: number;
  speedBoostUntil: number;
};

type PersistedGame = Omit<
  Game,
  | 'particles'
  | 'fusionSparks'
  | 'fusion'
  | 'smokePuffs'
  | 'smokeAccumulator'
  | 'frame'
  | 'initialized'
  | 'status'
  | 'respawnAt'
  | 'invincibleUntil'
  | 'speedBoostUntil'
> & {
  version: typeof GAME_SAVE_VERSION;
  savedAt: number;
  resumeType: 'EXACT' | 'SECTOR';
  resumeLevel: number;
  invincibleRemainingMs: number;
  speedBoostRemainingMs: number;
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
  kind: 'RECORD' | 'DIAMOND' | 'BOMB' | 'SPEED_BOOST' | 'SECTOR' | 'SECTOR_START' | 'BOSS' | 'SHIELD' | 'ENEMY' | 'BOSS_SPLIT' | 'SPLIT' | 'CLEAN' | 'GAME_OVER' | 'TUTORIAL';
  score?: number;
  points?: number;
  level?: number;
  bossKind?: EnemyKind;
  enemyKind?: EnemyKind;
  tutorialCompleted?: boolean;
  tutorialStep?: 1 | 2 | 3 | 4;
  tutorialPrompt?: 'SECURE_AREA';
  onComplete?: () => void;
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
  speedBoosts: SpeedBoost[];
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
  invincibleUntil: number;
};

const snapshotFromGame = (game: Game): Snapshot => ({
  width: game.width,
  height: game.height,
  cell: game.cell,
  rows: game.rows,
  level: game.level,
  frame: game.frame,
  trail: game.trail,
  protectedTrails: game.protectedTrails,
  player: { ...game.player },
  direction: game.trail.length > 0 ? game.cutDir : game.facingDir,
  enemies: game.enemies.map((enemy) => ({ ...enemy })),
  diamonds: game.diamonds.map((diamond) => ({ ...diamond })),
  speedBoosts: game.speedBoosts.map((speedBoost) => ({ ...speedBoost })),
  bombs: game.bombs.map((bomb) => ({ ...bomb })),
  projectiles: game.projectiles.map((projectile) => ({ ...projectile })),
  missiles: game.missiles.map((missile) => ({ ...missile })),
  spiderThreads: game.spiderThreads.map((thread) => ({
    ...thread,
    start: { ...thread.start },
    end: { ...thread.end },
    target: { ...thread.target },
  })),
  particles: game.particles.slice(-120),
  fusionSparks: game.fusionSparks.map((spark) => ({ ...spark })),
  fusionHead: null,
  smokePuffs: game.smokePuffs.map((puff) => ({ ...puff })),
  claimedPolygons: game.claimedPolygons,
  pendingCapturePolygons: game.pendingCapturePolygons,
  scanY: game.scanY,
  invincibleUntil: game.invincibleUntil,
});

type TutorialDirection = 'up' | 'down' | 'left' | 'right';
type TutorialSwipeCounts = Record<TutorialDirection, number>;

const EMPTY_TUTORIAL_SWIPE_COUNTS: TutorialSwipeCounts = {
  up: 0,
  down: 0,
  left: 0,
  right: 0,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const isPersistedGame = (value: unknown): value is PersistedGame => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PersistedGame>;
  return (
    candidate.version === GAME_SAVE_VERSION
    && typeof candidate.savedAt === 'number'
    && Number.isFinite(candidate.savedAt)
    && (candidate.resumeType === 'EXACT' || candidate.resumeType === 'SECTOR')
    && typeof candidate.resumeLevel === 'number'
    && Number.isFinite(candidate.resumeLevel)
    && candidate.resumeLevel >= 1
    && typeof candidate.width === 'number'
    && candidate.width > 0
    && typeof candidate.height === 'number'
    && candidate.height > 0
    && candidate.player !== undefined
    && Array.isArray(candidate.enemies)
    && Array.isArray(candidate.diamonds)
    && Array.isArray(candidate.speedBoosts)
    && Array.isArray(candidate.bombs)
    && Array.isArray(candidate.claimedPolygons)
    && Array.isArray(candidate.pendingCapturePolygons)
    && Array.isArray(candidate.fillQueue)
  );
};

const serializeGame = (game: Game, now: number): PersistedGame => ({
  version: GAME_SAVE_VERSION,
  savedAt: now,
  resumeType: 'EXACT',
  resumeLevel: game.level,
  width: game.width,
  height: game.height,
  cell: game.cell,
  rows: game.rows,
  player: { ...game.player },
  inputDir: { ...game.inputDir },
  facingDir: { ...game.facingDir },
  hasMoveCommand: game.hasMoveCommand,
  cutDir: { ...game.cutDir },
  cutCoordinate: game.cutCoordinate,
  trail: game.trail.map((point) => ({ ...point })),
  protectedTrails: game.protectedTrails.map((trail) => trail.map((point) => ({ ...point }))),
  enemies: game.enemies.map((enemy) => ({ ...enemy })),
  diamonds: game.diamonds.map((diamond) => ({ ...diamond })),
  speedBoosts: game.speedBoosts.map((speedBoost) => ({ ...speedBoost })),
  bombs: game.bombs.map((bomb) => ({ ...bomb })),
  projectiles: game.projectiles.map((projectile) => ({ ...projectile })),
  missiles: game.missiles.map((missile) => ({ ...missile })),
  spiderThreads: game.spiderThreads.map((thread) => ({
    ...thread,
    start: { ...thread.start },
    end: { ...thread.end },
    target: { ...thread.target },
  })),
  claimedPolygons: game.claimedPolygons.map((polygon) => polygon.map((point) => ({ ...point }))),
  pendingCapturePolygons: game.pendingCapturePolygons.map((polygon) => (
    polygon.map((point) => ({ ...point }))
  )),
  fillQueue: [...game.fillQueue],
  fillCursor: game.fillCursor,
  scanY: game.scanY,
  mode: game.mode,
  score: game.score,
  shields: game.shields,
  capturedArea: game.capturedArea,
  totalPlayableArea: game.totalPlayableArea,
  pendingCaptureArea: game.pendingCaptureArea,
  level: game.level,
  trailScoreAccumulator: game.trailScoreAccumulator,
  invincibleRemainingMs: Math.max(0, game.invincibleUntil - now),
  speedBoostRemainingMs: Math.max(0, game.speedBoostUntil - now),
});

const playerSpeedFor = (game: Game, now: number) => (
  game.level !== TUTORIAL_SECTOR
  && !isBossSector(game.level)
  && game.speedBoostUntil > now
    ? PLAYER_MOVE_SPEED * SPEED_BOOST_MULTIPLIER
    : PLAYER_MOVE_SPEED
);

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

const createSpeedBoosts = (width: number, height: number, cell: number, level: number): SpeedBoost[] => {
  if (level === TUTORIAL_SECTOR || isBossSector(level)) return [];
  const bounds = perimeterBounds(width, height, cell);
  return [{
    x: bounds.left + cell * (1.4 + Math.random() * Math.max(1, (bounds.right - bounds.left) / cell - 2.8)),
    y: bounds.top + cell * (1.4 + Math.random() * Math.max(1, (bounds.bottom - bounds.top) / cell - 2.8)),
    phase: Math.random() * Math.PI * 2,
    collected: false,
  }];
};

const placeSpeedBoostsInOpenSurface = (
  speedBoosts: SpeedBoost[],
  enemies: Enemy[],
  diamonds: Diamond[],
  bombs: Bomb[],
  width: number,
  height: number,
  cell: number,
  claimedPolygons: Point[][],
  protectedTrails: Point[][],
  activeTrail: Point[],
  player: Point,
) => {
  const bounds = perimeterBounds(width, height, cell);
  const radius = speedBoostRadius(cell);
  const candidates = [
    ...Array.from({ length: 28 }, () => ({
      x: bounds.left + radius + Math.random() * Math.max(0, bounds.right - bounds.left - radius * 2),
      y: bounds.top + radius + Math.random() * Math.max(0, bounds.bottom - bounds.top - radius * 2),
    })),
    ...Array.from({ length: 7 }, (_, row) => (
      Array.from({ length: 7 }, (_, column) => ({
        x: bounds.left + (bounds.right - bounds.left) * ((column + 0.5) / 7),
        y: bounds.top + (bounds.bottom - bounds.top) * ((row + 0.5) / 7),
      }))
    )).flat(),
  ];

  speedBoosts.forEach((speedBoost) => {
    if (speedBoost.collected) return;
    const candidate = [{ x: speedBoost.x, y: speedBoost.y }, ...candidates].find((point) => {
      const x = clamp(point.x, bounds.left + radius, bounds.right - radius);
      const y = clamp(point.y, bounds.top + radius, bounds.bottom - radius);
      const candidatePoint = { x, y };
      const clearOfClaimed = !pointInsideClaimedSurface(candidatePoint, claimedPolygons, cell * 0.12);
      const clearOfProtected = protectedTrails.every((trail) => (
        trail.slice(1).every((trailPoint, index) => (
          distanceToSegment(candidatePoint, trail[index], trailPoint)
            > radius + PERIMETER_STROKE_WIDTH * 0.5
        ))
      ));
      const clearOfActiveTrail = activeTrail.length < 2 || !pathTouchesPolygon(
        activeTrail,
        [
          { x: x - radius, y: y - radius },
          { x: x + radius, y: y - radius },
          { x: x + radius, y: y + radius },
          { x: x - radius, y: y + radius },
        ],
        PERIMETER_STROKE_WIDTH * 0.5,
      );
      const clearOfPlayer = Math.hypot(x - player.x, y - player.y)
        > radius + playerBodyRadius(cell) * 1.8;
      const clearOfEnemies = enemies
        .filter((enemy) => !enemyIsDestroyed(enemy))
        .every((enemy) => Math.hypot(x - enemy.x, y - enemy.y)
          > radius + enemyVisualRadius(enemy, cell) * 0.72);
      const clearOfDiamonds = diamonds
        .filter((diamond) => !diamond.collected)
        .every((diamond) => Math.hypot(x - diamond.x, y - diamond.y) > radius + cell * 0.7);
      const clearOfBombs = bombs
        .filter((bomb) => !bomb.destroyed)
        .every((bomb) => Math.hypot(x - bomb.x, y - bomb.y) > radius + bombRadius(cell));
      return clearOfClaimed
        && clearOfProtected
        && clearOfActiveTrail
        && clearOfPlayer
        && clearOfEnemies
        && clearOfDiamonds
        && clearOfBombs;
    });
    if (candidate) {
      speedBoost.x = clamp(candidate.x, bounds.left + radius, bounds.right - radius);
      speedBoost.y = clamp(candidate.y, bounds.top + radius, bounds.bottom - radius);
    }
  });
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
    scale: (enemy.isBoss ? BOSS_RENDER_SCALE : 1)
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
  const width = cell * 1.62 * NON_PLAYER_RENDER_SCALE;
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

const enemyRenderSize = (kind: EnemyKind, cell: number, isMini = false) => {
  const size = enemySpriteSize(kind, cell, isMini);
  return {
    width: size.width * ENEMY_RENDER_SCALE,
    height: size.height * ENEMY_RENDER_SCALE,
  };
};

const pickupVisualSize = (cell: number) => cell * PICKUP_VISUAL_SIZE_CELLS;
const speedBoostRadius = (cell: number) => cell * SPEED_BOOST_RADIUS_CELLS;
const pickupFloatOffset = (frame: number, phase: number, cell: number) => (
  Math.sin(frame * PICKUP_FLOAT_SPEED + phase) * cell * PICKUP_FLOAT_AMPLITUDE_CELLS
);

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
const PLAYER_MISSILE_SIZE_CELLS = 1.12 * NON_PLAYER_RENDER_SCALE;
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
  if (level === TUTORIAL_SECTOR) return [];
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
    const curveStrength = sector >= 5
      ? clamp(0.28 + (sector - 5) * 0.012, 0.28, 0.78)
      : 0;
    const shipCount = sector <= 2
      ? 1
      : sector <= 4 || sector === 7 || sector === 15 || sector === 25
        ? 2
        : 3;
    const shipSpeedStart = clamp(0.84 + (sector - 1) * 0.011, 0.84, 1.36);
    const ships: EnemySpawnSpec[] = Array.from({ length: shipCount }, (_, index) => ({
        baseIndex: index % 2 === 0 ? 0 : 2,
        speedScale: shipSpeedStart + index * 0.1,
        curveStrength,
        curvePhase: sector * 0.47 + index * 1.35,
      }));
    const spiderGrade = sector < 30 ? 3 : 5;
    const dragon = sector >= 7
      ? [{
          baseIndex: 1,
          speedScale: clamp(0.82 + (sector - 7) * 0.018, 0.82, 1.3),
        }]
      : [];
    const seven = sector >= 15
      ? [{
          baseIndex: 3,
          speedScale: clamp(0.84 + (sector - 15) * 0.018, 0.84, 1.44),
        }]
      : [];
    const spider = sector >= 25
      ? [{
          baseIndex: 4,
          spiderGrade: Math.max(1, Math.min(5, spiderGrade)),
          speedScale: clamp(0.8 + (sector - 25) * 0.018, 0.8, 1.25),
        }]
      : [];
    rosterByLevel[sector] = [...ships, ...dragon, ...seven, ...spider];
  }
  return (rosterByLevel[clampedLevel] ?? rosterByLevel[1]).map((spec) => {
    const enemy = { ...enemies[spec.baseIndex], ...spec };
    const bossSpeed = spec.isBoss
      ? (1.24 + (spec.bossTier ?? 1) * 0.035) * BOSS_SPEED_BOOST
      : 1;
    const spiderDifficulty = enemy.kind === 'SPIDER'
      ? spiderDifficultyFor(spec.spiderGrade ?? enemy.spiderGrade ?? 1, spec.bossTier)
      : undefined;
    return {
      ...enemy,
      speed: enemy.speed * bossSpeed * (spec.speedScale ?? 1),
      vx: enemy.vx * bossSpeed * (spec.speedScale ?? 1),
      vy: enemy.vy * bossSpeed * (spec.speedScale ?? 1),
      curveStrength: spec.curveStrength ?? enemy.curveStrength,
      curvePhase: spec.curvePhase ?? enemy.curvePhase,
      spiderThreadTimer: spiderDifficulty?.initialDelay,
      visualRotation: enemy.kind === 'SHIP' ? Math.atan2(enemy.vy, enemy.vx) + Math.PI / 2 : undefined,
    };
  });
};

const createBombs = (width: number, height: number, cell: number, level: number): Bomb[] => {
  if (level === TUTORIAL_SECTOR) return [];
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

const bossObjectiveComplete = (level: number, enemies: Enemy[]) => (
  !isBossSector(level)
  || enemies.some((enemy) => enemy.isBoss && enemyIsDestroyed(enemy))
);

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
  const smokeCount = 1;
  const backwardX = -enemy.vx / velocityLength;
  const backwardY = -enemy.vy / velocityLength;
  const sideX = -backwardY;
  const sideY = backwardX;

  return Array.from({ length: smokeCount }, (_, index) => {
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

const EnemySprite = React.memo(
  ({ enemy, enemyIndex, cell, spriteFrames }: any) => {
    const frame = useMemo(() => enemyFrameIndex(enemy), [enemy.phase]);
    const size = useMemo(
      () => enemyRenderSize(enemy.kind, cell, enemy.isMini),
      [enemy.kind, cell, enemy.isMini],
    );
    const motion = useMemo(
      () => enemyAnimationTransform(enemy, cell),
      [enemy.x, enemy.y, enemy.spin, cell],
    );
    if (enemy.respawnAt > Date.now()) return null;
    const centerY = enemy.y + motion.offsetY;
    const rotationDegrees = motion.rotation * (180 / Math.PI);
    return (
      <G
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
  },
  (previous: any, next: any) => (
    previous.enemy.x === next.enemy.x
      && previous.enemy.y === next.enemy.y
      && previous.enemy.phase === next.enemy.phase
      && previous.enemy.spin === next.enemy.spin
      && previous.enemy.respawnAt === next.enemy.respawnAt
      && previous.cell === next.cell
      && previous.enemy.kind === next.enemy.kind
      && previous.enemy.isMini === next.enemy.isMini
  ),
);

const ProjectileSprite = React.memo(
  ({ projectile, cell, sevenFireOrbSource }: any) => {
    const spriteSize = useMemo(() => sevenProjectileSize(cell), [cell]);
    return (
      <SvgImage
        href={sevenFireOrbSource}
        x={projectile.x - spriteSize / 2}
        y={projectile.y - spriteSize / 2}
        width={spriteSize}
        height={spriteSize}
        opacity={0.96}
      />
    );
  },
  (previous: any, next: any) => (
    previous.projectile.x === next.projectile.x
      && previous.projectile.y === next.projectile.y
      && previous.cell === next.cell
  ),
);

const PlayerMissileSprite = React.memo(
  ({ missile, cell, playerMissileSource, arenaBounds }: any) => {
    const spriteSize = useMemo(() => playerMissileSize(cell), [cell]);
    const rotationDegrees = useMemo(
      () => missile.angle * (180 / Math.PI),
      [missile.angle],
    );
    if (!pointInsidePerimeter(missile, arenaBounds)) return null;
    return (
      <SvgImage
        href={playerMissileSource}
        x={missile.x - spriteSize / 2}
        y={missile.y - spriteSize / 2}
        width={spriteSize}
        height={spriteSize}
        opacity={0.98}
        transform={`rotate(${rotationDegrees} ${missile.x} ${missile.y})`}
      />
    );
  },
  (previous: any, next: any) => (
    previous.missile.x === next.missile.x
      && previous.missile.y === next.missile.y
      && previous.missile.angle === next.missile.angle
      && previous.cell === next.cell
      && previous.arenaBounds.left === next.arenaBounds.left
      && previous.arenaBounds.right === next.arenaBounds.right
      && previous.arenaBounds.top === next.arenaBounds.top
      && previous.arenaBounds.bottom === next.arenaBounds.bottom
  ),
);

const BombSprite = React.memo(
  ({ bomb, pickupSize, frame, coreReactorSpriteSource }: any) => {
    if (bomb.destroyed) return null;
    const floatY = pickupFloatOffset(frame, bomb.x * 0.013 + bomb.y * 0.007, pickupSize);
    return (
      <G transform={`translate(${bomb.x} ${bomb.y + floatY})`}>
        <Defs>
          <ClipPath id="bomb-clip">
            <Rect
              x={-pickupSize / 2}
              y={-pickupSize / 2}
              width={pickupSize}
              height={pickupSize}
            />
          </ClipPath>
        </Defs>
        <G clipPath="url(#bomb-clip)">
          <SvgImage
            href={coreReactorSpriteSource}
            x={-pickupSize / 2 - frame * pickupSize}
            y={-pickupSize / 2}
            width={pickupSize * CORE_REACTOR_SPRITE_FRAME_COUNT}
            height={pickupSize}
            opacity={0.98}
          />
        </G>
      </G>
    );
  },
  (previous: any, next: any) => (
    previous.bomb.x === next.bomb.x
      && previous.bomb.y === next.bomb.y
      && previous.bomb.destroyed === next.bomb.destroyed
      && previous.frame === next.frame
      && previous.pickupSize === next.pickupSize
  ),
);

const DiamondSprite = React.memo(
  ({ diamond, pickupSize, frame, diamondSpriteSource }: any) => {
    if (diamond.collected) return null;
    const floatY = pickupFloatOffset(frame, diamond.phase, pickupSize);
    return (
      <G transform={`translate(${diamond.x} ${diamond.y + floatY})`}>
        <Defs>
          <ClipPath id="diamond-clip">
            <Rect
              x={-pickupSize / 2}
              y={-pickupSize / 2}
              width={pickupSize}
              height={pickupSize}
            />
          </ClipPath>
        </Defs>
        <G clipPath="url(#diamond-clip)">
          <SvgImage
            href={diamondSpriteSource}
            x={-pickupSize / 2 - frame * pickupSize}
            y={-pickupSize / 2}
            width={pickupSize * DIAMOND_SPRITE_FRAME_COUNT}
            height={pickupSize}
            opacity={0.98}
          />
        </G>
      </G>
    );
  },
  (previous: any, next: any) => (
    previous.diamond.x === next.diamond.x
      && previous.diamond.y === next.diamond.y
      && previous.diamond.collected === next.diamond.collected
      && previous.frame === next.frame
      && previous.pickupSize === next.pickupSize
  ),
);

const SpeedBoostSprite = React.memo(
  ({ speedBoost, cell, frame, speedBoostSource }: any) => {
    if (speedBoost.collected) return null;
    const size = pickupVisualSize(cell) * 0.92;
    const floatY = pickupFloatOffset(frame, speedBoost.phase, cell);
    return (
      <G
        transform={`translate(${speedBoost.x} ${speedBoost.y + floatY})`}
      >
        <Circle
          cx={0}
          cy={0}
          r={size * 0.46}
          fill="#00f3ff"
          opacity={0.14}
        />
        <SvgImage
          href={speedBoostSource}
          x={-size / 2}
          y={-size / 2}
          width={size}
          height={size}
          opacity={0.98}
        />
      </G>
    );
  },
  (previous: any, next: any) => (
    previous.speedBoost.x === next.speedBoost.x
      && previous.speedBoost.y === next.speedBoost.y
      && previous.speedBoost.collected === next.speedBoost.collected
      && previous.speedBoost.phase === next.speedBoost.phase
      && previous.frame === next.frame
      && previous.cell === next.cell
  ),
);

const SpiderThreadSprite = React.memo(
  ({ thread, spiderWebSource, cell }: any) => {
    const active = useMemo(
      () => spiderThreadIsActive(thread),
      [thread.remaining, thread.anchored],
    );
    const webSize = useMemo(
      () => cell * thread.webSizeCells * NON_PLAYER_RENDER_SCALE,
      [cell, thread.webSizeCells],
    );
    return (
      <G opacity={active ? 0.82 : 0.92}>
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
          <>
            <Line
              x1={thread.start.x}
              y1={thread.start.y}
              x2={thread.end.x}
              y2={thread.end.y}
              stroke="#00f3ff"
              strokeWidth={0.72}
              strokeLinecap="round"
            />
            <Circle cx={thread.end.x} cy={thread.end.y} r={3.2} fill="#fff3d6" />
          </>
        )}
      </G>
    );
  },
  (previous: any, next: any) => (
    previous.thread.start.x === next.thread.start.x
      && previous.thread.start.y === next.thread.start.y
      && previous.thread.end.x === next.thread.end.x
      && previous.thread.end.y === next.thread.end.y
      && previous.thread.target.x === next.thread.target.x
      && previous.thread.target.y === next.thread.target.y
      && previous.thread.anchored === next.thread.anchored
      && previous.thread.remaining === next.thread.remaining
      && previous.cell === next.cell
  ),
);

const FusionSparkSprite = React.memo(
  ({ spark }: any) => {
    const opacity = useMemo(
      () => clamp(spark.life / spark.maxLife, 0, 1),
      [spark.life, spark.maxLife],
    );
    return spark.streak ? (
      <Line
        x1={spark.x}
        y1={spark.y}
        x2={spark.previousX}
        y2={spark.previousY}
        stroke={spark.color}
        strokeWidth={spark.size}
        strokeLinecap="round"
        opacity={opacity}
      />
    ) : (
      <Circle
        cx={spark.x}
        cy={spark.y}
        r={spark.size}
        fill={spark.color}
        opacity={opacity}
      />
    );
  },
  (previous: any, next: any) => (
    previous.spark.x === next.spark.x
      && previous.spark.y === next.spark.y
      && previous.spark.life === next.spark.life
      && previous.spark.previousX === next.spark.previousX
      && previous.spark.previousY === next.spark.previousY
  ),
);

type NativeArenaStaticProps = {
  width: number;
  height: number;
  cell: number;
  rows: number;
  level: number;
};

const NativeArenaStatic = React.memo(({
  width,
  height,
  cell,
  rows,
  level,
}: NativeArenaStaticProps) => {
  const backgroundSource = backgroundSourceForLevel(level);
  const gridLines: React.ReactNode[] = [];
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
        opacity={INITIAL_MAP_OPACITY}
      />
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
    </>
  );
});

type SkiaDynamicArenaProps = {
  snapshot: Snapshot;
  renderMargin: number;
  publisherRef: React.MutableRefObject<NativePicturePublisher | null>;
  onReady: () => void;
};

type NativeSkiaImageSet = {
  background: any;
  player: any;
  diamond: any;
  speedBoost: any;
  coreReactor: any;
  projectile: any;
  missile: any;
  spiderWeb: any;
  shipSmoke: any;
  enemies: Record<EnemyKind, any[]>;
};

type NativePicturePublisher = (game: Game, now: number) => void;

type NativeSkiaViewApi = {
  setJsiProperty: (nativeId: number, property: string, value: unknown) => void;
  requestRedraw: (nativeId: number) => void;
};

const getNativeSkiaViewApi = () => (
  (globalThis as typeof globalThis & {
    SkiaViewApi?: NativeSkiaViewApi;
  }).SkiaViewApi
);

const drawSkiaSpriteFrame = (
  canvas: any,
  image: any,
  sourceWidth: number,
  sourceHeight: number,
  frame: number,
  destination: { x: number; y: number; width: number; height: number },
  paint: any,
) => {
  if (!image) return;
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(frame * sourceWidth, 0, sourceWidth, sourceHeight),
    Skia.XYWHRect(
      destination.x,
      destination.y,
      destination.width,
      destination.height,
    ),
    paint,
  );
};

const drawSkiaImage = (
  canvas: any,
  image: any,
  sourceWidth: number,
  sourceHeight: number,
  destination: { x: number; y: number; width: number; height: number },
  paint: any,
) => {
  if (!image) return;
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(0, 0, sourceWidth, sourceHeight),
    Skia.XYWHRect(
      destination.x,
      destination.y,
      destination.width,
      destination.height,
    ),
    paint,
  );
};

const drawSkiaPolyline = (
  canvas: any,
  points: Point[],
  paint: any,
  close = false,
) => {
  if (points.length < 2) return;
  const pathBuilder = Skia.PathBuilder.Make();
  pathBuilder.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    pathBuilder.lineTo(points[index].x, points[index].y);
  }
  if (close) pathBuilder.close();
  canvas.drawPath(pathBuilder.detach(), paint);
};

const drawSkiaFallbackDrone = (
  canvas: any,
  x: number,
  y: number,
  size: { width: number; height: number },
  direction: Point,
  fillPaint: any,
  strokePaint: any,
) => {
  const angle = Math.atan2(direction.y, direction.x) + Math.PI / 2;
  const halfWidth = size.width * 0.5;
  const halfHeight = size.height * 0.5;
  const pathBuilder = Skia.PathBuilder.Make();
  pathBuilder.moveTo(0, -halfHeight);
  pathBuilder.lineTo(halfWidth, halfHeight * 0.72);
  pathBuilder.lineTo(0, halfHeight * 0.38);
  pathBuilder.lineTo(-halfWidth, halfHeight * 0.72);
  pathBuilder.close();
  fillPaint.setColor(Skia.Color('#00f3ff'));
  fillPaint.setAlphaf(0.22);
  fillPaint.setStyle(SkiaPaintStyle.Fill);
  strokePaint.setColor(Skia.Color('#fff3d6'));
  strokePaint.setAlphaf(0.98);
  strokePaint.setStyle(SkiaPaintStyle.Stroke);
  strokePaint.setStrokeWidth(Math.max(2, size.width * 0.075));
  canvas.save();
  canvas.translate(x, y);
  canvas.rotate(angle * 180 / Math.PI, 0, 0);
  canvas.drawPath(pathBuilder.detach(), fillPaint);
  const outlineBuilder = Skia.PathBuilder.Make();
  outlineBuilder.moveTo(0, -halfHeight);
  outlineBuilder.lineTo(halfWidth, halfHeight * 0.72);
  outlineBuilder.lineTo(0, halfHeight * 0.38);
  outlineBuilder.lineTo(-halfWidth, halfHeight * 0.72);
  outlineBuilder.close();
  canvas.drawPath(outlineBuilder.detach(), strokePaint);
  canvas.drawLine(0, -halfHeight * 0.35, 0, halfHeight * 0.72, strokePaint);
  canvas.restore();
};

const drawSkiaFallbackEnemy = (
  canvas: any,
  enemy: Enemy,
  cell: number,
  now: number,
  fillPaint: any,
  strokePaint: any,
) => {
  const size = enemyRenderSize(enemy.kind, cell, enemy.isMini);
  const motion = enemyAnimationTransform(enemy, cell);
  const color = enemy.kind === 'SHIP'
    ? '#ffb02e'
    : enemy.kind === 'DRAGON'
      ? '#ff4d7d'
      : enemy.kind === 'SEVEN'
        ? '#b8ff4a'
        : '#d56bff';
  const radius = Math.max(5, Math.min(size.width, size.height) * 0.34);
  fillPaint.setColor(Skia.Color(color));
  fillPaint.setAlphaf(0.22);
  fillPaint.setStyle(SkiaPaintStyle.Fill);
  strokePaint.setColor(Skia.Color(color));
  strokePaint.setAlphaf(0.95);
  strokePaint.setStyle(SkiaPaintStyle.Stroke);
  strokePaint.setStrokeWidth(Math.max(2, cell * 0.07));
  canvas.save();
  canvas.translate(enemy.x, enemy.y + motion.offsetY);
  canvas.rotate(motion.rotation * 180 / Math.PI, 0, 0);
  if (enemy.kind === 'SPIDER') {
    canvas.drawCircle(0, 0, radius, fillPaint);
    canvas.drawCircle(0, 0, radius, strokePaint);
    for (let leg = 0; leg < 4; leg += 1) {
      const legAngle = (leg * Math.PI) / 4;
      canvas.drawLine(
        Math.cos(legAngle) * radius * 0.35,
        Math.sin(legAngle) * radius * 0.35,
        Math.cos(legAngle) * radius * 1.7,
        Math.sin(legAngle) * radius * 1.7,
        strokePaint,
      );
      canvas.drawLine(
        -Math.cos(legAngle) * radius * 0.35,
        -Math.sin(legAngle) * radius * 0.35,
        -Math.cos(legAngle) * radius * 1.7,
        -Math.sin(legAngle) * radius * 1.7,
        strokePaint,
      );
    }
  } else {
    const pathBuilder = Skia.PathBuilder.Make();
    pathBuilder.moveTo(0, -radius * 1.3);
    pathBuilder.lineTo(radius * 1.15, radius * 0.95);
    pathBuilder.lineTo(0, radius * 0.52);
    pathBuilder.lineTo(-radius * 1.15, radius * 0.95);
    pathBuilder.close();
    canvas.drawPath(pathBuilder.detach(), fillPaint);
    const outlineBuilder = Skia.PathBuilder.Make();
    outlineBuilder.moveTo(0, -radius * 1.3);
    outlineBuilder.lineTo(radius * 1.15, radius * 0.95);
    outlineBuilder.lineTo(0, radius * 0.52);
    outlineBuilder.lineTo(-radius * 1.15, radius * 0.95);
    outlineBuilder.close();
    canvas.drawPath(outlineBuilder.detach(), strokePaint);
  }
  canvas.restore();
};

const buildNativeDynamicPicture = (
  game: Game,
  now: number,
  renderMargin: number,
  images: NativeSkiaImageSet,
) => {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(
    Skia.XYWHRect(
      -renderMargin,
      -renderMargin,
      game.width + renderMargin * 2,
      game.height + renderMargin * 2,
    ),
  );
  const fillPaint = Skia.Paint();
  const strokePaint = Skia.Paint();
  const imagePaint = Skia.Paint();
  fillPaint.setStyle(SkiaPaintStyle.Fill);
  strokePaint.setStyle(SkiaPaintStyle.Stroke);
  strokePaint.setStrokeCap(SkiaStrokeCap.Round);
  imagePaint.setAntiAlias(true);
  canvas.save();
  canvas.translate(renderMargin, renderMargin);

  const setPaint = (
    paint: any,
    color: string,
    alpha = 1,
    style = SkiaPaintStyle.Fill,
    strokeWidth = 1,
  ) => {
    paint.setColor(Skia.Color(color));
    paint.setAlphaf(alpha);
    paint.setStyle(style);
    if (style === SkiaPaintStyle.Stroke) paint.setStrokeWidth(strokeWidth);
  };

  const bounds = perimeterBounds(game.width, game.height, game.cell);
  const pickupSize = pickupVisualSize(game.cell);

  if (images.background) {
    drawSkiaImage(
      canvas,
      images.background,
      1024,
      1024,
      {
        x: 0,
        y: 0,
        width: game.width,
        height: game.height,
      },
      imagePaint,
    );
  } else {
    setPaint(fillPaint, '#02070d', 1);
    canvas.drawRect(Skia.XYWHRect(0, 0, game.width, game.height), fillPaint);
  }

  setPaint(strokePaint, ZONE_COLOR, 0.95, SkiaPaintStyle.Stroke, PERIMETER_STROKE_WIDTH);
  canvas.drawRect(
    Skia.XYWHRect(
      bounds.left,
      bounds.top,
      bounds.right - bounds.left,
      bounds.bottom - bounds.top,
    ),
    strokePaint,
  );

  if (game.claimedPolygons.length > 0) {
    setPaint(fillPaint, ZONE_COLOR, CAPTURED_ZONE_LAYER_OPACITY);
    for (const polygon of game.claimedPolygons) {
      drawSkiaPolyline(canvas, polygon, fillPaint, true);
    }
  }

  if (game.protectedTrails.length > 0) {
    setPaint(strokePaint, '#ff5500', 1, SkiaPaintStyle.Stroke, 5);
    for (const protectedTrail of game.protectedTrails) {
      drawSkiaPolyline(canvas, protectedTrail, strokePaint);
    }
  }

  if (game.trail.length > 1) {
    setPaint(strokePaint, '#fff3d6', 0.16, SkiaPaintStyle.Stroke, 12);
    drawSkiaPolyline(canvas, game.trail, strokePaint);
    setPaint(strokePaint, '#ffffff', 1, SkiaPaintStyle.Stroke, 5);
    drawSkiaPolyline(canvas, game.trail, strokePaint);
  }

  const diamondFrame = Math.floor(game.frame / DIAMOND_SPRITE_FRAME_DURATION)
    % DIAMOND_SPRITE_FRAME_COUNT;
  for (const diamond of game.diamonds) {
    if (diamond.collected || !images.diamond) continue;
    const size = pickupSize;
    drawSkiaSpriteFrame(
      canvas,
      images.diamond,
      DIAMOND_SPRITE_FRAME_SIZE,
      DIAMOND_SPRITE_FRAME_SIZE,
      diamondFrame,
      {
        x: diamond.x - size / 2,
        y: diamond.y + pickupFloatOffset(game.frame, diamond.phase, game.cell) - size / 2,
        width: size,
        height: size,
      },
      imagePaint,
    );
  }

  const speedSize = pickupSize * 0.92;
  for (const speedBoost of game.speedBoosts) {
    if (speedBoost.collected || !images.speedBoost) continue;
    drawSkiaImage(
      canvas,
      images.speedBoost,
      498,
      465,
      {
        x: speedBoost.x - speedSize / 2,
        y: speedBoost.y + pickupFloatOffset(game.frame, speedBoost.phase, game.cell) - speedSize / 2,
        width: speedSize,
        height: speedSize,
      },
      imagePaint,
    );
  }

  if (images.coreReactor) {
    const bombFrame = Math.floor(game.frame / CORE_REACTOR_SPRITE_FRAME_DURATION)
      % CORE_REACTOR_SPRITE_FRAME_COUNT;
    for (const bomb of game.bombs) {
      if (bomb.destroyed) continue;
      const floatY = pickupFloatOffset(
        game.frame,
        bomb.x * 0.013 + bomb.y * 0.007,
        game.cell,
      );
      drawSkiaSpriteFrame(
        canvas,
        images.coreReactor,
        CORE_REACTOR_SPRITE_FRAME_SIZE,
        CORE_REACTOR_SPRITE_FRAME_SIZE,
        bombFrame,
        {
          x: bomb.x - pickupSize / 2,
          y: bomb.y + floatY - pickupSize / 2,
          width: pickupSize,
          height: pickupSize,
        },
        imagePaint,
      );
    }
  }

  for (const thread of game.spiderThreads) {
    const active = spiderThreadIsActive(thread);
    if (thread.anchored && images.spiderWeb) {
      const size = game.cell * thread.webSizeCells * NON_PLAYER_RENDER_SCALE;
      imagePaint.setAlphaf(clamp(0.6 + thread.remaining * 0.08, 0.6, 0.88));
      drawSkiaImage(
        canvas,
        images.spiderWeb,
        1024,
        1024,
        {
          x: thread.target.x - size / 2,
          y: thread.target.y - size / 2,
          width: size,
          height: size,
        },
        imagePaint,
      );
    } else {
      setPaint(strokePaint, '#fff3d6', active ? 0.82 : 0.94, SkiaPaintStyle.Stroke, 2.8);
      canvas.drawLine(thread.start.x, thread.start.y, thread.end.x, thread.end.y, strokePaint);
      setPaint(strokePaint, '#00f3ff', active ? 0.9 : 0.72, SkiaPaintStyle.Stroke, 0.72);
      canvas.drawLine(thread.start.x, thread.start.y, thread.end.x, thread.end.y, strokePaint);
      setPaint(fillPaint, '#fff3d6', active ? 0.9 : 0.72);
      canvas.drawCircle(thread.end.x, thread.end.y, 3.2, fillPaint);
    }
  }

  for (const particle of game.particles) {
    const opacity = clamp(particle.life / 0.4, 0, 1);
    if (particle.streak) {
      setPaint(strokePaint, particle.color, opacity, SkiaPaintStyle.Stroke, particle.size * 1.35);
      canvas.drawLine(
        particle.x,
        particle.y,
        particle.x - particle.vx * 0.018,
        particle.y - particle.vy * 0.018,
        strokePaint,
      );
    } else {
      setPaint(fillPaint, particle.color, opacity);
      canvas.drawCircle(particle.x, particle.y, particle.size, fillPaint);
    }
  }

  if (game.fusion) {
    const head = pointOnPolyline(
      game.fusion.path,
      game.fusion.cumulativeLengths,
      game.fusion.totalLength * clamp(
        game.fusion.elapsed / game.fusion.travelDuration,
        0,
        1,
      ),
    ).point;
    setPaint(fillPaint, '#ff6a16', 0.28);
    canvas.drawCircle(head.x, head.y, game.cell * 0.23, fillPaint);
    setPaint(fillPaint, '#fff5bd', 0.92);
    canvas.drawCircle(head.x, head.y, game.cell * 0.1, fillPaint);
  }

  for (const spark of game.fusionSparks) {
    const opacity = clamp(spark.life / spark.maxLife, 0, 1);
    setPaint(
      spark.streak ? strokePaint : fillPaint,
      spark.color,
      opacity,
      spark.streak ? SkiaPaintStyle.Stroke : SkiaPaintStyle.Fill,
      spark.size,
    );
    if (spark.streak) {
      canvas.drawLine(spark.previousX, spark.previousY, spark.x, spark.y, strokePaint);
    } else {
      canvas.drawCircle(spark.x, spark.y, spark.size, fillPaint);
    }
  }

  if (images.projectile) {
    const projectileSize = sevenProjectileSize(game.cell);
    for (const projectile of game.projectiles) {
      drawSkiaImage(
        canvas,
        images.projectile,
        1024,
        1024,
        {
          x: projectile.x - projectileSize / 2,
          y: projectile.y - projectileSize / 2,
          width: projectileSize,
          height: projectileSize,
        },
        imagePaint,
      );
    }
  }

  if (images.missile) {
    const missileSize = playerMissileSize(game.cell);
    for (const missile of game.missiles) {
      if (!pointInsidePerimeter(missile, bounds)) continue;
      canvas.save();
      canvas.translate(missile.x, missile.y);
      canvas.rotate(missile.angle * 180 / Math.PI, 0, 0);
      drawSkiaImage(
        canvas,
        images.missile,
        1024,
        1024,
        {
          x: -missileSize / 2,
          y: -missileSize / 2,
          width: missileSize,
          height: missileSize,
        },
        imagePaint,
      );
      canvas.restore();
    }
  }

  if (SHIP_SMOKE_RENDER_MODE === 'SPRITE' && images.shipSmoke) {
    const smokeFrame = Math.floor(game.frame / SHIP_SMOKE_SPRITE_FRAME_DURATION)
      % SHIP_SMOKE_SPRITE_FRAME_COUNT;
    for (const enemy of game.enemies) {
      if (enemy.kind !== 'SHIP' || enemy.respawnAt > now) continue;
      const smokePosition = shipSmokePosition(enemy, game.cell);
      const motion = enemyAnimationTransform(enemy, game.cell);
      const smokeSize = game.cell
        * (enemy.isMini ? 0.9 : 1.8)
        * NON_PLAYER_RENDER_SCALE;
      imagePaint.setAlphaf(0.58);
      canvas.save();
      canvas.translate(smokePosition.x, smokePosition.y + motion.offsetY);
      canvas.rotate(motion.rotation * 180 / Math.PI, 0, 0);
      drawSkiaSpriteFrame(
        canvas,
        images.shipSmoke,
        SHIP_SMOKE_SPRITE_FRAME_SIZE,
        SHIP_SMOKE_SPRITE_FRAME_SIZE,
        smokeFrame,
        {
          x: -smokeSize / 2,
          y: -smokeSize / 2,
          width: smokeSize,
          height: smokeSize,
        },
        imagePaint,
      );
      canvas.restore();
    }
  }

  for (const enemy of game.enemies) {
    if (enemy.respawnAt > now) continue;
    const frame = enemyFrameIndex(enemy);
    const image = images.enemies[enemy.kind]?.[frame];
    if (!image) {
      drawSkiaFallbackEnemy(canvas, enemy, game.cell, now, fillPaint, strokePaint);
      continue;
    }
    const size = enemyRenderSize(enemy.kind, game.cell, enemy.isMini);
    const motion = enemyAnimationTransform(enemy, game.cell);
    canvas.save();
    canvas.translate(enemy.x, enemy.y + motion.offsetY);
    canvas.rotate(motion.rotation * 180 / Math.PI, 0, 0);
    canvas.scale(motion.scale, motion.scale);
    imagePaint.setAlphaf(0.98);
    drawSkiaImage(
      canvas,
      image,
      512,
      512,
      {
        x: -size.width / 2,
        y: -size.height / 2,
        width: size.width,
        height: size.height,
      },
      imagePaint,
    );
    canvas.restore();
  }

  for (const polygon of game.pendingCapturePolygons) {
    const intervals = polygonHorizontalIntervals(polygon, game.scanY);
    for (const [startX, endX] of intervals) {
      setPaint(strokePaint, '#ffffff', 0.2, SkiaPaintStyle.Stroke, 8);
      canvas.drawLine(startX, game.scanY, endX, game.scanY, strokePaint);
      setPaint(strokePaint, '#ffffff', 0.98, SkiaPaintStyle.Stroke, 2);
      canvas.drawLine(startX, game.scanY, endX, game.scanY, strokePaint);
    }
  }

  if (isParticleSmokeMode(SHIP_SMOKE_RENDER_MODE)) {
    for (const puff of game.smokePuffs) {
      const opacity = clamp(puff.life / puff.maxLife, 0, 1) * 0.22;
      setPaint(fillPaint, '#00f3ff', opacity);
      canvas.drawCircle(puff.x, puff.y, puff.size, fillPaint);
      setPaint(fillPaint, '#ffffff', opacity * 0.55);
      canvas.drawCircle(puff.x, puff.y, puff.size * 0.42, fillPaint);
    }
  }

  const invincibilityRemaining = Math.max(0, game.invincibleUntil - now);
  if (invincibilityRemaining > 0) {
    const protectionPulse = clamp(
      0.5
        + Math.sin(now * 0.014) * 0.24
        + Math.sin(now * 0.041) * 0.15
        + Math.sin(now * 0.083) * 0.1,
      0,
      1,
    );
    setPaint(
      strokePaint,
      '#00f3ff',
      0.1 + protectionPulse * 0.22,
      SkiaPaintStyle.Stroke,
      game.cell * 0.065,
    );
    canvas.drawCircle(game.player.x, game.player.y, game.cell * (0.92 + protectionPulse * 0.12), strokePaint);
    setPaint(fillPaint, '#00f3ff', 0.015 + protectionPulse * 0.045);
    canvas.drawCircle(game.player.x, game.player.y, game.cell * (0.62 + protectionPulse * 0.08), fillPaint);
    setPaint(
      strokePaint,
      '#fff5cf',
      0.06 + protectionPulse * 0.16,
      SkiaPaintStyle.Stroke,
      game.cell * 0.02,
    );
    canvas.drawCircle(game.player.x, game.player.y, game.cell * 1.16, strokePaint);
  }

  const currentDirection = game.trail.length > 0 ? game.cutDir : game.facingDir;
  const playerSize = playerSpriteSize(game.cell);
  if (images.player) {
    canvas.save();
    canvas.translate(game.player.x, game.player.y);
    canvas.rotate(
      (Math.atan2(currentDirection.y, currentDirection.x) + Math.PI / 2) * 180 / Math.PI,
      0,
      0,
    );
    imagePaint.setAlphaf(0.98);
    drawSkiaImage(
      canvas,
      images.player,
      1024,
      1024,
      {
        x: -playerSize.width / 2,
        y: -playerSize.height / 2,
        width: playerSize.width,
        height: playerSize.height,
      },
      imagePaint,
    );
    canvas.restore();
  } else {
    drawSkiaFallbackDrone(
      canvas,
      game.player.x,
      game.player.y,
      playerSize,
      currentDirection,
      fillPaint,
      strokePaint,
    );
  }

  canvas.restore();
  return recorder.finishRecordingAsPicture();
};

const SkiaDynamicArena = React.memo(({
  snapshot,
  renderMargin,
  publisherRef,
  onReady,
}: SkiaDynamicArenaProps) => {
  const backgroundImage = useSkiaImage(backgroundSourceForLevel(snapshot.level));
  const playerImage = useSkiaImage(playerSource);
  const diamondImage = useSkiaImage(diamondSpriteSource);
  const speedBoostImage = useSkiaImage(speedBoostSource);
  const coreReactorImage = useSkiaImage(coreReactorSpriteSource);
  const projectileImage = useSkiaImage(sevenFireOrbSource);
  const missileImage = useSkiaImage(playerMissileSource);
  const spiderWebImage = useSkiaImage(spiderWebSource);
  const shipSmokeImage = useSkiaImage(shipSmokeSpriteSource);
  const shipImages = spriteFrames.SHIP.map((source) => useSkiaImage(source));
  const dragonImages = spriteFrames.DRAGON.map((source) => useSkiaImage(source));
  const sevenImages = spriteFrames.SEVEN.map((source) => useSkiaImage(source));
  const spiderImages = spriteFrames.SPIDER.map((source) => useSkiaImage(source));
  const pictureViewRef = useRef<any>(null);
  const [picture, setPicture] = useState<any>(null);
  const layoutReportedRef = useRef(false);
  const lastPicturePublishAtRef = useRef(0);

  useEffect(() => {
    const imageSet: NativeSkiaImageSet = {
      background: backgroundImage,
      player: playerImage,
      diamond: diamondImage,
      speedBoost: speedBoostImage,
      coreReactor: coreReactorImage,
      projectile: projectileImage,
      missile: missileImage,
      spiderWeb: spiderWebImage,
      shipSmoke: shipSmokeImage,
      enemies: {
        SHIP: shipImages,
        DRAGON: dragonImages,
        SEVEN: sevenImages,
        SPIDER: spiderImages,
      },
    };
    const allImagesReady = [
      backgroundImage,
      playerImage,
      diamondImage,
      speedBoostImage,
      coreReactorImage,
      projectileImage,
      missileImage,
      spiderWebImage,
      shipSmokeImage,
      ...shipImages,
      ...dragonImages,
      ...sevenImages,
      ...spiderImages,
    ].every(Boolean);
    const publisher: NativePicturePublisher = (game, now) => {
      if (
        lastPicturePublishAtRef.current !== 0
        && now - lastPicturePublishAtRef.current < NATIVE_PICTURE_PUBLISH_INTERVAL_MS
      ) {
        return;
      }
      lastPicturePublishAtRef.current = now;
      const nextPicture = buildNativeDynamicPicture(game, now, renderMargin, imageSet);
      const nativeId = pictureViewRef.current?.nativeId;
      const nativeApi = getNativeSkiaViewApi();
      if (
        typeof nativeId === 'number'
        && nativeApi?.setJsiProperty
        && nativeApi.requestRedraw
      ) {
        nativeApi.setJsiProperty(nativeId, 'picture', nextPicture);
        nativeApi.requestRedraw(nativeId);
      } else {
        // The first game frame can race the native view mount. Keep a single
        // React-prop path only for that startup case; steady-state animation
        // must not schedule a React render for every picture.
        setPicture(nextPicture);
      }
    };
    publisherRef.current = publisher;
    if (allImagesReady) onReady();
    return () => {
      if (publisherRef.current === publisher) publisherRef.current = null;
    };
  }, [
    renderMargin,
    publisherRef,
    onReady,
    backgroundImage,
    playerImage,
    diamondImage,
    speedBoostImage,
    coreReactorImage,
    projectileImage,
    missileImage,
    spiderWebImage,
    shipSmokeImage,
    shipImages,
    dragonImages,
    sevenImages,
    spiderImages,
    pictureViewRef,
  ]);

  if (!snapshot) return null;

  return (
    <View
      collapsable={false}
      style={{
        position: 'absolute',
        left: -renderMargin,
        top: -renderMargin,
        width: snapshot.width + renderMargin * 2,
        height: snapshot.height + renderMargin * 2,
      }}
      onLayout={(event) => {
        if (layoutReportedRef.current) return;
        layoutReportedRef.current = true;
        diagnosticLog('skia-view-layout', {
          width: Math.round(event.nativeEvent.layout.width),
          height: Math.round(event.nativeEvent.layout.height),
          snapshotWidth: Math.round(snapshot.width),
          snapshotHeight: Math.round(snapshot.height),
          renderMargin: Math.round(renderMargin),
          hasPicture: Boolean(picture),
        });
      }}
      pointerEvents="none"
    >
      <SkiaPictureView
        ref={pictureViewRef}
        picture={picture}
        collapsable={false}
        opaque={false}
        androidWarmup
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </View>
  );
}, (previous, next) => (
  previous.snapshot.width === next.snapshot.width
  && previous.snapshot.height === next.snapshot.height
  && previous.snapshot.cell === next.snapshot.cell
  && previous.renderMargin === next.renderMargin
  && previous.publisherRef === next.publisherRef
  && previous.onReady === next.onReady
));

const NativeArenaDynamic = React.memo(({
  snapshot,
  skiaPlayerReady,
  skiaShipReady,
}: {
  snapshot: Snapshot;
  skiaPlayerReady: boolean;
  skiaShipReady: boolean;
}) => {
  const arenaBounds = perimeterBounds(snapshot.width, snapshot.height, snapshot.cell);
  const angle = Math.atan2(snapshot.direction.y, snapshot.direction.x);
  const playerRotationDegrees = angle * (180 / Math.PI) + 90;
  const playerSize = playerSpriteSize(snapshot.cell);
  const pickupSize = pickupVisualSize(snapshot.cell);
  const invincibilityRemaining = Math.max(0, snapshot.invincibleUntil - Date.now());
  const protectionPulse = clamp(
    0.5
      + Math.sin(Date.now() * 0.014) * 0.24
      + Math.sin(Date.now() * 0.041) * 0.15
      + Math.sin(Date.now() * 0.083) * 0.1,
    0,
    1,
  );
  const diamondFrame = Math.floor(snapshot.frame / DIAMOND_SPRITE_FRAME_DURATION)
    % DIAMOND_SPRITE_FRAME_COUNT;
  const scanIntervals = snapshot.pendingCapturePolygons.flatMap((polygon) => (
    polygonHorizontalIntervals(polygon, snapshot.scanY)
  ));
  return (
    <>
      {snapshot.diamonds.map((diamond, index) => (
        <DiamondSprite
          key={`diamond-${index}`}
          diamond={diamond}
          diamondIndex={index}
          cell={snapshot.cell}
          frame={diamondFrame}
          pickupSize={pickupSize}
          diamondSpriteSource={diamondSpriteSource}
        />
      ))}
      {snapshot.speedBoosts.map((speedBoost, index) => (
        <SpeedBoostSprite
          key={`speed-boost-${index}`}
          speedBoost={speedBoost}
          cell={snapshot.cell}
          frame={snapshot.frame}
          speedBoostSource={speedBoostSource}
        />
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
              const smokeSize = snapshot.cell
                * (enemy.isMini ? 0.9 : 1.8)
                * NON_PLAYER_RENDER_SCALE;
              const frame = Math.floor(Date.now() / 55) % SHIP_SMOKE_SPRITE_FRAME_COUNT;
              const smokeClipId = `ship-smoke-single-blob-${index}`;
              return (
                <G
                  key={`ship-smoke-sprite-${index}`}
                  transform={`translate(${smokePosition.x} ${smokePosition.y + motion.offsetY}) rotate(${motion.rotation * (180 / Math.PI)}) translate(0 ${-smokeSize * 0.3})`}
                  opacity={0.58}
                >
                  <Defs>
                    <ClipPath id={smokeClipId}>
                      <Circle
                        cx={-smokeSize * 0.04}
                        cy={smokeSize * 0.3}
                        r={smokeSize * 0.28}
                      />
                    </ClipPath>
                  </Defs>
                  <G clipPath={`url(#${smokeClipId})`}>
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
                </G>
              );
            })}
        </>
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
      {snapshot.frame % 2 === 0 && snapshot.fusionSparks.map((spark, index) => (
        <FusionSparkSprite
          key={`fusion-spark-${index}`}
          spark={spark}
          sparkIndex={index}
        />
      ))}
      {snapshot.spiderThreads.map((thread, index) => (
        <SpiderThreadSprite
          key={`spider-thread-${index}`}
          thread={thread}
          threadIndex={index}
          cell={snapshot.cell}
          spiderWebSource={spiderWebSource}
        />
      ))}
      {snapshot.bombs.map((bomb, bombIndex) => (
        <BombSprite
          key={`bomb-${bombIndex}`}
          bomb={bomb}
          bombIndex={bombIndex}
          pickupSize={pickupSize}
          frame={Math.floor(snapshot.frame / CORE_REACTOR_SPRITE_FRAME_DURATION)
            % CORE_REACTOR_SPRITE_FRAME_COUNT}
          coreReactorSpriteSource={coreReactorSpriteSource}
        />
      ))}
      {snapshot.projectiles.map((projectile, projectileIndex) => (
        <ProjectileSprite
          key={`seven-projectile-${projectileIndex}`}
          projectile={projectile}
          projectileIndex={projectileIndex}
          cell={snapshot.cell}
          sevenFireOrbSource={sevenFireOrbSource}
        />
      ))}
      {snapshot.missiles.map((missile, missileIndex) => (
        <PlayerMissileSprite
          key={`player-missile-${missileIndex}`}
          missile={missile}
          missileIndex={missileIndex}
          cell={snapshot.cell}
          playerMissileSource={playerMissileSource}
          arenaBounds={arenaBounds}
        />
      ))}
      {snapshot.enemies
        .filter((enemy) => !(skiaShipReady && enemy.kind === 'SHIP'))
        .map((enemy, enemyIndex) => (
        <EnemySprite
          key={`enemy-sprite-${enemyIndex}`}
          enemy={enemy}
          enemyIndex={enemyIndex}
          cell={snapshot.cell}
          spriteFrames={spriteFrames}
        />
      ))}
      {scanIntervals.map(([startX, endX], index) => (
        <React.Fragment key={`capture-scan-${index}`}>
          <Line
            x1={startX}
            y1={snapshot.scanY}
            x2={endX}
            y2={snapshot.scanY}
            stroke="#ffffff"
            strokeWidth={8}
            opacity={0.2}
          />
          <Line
            x1={startX}
            y1={snapshot.scanY}
            x2={endX}
            y2={snapshot.scanY}
            stroke="#ffffff"
            strokeWidth={2}
            opacity={0.98}
          />
        </React.Fragment>
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
      {invincibilityRemaining > 0 && (
        <G pointerEvents="none">
          <Circle
            cx={snapshot.player.x}
            cy={snapshot.player.y}
            r={snapshot.cell * (0.92 + protectionPulse * 0.12)}
            fill="none"
            stroke="#00f3ff"
            strokeWidth={snapshot.cell * 0.065}
            opacity={0.1 + protectionPulse * 0.22}
          />
          <Circle
            cx={snapshot.player.x}
            cy={snapshot.player.y}
            r={snapshot.cell * (0.62 + protectionPulse * 0.08)}
            fill="#00f3ff"
            opacity={0.015 + protectionPulse * 0.045}
          />
          <Circle
            cx={snapshot.player.x}
            cy={snapshot.player.y}
            r={snapshot.cell * 1.16}
            fill="none"
            stroke="#fff5cf"
            strokeWidth={snapshot.cell * 0.02}
            opacity={0.06 + protectionPulse * 0.16}
          />
        </G>
      )}
      {!skiaPlayerReady && (
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
      )}
    </>
  );
});

const DebugSectorSelector = ({
  currentSector,
  tutorialStep,
  onSelect,
  onSkipTutorial,
  bottomInset,
}: {
  currentSector: number;
  tutorialStep: 1 | 2 | 3 | 4;
  onSelect: (sector: number) => void;
  onSkipTutorial: () => void;
  bottomInset: number;
}) => {
  if (!DEBUG_SECTOR_SELECTOR_ENABLED) return null;
  const tutorialInstruction = (
    tutorialStep === 1
      ? 'SWIPES 4 DIRECTIONS'
      : tutorialStep === 2
        ? 'SÉCURISE 80% DE LA ZONE'
        : tutorialStep === 3
          ? 'CAPTURE LE VAISSEAU + 80%'
          : 'DÉTRUIS LE VAISSEAU + 80%'
  );
  return (
    <View style={[styles.debugSectorSelector, { bottom: bottomInset }]}>
      {currentSector === TUTORIAL_SECTOR && (
        <View style={styles.tutorialControlRow}>
          <Pressable
            style={styles.skipTutorialButton}
            onPress={onSkipTutorial}
            accessibilityRole="button"
            accessibilityLabel="Passer le tutoriel et reprendre au dernier secteur joué"
            testID="skip-tutorial"
          >
            <Text style={styles.skipTutorialButtonText}>PASSER LE TUTORIEL</Text>
          </Pressable>
          <View style={styles.tutorialInstruction}>
            <Text
              style={styles.tutorialInstructionText}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.68}
            >
              {tutorialInstruction}
            </Text>
          </View>
        </View>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.debugSectorContent}
      >
        {Array.from({ length: MAX_LEVEL + 1 }, (_, index) => {
          const sector = index;
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
              accessibilityLabel={
                sector === TUTORIAL_SECTOR
                  ? 'Téléporter au tutoriel secteur 0'
                  : `Téléporter au secteur ${sector}`
              }
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

const TutorialSwipeGuide = ({ counts }: { counts: TutorialSwipeCounts }) => {
  const arrowStyle = (direction: TutorialDirection) => (
    counts[direction] >= TUTORIAL_SWIPE_REPETITIONS
      ? styles.tutorialArrowDone
      : counts[direction] > 0
        ? styles.tutorialArrowProgress
        : styles.tutorialArrow
  );

  return (
    <View style={styles.tutorialGuide} pointerEvents="none">
      <Text
        style={styles.tutorialGuideLabel}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
      >
        SWIPE D&apos;UN GESTE DANS LES 4 DIRECTIONS
      </Text>
      <View style={styles.tutorialArrowGrid}>
        <View style={styles.tutorialArrowRow}>
          <View style={styles.tutorialArrowSlot} />
          <Text style={arrowStyle('up')}>▲</Text>
          <View style={styles.tutorialArrowSlot} />
        </View>
        <View style={styles.tutorialArrowRow}>
          <Text style={arrowStyle('left')}>◀</Text>
          <View style={styles.tutorialCenterSlot}>
            <Text style={styles.tutorialCenterMark}>✦</Text>
          </View>
          <Text style={arrowStyle('right')}>▶</Text>
        </View>
        <View style={styles.tutorialArrowRow}>
          <View style={styles.tutorialArrowSlot} />
          <Text style={arrowStyle('down')}>▼</Text>
          <View style={styles.tutorialArrowSlot} />
        </View>
      </View>
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
    speedBoosts: [],
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
    invincibleUntil: 0,
    speedBoostUntil: 0,
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
  const [fps, setFps] = useState(0);
  const [skiaReady, setSkiaReady] = useState(false);
  const handleSkiaReady = useCallback(() => setSkiaReady(true), []);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [isLoadingScreenVisible, setIsLoadingScreenVisible] = useState(true);
  const [isInitialLoadingReady, setIsInitialLoadingReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [nativeSnapshot, setNativeSnapshot] = useState<Snapshot | null>(null);
  const performanceMetricsRef = useRef<PerformanceMetrics>({
    frames: 0,
    updateMs: 0,
    collisionMs: 0,
    renderMs: 0,
    nativeBuildMs: 0,
    particleCount: 0,
    peakParticles: 0,
  });
  const lastPerformanceReportAtRef = useRef(0);
  const nativeSnapshotRef = useRef<Snapshot | null>(null);
  const nativePicturePublisherRef = useRef<NativePicturePublisher | null>(null);
  const nativeArenaRenderReportedRef = useRef(false);
  const nativeDynamicRenderReportedRef = useRef(false);
  const lastHudPublishAtRef = useRef(0);
  const spriteImagesRef = useRef<Record<string, any>>({});
  const coreReactorImageRef = useRef<any>(null);
  const sevenFireOrbImageRef = useRef<any>(null);
  const playerMissileImageRef = useRef<any>(null);
  const spiderWebImageRef = useRef<any>(null);
  const diamondSpriteImageRef = useRef<any>(null);
  const speedBoostImageRef = useRef<any>(null);
  const playerImageRef = useRef<any>(null);
  const shipSmokeSpriteImageRef = useRef<any>(null);
  const sectorBackgroundImageRefs = useRef<Record<number, any>>({});
  const sectorBackgroundLoadPromisesRef = useRef<Record<number, Promise<void>>>({});
  const webAssetImageRefs = useRef<Record<string, any>>({});
  const webAssetLoadPromisesRef = useRef<Record<string, Promise<void>>>({});
  const allGameAssetsPromiseRef = useRef<Promise<void> | null>(null);
  const initialSectorPreparationStartedRef = useRef(false);
  const bestScoreRef = useRef(0);
  const bestScoreHydratedRef = useRef(false);
  const savedGameRef = useRef<PersistedGame | null>(null);
  const savedGameHydratedRef = useRef(false);
  const saveQueueRef = useRef(Promise.resolve());
  const lastGameSaveAtRef = useRef(0);
  const recordBannerShownRef = useRef(false);
  const bannerQueueRef = useRef<Banner[]>([]);
  const bannerAnimatingRef = useRef(false);
  const bannerSequenceRef = useRef(0);
  const bannerTranslateX = useRef(new Animated.Value(-520)).current;
  const initialLoadingRevealStartedRef = useRef(false);
  const initialLoadingTapHandledRef = useRef(false);
  const initialLoadingBannerRef = useRef<Banner | null>(null);
  const loadingBannerTranslateX = useRef(new Animated.Value(0)).current;
  const lastPlayedSectorRef = useRef(0);
  const lastPlayedSectorHydratedRef = useRef(false);
  const tutorialSwipeCountsRef = useRef<TutorialSwipeCounts>({ ...EMPTY_TUTORIAL_SWIPE_COUNTS });
  const tutorialSwipeGestureDirectionRef = useRef<TutorialDirection | null>(null);
  const tutorialCompletionBannerShownRef = useRef(false);
  const tutorialCaptureCompletionBannerShownRef = useRef(false);
  const tutorialEnemyCaptureCompletionBannerShownRef = useRef(false);
  const tutorialEnemyCaptureProgressBannerShownRef = useRef(false);
  const tutorialEnemyDestroyedRef = useRef(false);
  const tutorialEnemyDestructionCompletionBannerShownRef = useRef(false);
  const tutorialStepRef = useRef<1 | 2 | 3 | 4>(1);
  const [tutorialSwipeCounts, setTutorialSwipeCounts] = useState<TutorialSwipeCounts>({
    ...EMPTY_TUTORIAL_SWIPE_COUNTS,
  });
  const [tutorialStep, setTutorialStep] = useState<1 | 2 | 3 | 4>(1);

  useEffect(() => {
    diagnosticLog('game-screen-mounted', {
      platform: Platform.OS,
      smokeRenderMode: SHIP_SMOKE_RENDER_MODE,
      shipSmokeCount: 1,
    });
    return () => {
      diagnosticLog('game-screen-unmounted');
    };
  }, []);

  const saveGameProgress = useCallback(() => {
    const game = gameRef.current;
    if (
      !game.initialized
      || game.status !== 'PLAYING'
      || game.level === TUTORIAL_SECTOR
    ) {
      return;
    }
    const serialized = JSON.stringify(serializeGame(game, Date.now()));
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(GAME_SAVE_STORAGE_KEY, serialized))
      .catch((error: unknown) => {
        if (__DEV__) console.warn('Unable to save game progress', error);
      });
  }, []);
  const clearSavedGameProgress = useCallback(() => {
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(() => AsyncStorage.removeItem(GAME_SAVE_STORAGE_KEY))
      .catch((error: unknown) => {
        if (__DEV__) console.warn('Unable to clear saved game progress', error);
      });
  }, []);
  const rememberLastPlayedSector = useCallback((sector: number) => {
    const normalizedSector = Math.round(clamp(sector, 1, MAX_LEVEL));
    lastPlayedSectorRef.current = normalizedSector;
    void AsyncStorage.setItem(LAST_PLAYED_SECTOR_STORAGE_KEY, String(normalizedSector))
      .catch((error: unknown) => {
        if (__DEV__) console.warn('Unable to save last played sector', error);
      });
  }, []);
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
    if (Platform.OS !== 'web') {
      // Native gameplay must not depend on the JS animation queue. A tight
      // 60 FPS scheduler can delay Animated callbacks on Android and leave
      // the sector-start card permanently over the game.
      setBanner(null);
      nextBanner.onComplete?.();
      return;
    }
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
        Animated.delay(next.kind === 'TUTORIAL' ? 2400 : 820),
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
        next.onComplete?.();
        playNextBanner();
      });
    };

    playNextBanner();
  }, [bannerTranslateX]);

  const revealGameAfterInitialLoad = useCallback((nextBanner: Banner) => {
    if (initialLoadingRevealStartedRef.current) return;
    initialLoadingRevealStartedRef.current = true;
    setLoadingProgress(1);
    if (Platform.OS !== 'web') {
      initialLoadingBannerRef.current = null;
      setIsLoadingScreenVisible(false);
      setIsInitialLoadingReady(false);
      diagnosticLog('native-loading-autostart', { level: nextBanner.level });
      enqueueBanner(nextBanner);
      return;
    }
    initialLoadingBannerRef.current = nextBanner;
    setIsInitialLoadingReady(true);
  }, [enqueueBanner]);

  const handleInitialLoadingTap = useCallback(() => {
    if (
      !isLoadingScreenVisible
      || !isInitialLoadingReady
      || initialLoadingTapHandledRef.current
    ) {
      return;
    }
    initialLoadingTapHandledRef.current = true;
    audioUnlockedRef.current = true;
    loadingBannerTranslateX.stopAnimation();
    Animated.timing(loadingBannerTranslateX, {
      toValue: Math.max(sizeRef.current.width, 360) + 180,
      duration: 330,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setIsLoadingScreenVisible(false);
      setIsInitialLoadingReady(false);
      const nextBanner = initialLoadingBannerRef.current;
      initialLoadingBannerRef.current = null;
      if (nextBanner) enqueueBanner(nextBanner);
    });
  }, [
    enqueueBanner,
    isInitialLoadingReady,
    isLoadingScreenVisible,
    loadingBannerTranslateX,
  ]);

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
    let cancelled = false;
    AsyncStorage.getItem(GAME_SAVE_STORAGE_KEY)
      .then((storedGame) => {
        if (cancelled || !storedGame) return;
        try {
          const parsedGame: unknown = JSON.parse(storedGame);
          if (isPersistedGame(parsedGame)) {
            savedGameRef.current = parsedGame;
          } else if (__DEV__) {
            console.warn('Ignoring invalid saved game progress');
          }
        } catch (error) {
          if (__DEV__) console.warn('Unable to parse saved game progress', error);
        }
      })
      .catch((error: unknown) => {
        if (__DEV__) console.warn('Unable to load saved game progress', error);
      })
      .finally(() => {
        if (!cancelled) savedGameHydratedRef.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(LAST_PLAYED_SECTOR_STORAGE_KEY)
      .then((storedSector) => {
        if (cancelled) return;
        const parsedSector = Number.parseInt(storedSector ?? '0', 10);
        lastPlayedSectorRef.current = Number.isFinite(parsedSector)
          ? Math.round(clamp(parsedSector, 0, MAX_LEVEL))
          : 0;
      })
      .catch((error: unknown) => {
        if (__DEV__) console.warn('Unable to load last played sector', error);
      })
      .finally(() => {
        if (!cancelled) lastPlayedSectorHydratedRef.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        saveGameProgress();
      }
    });
    return () => subscription.remove();
  }, [saveGameProgress]);

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

  const loadWebImageAsset = useCallback((assetModule: any) => {
    const resolvedAsset = (RNImage as any).resolveAssetSource?.(assetModule);
    const uri = String(resolvedAsset?.uri ?? assetModule?.uri ?? assetModule);
    if (webAssetImageRefs.current[uri]) return Promise.resolve();
    const existingPromise = webAssetLoadPromisesRef.current[uri];
    if (existingPromise) return existingPromise;

    const image = new (globalThis as any).Image();
    image.decoding = 'async';
    const promise = new Promise<void>((resolve, reject) => {
      image.onload = () => {
        const finish = () => {
          webAssetImageRefs.current[uri] = image;
          resolve();
        };
        if (typeof image.decode === 'function') {
          void image.decode().then(finish).catch(finish);
        } else {
          finish();
        }
      };
      image.onerror = () => {
        reject(new Error(`Unable to preload web image asset: ${uri}`));
      };
    });
    webAssetLoadPromisesRef.current[uri] = promise;
    image.src = uri;
    return promise;
  }, []);

  const loadNativeImageAsset = useCallback((assetModule: any) => {
    if (Platform.OS === 'web') return Promise.resolve();
    const resolvedAsset = (RNImage as any).resolveAssetSource?.(assetModule);
    const uri = String(resolvedAsset?.uri ?? assetModule?.uri ?? assetModule);
    const prefetch = typeof (RNImage as any).prefetch === 'function'
      ? (RNImage as any).prefetch(uri).catch(() => false)
      : Promise.resolve(false);
    const dimensions = new Promise<void>((resolve, reject) => {
      RNImage.getSize(
        uri,
        () => resolve(),
        () => reject(new Error(`Unable to preload native image asset: ${uri}`)),
      );
    });
    // Prefetch warms the native cache but is not a readiness signal: on some
    // Expo Go Android sessions it never settles for a bundled local asset.
    // The size callback is the readiness check used by the launch gate.
    void prefetch;
    const load = dimensions;
    // A native asset callback can remain pending indefinitely in Expo Go when
    // Android has a stale local image request. Do not hold the launch gate
    // forever; Skia's own image loader continues independently.
    const timeout = new Promise<void>((resolve) => {
      setTimeout(resolve, NATIVE_ASSET_PRELOAD_TIMEOUT_MS);
    });
    return Promise.race([load, timeout]);
  }, []);

  const preloadAllGameAssets = useCallback(() => {
    if (!allGameAssetsPromiseRef.current) {
      const imageModules = [
        ...Object.values(spriteFrames).flat(),
        diamondSource,
        playerSource,
        playerMissileSource,
        cockpitInteriorSource,
        shipSmokeSpriteSource,
        coreReactorSpriteSource,
        sevenFireOrbSource,
        diamondSpriteSource,
        speedBoostSource,
        spiderWebSource,
      ];
      const uniqueAssetModules = Array.from(new Set(imageModules));
      allGameAssetsPromiseRef.current = Promise.allSettled(
        uniqueAssetModules.map((assetModule) => {
          if (Platform.OS === 'web') return loadWebImageAsset(assetModule);
          return loadNativeImageAsset(assetModule);
        }),
      ).then((results) => {
        const failedCount = results.filter((result) => result.status === 'rejected').length;
        diagnosticLog('game-assets-preloaded', {
          requestedCount: uniqueAssetModules.length,
          failedCount,
        });
      });
    }
    return allGameAssetsPromiseRef.current;
  }, [loadNativeImageAsset, loadWebImageAsset]);

  const loadWebBackground = useCallback((level: number) => {
    const normalizedLevel = Math.min(MAX_LEVEL, Math.max(1, Math.round(level)));
    if (sectorBackgroundImageRefs.current[normalizedLevel]) return Promise.resolve();
    const existingPromise = sectorBackgroundLoadPromisesRef.current[normalizedLevel];
    if (existingPromise) return existingPromise;

    const source = backgroundSourceForLevel(normalizedLevel);
    if (Platform.OS !== 'web') {
      // Android renders the bundled source directly through SvgImage/Skia.
      // Do not put the game into SECTOR_TRANSITION while waiting for an
      // optional Image.getSize/prefetch callback: Expo Go can leave that
      // callback pending for a local asset. The native renderer loads the
      // background independently after the sector becomes active.
      const promise = Promise.resolve();
      sectorBackgroundLoadPromisesRef.current[normalizedLevel] = promise;
      return promise;
    }
    const resolvedBackground = (RNImage as any).resolveAssetSource?.(source);
    const backgroundUri = String(resolvedBackground?.uri ?? source);
    const promise = loadWebImageAsset(source)
      .then(() => {
        sectorBackgroundImageRefs.current[normalizedLevel] = webAssetImageRefs.current[backgroundUri];
      })
      .catch((error: unknown) => {
        diagnosticLog('sector-background-preload-failed', {
          level: normalizedLevel,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    sectorBackgroundLoadPromisesRef.current[normalizedLevel] = promise;
    return promise;
  }, [loadNativeImageAsset, loadWebImageAsset]);

  const preloadBackgroundWindow = useCallback((
    startLevel: number,
    count = INITIAL_BACKGROUND_PRELOAD_COUNT,
  ) => {
    const firstLevel = Math.min(MAX_LEVEL, Math.max(1, Math.round(startLevel)));
    const levels = Array.from(
      { length: Math.max(1, Math.min(count, MAX_LEVEL - firstLevel + 1)) },
      (_, index) => firstLevel + index,
    );
    return Promise.all(levels.map((level) => loadWebBackground(level)));
  }, [loadWebBackground]);

  const preloadSectorForBanner = useCallback(async (
    level: number,
    onProgress?: (progress: number) => void,
  ) => {
    const normalizedLevel = Math.min(MAX_LEVEL, Math.max(1, Math.round(level)));
    onProgress?.(0.08);
    await preloadAllGameAssets();
    onProgress?.(0.76);
    await loadWebBackground(normalizedLevel);
    onProgress?.(0.94);
    diagnosticLog('sector-assets-ready', { level: normalizedLevel });
  }, [loadWebBackground, preloadAllGameAssets]);

  const releaseSectorBackground = useCallback((level: number, nextLevel: number) => {
    const normalizedLevel = Math.min(MAX_LEVEL, Math.max(1, Math.round(level)));
    const normalizedNextLevel = Math.min(MAX_LEVEL, Math.max(1, Math.round(nextLevel)));
    if (normalizedLevel === normalizedNextLevel) return;
    if (Platform.OS === 'web') {
      const backgroundImage = sectorBackgroundImageRefs.current[normalizedLevel];
      if (backgroundImage) {
        backgroundImage.onload = null;
        backgroundImage.onerror = null;
        backgroundImage.src = '';
      }
      const source = backgroundSourceForLevel(normalizedLevel);
      const resolvedBackground = (RNImage as any).resolveAssetSource?.(source);
      const backgroundUri = String(resolvedBackground?.uri ?? source);
      delete webAssetImageRefs.current[backgroundUri];
      delete webAssetLoadPromisesRef.current[backgroundUri];
      delete sectorBackgroundImageRefs.current[normalizedLevel];
      delete sectorBackgroundLoadPromisesRef.current[normalizedLevel];
    }
    diagnosticLog('sector-background-released', {
      level: normalizedLevel,
      nextLevel: normalizedNextLevel,
    });
  }, []);

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
    const resolvedSpeedBoost = (RNImage as any).resolveAssetSource?.(speedBoostSource);
    const speedBoostImage = new (globalThis as any).Image();
    speedBoostImage.decoding = 'async';
    speedBoostImage.onload = () => {
      if (!cancelled) speedBoostImageRef.current = speedBoostImage;
    };
    speedBoostImage.src = resolvedSpeedBoost?.uri ?? speedBoostSource;
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
    const resolvedShipSmokeSprite = (RNImage as any).resolveAssetSource?.(shipSmokeSpriteSource);
    const shipSmokeSpriteImage = new (globalThis as any).Image();
    shipSmokeSpriteImage.decoding = 'async';
    shipSmokeSpriteImage.onload = () => {
      if (!cancelled) shipSmokeSpriteImageRef.current = shipSmokeSpriteImage;
    };
    shipSmokeSpriteImage.src = resolvedShipSmokeSprite?.uri ?? shipSmokeSpriteSource;
    return () => {
      cancelled = true;
      spriteImagesRef.current = {};
      coreReactorImageRef.current = null;
      diamondSpriteImageRef.current = null;
      speedBoostImageRef.current = null;
      sevenFireOrbImageRef.current = null;
      playerMissileImageRef.current = null;
      spiderWebImageRef.current = null;
      playerImageRef.current = null;
      shipSmokeSpriteImageRef.current = null;
      sectorBackgroundImageRefs.current = {};
      sectorBackgroundLoadPromisesRef.current = {};
    };
  }, [loadWebBackground]);

  const resetGame = useCallback((
    preserveStats = false,
    resetBoard = false,
    levelOverride?: number,
  ) => {
    const g = gameRef.current;
    const { width, height } = sizeRef.current;
    if (width <= 0 || height <= 0) return;

    const previousScore = preserveStats ? g.score : 0;
    const previousShields = preserveStats ? g.shields : 3;
    const previousInvincibleUntil = preserveStats && resetBoard
      ? (g.invincibleUntil ?? 0)
      : 0;
    const previousSpeedBoostUntil = preserveStats && !resetBoard
      ? (g.speedBoostUntil ?? 0)
      : 0;
    const previousLevel = levelOverride ?? (preserveStats ? g.level : 1);
    const previousClaimedPolygons = preserveStats && !resetBoard
      ? g.claimedPolygons.map((polygon) => polygon.map((point) => ({ ...point })))
      : [];
    const previousProtectedTrails = preserveStats && !resetBoard
      ? g.protectedTrails.map((trail) => trail.map((point) => ({ ...point })))
      : [];
    const previousCapturedArea = preserveStats && !resetBoard ? g.capturedArea : 0;
    const previousDiamonds = preserveStats && !resetBoard
      ? g.diamonds.map((diamond) => ({ ...diamond }))
      : previousLevel === TUTORIAL_SECTOR
        ? []
        : createDiamonds(width, height, width / COLS, diamondCountForLevel(previousLevel));
    const preserveSpeedBoostLayout = preserveStats && !resetBoard;
    const previousSpeedBoosts = preserveSpeedBoostLayout
      ? g.speedBoosts.map((speedBoost) => ({ ...speedBoost }))
      : createSpeedBoosts(width, height, width / COLS, previousLevel);
    const previousEnemies = preserveStats && !resetBoard ? g.enemies : [];
    const preserveBombLayout = preserveStats && !resetBoard;
    const previousBombs = preserveBombLayout
      ? g.bombs.map((bomb) => ({ ...bomb }))
      : [];
    const previousSplitEnemies = preserveStats && !resetBoard
      ? previousEnemies
        .filter((enemy) => (
          (enemy.isMini || enemy.splitLevel !== undefined)
          && !enemyIsDestroyed(enemy)
        ))
        .map((enemy) => ({ ...enemy }))
      : [];
    if (!preserveStats) recordBannerShownRef.current = false;
    if (previousLevel === TUTORIAL_SECTOR) {
      tutorialSwipeCountsRef.current = { ...EMPTY_TUTORIAL_SWIPE_COUNTS };
      tutorialSwipeGestureDirectionRef.current = null;
      tutorialCompletionBannerShownRef.current = false;
      tutorialCaptureCompletionBannerShownRef.current = false;
      tutorialEnemyCaptureCompletionBannerShownRef.current = false;
      tutorialEnemyCaptureProgressBannerShownRef.current = false;
      tutorialEnemyDestroyedRef.current = false;
      tutorialEnemyDestructionCompletionBannerShownRef.current = false;
      tutorialStepRef.current = 1;
      setTutorialStep(1);
      setTutorialSwipeCounts({ ...EMPTY_TUTORIAL_SWIPE_COUNTS });
    } else {
      rememberLastPlayedSector(previousLevel);
    }
    const cell = width / COLS;
    const bounds = perimeterBounds(width, height, cell);
    const rows = Math.max(18, Math.floor(height / cell));
    const totalPlayableArea = Math.max(1, (bounds.right - bounds.left) * (bounds.bottom - bounds.top));
    const enemies = createEnemies(width, height, cell, previousLevel);
    preserveDestroyedEnemies(
      enemies,
      previousEnemies.filter((enemy) => !enemy.isMini && enemy.splitLevel === undefined),
    );
    if (previousSplitEnemies.length > 0) {
      enemies.push(...previousSplitEnemies);
    }
    // A respawn resumes the same sector state, including the exact bomb
    // roster and destroyed flags. Only a new sector/game creates a new draw.
    const bombs = preserveBombLayout
      ? previousBombs
      : createBombs(width, height, cell, previousLevel);
    const respawnPlayer = {
      x: bounds.left + cell,
      y: bounds.top - cell * PLAYER_RADIUS_CELLS,
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
    if (!preserveSpeedBoostLayout) {
      placeSpeedBoostsInOpenSurface(
        previousSpeedBoosts,
        enemies,
        previousDiamonds,
        bombs,
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
      facingDir: { x: 0, y: 1 },
      hasMoveCommand: false,
      cutDir: ZERO,
      cutCoordinate: 0,
      trail: [],
      protectedTrails: previousProtectedTrails,
      enemies,
      diamonds: previousDiamonds,
      speedBoosts: previousSpeedBoosts,
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
      invincibleUntil: previousInvincibleUntil,
      speedBoostUntil: previousSpeedBoostUntil,
    };
    diagnosticLog('game-reset', {
      level: previousLevel,
      preserveStats,
      resetBoard,
      enemyCount: enemies.length,
      miniShipCount: enemies.filter((enemy) => enemy.kind === 'SHIP' && enemy.isMini).length,
      initialSmokePuffCount: gameRef.current.smokePuffs.length,
    });
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
  }, [enqueueBanner, rememberLastPlayedSector]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    const fallback = setTimeout(() => {
      if (
        gameRef.current.initialized
        || initialLoadingRevealStartedRef.current
        || sizeRef.current.width <= 0
        || sizeRef.current.height <= 0
      ) {
        return;
      }
      const savedGame = savedGameRef.current;
      const initialLevel = savedGame?.level
        ?? (lastPlayedSectorRef.current > 0 ? lastPlayedSectorRef.current : TUTORIAL_SECTOR);
      resetGame(false, false, initialLevel);
      savedGameRef.current = null;
      if (!gameRef.current.initialized) return;
      diagnosticLog('native-start-fallback', { level: initialLevel });
      revealGameAfterInitialLoad({
        kind: initialLevel === TUTORIAL_SECTOR ? 'TUTORIAL' : 'SECTOR_START',
        tutorialStep: initialLevel === TUTORIAL_SECTOR ? 1 : undefined,
        level: gameRef.current.level,
      });
    }, NATIVE_INITIAL_START_FALLBACK_DELAY_MS);
    return () => clearTimeout(fallback);
  }, [resetGame, revealGameAfterInitialLoad]);

  const restoreSavedGame = useCallback((saved: PersistedGame) => {
    const { width, height } = sizeRef.current;
    if (width <= 0 || height <= 0) return;

    resetGame(false);
    const game = gameRef.current;
    const savedCell = saved.cell > 0 ? saved.cell : saved.width / COLS;
    const savedBounds = perimeterBounds(saved.width, saved.height, savedCell);
    const emptySectorOneSave = (
      saved.level === 1
      && saved.score === 0
      && saved.shields === 3
      && saved.trail.length === 0
      && saved.pendingCapturePolygons.length === 0
      && saved.fillQueue.length === 0
      && saved.capturedArea <= savedCell * savedCell * 0.1
    );
    const legacyBottomSpawn = (
      saved.trail.length === 0
      && saved.pendingCapturePolygons.length === 0
      && saved.fillQueue.length === 0
      && saved.capturedArea <= savedCell * savedCell * 0.1
      && Math.abs(saved.player.x - (savedBounds.left + savedCell)) <= savedCell * 0.24
      && Math.abs(saved.player.y - (savedBounds.bottom + savedCell * PLAYER_RADIUS_CELLS)) <= savedCell * 0.24
    );
    if (emptySectorOneSave || legacyBottomSpawn) {
      game.level = Math.round(clamp(saved.level, 1, MAX_LEVEL));
      rememberLastPlayedSector(game.level);
      game.score = Math.max(0, saved.score);
      game.shields = Math.max(0, saved.shields);
      savedGameRef.current = null;
      resetGame(true, true);
      return;
    }
    const scaleX = width / Math.max(1, saved.width);
    const scaleY = height / Math.max(1, saved.height);
    const scalePoint = (point: Point): Point => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    });
    const scaleTrail = (trail: Point[]) => trail.map(scalePoint);
    const currentBounds = perimeterBounds(width, height, game.cell);
    const totalPlayableArea = Math.max(
      1,
      (currentBounds.right - currentBounds.left) * (currentBounds.bottom - currentBounds.top),
    );
    const savedAreaRatio = saved.totalPlayableArea > 0
      ? clamp(saved.capturedArea / saved.totalPlayableArea, 0, 1)
      : 0;
    const savedPendingAreaRatio = saved.totalPlayableArea > 0
      ? Math.max(0, saved.pendingCaptureArea / saved.totalPlayableArea)
      : 0;

    game.level = Math.round(clamp(saved.level, 1, MAX_LEVEL));
    rememberLastPlayedSector(game.level);
    game.player = scalePoint(saved.player);
    game.inputDir = { ...saved.inputDir };
    game.facingDir = { ...saved.facingDir };
    game.hasMoveCommand = saved.hasMoveCommand;
    game.cutDir = { ...saved.cutDir };
    game.cutCoordinate = saved.cutCoordinate * scaleX;
    game.trail = scaleTrail(saved.trail);
    game.protectedTrails = saved.protectedTrails.map(scaleTrail);
    game.enemies = saved.enemies.map((enemy) => ({
      ...enemy,
      x: enemy.x * scaleX,
      y: enemy.y * scaleY,
      targetX: enemy.targetX * scaleX,
      targetY: enemy.targetY * scaleY,
      lastSafeX: enemy.lastSafeX === undefined ? undefined : enemy.lastSafeX * scaleX,
      lastSafeY: enemy.lastSafeY === undefined ? undefined : enemy.lastSafeY * scaleY,
    }));
    game.diamonds = saved.diamonds.map((diamond) => ({
      ...diamond,
      x: diamond.x * scaleX,
      y: diamond.y * scaleY,
    }));
    game.speedBoosts = saved.speedBoosts.map((speedBoost) => ({
      ...speedBoost,
      x: speedBoost.x * scaleX,
      y: speedBoost.y * scaleY,
    }));
    game.bombs = saved.bombs.map((bomb) => ({
      ...bomb,
      x: bomb.x * scaleX,
      y: bomb.y * scaleY,
    }));
    game.projectiles = saved.projectiles.map((projectile) => ({
      ...projectile,
      x: projectile.x * scaleX,
      y: projectile.y * scaleY,
      vx: projectile.vx * scaleX,
      vy: projectile.vy * scaleY,
      radius: projectile.radius * scaleX,
    }));
    game.missiles = saved.missiles.map((missile) => ({
      ...missile,
      x: missile.x * scaleX,
      y: missile.y * scaleY,
      vx: missile.vx * scaleX,
      vy: missile.vy * scaleY,
      radius: missile.radius * scaleX,
    }));
    game.spiderThreads = saved.spiderThreads.map((thread) => ({
      ...thread,
      start: scalePoint(thread.start),
      end: scalePoint(thread.end),
      target: scalePoint(thread.target),
      vx: thread.vx * scaleX,
      vy: thread.vy * scaleY,
      projectileSpeed: thread.projectileSpeed * scaleX,
    }));
    game.claimedPolygons = saved.claimedPolygons.map(scaleTrail);
    game.pendingCapturePolygons = saved.pendingCapturePolygons.map(scaleTrail);
    game.fillQueue = [...saved.fillQueue];
    game.fillCursor = clamp(Math.floor(saved.fillCursor), 0, game.fillQueue.length);
    game.scanY = saved.scanY * scaleY;
    game.mode = saved.mode;
    game.score = Math.max(0, saved.score);
    game.shields = Math.max(0, saved.shields);
    game.totalPlayableArea = totalPlayableArea;
    game.capturedArea = totalPlayableArea * savedAreaRatio;
    game.pendingCaptureArea = totalPlayableArea * savedPendingAreaRatio;
    game.trailScoreAccumulator = Math.max(0, saved.trailScoreAccumulator * scaleX);
    game.frame = 0;
    game.particles = [];
    game.fusionSparks = [];
    game.fusion = null;
    game.smokePuffs = [];
    game.smokeAccumulator = 0;
    game.status = 'PLAYING';
    game.respawnAt = 0;
    game.invincibleUntil = Date.now() + Math.max(0, saved.invincibleRemainingMs);
    game.speedBoostUntil = Date.now() + Math.max(0, saved.speedBoostRemainingMs);
    game.initialized = true;
    savedGameRef.current = null;
    setHud({
      score: game.score,
      bestScore: bestScoreRef.current,
      shields: game.shields,
      capture: Math.min(
        LEVEL_CAPTURE_TARGET,
        Math.floor(clamp(game.capturedArea / game.totalPlayableArea, 0, 1) * 100),
      ),
      level: game.level,
      mode: game.mode,
      feedback: '',
    });
  }, [rememberLastPlayedSector, resetGame]);

  const beginTutorialCaptureStep = useCallback(() => {
    const game = gameRef.current;
    if (game.level !== TUTORIAL_SECTOR) return;
    resetGame(false, false, TUTORIAL_SECTOR);
    tutorialStepRef.current = 2;
    tutorialCompletionBannerShownRef.current = true;
    tutorialCaptureCompletionBannerShownRef.current = false;
    tutorialEnemyCaptureCompletionBannerShownRef.current = false;
    tutorialEnemyCaptureProgressBannerShownRef.current = false;
    tutorialEnemyDestroyedRef.current = false;
    tutorialEnemyDestructionCompletionBannerShownRef.current = false;
    setTutorialStep(2);
    enqueueBanner({
      kind: 'TUTORIAL',
      tutorialStep: 2,
    });
  }, [enqueueBanner, resetGame]);

  const beginTutorialEnemyStep = useCallback(() => {
    const game = gameRef.current;
    if (game.level !== TUTORIAL_SECTOR) return;
    resetGame(false, false, TUTORIAL_SECTOR);
    const tutorialGame = gameRef.current;
    const bounds = perimeterBounds(tutorialGame.width, tutorialGame.height, tutorialGame.cell);
    const baseEnemy = createEnemies(
      tutorialGame.width,
      tutorialGame.height,
      tutorialGame.cell,
      1,
    )[0];
    if (baseEnemy) {
      const enemyX = (bounds.left + bounds.right) * 0.5;
      const enemyY = (bounds.top + bounds.bottom) * 0.5;
      tutorialGame.enemies = [{
        ...baseEnemy,
        x: enemyX,
        y: enemyY,
        vx: 16,
        vy: 11,
        speed: 22,
        agility: 0.42,
        phase: 0.4,
        routePhase: 0.3,
        targetX: enemyX,
        targetY: enemyY,
        thinkTimer: 0,
        respawnAt: 0,
        edgeTurnTimer: 0,
        edgeDirectionX: 0,
        edgeDirectionY: 0,
        bounceCooldown: 0,
        isBoss: false,
        isMini: true,
        splitLevel: undefined,
        visualRotation: Math.atan2(11, 16) + Math.PI / 2,
      }];
    }
    tutorialGame.missiles.length = 0;
    tutorialStepRef.current = 3;
    tutorialCompletionBannerShownRef.current = true;
    tutorialCaptureCompletionBannerShownRef.current = false;
    tutorialEnemyCaptureCompletionBannerShownRef.current = false;
    tutorialEnemyCaptureProgressBannerShownRef.current = false;
    tutorialEnemyDestructionCompletionBannerShownRef.current = false;
    setTutorialStep(3);
    enqueueBanner({
      kind: 'TUTORIAL',
      tutorialStep: 3,
    });
  }, [enqueueBanner, resetGame]);

  const beginTutorialDestructionStep = useCallback(() => {
    const game = gameRef.current;
    if (game.level !== TUTORIAL_SECTOR) return;
    resetGame(false, false, TUTORIAL_SECTOR);
    const tutorialGame = gameRef.current;
    const bounds = perimeterBounds(tutorialGame.width, tutorialGame.height, tutorialGame.cell);
    const baseEnemy = createEnemies(
      tutorialGame.width,
      tutorialGame.height,
      tutorialGame.cell,
      1,
    )[0];
    if (baseEnemy) {
      const enemyX = (bounds.left + bounds.right) * 0.5;
      const enemyY = (bounds.top + bounds.bottom) * 0.5;
      tutorialGame.enemies = [{
        ...baseEnemy,
        x: enemyX,
        y: enemyY,
        vx: 20,
        vy: 14,
        speed: 34,
        agility: 0.58,
        phase: 0.4,
        routePhase: 0.3,
        targetX: enemyX,
        targetY: enemyY,
        thinkTimer: 0,
        respawnAt: 0,
        edgeTurnTimer: 0,
        edgeDirectionX: 0,
        edgeDirectionY: 0,
        isBoss: false,
        isMini: false,
        splitLevel: undefined,
        visualRotation: Math.atan2(14, 20) + Math.PI / 2,
      }];
    }
    tutorialGame.missiles.length = 0;
    tutorialStepRef.current = 4;
    tutorialCompletionBannerShownRef.current = true;
    tutorialCaptureCompletionBannerShownRef.current = true;
    tutorialEnemyCaptureCompletionBannerShownRef.current = true;
    tutorialEnemyDestroyedRef.current = false;
    tutorialEnemyDestructionCompletionBannerShownRef.current = false;
    setTutorialStep(4);
    enqueueBanner({
      kind: 'TUTORIAL',
      tutorialStep: 4,
    });
  }, [enqueueBanner, resetGame]);

  const restartTutorialStep = useCallback((step: 1 | 2 | 3 | 4) => {
    if (gameRef.current.level !== TUTORIAL_SECTOR) return;
    if (step === 2) {
      beginTutorialCaptureStep();
      return;
    }
    if (step === 3) {
      beginTutorialEnemyStep();
      return;
    }
    if (step === 4) {
      beginTutorialDestructionStep();
      return;
    }
    resetGame(false, false, TUTORIAL_SECTOR);
    enqueueBanner({
      kind: 'TUTORIAL',
      tutorialStep: 1,
    });
  }, [
    beginTutorialCaptureStep,
    beginTutorialDestructionStep,
    beginTutorialEnemyStep,
    enqueueBanner,
    resetGame,
  ]);

  const registerTutorialSwipe = useCallback((direction: Direction) => {
    const game = gameRef.current;
    if (
      game.level !== TUTORIAL_SECTOR
      || game.status !== 'PLAYING'
      || tutorialCompletionBannerShownRef.current
    ) {
      return;
    }
    const tutorialDirection: TutorialDirection = direction.x > 0
      ? 'right'
      : direction.x < 0
        ? 'left'
        : direction.y > 0
          ? 'down'
          : 'up';
    const nextCounts = {
      ...tutorialSwipeCountsRef.current,
      [tutorialDirection]: Math.min(
        TUTORIAL_SWIPE_REPETITIONS,
        tutorialSwipeCountsRef.current[tutorialDirection] + 1,
      ),
    };
    tutorialSwipeCountsRef.current = nextCounts;
    setTutorialSwipeCounts(nextCounts);
    const completed = Object.values(nextCounts).every(
      (count) => count >= TUTORIAL_SWIPE_REPETITIONS,
    );
    if (completed) {
      tutorialCompletionBannerShownRef.current = true;
      enqueueBanner({
        kind: 'TUTORIAL',
        tutorialStep: 1,
        tutorialCompleted: true,
        onComplete: beginTutorialCaptureStep,
      });
    }
  }, [beginTutorialCaptureStep, enqueueBanner]);

  const teleportToSector = useCallback((sector: number) => {
    const g = gameRef.current;
    if (!g.initialized) return;
    const previousLevel = g.level;
    const nextLevel = Math.round(clamp(sector, TUTORIAL_SECTOR, MAX_LEVEL));
    if (nextLevel > TUTORIAL_SECTOR) rememberLastPlayedSector(nextLevel);
    g.status = 'SECTOR_TRANSITION';
    void preloadSectorForBanner(nextLevel).then(() => {
      const transitionGame = gameRef.current;
      if (transitionGame.status !== 'SECTOR_TRANSITION') return;
      transitionGame.level = nextLevel;
      releaseSectorBackground(previousLevel, nextLevel);
      if (nextLevel === TUTORIAL_SECTOR) {
        resetGame(false, false, TUTORIAL_SECTOR);
      } else {
        resetGame(true, true);
      }
      enqueueBanner({
        kind: nextLevel === TUTORIAL_SECTOR ? 'TUTORIAL' : 'SECTOR_START',
        tutorialStep: nextLevel === TUTORIAL_SECTOR ? 1 : undefined,
        level: nextLevel,
      });
    });
  }, [
    enqueueBanner,
    preloadSectorForBanner,
    releaseSectorBackground,
    rememberLastPlayedSector,
    resetGame,
  ]);

  const handleArenaLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    const previous = sizeRef.current;
    const changed = Math.abs(previous.width - width) > 1 || Math.abs(previous.height - height) > 1;
    sizeRef.current = { width, height };
    diagnosticLog('arena-layout', {
      width: Math.round(width),
      height: Math.round(height),
      changed,
      initialized: gameRef.current.initialized,
    });
    if (changed && gameRef.current.initialized) resetGame(true);
    if (
      Platform.OS !== 'web'
      && !gameRef.current.initialized
      && !initialSectorPreparationStartedRef.current
    ) {
      initialSectorPreparationStartedRef.current = true;
      const savedGame = savedGameRef.current;
      const initialLevel = savedGame?.level
        ?? (lastPlayedSectorRef.current > 0 ? lastPlayedSectorRef.current : TUTORIAL_SECTOR);
      resetGame(false, false, initialLevel);
      savedGameRef.current = null;
      if (gameRef.current.initialized) {
        const initialSnapshot = snapshotFromGame(gameRef.current);
        nativeSnapshotRef.current = initialSnapshot;
        setNativeSnapshot(initialSnapshot);
        diagnosticLog('native-layout-autostart', {
          level: initialLevel,
          width: Math.round(width),
          height: Math.round(height),
        });
        revealGameAfterInitialLoad({
          kind: initialLevel === TUTORIAL_SECTOR ? 'TUTORIAL' : 'SECTOR_START',
          tutorialStep: initialLevel === TUTORIAL_SECTOR ? 1 : undefined,
          level: gameRef.current.level,
        });
        void preloadBackgroundWindow(
          initialLevel === TUTORIAL_SECTOR ? 1 : initialLevel,
        );
      }
    }
  }, [preloadBackgroundWindow, resetGame, revealGameAfterInitialLoad]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        audioUnlockedRef.current = true;
        tutorialSwipeGestureDirectionRef.current = null;
      },
      onPanResponderMove: (_, gesture) => {
        const g = gameRef.current;
        if (g.status !== 'PLAYING' || Math.hypot(gesture.dx, gesture.dy) < 10) return;
        const direction = cardinalDirection(gesture.dx, gesture.dy);
        if (g.level === TUTORIAL_SECTOR) {
          const tutorialDirection: TutorialDirection = direction.x > 0
            ? 'right'
            : direction.x < 0
              ? 'left'
              : direction.y > 0
                ? 'down'
                : 'up';
          if (tutorialSwipeGestureDirectionRef.current !== tutorialDirection) {
            tutorialSwipeGestureDirectionRef.current = tutorialDirection;
            registerTutorialSwipe(direction);
          }
        }
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
        tutorialSwipeGestureDirectionRef.current = null;
        // Keep the selected direction latched. This lets a short inward
        // swipe cross the outer safe band and enter the empty playfield.
      },
      onPanResponderTerminate: () => {
        tutorialSwipeGestureDirectionRef.current = null;
        // Keep the selected direction latched for the same safe-band entry.
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  useEffect(() => {
    let loopHandle: ReturnType<typeof setTimeout> | ReturnType<typeof setImmediate> | number = 0;
    let lastTime = Date.now();
    let lastNativeFrameAt = lastTime - NATIVE_GAME_LOOP_INTERVAL_MS;
    let fpsWindowStart = lastTime;
    let fpsWindowFrames = 0;
    let cancelled = false;

    const playerIsProtected = (g: Game, now: number) => g.invincibleUntil > now;

    const activateCaptureProtection = (g: Game, now: number) => {
      const protectionWasInactive = !playerIsProtected(g, now);
      g.invincibleUntil = Math.max(
        g.invincibleUntil,
        now + CAPTURE_INVINCIBILITY_DURATION * 1000,
      );
      if (protectionWasInactive) {
        enqueueBanner({ kind: 'SHIELD' });
      }
    };

    const explode = (g: Game, now: number) => {
      if (g.status !== 'PLAYING') return;
      if (playerIsProtected(g, now)) return;
      for (let i = 0; i < 72; i += 1) {
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

    const appendParticle = (g: Game, particle: Particle) => {
      g.particles.push(particle);
      if (g.particles.length > MAX_PARTICLES) g.particles.shift();
    };

    const appendSmokePuffs = (g: Game, puffs: SmokePuff[]) => {
      for (const puff of puffs) {
        g.smokePuffs.push(puff);
        if (g.smokePuffs.length > MAX_SMOKE_PUFFS) g.smokePuffs.shift();
      }
    };

    const addFusionSpark = (
      g: Game,
      sequence: FusionSequence,
      pathDistance: number,
      initialSpread = 1,
    ) => {
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
      if (g.fusionSparks.length > MAX_FUSION_SPARKS) g.fusionSparks.shift();
    };

    const startFusionDeath = (g: Game, impactPoint: Point) => {
      if (g.status !== 'PLAYING') return;
      if (playerIsProtected(g, Date.now())) return;
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
      for (let index = 0; index < 26; index += 1) {
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

      const sparksToEmit = sequence.elapsed < sequence.travelDuration ? 3 : 1;
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
      for (let index = 0; index < 48; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 35 + Math.random() * 190;
        appendParticle(g, {
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

    const activateSpeedBoost = (g: Game, speedBoost: SpeedBoost, now: number) => {
      if (
        speedBoost.collected
        || g.level === TUTORIAL_SECTOR
        || isBossSector(g.level)
      ) {
        return;
      }
      speedBoost.collected = true;
      g.speedBoostUntil = Math.max(now, g.speedBoostUntil) + SPEED_BOOST_DURATION_MS;
      enqueueBanner({ kind: 'SPEED_BOOST' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const collectSpeedBoostsAlongSegment = (
      g: Game,
      from: Point,
      to: Point,
      now: number,
    ) => {
      const contactRadius = speedBoostRadius(g.cell) + playerBodyRadius(g.cell);
      g.speedBoosts.forEach((speedBoost) => {
        if (
          !speedBoost.collected
          && distanceToSegment(speedBoost, from, to) <= contactRadius
        ) {
          activateSpeedBoost(g, speedBoost, now);
        }
      });
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
        bounceCooldown: 0,
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
          curveStrength: enemy.curveStrength
            ? Math.min(0.9, enemy.curveStrength * 1.08)
            : undefined,
          curvePhase: (enemy.curvePhase ?? 0) + side * 0.52 + index * 0.18,
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
      fromCapture = false,
    ) => {
      const splitOnMissile = fromMissile
        && !enemy.isMini
        && !(
          g.level === TUTORIAL_SECTOR
          && tutorialStepRef.current === 4
        );
      const suppressTutorialEnemyBanner = (
        g.level === TUTORIAL_SECTOR
        && tutorialStepRef.current === 3
        && fromCapture
      );
      const suppressTutorialDestructionBanner = (
        g.level === TUTORIAL_SECTOR
        && tutorialStepRef.current === 4
        && fromMissile
      );
      const suppressTutorialCompletionBanner = (
        suppressTutorialEnemyBanner
        || suppressTutorialDestructionBanner
      );
      const colors = ['#ffffff', '#00f3ff', '#ff5500', '#ff2bb5', '#b8ff4a'];
      // Keep missile bursts below the Android Skia frame-pressure threshold.
      // A split can be followed by another burst when a mini ship is
      // destroyed, so both paths need to remain cheap enough to recover to
      // the device's full refresh rate after the particles expire.
      const particleCount = splitOnMissile ? 32 : 44;
      for (let i = 0; i < particleCount; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 45 + Math.random() * 260;
        const life = 0.55 + Math.random() * 0.85;
        appendParticle(g, {
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 55,
          vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 55,
          life,
          size: 0.45 + Math.random() * 1.65,
          color: colors[i % colors.length],
        });
      }
      const enemyPoints = ENEMY_SCORE[enemy.kind] * (fromCapture ? 2 : 1);
      g.score += enemyPoints;
      if (fromCapture) {
        // This applies to every enemy type, including the mini ships created
        // by a split. The capture completion path also activates it once
        // before bursting the captured roster.
        activateCaptureProtection(g, now);
      }
      enemy.blockedTime = 0;
      // A destroyed enemy stays permanently inactive for this sector. The
      // next sector creates a fresh enemy roster through resetGame.
      const splitShips = splitOnMissile
        ? splitEnemyIntoEnemies(g, enemy, !enemy.isBoss)
        : [];
      enemy.respawnAt = Number.POSITIVE_INFINITY;
      enemy.vx = 0;
      enemy.vy = 0;
      const respawnTutorialEnemyAfterCapture = (
        g.level === TUTORIAL_SECTOR
        && tutorialStepRef.current === 4
        && fromCapture
      );
      if (respawnTutorialEnemyAfterCapture) {
        // In the destruction lesson, capturing the ship is only the first
        // half of the exercise. Move it out of the newly claimed surface and
        // bring it back so the player can finish with a missile.
        spawnPointAfterBurst(g, enemy);
        enemy.respawnAt = now + 250;
      }
      if (splitOnMissile) {
        g.enemies.push(...splitShips);
        if (!suppressTutorialCompletionBanner) {
          enqueueBanner({
            kind: enemy.isBoss ? 'BOSS_SPLIT' : 'SPLIT',
            points: ENEMY_SCORE[enemy.kind],
            enemyKind: enemy.kind,
          });
        }
      } else if (!suppressTutorialCompletionBanner) {
        enqueueBanner({
          kind: 'ENEMY',
          points: enemyPoints,
          enemyKind: enemy.kind,
        });
      }
      if (
        !suppressTutorialCompletionBanner
        && g.enemies.every((candidate) => enemyIsDestroyed(candidate))
      ) {
        enqueueBanner({ kind: 'CLEAN' });
      }
      if (enemy.kind === 'SHIP') {
        // Smoke is only emitted by the ship. Remove the old trail while it
        // is off-screen so it cannot remain at the previous spawn point.
        g.smokePuffs.length = 0;
        g.smokeAccumulator = 0;
        if (SHIP_SMOKE_RENDER_MODE === 'PARTICLES' && splitShips.length > 0) {
          appendSmokePuffs(g, splitShips.flatMap((splitShip) => (
            createShipSmokePuffs(splitShip, g.cell, 3)
          )));
          diagnosticLog('ship-split-smoke-created', {
            parentIsBoss: enemy.isBoss,
            splitShipCount: splitShips.length,
            miniShipCount: splitShips.filter((splitShip) => splitShip.isMini).length,
            smokePuffCount: g.smokePuffs.length,
          });
        }
      }
    };

    const launchPlayerMissiles = (g: Game) => {
      if (g.level === TUTORIAL_SECTOR && tutorialStepRef.current <= 3) {
        g.missiles.length = 0;
        return;
      }
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
            if (
              g.level === TUTORIAL_SECTOR
              && tutorialStepRef.current === 4
              && !tutorialEnemyDestroyedRef.current
            ) {
              tutorialEnemyDestroyedRef.current = true;
              g.inputDir = ZERO;
              g.cutDir = ZERO;
              g.hasMoveCommand = false;
              const targetReached = (
                g.capturedArea / g.totalPlayableArea >= LEVEL_CAPTURE_TARGET / 100
              );
              if (targetReached) {
                tutorialEnemyDestructionCompletionBannerShownRef.current = true;
                enqueueBanner({
                  kind: 'TUTORIAL',
                  tutorialStep: 4,
                  tutorialCompleted: true,
                  onComplete: () => teleportToSector(1),
                });
              } else {
                enqueueBanner({
                  kind: 'TUTORIAL',
                  tutorialStep: 4,
                  tutorialPrompt: 'SECURE_AREA',
                });
              }
            }
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
            appendSmokePuffs(g, createShipSmokePuffs(enemy, g.cell, 5));
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
        enemy.bounceCooldown = Math.max(0, (enemy.bounceCooldown ?? 0) - dt);

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
          if (!playerIsProtected(g, now)) {
            startFusionDeath(g, enemy);
            return;
          }
          // A protected drone can finish the cut. Do not return from the
          // enemy update here, otherwise a mini ship can remain pinned to the
          // active trail while the player is trying to close the region.
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
          enemy.bounceCooldown = 0.36;
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
              x: clamp(g.player.x + playerDirection.x * playerSpeedFor(g, now) * predictionTime, minX, maxX),
              y: clamp(g.player.y + playerDirection.y * playerSpeedFor(g, now) * predictionTime, minY, maxY),
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
          const baseRouteBend = enemy.pattern === 'SWEEP'
            ? Math.sin(enemy.routePhase * 0.75) * 0.58
            : Math.sin(enemy.routePhase * 1.35) * 1.1;
          const curveBend = enemy.kind === 'SHIP' && (enemy.curveStrength ?? 0) > 0
            ? Math.sin(
              enemy.routePhase * 0.55 + (enemy.curvePhase ?? 0),
            ) * (enemy.curveStrength ?? 0)
            : 0;
          const routeBend = baseRouteBend + curveBend;
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
        if (
          enemy.kind === 'SHIP'
          && !canMoveFull
          && (enemy.bounceCooldown ?? 0) <= 0
        ) {
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
          if (!playerIsProtected(g, now)) {
            startFusionDeath(g, enemy);
            return;
          }
          // Protected trail contact is non-lethal and must not interrupt the
          // rest of the enemy update or the player's capture flow.
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
        // Broad-phase reject before expanding the enemy's full collision
        // profile. This matters most for the Spider, which has 25 circles.
        const nearDroneX = Math.abs(enemy.x - g.player.x) <= 100;
        const nearDroneY = Math.abs(enemy.y - g.player.y) <= 100;
        const touchesDrone = nearDroneX
          && nearDroneY
          && enemyCollisionCircles(enemy, g.cell, enemy.x, enemy.y).some(({ center, radius }) => (
            Math.hypot(center.x - g.player.x, center.y - g.player.y)
              <= radius + playerBodyRadius(g.cell)
          ));
        if (droneIsActive && touchesDrone) {
          if (!playerIsProtected(g, now)) {
            explode(g, now);
            return;
          }
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
              x: droneDirection.x * playerSpeedFor(g, now),
              y: droneDirection.y * playerSpeedFor(g, now),
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
              appendSmokePuffs(g, createShipSmokePuffs(enemy, g.cell, 1));
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
      g.invincibleUntil ??= 0;
      g.speedBoosts ??= [];
      g.speedBoostUntil ??= 0;
      if (g.speedBoostUntil <= now) g.speedBoostUntil = 0;
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
          const tutorialStepToRestart = g.level === TUTORIAL_SECTOR
            && tutorialStepRef.current >= 3
            ? tutorialStepRef.current
            : null;
          if (g.shields <= 0) {
            enqueueBanner({ kind: 'GAME_OVER', score: g.score });
            clearSavedGameProgress();
            if (tutorialStepToRestart) {
              restartTutorialStep(tutorialStepToRestart);
            } else {
              const resumeLevel = Math.round(clamp(
                lastPlayedSectorRef.current > 0 ? lastPlayedSectorRef.current : g.level,
                1,
                MAX_LEVEL,
              ));
              resetGame(false, false, resumeLevel);
            }
          } else if (tutorialStepToRestart) {
            restartTutorialStep(tutorialStepToRestart);
          } else {
            resetGame(true);
          }
        }
        return;
      }

      if (g.status === 'SECTOR_TRANSITION') return;

      if (g.fillQueue.length > 0) {
        const unitsPerFrame = Math.max(5, Math.min(22, Math.ceil(g.fillQueue.length / 26)));
        g.fillCursor = Math.min(g.fillQueue.length, g.fillCursor + unitsPerFrame);
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        for (const polygon of g.pendingCapturePolygons) {
          for (const point of polygon) {
            if (point.y < minY) minY = point.y;
            if (point.y > maxY) maxY = point.y;
          }
        }
        if (Number.isFinite(minY) && Number.isFinite(maxY)) {
          const progress = g.fillCursor / Math.max(1, g.fillQueue.length);
          g.scanY = minY + (maxY - minY) * progress;
        }
        if (g.fillCursor >= g.fillQueue.length) {
          const completedPolygons = g.pendingCapturePolygons;
          let diamondCaptured = false;
          if (completedPolygons.length > 0) {
            g.claimedPolygons.push(...completedPolygons);
            // buildOrthogonalCaptureRegions computed this exact area when the
            // trail closed. Commit the cached value instead of recalculating
            // the whole claimed surface from inside the animation loop.
            g.capturedArea = Math.min(
              g.totalPlayableArea,
              g.capturedArea + g.pendingCaptureArea,
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
              for (let particleIndex = 0; particleIndex < 36; particleIndex += 1) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 35 + Math.random() * 180;
                appendParticle(g, {
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
            g.speedBoosts.forEach((speedBoost) => {
              if (
                !speedBoost.collected
                && captureRegionsOverlapCircle(
                  speedBoost,
                  speedBoostRadius(g.cell),
                  completedPolygons,
                )
              ) {
                activateSpeedBoost(g, speedBoost, now);
              }
            });
            const capturedEnemies = g.enemies.filter((enemy) => {
              if (enemy.respawnAt > now) return false;
              const enemyPoints = enemySpriteFootprint(enemy, g.cell, enemy.x, enemy.y);
              return completedPolygons.some((polygon) => (
                enemyPoints.length > 0
                && enemyPoints.every((point) => pointInPolygon(point, polygon))
              ));
            });
            if (capturedEnemies.length > 0) {
              // Activate protection for the whole captured roster, including
              // mini enemies, before any individual burst is processed.
              activateCaptureProtection(g, now);
              capturedEnemies.forEach((enemy) => {
                burstEnemy(g, enemy, now, false, true);
              });
            }
            const tutorialStepThreeTargetReached = (
              g.level === TUTORIAL_SECTOR
              && tutorialStepRef.current === 3
              && g.capturedArea / g.totalPlayableArea >= LEVEL_CAPTURE_TARGET / 100
            );
            if (
              tutorialStepThreeTargetReached
              && !tutorialEnemyCaptureCompletionBannerShownRef.current
            ) {
              tutorialEnemyCaptureCompletionBannerShownRef.current = true;
              g.inputDir = ZERO;
              g.hasMoveCommand = false;
              enqueueBanner({
                kind: 'TUTORIAL',
                tutorialStep: 3,
                tutorialCompleted: true,
                onComplete: beginTutorialDestructionStep,
              });
            } else if (
              capturedEnemies.length > 0
              && g.level === TUTORIAL_SECTOR
              && tutorialStepRef.current === 3
              && !tutorialEnemyCaptureProgressBannerShownRef.current
            ) {
              tutorialEnemyCaptureProgressBannerShownRef.current = true;
              g.inputDir = ZERO;
              g.hasMoveCommand = false;
              enqueueBanner({
                kind: 'TUTORIAL',
                tutorialStep: 3,
                tutorialPrompt: 'SECURE_AREA',
              });
            }
            if (
              g.level === TUTORIAL_SECTOR
              && tutorialStepRef.current === 4
              && tutorialEnemyDestroyedRef.current
              && g.capturedArea / g.totalPlayableArea >= LEVEL_CAPTURE_TARGET / 100
              && !tutorialEnemyDestructionCompletionBannerShownRef.current
            ) {
              tutorialEnemyDestructionCompletionBannerShownRef.current = true;
              g.inputDir = ZERO;
              g.hasMoveCommand = false;
              enqueueBanner({
                kind: 'TUTORIAL',
                tutorialStep: 4,
                tutorialCompleted: true,
                onComplete: () => teleportToSector(1),
              });
            }
            g.score += Math.max(100, Math.round((g.pendingCaptureArea / (g.cell * g.cell)) * 20));
            if (
              g.level === TUTORIAL_SECTOR
              && tutorialStepRef.current === 2
              && g.capturedArea / g.totalPlayableArea >= LEVEL_CAPTURE_TARGET / 100
              && !tutorialCaptureCompletionBannerShownRef.current
            ) {
              tutorialCaptureCompletionBannerShownRef.current = true;
              g.inputDir = ZERO;
              g.hasMoveCommand = false;
              enqueueBanner({
                kind: 'TUTORIAL',
                tutorialStep: 2,
                tutorialCompleted: true,
                onComplete: beginTutorialEnemyStep,
              });
            }
            if (
              g.level !== TUTORIAL_SECTOR
              && g.level < MAX_LEVEL
              && g.capturedArea / g.totalPlayableArea >= LEVEL_CAPTURE_TARGET / 100
              && bossObjectiveComplete(g.level, g.enemies)
            ) {
              const nextLevel = Math.min(MAX_LEVEL, g.level + 1);
              g.status = 'SECTOR_TRANSITION';
              g.inputDir = ZERO;
              g.cutDir = ZERO;
              g.hasMoveCommand = false;
              g.fillQueue = [];
              g.fillCursor = 0;
              g.pendingCapturePolygons = [];
              g.pendingCaptureArea = 0;
            const previousLevel = g.level;
            void preloadSectorForBanner(nextLevel).then(() => {
              const transitionGame = gameRef.current;
              if (transitionGame.status !== 'SECTOR_TRANSITION') return;
              enqueueBanner({
                kind: 'SECTOR',
                level: nextLevel,
                onComplete: () => {
                  const completedTransitionGame = gameRef.current;
                  if (completedTransitionGame.status !== 'SECTOR_TRANSITION') return;
                  completedTransitionGame.level = nextLevel;
                  releaseSectorBackground(previousLevel, nextLevel);
                  enqueueBanner({
                    kind: 'SECTOR_START',
                    level: nextLevel,
                  });
                  resetGame(true, true);
                },
              });
            });
              playSectorTransition();
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

      const collisionStartedAt = __DEV__ ? performance.now() : 0;
      const recordCollisionTime = () => {
        if (collisionStartedAt > 0) {
          performanceMetricsRef.current.collisionMs += performance.now() - collisionStartedAt;
        }
      };
      const direction = g.trail.length > 0
        ? g.cutDir
        : (g.inputDir.x !== 0 || g.inputDir.y !== 0)
          ? g.inputDir
          : g.hasMoveCommand
            ? g.facingDir
            : ZERO;
      if (direction.x !== 0 || direction.y !== 0) g.facingDir = direction;
      collectSpeedBoostsAlongSegment(g, g.player, g.player, now);
      const baseSpeed = playerSpeedFor(g, now);
      const baseDistance = baseSpeed * dt;
      if (direction.x !== 0 || direction.y !== 0) {
        const steps = Math.max(1, Math.ceil(baseDistance));
        const movementBounds = perimeterBounds(g.width, g.height, g.cell);
        const movementOuterBounds = playerOuterBounds(movementBounds, g.cell);
        const movementBodyRadius = playerBodyRadius(g.cell);
        const previous = { x: g.player.x, y: g.player.y };

        for (let i = 0; i < steps; i += 1) {
          previous.x = g.player.x;
          previous.y = g.player.y;
          const activeTrail = g.trail.length > 0;
          const probe = {
            x: g.player.x + direction.x * (baseDistance / steps),
            y: g.player.y + direction.y * (baseDistance / steps),
          };
          let caughtInSpiderWeb = false;
          let spiderSlowFactor = 0.25;
          for (const thread of g.spiderThreads) {
            if (!spiderThreadIsActive(thread)) continue;
            const touchesThread = thread.anchored
              ? Math.hypot(probe.x - thread.target.x, probe.y - thread.target.y)
                <= movementBodyRadius + g.cell * thread.webRadiusCells
              : distanceBetweenSegments(
                g.player,
                probe,
                thread.start,
                thread.end,
              ) <= movementBodyRadius + g.cell * 0.12;
            if (!touchesThread) continue;
            caughtInSpiderWeb = true;
            if (thread.anchored) spiderSlowFactor = thread.slowFactor;
          }
          const movementDistance = (
            (caughtInSpiderWeb ? baseSpeed * spiderSlowFactor : baseSpeed) * dt
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
            (direction.x < 0 && next.x <= movementBounds.left)
            || (direction.x > 0 && next.x >= movementBounds.right)
            || (direction.y < 0 && next.y <= movementBounds.top)
            || (direction.y > 0 && next.y >= movementBounds.bottom)
          );
          if (reachedPerimeter) {
            const contact = perimeterContact(next, direction, movementBounds);
            g.player = contact;
            if (g.trail.length > 2) {
              g.trail.push(contact);
              capture(g, direction);
            } else {
              g.trail = [];
              g.player = playerPerimeterSafetyPoint(
                g.player,
                direction,
                movementBounds,
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
          next.x = clamp(next.x, movementOuterBounds.left, movementOuterBounds.right);
          next.y = clamp(next.y, movementOuterBounds.top, movementOuterBounds.bottom);
          g.player = next;
            collectSpeedBoostsAlongSegment(g, previous, g.player, now);
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

          const inside = pointInsidePerimeter(g.player, movementBounds);
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
                ?? (pointInsidePerimeter(previous, movementBounds)
                  ? previous
                  : perimeterEntryContact(previous, direction, movementBounds));
              g.trail.push(trailStart);
            }
            g.trail.push({ ...g.player });
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
      if (g.status !== 'PLAYING') {
        recordCollisionTime();
        return;
      }
      moveProjectiles(g, dt, now);
      if (g.status !== 'PLAYING') {
        recordCollisionTime();
        return;
      }
      checkBombContact(g, now);
      if (g.status !== 'PLAYING') {
        recordCollisionTime();
        return;
      }
      moveEnemies(g, dt, now);
      recordCollisionTime();
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
      const backgroundLevel = Math.min(MAX_LEVEL, Math.max(1, Math.round(g.level)));
      const background = sectorBackgroundImageRefs.current[backgroundLevel];
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
          for (let pointIndex = 1; pointIndex < polygon.length; pointIndex += 1) {
            const point = polygon[pointIndex];
            context.lineTo(point.x, point.y);
          }
         context.closePath();
       });
       context.fill();
       context.globalAlpha = 1;
        const bounds = perimeterBounds(g.width, g.height, g.cell);

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
           for (let pointIndex = 1; pointIndex < trail.length; pointIndex += 1) {
             const point = trail[pointIndex];
             context.lineTo(point.x, point.y);
           }
          context.stroke();
        };
         g.protectedTrails.forEach(drawTrail);
        drawTrail(g.trail);
        context.lineCap = 'butt';
        context.lineJoin = 'miter';
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
               const smokeSize = g.cell
                 * (enemy.isMini ? 0.9 : 1.8)
                 * NON_PLAYER_RENDER_SCALE;
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
               const webSize = g.cell * thread.webSizeCells * NON_PLAYER_RENDER_SCALE;
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
         const pickupSize = pickupVisualSize(g.cell);
          const diamondFrame = Math.floor(g.frame / DIAMOND_SPRITE_FRAME_DURATION)
            % DIAMOND_SPRITE_FRAME_COUNT;
         g.diamonds.forEach((diamond) => {
           if (diamond.collected) return;
           context.save();
            context.translate(
              diamond.x,
              diamond.y + pickupFloatOffset(g.frame, diamond.phase, g.cell),
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
              -pickupSize / 2,
              -pickupSize / 2,
              pickupSize,
              pickupSize,
            );
           context.restore();
         });
       }
        const speedBoostImage = speedBoostImageRef.current;
        if (speedBoostImage) {
          const speedBoostSize = pickupVisualSize(g.cell) * 0.92;
          g.speedBoosts.forEach((speedBoost) => {
            if (speedBoost.collected) return;
            const y = speedBoost.y + pickupFloatOffset(g.frame, speedBoost.phase, g.cell);
            context.save();
            context.globalCompositeOperation = 'source-over';
            context.globalAlpha = 0.98;
            context.drawImage(
              speedBoostImage,
              speedBoost.x - speedBoostSize / 2,
              y - speedBoostSize / 2,
              speedBoostSize,
              speedBoostSize,
            );
            context.restore();
          });
        }
       const coreReactorImage = coreReactorImageRef.current;
       if (coreReactorImage) {
         const bombFrame = Math.floor(g.frame / CORE_REACTOR_SPRITE_FRAME_DURATION)
           % CORE_REACTOR_SPRITE_FRAME_COUNT;
         const bombSize = pickupVisualSize(g.cell);
         g.bombs.forEach((bomb) => {
           if (bomb.destroyed) return;
           context.save();
           context.globalCompositeOperation = 'source-over';
           context.globalAlpha = 0.98;
           const floatY = pickupFloatOffset(
             g.frame,
             bomb.x * 0.013 + bomb.y * 0.007,
             g.cell,
           );
           context.drawImage(
             coreReactorImage,
             bombFrame * CORE_REACTOR_SPRITE_FRAME_SIZE,
             0,
             CORE_REACTOR_SPRITE_FRAME_SIZE,
             CORE_REACTOR_SPRITE_FRAME_SIZE,
             bomb.x - bombSize / 2,
             bomb.y + floatY - bombSize / 2,
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
         const size = enemyRenderSize(enemy.kind, g.cell, enemy.isMini);
        const motion = enemyAnimationTransform(enemy, g.cell);
        context.save();
        context.translate(enemy.x, enemy.y + motion.offsetY);
        context.rotate(motion.rotation);
        context.scale(motion.scale, motion.scale);
        drawEnemySpriteWithGlow(context, image, size, enemyGlowColor(enemy.kind));
        context.restore();
      });
      context.shadowBlur = 0;

      const invincibilityRemaining = Math.max(0, g.invincibleUntil - now);
      if (invincibilityRemaining > 0) {
        const protectionPulse = clamp(
          0.5
            + Math.sin(now * 0.014) * 0.24
            + Math.sin(now * 0.041) * 0.15
            + Math.sin(now * 0.083) * 0.1,
          0,
          1,
        );
        context.save();
        context.globalCompositeOperation = 'lighter';
        context.globalAlpha = 0.1 + protectionPulse * 0.22;
        context.strokeStyle = '#00f3ff';
        context.shadowColor = '#00f3ff';
        context.shadowBlur = g.cell * 0.2;
        context.lineWidth = g.cell * 0.065;
        context.beginPath();
        context.arc(
          g.player.x,
          g.player.y,
          g.cell * (0.92 + protectionPulse * 0.12),
          0,
          Math.PI * 2,
        );
        context.stroke();
        context.globalAlpha = 0.015 + protectionPulse * 0.045;
        context.fillStyle = '#00f3ff';
        context.beginPath();
        context.arc(
          g.player.x,
          g.player.y,
          g.cell * (0.62 + protectionPulse * 0.08),
          0,
          Math.PI * 2,
        );
        context.fill();
        context.globalAlpha = 0.06 + protectionPulse * 0.16;
        context.shadowColor = '#fff5cf';
        context.shadowBlur = g.cell * 0.08;
        context.strokeStyle = '#fff5cf';
        context.lineWidth = g.cell * 0.02;
        context.beginPath();
        context.arc(g.player.x, g.player.y, g.cell * 1.16, 0, Math.PI * 2);
        context.stroke();
        context.restore();
      }

      if (g.fillQueue.length > 0) {
        context.save();
        context.globalCompositeOperation = 'source-over';
        context.strokeStyle = '#ffffff';
        context.shadowColor = '#ffffff';
        context.shadowBlur = g.cell * 0.18;
        context.globalAlpha = 0.22;
        context.lineWidth = 7;
         for (const polygon of g.pendingCapturePolygons) {
           const intervals = polygonHorizontalIntervals(polygon, g.scanY);
           for (const [startX, endX] of intervals) {
             context.beginPath();
             context.moveTo(startX, g.scanY);
             context.lineTo(endX, g.scanY);
             context.stroke();
           }
         }
        context.globalAlpha = 1;
        context.shadowBlur = g.cell * 0.08;
        context.lineWidth = 2;
         for (const polygon of g.pendingCapturePolygons) {
           const intervals = polygonHorizontalIntervals(polygon, g.scanY);
           for (const [startX, endX] of intervals) {
             context.beginPath();
             context.moveTo(startX, g.scanY);
             context.lineTo(endX, g.scanY);
             context.stroke();
           }
         }
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

    let scheduleNextLoop: () => void;
    const loop = () => {
      if (cancelled) return;
      const now = Date.now();
      if (
        Platform.OS !== 'web'
        && now - lastNativeFrameAt < NATIVE_GAME_LOOP_INTERVAL_MS
      ) {
        scheduleNextLoop();
        return;
      }
      if (Platform.OS !== 'web') {
        lastNativeFrameAt = now;
      }
      fpsWindowFrames += 1;
      if (now - fpsWindowStart >= 500) {
        setFps(Math.round(fpsWindowFrames * 1000 / (now - fpsWindowStart)));
        fpsWindowFrames = 0;
        fpsWindowStart = now;
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const g = gameRef.current;
      if (
        !g.initialized
        && sizeRef.current.width > 0
        && savedGameHydratedRef.current
        && lastPlayedSectorHydratedRef.current
        && !initialSectorPreparationStartedRef.current
      ) {
        initialSectorPreparationStartedRef.current = true;
        const savedGame = savedGameRef.current;
        const initialLevel = savedGame?.level
          ?? (lastPlayedSectorRef.current > 0 ? lastPlayedSectorRef.current : TUTORIAL_SECTOR);
        setLoadingProgress(0.03);
        void preloadSectorForBanner(initialLevel, setLoadingProgress).then(() => {
          if (cancelled || gameRef.current.initialized) return;
          // The loading screen is the launch gate. Once the player taps it,
          // always begin at the start of the remembered sector rather than
          // dropping them into a mid-cut snapshot from the previous session.
          resetGame(false, false, initialLevel);
          savedGameRef.current = null;
          if (gameRef.current.initialized) {
            revealGameAfterInitialLoad({
              kind: initialLevel === TUTORIAL_SECTOR ? 'TUTORIAL' : 'SECTOR_START',
              tutorialStep: initialLevel === TUTORIAL_SECTOR ? 1 : undefined,
              level: gameRef.current.level,
            });
            void preloadBackgroundWindow(
              initialLevel === TUTORIAL_SECTOR ? 1 : initialLevel,
            );
          }
        });
      }
      if (g.initialized) {
        const profileFrame = __DEV__;
        const updateStartedAt = profileFrame ? performance.now() : 0;
        update(g, dt, now);
        if (profileFrame) {
          performanceMetricsRef.current.updateMs += performance.now() - updateStartedAt;
        }
        if (now - lastGameSaveAtRef.current >= GAME_SAVE_INTERVAL_MS) {
          lastGameSaveAtRef.current = now;
          saveGameProgress();
        }
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
        const renderStartedAt = profileFrame ? performance.now() : 0;
        drawCanvas(g, now);
        if (profileFrame) {
          performanceMetricsRef.current.renderMs += performance.now() - renderStartedAt;
        }
        if (Platform.OS !== 'web') {
          const nativeBuildStartedAt = profileFrame ? performance.now() : 0;
          nativePicturePublisherRef.current?.(g, now);
          if (profileFrame) {
            performanceMetricsRef.current.nativeBuildMs += (
              performance.now() - nativeBuildStartedAt
            );
          }
          const previousStaticSnapshot = nativeSnapshotRef.current;
          const staticLayerChanged = !previousStaticSnapshot
            || previousStaticSnapshot.width !== g.width
            || previousStaticSnapshot.height !== g.height
            || previousStaticSnapshot.cell !== g.cell
            || previousStaticSnapshot.rows !== g.rows
            || previousStaticSnapshot.level !== g.level;
          if (staticLayerChanged) {
            const currentDirection = g.trail.length > 0 ? g.cutDir : g.facingDir;
            const staticSnapshot: Snapshot = {
              width: g.width,
              height: g.height,
              cell: g.cell,
              rows: g.rows,
              level: g.level,
              frame: g.frame,
              trail: g.trail,
              protectedTrails: g.protectedTrails,
              player: { ...g.player },
              direction: currentDirection,
              enemies: g.enemies.map((enemy) => ({ ...enemy })),
              diamonds: g.diamonds.map((diamond) => ({ ...diamond })),
              speedBoosts: g.speedBoosts.map((speedBoost) => ({ ...speedBoost })),
              bombs: g.bombs.map((bomb) => ({ ...bomb })),
              projectiles: g.projectiles.map((projectile) => ({ ...projectile })),
              missiles: g.missiles.map((missile) => ({ ...missile })),
              spiderThreads: g.spiderThreads.map((thread) => ({
                ...thread,
                start: { ...thread.start },
                end: { ...thread.end },
                target: { ...thread.target },
              })),
              particles: g.particles.slice(-120),
              fusionSparks: g.fusionSparks.map((spark) => ({ ...spark })),
              fusionHead: null,
              smokePuffs: g.smokePuffs.map((puff) => ({ ...puff })),
              claimedPolygons: g.claimedPolygons,
              pendingCapturePolygons: g.pendingCapturePolygons,
              scanY: g.scanY,
              invincibleUntil: g.invincibleUntil,
            };
            nativeSnapshotRef.current = staticSnapshot;
            setNativeSnapshot(staticSnapshot);
          }
        }
        if (profileFrame) {
          const metrics = performanceMetricsRef.current;
          if (lastPerformanceReportAtRef.current === 0) {
            lastPerformanceReportAtRef.current = now;
          }
          metrics.frames += 1;
          metrics.particleCount = g.particles.length;
          metrics.peakParticles = Math.max(metrics.peakParticles, g.particles.length);
          if (now - lastPerformanceReportAtRef.current >= 1000) {
            const frameCount = Math.max(1, metrics.frames);
            diagnosticLog('performance-sample', {
              fps: Math.round(frameCount * 1000 / Math.max(1, now - lastPerformanceReportAtRef.current)),
              updateMs: Number((metrics.updateMs / frameCount).toFixed(2)),
              collisionMs: Number((metrics.collisionMs / frameCount).toFixed(2)),
              renderMs: Number((metrics.renderMs / frameCount).toFixed(2)),
              nativeBuildMs: Number((metrics.nativeBuildMs / frameCount).toFixed(2)),
              particles: metrics.particleCount,
              peakParticles: metrics.peakParticles,
              platform: Platform.OS,
            });
            metrics.frames = 0;
            metrics.updateMs = 0;
            metrics.collisionMs = 0;
            metrics.renderMs = 0;
            metrics.nativeBuildMs = 0;
            metrics.peakParticles = metrics.particleCount;
            lastPerformanceReportAtRef.current = now;
          }
        }
        if (now - lastHudPublishAtRef.current >= 66) {
          lastHudPublishAtRef.current = now;
          const nextHud = {
            score: g.score,
            bestScore: bestScoreRef.current,
            shields: Math.max(0, g.shields),
            capture: Math.min(
              LEVEL_CAPTURE_TARGET,
              Math.floor(clamp(
                (
                  g.capturedArea
                  + (g.fillQueue.length > 0
                    ? g.pendingCaptureArea * g.fillCursor / Math.max(1, g.fillQueue.length)
                    : 0)
                ) / g.totalPlayableArea,
                0,
                1,
              ) * 100),
            ),
            level: g.level,
            mode: g.mode,
            feedback: g.status === 'RESPAWN' ? 'DRONE EN EXPANSION' : '',
          };
          setHud((current) => (
            current.score === nextHud.score
              && current.bestScore === nextHud.bestScore
              && current.shields === nextHud.shields
              && current.capture === nextHud.capture
              && current.level === nextHud.level
              && current.mode === nextHud.mode
              && current.feedback === nextHud.feedback
              ? current
              : nextHud
          ));
        }
      }
      scheduleNextLoop();
    };

    scheduleNextLoop = () => {
      if (cancelled) return;
      if (Platform.OS === 'web') {
        loopHandle = requestAnimationFrame(loop);
      } else if (!gameRef.current.initialized) {
        // Keep the launch path cooperative so AsyncStorage and native image
        // callbacks can resolve before switching to the tighter scheduler.
        loopHandle = setTimeout(loop, NATIVE_GAME_LOOP_INTERVAL_MS);
      } else if (typeof setImmediate === 'function') {
        // Android timers quantize even a zero-delay timeout to roughly one
        // display interval. Using one periodically turns the measured cadence
        // into ~30 FPS. Native banners no longer depend on JS timers, so keep
        // the immediate scheduler for the gameplay loop and use the timestamp
        // guard above to cap actual frames at 60 FPS.
        loopHandle = setImmediate(loop);
      } else {
        loopHandle = setTimeout(loop, 1);
      }
    };
    scheduleNextLoop();
    return () => {
      cancelled = true;
      if (Platform.OS === 'web') {
        cancelAnimationFrame(loopHandle as number);
      } else if (typeof clearImmediate === 'function') {
        clearImmediate(loopHandle as ReturnType<typeof setImmediate>);
      } else {
        clearTimeout(loopHandle as ReturnType<typeof setTimeout>);
      }
    };
  }, [
    enqueueBanner,
    clearSavedGameProgress,
    playDiamondCapture,
    playPickupChime,
    playSevenFireShot,
    playSectorTransition,
    playShieldLossExplosion,
    preloadBackgroundWindow,
    preloadSectorForBanner,
    revealGameAfterInitialLoad,
    resetGame,
    beginTutorialDestructionStep,
    beginTutorialEnemyStep,
    restartTutorialStep,
    restoreSavedGame,
    saveGameProgress,
    teleportToSector,
  ]);

  const renderNativeArena = () => {
    if (Platform.OS === 'web') return null;
    const snapshot = nativeSnapshot
      ?? (gameRef.current.initialized ? snapshotFromGame(gameRef.current) : null);
    if (!snapshot) return null;
    if (!nativeArenaRenderReportedRef.current) {
      nativeArenaRenderReportedRef.current = true;
      diagnosticLog('native-arena-render', {
        width: Math.round(snapshot.width),
        height: Math.round(snapshot.height),
        cell: Number(snapshot.cell.toFixed(2)),
        level: snapshot.level,
      });
    }
    const frameLeft = snapshot.cell * PERIMETER_HORIZONTAL_INSET_CELLS;
    const frameTop = snapshot.cell * PERIMETER_VERTICAL_INSET_CELLS;
    const frameWidth = snapshot.width - frameLeft * 2;
    const frameHeight = snapshot.height - frameTop * 2;
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              left: frameLeft,
              top: frameTop,
              width: frameWidth,
              height: frameHeight,
              borderWidth: PERIMETER_STROKE_WIDTH,
              borderColor: '#00f3ff',
            },
          ]}
        />
        <Svg
          width={snapshot.width}
          height={snapshot.height}
          viewBox={`0 0 ${snapshot.width} ${snapshot.height}`}
          preserveAspectRatio="none"
          style={[StyleSheet.absoluteFill, { overflow: 'visible' }]}
          pointerEvents="none"
        >
          <NativeArenaStatic
            width={snapshot.width}
            height={snapshot.height}
            cell={snapshot.cell}
            rows={snapshot.rows}
            level={snapshot.level}
          />
        </Svg>
      </View>
    );
  };

  const renderNativeDynamicArena = () => {
    if (Platform.OS === 'web') return null;
    const snapshot = nativeSnapshot
      ?? (gameRef.current.initialized ? snapshotFromGame(gameRef.current) : null);
    if (!snapshot) return null;
    const renderMargin = Math.max(snapshot.cell * 2.2, 28);
    const expandedWidth = snapshot.width + renderMargin * 2;
    const expandedHeight = snapshot.height + renderMargin * 2;
    const liveShipCount = snapshot.enemies.filter((enemy) => (
      enemy.kind === 'SHIP'
      && !enemyIsDestroyed(enemy)
      && enemy.respawnAt <= Date.now()
    )).length;
    const skiaShipReady = skiaReady && liveShipCount <= 1;
    if (!nativeDynamicRenderReportedRef.current) {
      nativeDynamicRenderReportedRef.current = true;
      diagnosticLog('native-dynamic-render', {
        width: Math.round(snapshot.width),
        height: Math.round(snapshot.height),
        skiaEnabled: SKIA_DYNAMIC_RENDER_ENABLED,
        skiaReady,
        liveShipCount,
      });
    }
    return (
      <View
        style={styles.nativeArenaDynamicLayer}
        pointerEvents="none"
        collapsable={false}
      >
        {SKIA_DYNAMIC_RENDER_ENABLED && (
          <SkiaDynamicArena
            snapshot={snapshot}
            renderMargin={renderMargin}
            publisherRef={nativePicturePublisherRef}
            onReady={handleSkiaReady}
          />
        )}
        {!SKIA_DYNAMIC_RENDER_ENABLED && (
          <Svg
            style={[
              StyleSheet.absoluteFill,
              {
                left: -renderMargin,
                top: -renderMargin,
                width: expandedWidth,
                height: expandedHeight,
                overflow: 'visible',
              },
            ]}
            viewBox={`${-renderMargin} ${-renderMargin} ${expandedWidth} ${expandedHeight}`}
            preserveAspectRatio="none"
          >
            {snapshot.trail.length > 1 && (
              <>
                <Polyline
                  points={pointsToString(snapshot.trail)}
                  fill="none"
                  stroke="#fff3d6"
                  strokeWidth={12}
                  opacity={0.16}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Polyline
                  points={pointsToString(snapshot.trail)}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}
            <NativeArenaDynamic
              snapshot={snapshot}
              skiaPlayerReady={skiaReady}
              skiaShipReady={skiaShipReady}
            />
          </Svg>
        )}
      </View>
    );
  };

  const zoneProgress = clamp(hud.capture / LEVEL_CAPTURE_TARGET, 0, 1);
  const zoneGlow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(zoneGlow, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(zoneGlow, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, [zoneGlow]);
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
        {hud.level === TUTORIAL_SECTOR
          && tutorialStep === 1
          && !tutorialCompletionBannerShownRef.current && (
          <TutorialSwipeGuide counts={tutorialSwipeCounts} />
        )}
        {banner && (
          <View style={styles.arcadeBannerLayer} pointerEvents="none">
            <Animated.View
              style={[
                styles.arcadeBanner,
                banner.kind === 'TUTORIAL'
                  ? styles.tutorialBanner
                  : null,
                banner.kind === 'RECORD'
                  ? styles.recordBanner
                  : banner.kind === 'DIAMOND'
                    ? styles.diamondBanner
                    : banner.kind === 'BOMB'
                      ? styles.bombBanner
                      : banner.kind === 'SPEED_BOOST'
                        ? styles.speedBoostBanner
                        : banner.kind === 'SHIELD'
                            ? styles.shieldBanner
                      : banner.kind === 'SECTOR'
                        ? styles.sectorBanner
                      : banner.kind === 'TUTORIAL'
                        ? styles.tutorialBanner
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
                  banner.kind === 'TUTORIAL'
                    ? styles.tutorialBannerTitle
                    : styles.bannerTitle,
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
                    : banner.kind === 'SPEED_BOOST'
                      ? 'BOOST DE VITESSE'
                    : banner.kind === 'SHIELD'
                      ? 'BOUCLIER ACTIVÉ'
                      : banner.kind === 'SECTOR'
                        ? 'SECTEUR SÉCURISÉ À 80%'
                        : banner.kind === 'TUTORIAL'
                          ? banner.tutorialStep === 4
                            ? banner.tutorialCompleted
                              ? 'OBJECTIF ATTEINT !'
                              : banner.tutorialPrompt === 'SECURE_AREA'
                                ? 'ZONE À SÉCURISER'
                                : 'TUTORIEL 4/4'
                            : banner.tutorialStep === 3
                              ? banner.tutorialCompleted
                                ? 'OBJECTIF ATTEINT !'
                                : banner.tutorialPrompt === 'SECURE_AREA'
                                  ? 'ZONE À SÉCURISER'
                                  : 'TUTORIEL 3/4'
                              : banner.tutorialStep === 2
                                ? banner.tutorialCompleted
                                  ? 'OBJECTIF ATTEINT !'
                                  : 'TUTORIEL 2/4'
                            : banner.tutorialCompleted
                              ? 'DIRIGER LE DRONE 1/4'
                              : 'TUTORIEL 1/4'
                        : banner.kind === 'SECTOR_START'
                          ? `SECTEUR ${(banner.level ?? 1).toString().padStart(2, '0')}`
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
              {banner.kind !== 'SECTOR_START' && (
                <Text
                  style={banner.kind === 'TUTORIAL' ? styles.tutorialBannerScore : styles.bannerScore}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                >
                  {banner.kind === 'RECORD'
                    ? `SCORE DÉPASSÉ  •  ${(banner.score ?? 0).toString().padStart(6, '0')}`
                    : banner.kind === 'DIAMOND'
                      ? `+${banner.points ?? DIAMOND_SCORE} POINTS`
                      : banner.kind === 'BOMB'
                        ? `+${banner.points ?? BOMB_SCORE} POINTS`
                    : banner.kind === 'SPEED_BOOST'
                      ? 'VITESSE +100%  •  5 SECONDES'
                      : banner.kind === 'SHIELD'
                        ? 'INVINCIBILITÉ  •  10 SECONDES'
                      : banner.kind === 'SECTOR'
                        ? 'PASSAGE SECTEUR SUIVANT'
                      : banner.kind === 'TUTORIAL'
                        ? banner.tutorialStep === 4
                          ? banner.tutorialCompleted
                            ? '✓ ENNEMI DÉTRUIT'
                            : banner.tutorialPrompt === 'SECURE_AREA'
                              ? 'SÉCURISE 80% DE LA ZONE'
                              : 'FERME UNE ZONE VIDE POUR TIRER'
                          : banner.tutorialStep === 3
                            ? banner.tutorialCompleted
                              ? '✓ ENNEMI CAPTURÉ'
                              : banner.tutorialPrompt === 'SECURE_AREA'
                                ? 'SÉCURISE 80% DE LA ZONE'
                                : 'CAPTURE LE VAISSEAU ENNEMI'
                            : banner.tutorialStep === 2
                              ? banner.tutorialCompleted
                                ? '✓ ZONE SÉCURISÉE À 80%'
                                : 'SÉCURISE 80% DE LA ZONE'
                          : banner.tutorialCompleted
                            ? '✓ OBJECTIF VALIDÉ'
                            : 'DIRIGE LE DRONE AVEC DES SWIPES'
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
              )}
            </Animated.View>
          </View>
        )}
      </View>

      {renderNativeDynamicArena()}

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
          <View style={[styles.hudCardStack, styles.sectorStack]}>
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
              {hud.level === TUTORIAL_SECTOR && (
                <Text style={styles.tutorialSectorLabel}>TUTORIEL</Text>
              )}
              {isBossSector(hud.level) && (
                <Text style={[styles.bossSectorValue, { color: HUD_COLORS.cyan }]}>BOSS</Text>
              )}
            </View>
            <View style={[styles.hudCard, styles.utilityCard, styles.optionsCard]}>
              <Svg width={20} height={18} viewBox="0 0 20 18" accessibilityLabel="Symbole options">
                <Polygon
                  points="8,0.4 10,1.2 11.8,0.5 12.7,2.2 14.7,2.5 14.9,4.4 16.6,5.5 15.9,7.3 17.2,8.8 15.9,10.3 16.5,12.1 14.8,13.1 14.6,15 12.7,15.2 11.7,16.8 10,16.1 8.2,16.8 7.3,15.1 5.3,14.8 5.1,13 3.4,11.9 4.1,10.2 2.8,8.7 4.1,7.2 3.5,5.4 5.2,4.4 5.4,2.5 7.3,2.2"
                  fill="none"
                  stroke={HUD_COLORS.cyan}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <Circle cx="10" cy="8.7" r="3.1" fill="none" stroke={HUD_COLORS.cyan} strokeWidth="1.5" />
                <Circle cx="10" cy="8.7" r="1" fill={HUD_COLORS.cyan} />
              </Svg>
              <Text style={[styles.utilityLabel, { color: HUD_COLORS.cyan }]}>OPTIONS</Text>
            </View>
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

          <View style={[styles.hudCardStack, styles.shieldStack]}>
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
            <View style={[styles.hudCard, styles.utilityCard, styles.shopCard]}>
              <Svg width={20} height={18} viewBox="0 0 20 18" accessibilityLabel="Symbole boutique">
                <Polygon points="2,6 4,2 16,2 18,6" fill="none" stroke={HUD_COLORS.lime} strokeWidth="1.4" />
                <Line x1="2" y1="6" x2="18" y2="6" stroke={HUD_COLORS.lime} strokeWidth="1.4" />
                <Rect x="4" y="6" width="12" height="9" fill="none" stroke={HUD_COLORS.lime} strokeWidth="1.4" />
                <Rect x="8" y="10" width="4" height="5" fill="none" stroke={HUD_COLORS.lime} strokeWidth="1.2" />
                <Line x1="5" y1="8" x2="15" y2="8" stroke={HUD_COLORS.lime} strokeWidth="1" />
              </Svg>
              <Text style={[styles.utilityLabel, { color: HUD_COLORS.lime }]}>BOUTIQUE</Text>
            </View>
          </View>
        </View>

        <View style={styles.zoneModule}>
          <View style={[styles.hudCard, styles.zoneCard]}>
            <Text style={[styles.cardLabel, { color: HUD_COLORS.amber }]}>ZONE SÉCURISÉE</Text>
            <View style={styles.zoneValueRow}>
              <Text style={[styles.zoneValue, { color: HUD_COLORS.amber }]}>{hud.capture}</Text>
              <Text style={[styles.zoneTarget, { color: HUD_COLORS.warmWhite }]}>/ {LEVEL_CAPTURE_TARGET}</Text>
              <Text style={[styles.zoneFps, { color: HUD_COLORS.lime }]}>{fps} FPS</Text>
            </View>
            <View style={styles.zoneProgressRail}>
                <Animated.View
                  style={[
                    styles.zoneProgressFill,
                    {
                      width: `${zoneProgress * 100}%`,
                      opacity: zoneGlow.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.92, 1],
                      }),
                    },
                  ]}
                />
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
        tutorialStep={tutorialStep}
        onSelect={teleportToSector}
        onSkipTutorial={() => teleportToSector(
          lastPlayedSectorRef.current > 0 ? lastPlayedSectorRef.current : 1,
        )}
        bottomInset={Math.max(insets.bottom, 6) + 18}
      />

      {Platform.OS === 'web' && isLoadingScreenVisible && (
        <View
          style={styles.loadingScreen}
          pointerEvents="auto"
          testID="initial-loading-screen"
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleInitialLoadingTap}
            disabled={!isInitialLoadingReady}
            accessibilityRole="button"
            accessibilityLabel="Démarrer Fragments"
            testID="initial-loading-start"
          >
            <Animated.View
              style={[
                styles.loadingArtworkFrame,
                { transform: [{ translateX: loadingBannerTranslateX }] },
              ]}
              accessibilityLabel="Chargement"
              pointerEvents="none"
            >
              <RNImage
                source={loadingCoverSource}
                style={styles.loadingArtwork}
                resizeMode="cover"
                accessibilityLabel="Illustration Fragments"
              />
              <View style={styles.loadingArtworkShade} />
              <View style={styles.loadingOverlay}>
                {isInitialLoadingReady && (
                  <Text style={styles.loadingBannerSubtitle}>TOUCHER POUR DÉMARRER</Text>
                )}
              </View>
            </Animated.View>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  loadingScreen: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  loadingArtworkFrame: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: '#020208',
  },
  loadingArtwork: {
    width: '100%',
    height: '100%',
  },
  loadingArtworkShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 34,
    alignItems: 'center',
  },
  loadingProgressTrack: {
    width: '100%',
    height: 8,
    marginTop: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ff1e38',
    backgroundColor: 'rgba(10, 0, 10, 0.82)',
    shadowColor: '#ff1e38',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  loadingProgressFill: {
    height: '100%',
    backgroundColor: '#ff1e38',
    shadowColor: '#ff5a64',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  loadingProgressLabel: {
    marginTop: 5,
    color: '#ff5a64',
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1.4,
    textShadowColor: '#ff1e38',
    textShadowRadius: 7,
    textAlign: 'center',
  },
  loadingBanner: {
    width: '82%',
    minHeight: 94,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderRadius: 4,
    borderColor: HUD_COLORS.cyan,
    backgroundColor: '#02070d',
    shadowColor: HUD_COLORS.cyan,
    shadowOpacity: 0.95,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  loadingBannerTitle: {
    maxWidth: '100%',
    color: HUD_COLORS.warmWhite,
    fontFamily: 'Inter_700Bold',
    fontSize: 25,
    lineHeight: 30,
    letterSpacing: 1.6,
    textAlign: 'center',
    textShadowColor: HUD_COLORS.cyan,
    textShadowRadius: 13,
    textShadowOffset: { width: 0, height: 0 },
  },
  loadingBannerSubtitle: {
    marginTop: 5,
    color: HUD_COLORS.cyan,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  arena: {
    position: 'absolute',
    top: 160,
    left: 0,
    right: 0,
    bottom: 28,
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
  tutorialControlRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 5,
    marginBottom: 5,
  },
  skipTutorialButton: {
    flex: 1.08,
    minHeight: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 176, 46, 0.82)',
    borderRadius: 2,
    backgroundColor: 'rgba(255, 85, 0, 0.16)',
  },
  tutorialInstruction: {
    flex: 0.92,
    minHeight: 31,
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 243, 255, 0.48)',
    borderRadius: 2,
    backgroundColor: 'rgba(0, 24, 34, 0.72)',
  },
  tutorialInstructionLabel: {
    color: '#00f3ff',
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 0.9,
    lineHeight: 10,
  },
  tutorialInstructionText: {
    color: '#00f3ff',
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    letterSpacing: 0.9,
    lineHeight: 10,
    textShadowColor: '#00f3ff',
    textShadowRadius: 4,
  },
  skipTutorialButtonText: {
    color: '#fff3d6',
    fontFamily: 'Inter_700Bold',
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 0.9,
    textShadowColor: '#ff5500',
    textShadowRadius: 6,
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
  tutorialGuide: {
    position: 'absolute',
    top: '56%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 12,
  },
  tutorialGuideLabel: {
    maxWidth: '94%',
    color: '#fff3d6',
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 0.8,
    textAlign: 'center',
    textShadowColor: '#00f3ff',
    textShadowRadius: 8,
  },
  tutorialArrowGrid: {
    width: 156,
    marginTop: 10,
    gap: 4,
  },
  tutorialArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  tutorialArrowSlot: {
    width: 44,
    height: 40,
  },
  tutorialCenterSlot: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 243, 255, 0.68)',
    borderRadius: 20,
    backgroundColor: 'rgba(0, 16, 28, 0.82)',
    shadowColor: '#00f3ff',
    shadowOpacity: 0.72,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  tutorialCenterMark: {
    color: '#00f3ff',
    fontSize: 14,
    textShadowColor: '#00f3ff',
    textShadowRadius: 10,
  },
  tutorialArrow: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    color: '#7e879b',
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(126, 135, 155, 0.65)',
    borderRadius: 12,
    backgroundColor: 'rgba(32, 38, 50, 0.82)',
    textShadowColor: '#7e879b',
    textShadowRadius: 9,
  },
  tutorialArrowProgress: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ff8a00',
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
    borderWidth: 1.2,
    borderColor: '#ff8a00',
    borderRadius: 12,
    backgroundColor: 'rgba(64, 28, 4, 0.82)',
    textShadowColor: '#ff8a00',
    textShadowRadius: 11,
  },
  tutorialArrowDone: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    color: '#b8ff4a',
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
    borderWidth: 1.2,
    borderColor: '#b8ff4a',
    borderRadius: 12,
    backgroundColor: 'rgba(18, 46, 8, 0.82)',
    textShadowColor: '#b8ff4a',
    textShadowRadius: 13,
  },
  cockpitHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 206,
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
    top: -17,
    left: 18,
    right: 18,
    zIndex: 3,
  },
  nativeArenaDynamicLayer: {
    position: 'absolute',
    top: 160,
    left: 0,
    right: 0,
    bottom: 28,
    zIndex: 2,
    overflow: 'visible',
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 6,
    minHeight: 101,
  },
  hudCardStack: {
    alignItems: 'stretch',
  },
  sectorStack: {
    width: '26%',
  },
  shieldStack: {
    width: '29%',
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
    width: '100%',
    minHeight: 60,
    borderColor: HUD_COLORS.cyan,
    transform: [{ translateY: 2 }, { rotate: '-1deg' }],
  },
  scoreCard: {
    width: '44%',
    minHeight: 92,
    marginHorizontal: -5,
    zIndex: 2,
    borderColor: HUD_COLORS.amber,
    backgroundColor: 'rgba(10, 12, 20, 0.96)',
    transform: [{ translateY: 8 }],
  },
  shieldCard: {
    width: '100%',
    minHeight: 70,
    borderColor: HUD_COLORS.lime,
    transform: [{ translateY: 1 }, { rotate: '1deg' }],
  },
  utilityCard: {
    width: '100%',
    minHeight: 39,
    marginTop: 5,
    paddingHorizontal: 6,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  optionsCard: {
    borderColor: HUD_COLORS.cyan,
    backgroundColor: 'rgba(0, 24, 34, 0.9)',
    transform: [{ translateY: 0 }, { rotate: '-1deg' }],
  },
  shopCard: {
    borderColor: HUD_COLORS.lime,
    backgroundColor: 'rgba(18, 34, 8, 0.9)',
    transform: [{ translateY: 0 }, { rotate: '1deg' }],
  },
  utilityLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 0.75,
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
  tutorialSectorLabel: {
    alignSelf: 'flex-start',
    marginLeft: 1,
    marginTop: 2,
    marginBottom: 1,
    color: HUD_COLORS.cyan,
    fontFamily: 'Inter_700Bold',
    fontSize: 7,
    letterSpacing: 1.7,
    lineHeight: 9,
    textShadowColor: HUD_COLORS.cyan,
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 0 },
  },
  sectorValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 29,
    letterSpacing: 1,
    lineHeight: 32,
  },
  scoreValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    letterSpacing: 2,
    lineHeight: 32,
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
    transform: [{ translateX: -7 }, { translateY: -45 }],
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
  zoneFps: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.7,
    marginLeft: 10,
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
  shieldBanner: {
    borderColor: HUD_COLORS.cyan,
    backgroundColor: 'rgba(0, 24, 34, 0.24)',
    shadowColor: HUD_COLORS.cyan,
    shadowOpacity: 0.7,
  },
  speedBoostBanner: {
    borderColor: HUD_COLORS.lime,
    backgroundColor: 'rgba(18, 34, 8, 0.5)',
    shadowColor: HUD_COLORS.cyan,
    shadowOpacity: 0.9,
  },
  sectorBanner: {
    borderColor: HUD_COLORS.magenta,
    backgroundColor: 'rgba(24, 4, 24, 0.46)',
  },
  tutorialBanner: {
    width: '92%',
    paddingHorizontal: 10,
    borderColor: HUD_COLORS.cyan,
    backgroundColor: 'rgba(0, 22, 32, 0.68)',
    shadowColor: HUD_COLORS.cyan,
    shadowOpacity: 0.9,
    shadowRadius: 16,
  },
  tutorialBannerTitle: {
    maxWidth: '100%',
    color: HUD_COLORS.warmWhite,
    fontFamily: 'Inter_700Bold',
    fontSize: 21,
    lineHeight: 25,
    letterSpacing: 1.1,
    textAlign: 'center',
    textShadowColor: HUD_COLORS.cyan,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
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
  tutorialBannerScore: {
    maxWidth: '100%',
    marginTop: 4,
    color: HUD_COLORS.cyan,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.45,
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
/*
import {
  AppState,
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
const INITIAL_MAP_OPACITY = 0;
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
const GAME_SAVE_STORAGE_KEY = 'fragments-neon:game-progress:v1';
const GAME_SAVE_INTERVAL_MS = 1200;
const GAME_SAVE_VERSION = 2 as const;
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
const ENEMY_RENDER_SCALE = 0.88;
const BOSS_RENDER_SCALE = 1.72;
const PICKUP_VISUAL_SIZE_CELLS = 1.34;
const PLAYER_MOVE_SPEED = 126;
const BOSS_SPEED_BOOST = 1.06;
const CAPTURE_INVINCIBILITY_DURATION = 10;
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
    ? (1.16 + Math.min(0.16, (enemy.bossTier ?? 1) * 0.035)) * BOSS_SPEED_BOOST
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
  invincibleUntil: number;
};

type PersistedGame = Omit<
  Game,
  | 'particles'
  | 'fusionSparks'
  | 'fusion'
  | 'smokePuffs'
  | 'smokeAccumulator'
  | 'frame'
  | 'initialized'
  | 'status'
  | 'respawnAt'
  | 'invincibleUntil'
> & {
  version: typeof GAME_SAVE_VERSION;
  savedAt: number;
  resumeType: 'EXACT' | 'SECTOR';
  resumeLevel: number;
  invincibleRemainingMs: number;
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
  kind: 'RECORD' | 'DIAMOND' | 'BOMB' | 'SECTOR' | 'BOSS' | 'SHIELD' | 'ENEMY' | 'BOSS_SPLIT' | 'SPLIT' | 'CLEAN' | 'GAME_OVER';
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
  invincibleUntil: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const isPersistedGame = (value: unknown): value is PersistedGame => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PersistedGame>;
  return (
    candidate.version === GAME_SAVE_VERSION
    && typeof candidate.savedAt === 'number'
    && Number.isFinite(candidate.savedAt)
    && (candidate.resumeType === 'EXACT' || candidate.resumeType === 'SECTOR')
    && typeof candidate.resumeLevel === 'number'
    && Number.isFinite(candidate.resumeLevel)
    && candidate.resumeLevel >= 1
    && typeof candidate.width === 'number'
    && candidate.width > 0
    && typeof candidate.height === 'number'
    && candidate.height > 0
    && candidate.player !== undefined
    && Array.isArray(candidate.enemies)
    && Array.isArray(candidate.diamonds)
    && Array.isArray(candidate.bombs)
    && Array.isArray(candidate.claimedPolygons)
    && Array.isArray(candidate.pendingCapturePolygons)
    && Array.isArray(candidate.fillQueue)
  );
};

const serializeGame = (game: Game, now: number): PersistedGame => ({
  version: GAME_SAVE_VERSION,
  savedAt: now,
  resumeType: 'EXACT',
  resumeLevel: game.level,
  width: game.width,
  height: game.height,
  cell: game.cell,
  rows: game.rows,
  player: { ...game.player },
  inputDir: { ...game.inputDir },
  facingDir: { ...game.facingDir },
  hasMoveCommand: game.hasMoveCommand,
  cutDir: { ...game.cutDir },
  cutCoordinate: game.cutCoordinate,
  trail: game.trail.map((point) => ({ ...point })),
  protectedTrails: game.protectedTrails.map((trail) => trail.map((point) => ({ ...point }))),
  enemies: game.enemies.map((enemy) => ({ ...enemy })),
  diamonds: game.diamonds.map((diamond) => ({ ...diamond })),
  bombs: game.bombs.map((bomb) => ({ ...bomb })),
  projectiles: game.projectiles.map((projectile) => ({ ...projectile })),
  missiles: game.missiles.map((missile) => ({ ...missile })),
  spiderThreads: game.spiderThreads.map((thread) => ({
    ...thread,
    start: { ...thread.start },
    end: { ...thread.end },
    target: { ...thread.target },
  })),
  claimedPolygons: game.claimedPolygons.map((polygon) => polygon.map((point) => ({ ...point }))),
  pendingCapturePolygons: game.pendingCapturePolygons.map((polygon) => (
    polygon.map((point) => ({ ...point }))
  )),
  fillQueue: [...game.fillQueue],
  fillCursor: game.fillCursor,
  scanY: game.scanY,
  mode: game.mode,
  score: game.score,
  shields: game.shields,
  capturedArea: game.capturedArea,
  totalPlayableArea: game.totalPlayableArea,
  pendingCaptureArea: game.pendingCaptureArea,
  level: game.level,
  trailScoreAccumulator: game.trailScoreAccumulator,
  invincibleRemainingMs: Math.max(0, game.invincibleUntil - now),
});

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

const createSpeedBoosts = (width: number, height: number, cell: number, level: number): SpeedBoost[] => {
  if (level === TUTORIAL_SECTOR || isBossSector(level)) return [];
  const bounds = perimeterBounds(width, height, cell);
  return [{
    x: bounds.left + cell * (1.4 + Math.random() * Math.max(1, (bounds.right - bounds.left) / cell - 2.8)),
    y: bounds.top + cell * (1.4 + Math.random() * Math.max(1, (bounds.bottom - bounds.top) / cell - 2.8)),
    phase: Math.random() * Math.PI * 2,
    collected: false,
  }];
};

const placeSpeedBoostsInOpenSurface = (
  speedBoosts: SpeedBoost[],
  enemies: Enemy[],
  diamonds: Diamond[],
  bombs: Bomb[],
  width: number,
  height: number,
  cell: number,
  claimedPolygons: Point[][],
  protectedTrails: Point[][],
  activeTrail: Point[],
  player: Point,
) => {
  const bounds = perimeterBounds(width, height, cell);
  const radius = speedBoostRadius(cell);
  const randomCandidates = Array.from({ length: 28 }, () => ({
    x: bounds.left + radius + Math.random() * Math.max(0, bounds.right - bounds.left - radius * 2),
    y: bounds.top + radius + Math.random() * Math.max(0, bounds.bottom - bounds.top - radius * 2),
  }));
  const gridCandidates = Array.from({ length: 7 }, (_, row) => (
    Array.from({ length: 7 }, (_, column) => ({
      x: bounds.left + (bounds.right - bounds.left) * ((column + 0.5) / 7),
      y: bounds.top + (bounds.bottom - bounds.top) * ((row + 0.5) / 7),
    }))
  )).flat();

  speedBoosts.forEach((speedBoost) => {
    if (speedBoost.collected) return;
    const candidates = [
      { x: speedBoost.x, y: speedBoost.y },
      ...randomCandidates,
      ...gridCandidates,
    ];
    const candidate = candidates.find((point) => {
      const x = clamp(point.x, bounds.left + radius, bounds.right - radius);
      const y = clamp(point.y, bounds.top + radius, bounds.bottom - radius);
      const candidatePoint = { x, y };
      const clearOfClaimed = !pointInsideClaimedSurface(candidatePoint, claimedPolygons, cell * 0.12);
      const clearOfProtected = protectedTrails.every((trail) => (
        trail.slice(1).every((trailPoint, index) => (
          distanceToSegment(candidatePoint, trail[index], trailPoint)
            > radius + PERIMETER_STROKE_WIDTH * 0.5
        ))
      ));
      const clearOfActiveTrail = activeTrail.length < 2 || !pathTouchesPolygon(
        activeTrail,
        [
          { x: x - radius, y: y - radius },
          { x: x + radius, y: y - radius },
          { x: x + radius, y: y + radius },
          { x: x - radius, y: y + radius },
        ],
        PERIMETER_STROKE_WIDTH * 0.5,
      );
      const clearOfPlayer = Math.hypot(x - player.x, y - player.y)
        > radius + playerBodyRadius(cell) * 1.8;
      const clearOfEnemies = enemies
        .filter((enemy) => !enemyIsDestroyed(enemy))
        .every((enemy) => (
          Math.hypot(x - enemy.x, y - enemy.y)
            > radius + enemyVisualRadius(enemy, cell) * 0.72
        ));
      const clearOfDiamonds = diamonds
        .filter((diamond) => !diamond.collected)
        .every((diamond) => Math.hypot(x - diamond.x, y - diamond.y) > radius + cell * 0.7);
      const clearOfBombs = bombs
        .filter((bomb) => !bomb.destroyed)
        .every((bomb) => Math.hypot(x - bomb.x, y - bomb.y) > radius + bombRadius(cell));
      return clearOfClaimed
        && clearOfProtected
        && clearOfActiveTrail
        && clearOfPlayer
        && clearOfEnemies
        && clearOfDiamonds
        && clearOfBombs;
    });
    if (candidate) {
      speedBoost.x = clamp(candidate.x, bounds.left + radius, bounds.right - radius);
      speedBoost.y = clamp(candidate.y, bounds.top + radius, bounds.bottom - radius);
    }
  });
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
    scale: (enemy.isBoss ? BOSS_RENDER_SCALE : 1)
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

const enemyRenderSize = (kind: EnemyKind, cell: number, isMini = false) => {
  const size = enemySpriteSize(kind, cell, isMini);
  return {
    width: size.width * ENEMY_RENDER_SCALE,
    height: size.height * ENEMY_RENDER_SCALE,
  };
};

const pickupVisualSize = (cell: number) => cell * PICKUP_VISUAL_SIZE_CELLS;

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
    const bossSpeed = spec.isBoss
      ? (1.24 + (spec.bossTier ?? 1) * 0.035) * BOSS_SPEED_BOOST
      : 1;
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
  const gridLines: React.ReactNode[] = [];
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
  const arenaBounds = perimeterBounds(snapshot.width, snapshot.height, snapshot.cell);
  const angle = Math.atan2(snapshot.direction.y, snapshot.direction.x);
  const playerRotationDegrees = angle * (180 / Math.PI) + 90;
  const playerSize = playerSpriteSize(snapshot.cell);
  const pickupSize = pickupVisualSize(snapshot.cell);
  const invincibilityRemaining = Math.max(0, snapshot.invincibleUntil - Date.now());
  const protectionPulse = clamp(
    0.5
      + Math.sin(Date.now() * 0.014) * 0.24
      + Math.sin(Date.now() * 0.041) * 0.15
      + Math.sin(Date.now() * 0.083) * 0.1,
    0,
    1,
  );
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
                  x={-pickupSize / 2}
                  y={-pickupSize / 2}
                  width={pickupSize}
                  height={pickupSize}
                />
              </ClipPath>
            </Defs>
            <G clipPath={`url(#diamond-sprite-clip-${index})`}>
              <SvgImage
                href={diamondSpriteSource}
                x={-pickupSize / 2 - diamondFrame * pickupSize}
                y={-pickupSize / 2}
                width={pickupSize * DIAMOND_SPRITE_FRAME_COUNT}
                height={pickupSize}
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
        const spriteSize = pickupSize;
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
        const size = enemyRenderSize(enemy.kind, snapshot.cell, enemy.isMini);
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
      {invincibilityRemaining > 0 && (
        <G pointerEvents="none">
          <Circle
            cx={snapshot.player.x}
            cy={snapshot.player.y}
            r={snapshot.cell * (0.92 + protectionPulse * 0.12)}
            fill="none"
            stroke="#00f3ff"
            strokeWidth={snapshot.cell * 0.065}
            opacity={0.1 + protectionPulse * 0.22}
          />
          <Circle
            cx={snapshot.player.x}
            cy={snapshot.player.y}
            r={snapshot.cell * (0.62 + protectionPulse * 0.08)}
            fill="#00f3ff"
            opacity={0.015 + protectionPulse * 0.045}
          />
          <Circle
            cx={snapshot.player.x}
            cy={snapshot.player.y}
            r={snapshot.cell * 1.16}
            fill="none"
            stroke="#fff5cf"
            strokeWidth={snapshot.cell * 0.02}
            opacity={0.06 + protectionPulse * 0.16}
          />
        </G>
      )}
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
    invincibleUntil: 0,
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
  const savedGameRef = useRef<PersistedGame | null>(null);
  const savedGameHydratedRef = useRef(false);
  const saveQueueRef = useRef(Promise.resolve());
  const lastGameSaveAtRef = useRef(0);
  const recordBannerShownRef = useRef(false);
  const bannerQueueRef = useRef<Banner[]>([]);
  const bannerAnimatingRef = useRef(false);
  const bannerSequenceRef = useRef(0);
  const bannerTranslateX = useRef(new Animated.Value(-520)).current;
  const saveGameProgress = useCallback(() => {
    const game = gameRef.current;
    if (!game.initialized || game.status !== 'PLAYING') return;
    const serialized = JSON.stringify(serializeGame(game, Date.now()));
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(GAME_SAVE_STORAGE_KEY, serialized))
      .catch((error: unknown) => {
        if (__DEV__) console.warn('Unable to save game progress', error);
      });
  }, [rememberLastPlayedSector]);
  const clearSavedGameProgress = useCallback(() => {
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(() => AsyncStorage.removeItem(GAME_SAVE_STORAGE_KEY))
      .catch((error: unknown) => {
        if (__DEV__) console.warn('Unable to clear saved game progress', error);
      });
  }, []);
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
    let cancelled = false;
    AsyncStorage.getItem(GAME_SAVE_STORAGE_KEY)
      .then((storedGame) => {
        if (cancelled || !storedGame) return;
        try {
          const parsedGame: unknown = JSON.parse(storedGame);
          if (isPersistedGame(parsedGame)) {
            savedGameRef.current = parsedGame;
          } else if (__DEV__) {
            console.warn('Ignoring invalid saved game progress');
          }
        } catch (error) {
          if (__DEV__) console.warn('Unable to parse saved game progress', error);
        }
      })
      .catch((error: unknown) => {
        if (__DEV__) console.warn('Unable to load saved game progress', error);
      })
      .finally(() => {
        if (!cancelled) savedGameHydratedRef.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        saveGameProgress();
      }
    });
    return () => subscription.remove();
  }, [saveGameProgress]);

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
    const resolvedShipSmokeSprite = (RNImage as any).resolveAssetSource?.(shipSmokeSpriteSource);
    const shipSmokeSpriteImage = new (globalThis as any).Image();
    shipSmokeSpriteImage.decoding = 'async';
    shipSmokeSpriteImage.onload = () => {
      if (!cancelled) shipSmokeSpriteImageRef.current = shipSmokeSpriteImage;
    };
    shipSmokeSpriteImage.src = resolvedShipSmokeSprite?.uri ?? shipSmokeSpriteSource;
    const resolvedCuttingSprite = (RNImage as any).resolveAssetSource?.(cuttingSpriteSource);
    const cuttingSpriteImage = new (globalThis as any).Image();
    cuttingSpriteImage.decoding = 'async';
    cuttingSpriteImage.onload = () => {
      if (!cancelled) cuttingSpriteImageRef.current = cuttingSpriteImage;
    };
    cuttingSpriteImage.src = resolvedCuttingSprite?.uri ?? cuttingSpriteSource;
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
    const previousInvincibleUntil = preserveStats && resetBoard
      ? (g.invincibleUntil ?? 0)
      : 0;
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
      invincibleUntil: previousInvincibleUntil,
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

  const restoreSavedGame = useCallback((saved: PersistedGame) => {
    const { width, height } = sizeRef.current;
    if (width <= 0 || height <= 0) return;

    resetGame(false);
    const game = gameRef.current;
    const scaleX = width / Math.max(1, saved.width);
    const scaleY = height / Math.max(1, saved.height);
    const scalePoint = (point: Point): Point => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    });
    const scaleTrail = (trail: Point[]) => trail.map(scalePoint);
    const currentBounds = perimeterBounds(width, height, game.cell);
    const totalPlayableArea = Math.max(
      1,
      (currentBounds.right - currentBounds.left) * (currentBounds.bottom - currentBounds.top),
    );
    const savedAreaRatio = saved.totalPlayableArea > 0
      ? clamp(saved.capturedArea / saved.totalPlayableArea, 0, 1)
      : 0;
    const savedPendingAreaRatio = saved.totalPlayableArea > 0
      ? Math.max(0, saved.pendingCaptureArea / saved.totalPlayableArea)
      : 0;

    game.level = Math.round(clamp(saved.level, 1, MAX_LEVEL));
    game.player = scalePoint(saved.player);
    game.inputDir = { ...saved.inputDir };
    game.facingDir = { ...saved.facingDir };
    game.hasMoveCommand = saved.hasMoveCommand;
    game.cutDir = { ...saved.cutDir };
    game.cutCoordinate = saved.cutCoordinate * scaleX;
    game.trail = scaleTrail(saved.trail);
    game.protectedTrails = saved.protectedTrails.map(scaleTrail);
    game.enemies = saved.enemies.map((enemy) => ({
      ...enemy,
      x: enemy.x * scaleX,
      y: enemy.y * scaleY,
      targetX: enemy.targetX * scaleX,
      targetY: enemy.targetY * scaleY,
      lastSafeX: enemy.lastSafeX === undefined ? undefined : enemy.lastSafeX * scaleX,
      lastSafeY: enemy.lastSafeY === undefined ? undefined : enemy.lastSafeY * scaleY,
    }));
    game.diamonds = saved.diamonds.map((diamond) => ({
      ...diamond,
      x: diamond.x * scaleX,
      y: diamond.y * scaleY,
    }));
    game.bombs = saved.bombs.map((bomb) => ({
      ...bomb,
      x: bomb.x * scaleX,
      y: bomb.y * scaleY,
    }));
    game.projectiles = saved.projectiles.map((projectile) => ({
      ...projectile,
      x: projectile.x * scaleX,
      y: projectile.y * scaleY,
      vx: projectile.vx * scaleX,
      vy: projectile.vy * scaleY,
      radius: projectile.radius * scaleX,
    }));
    game.missiles = saved.missiles.map((missile) => ({
      ...missile,
      x: missile.x * scaleX,
      y: missile.y * scaleY,
      vx: missile.vx * scaleX,
      vy: missile.vy * scaleY,
      radius: missile.radius * scaleX,
    }));
    game.spiderThreads = saved.spiderThreads.map((thread) => ({
      ...thread,
      start: scalePoint(thread.start),
      end: scalePoint(thread.end),
      target: scalePoint(thread.target),
      vx: thread.vx * scaleX,
      vy: thread.vy * scaleY,
      projectileSpeed: thread.projectileSpeed * scaleX,
    }));
    game.claimedPolygons = saved.claimedPolygons.map(scaleTrail);
    game.pendingCapturePolygons = saved.pendingCapturePolygons.map(scaleTrail);
    game.fillQueue = [...saved.fillQueue];
    game.fillCursor = clamp(Math.floor(saved.fillCursor), 0, game.fillQueue.length);
    game.scanY = saved.scanY * scaleY;
    game.mode = saved.mode;
    game.score = Math.max(0, saved.score);
    game.shields = Math.max(0, saved.shields);
    game.totalPlayableArea = totalPlayableArea;
    game.capturedArea = totalPlayableArea * savedAreaRatio;
    game.pendingCaptureArea = totalPlayableArea * savedPendingAreaRatio;
    game.trailScoreAccumulator = Math.max(0, saved.trailScoreAccumulator * scaleX);
    game.frame = 0;
    game.particles = [];
    game.fusionSparks = [];
    game.fusion = null;
    game.smokePuffs = [];
    game.smokeAccumulator = 0;
    game.status = 'PLAYING';
    game.respawnAt = 0;
    game.invincibleUntil = Date.now() + Math.max(0, saved.invincibleRemainingMs);
    game.initialized = true;
    savedGameRef.current = null;
    setHud({
      score: game.score,
      bestScore: bestScoreRef.current,
      shields: game.shields,
      capture: Math.min(
        LEVEL_CAPTURE_TARGET,
        Math.floor(clamp(game.capturedArea / game.totalPlayableArea, 0, 1) * 100),
      ),
      level: game.level,
      mode: game.mode,
      feedback: '',
    });
  }, [resetGame]);

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
    diagnosticLog('arena-layout', {
      width: Math.round(width),
      height: Math.round(height),
      changed,
      initialized: gameRef.current.initialized,
    });
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

    const playerIsProtected = (g: Game, now: number) => g.invincibleUntil > now;

    const activateCaptureProtection = (g: Game, now: number) => {
      const protectionWasInactive = !playerIsProtected(g, now);
      g.invincibleUntil = Math.max(
        g.invincibleUntil,
        now + CAPTURE_INVINCIBILITY_DURATION * 1000,
      );
      if (protectionWasInactive) {
        enqueueBanner({ kind: 'SHIELD' });
      }
    };

    const explode = (g: Game, now: number) => {
      if (g.status !== 'PLAYING') return;
      if (playerIsProtected(g, now)) return;
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
      if (playerIsProtected(g, Date.now())) return;
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
      fromCapture = false,
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
      const enemyPoints = ENEMY_SCORE[enemy.kind] * (fromCapture ? 2 : 1);
      g.score += enemyPoints;
      if (fromCapture) {
        // This applies to every enemy type, including the mini ships created
        // by a split. The capture completion path also activates it once
        // before bursting the captured roster.
        activateCaptureProtection(g, now);
      }
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
          points: enemyPoints,
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
          if (!playerIsProtected(g, now)) {
            startFusionDeath(g, enemy);
            return;
          }
          // A protected drone can finish the cut. Do not return from the
          // enemy update here, otherwise a mini ship can remain pinned to the
          // active trail while the player is trying to close the region.
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
              x: clamp(g.player.x + playerDirection.x * PLAYER_MOVE_SPEED * predictionTime, minX, maxX),
              y: clamp(g.player.y + playerDirection.y * PLAYER_MOVE_SPEED * predictionTime, minY, maxY),
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
          if (!playerIsProtected(g, now)) {
            startFusionDeath(g, enemy);
            return;
          }
          // Protected trail contact is non-lethal and must not interrupt the
          // rest of the enemy update or the player's capture flow.
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
          if (!playerIsProtected(g, now)) {
            explode(g, now);
            return;
          }
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
              x: droneDirection.x * PLAYER_MOVE_SPEED,
              y: droneDirection.y * PLAYER_MOVE_SPEED,
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
      g.invincibleUntil ??= 0;
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
          const tutorialStepToRestart = g.level === TUTORIAL_SECTOR
            && tutorialStepRef.current >= 3
            ? tutorialStepRef.current
            : null;
          if (g.shields <= 0) {
            enqueueBanner({ kind: 'GAME_OVER', score: g.score });
            clearSavedGameProgress();
            if (tutorialStepToRestart) {
              restartTutorialStep(tutorialStepToRestart);
            } else {
              resetGame(false);
            }
          } else if (tutorialStepToRestart) {
            restartTutorialStep(tutorialStepToRestart);
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
            const capturedEnemies = g.enemies.filter((enemy) => {
              if (enemy.respawnAt > now) return false;
              const enemyPoints = enemySpriteFootprint(enemy, g.cell, enemy.x, enemy.y);
              return completedPolygons.some((polygon) => (
                enemyPoints.length > 0
                && enemyPoints.every((point) => pointInPolygon(point, polygon))
              ));
            });
            if (capturedEnemies.length > 0) {
              // Activate protection for the whole captured roster, including
              // mini enemies, before any individual burst is processed.
              activateCaptureProtection(g, now);
              capturedEnemies.forEach((enemy) => {
                burstEnemy(g, enemy, now, false, true);
              });
            }
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
      const baseSpeed = PLAYER_MOVE_SPEED;
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
        const bounds = perimeterBounds(g.width, g.height, g.cell);

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
         const pickupSize = pickupVisualSize(g.cell);
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
              -pickupSize / 2,
              -pickupSize / 2,
              pickupSize,
              pickupSize,
            );
           context.restore();
         });
       }
       const coreReactorImage = coreReactorImageRef.current;
       if (coreReactorImage) {
         const bombFrame = Math.floor(g.frame / CORE_REACTOR_SPRITE_FRAME_DURATION)
           % CORE_REACTOR_SPRITE_FRAME_COUNT;
         const bombSize = pickupVisualSize(g.cell);
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
         const size = enemyRenderSize(enemy.kind, g.cell, enemy.isMini);
        const motion = enemyAnimationTransform(enemy, g.cell);
        context.save();
        context.translate(enemy.x, enemy.y + motion.offsetY);
        context.rotate(motion.rotation);
        context.scale(motion.scale, motion.scale);
        drawEnemySpriteWithGlow(context, image, size, enemyGlowColor(enemy.kind));
        context.restore();
      });
      context.shadowBlur = 0;

      const invincibilityRemaining = Math.max(0, g.invincibleUntil - now);
      if (invincibilityRemaining > 0) {
        const protectionPulse = clamp(
          0.5
            + Math.sin(now * 0.014) * 0.24
            + Math.sin(now * 0.041) * 0.15
            + Math.sin(now * 0.083) * 0.1,
          0,
          1,
        );
        context.save();
        context.globalCompositeOperation = 'lighter';
        context.globalAlpha = 0.1 + protectionPulse * 0.22;
        context.strokeStyle = '#00f3ff';
        context.shadowColor = '#00f3ff';
        context.shadowBlur = g.cell * 0.2;
        context.lineWidth = g.cell * 0.065;
        context.beginPath();
        context.arc(
          g.player.x,
          g.player.y,
          g.cell * (0.92 + protectionPulse * 0.12),
          0,
          Math.PI * 2,
        );
        context.stroke();
        context.globalAlpha = 0.015 + protectionPulse * 0.045;
        context.fillStyle = '#00f3ff';
        context.beginPath();
        context.arc(
          g.player.x,
          g.player.y,
          g.cell * (0.62 + protectionPulse * 0.08),
          0,
          Math.PI * 2,
        );
        context.fill();
        context.globalAlpha = 0.06 + protectionPulse * 0.16;
        context.shadowColor = '#fff5cf';
        context.shadowBlur = g.cell * 0.08;
        context.strokeStyle = '#fff5cf';
        context.lineWidth = g.cell * 0.02;
        context.beginPath();
        context.arc(g.player.x, g.player.y, g.cell * 1.16, 0, Math.PI * 2);
        context.stroke();
        context.restore();
      }

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
      if (
        !g.initialized
        && sizeRef.current.width > 0
        && savedGameHydratedRef.current
      ) {
        if (savedGameRef.current) restoreSavedGame(savedGameRef.current);
        else resetGame(false);
      }
      if (g.initialized) {
        update(g, dt, now);
        if (now - lastGameSaveAtRef.current >= GAME_SAVE_INTERVAL_MS) {
          lastGameSaveAtRef.current = now;
          saveGameProgress();
        }
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
            invincibleUntil: g.invincibleUntil,
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
    clearSavedGameProgress,
    playDiamondCapture,
    playPickupChime,
    playSevenFireShot,
    playSectorTransition,
    playShieldLossExplosion,
    resetGame,
    restoreSavedGame,
    saveGameProgress,
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
          <>
            <Polyline
              points={pointsToString(snapshot.trail)}
              fill="none"
              stroke="#fff3d6"
              strokeWidth={12}
              opacity={0.16}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Polyline
              points={pointsToString(snapshot.trail)}
              fill="none"
              stroke="#ffffff"
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
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
                          : banner.kind === 'SHIELD'
                            ? styles.shieldBanner
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
                    : banner.kind === 'SHIELD'
                      ? 'BOUCLIER ACTIVÉ'
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
                    : banner.kind === 'SHIELD'
                      ? 'INVINCIBILITÉ  •  10 SECONDES'
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
  shieldBanner: {
    borderColor: HUD_COLORS.cyan,
    backgroundColor: 'rgba(0, 24, 34, 0.24)',
    shadowColor: HUD_COLORS.cyan,
    shadowOpacity: 0.7,
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
*/