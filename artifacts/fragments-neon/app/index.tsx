import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, Pressable, Image } from 'react-native';
import Svg, { Rect, Polyline, Circle, Defs, RadialGradient, Stop, Filter, FeGaussianBlur } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

const EMPTY = 0;
const CLAIMED = 1;
const TRAIL = 2;

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const GRID_W = 40;
const TARGET_PERCENT = 75;
const playerSprite = require('@/assets/images/player-arcwing.png');
const enemySprite = require('@/assets/images/enemy-void-mantis.png');
const shardSprite = require('@/assets/images/energy-tesseract.png');
const beamCapsuleSprite = require('@/assets/images/laser-beam-capsule.png');

const isClaimedSafe = (grid: number[][], x: number, y: number, w: number, h: number) => {
  if (x < 0 || x >= w || y < 0 || y >= h) return true;
  return grid[y][x] === CLAIMED;
};

export default function GameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const confirmSound = useAudioPlayer(require('@/assets/audio/confirm.mp3'));
  const pickupSound = useAudioPlayer(require('@/assets/audio/pickup.mp3'));
  const dangerSound = useAudioPlayer(require('@/assets/audio/danger.mp3'));

  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // React State for Rendering
  const [gameState, setGameState] = useState<'MENU'|'PLAYING'|'GAMEOVER'|'VICTORY'>('MENU');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [totalShards, setTotalShards] = useState(0);
  const [shields, setShields] = useState(3);
  const [level, setLevel] = useState(1);
  const [progress, setProgress] = useState(0);
  const [shardTiers, setShardTiers] = useState(0);
  
  // Game Render State
  const [renderedGrid, setRenderedGrid] = useState<{x:number, y:number, w:number}[]>([]);
  const [playerPos, setPlayerPos] = useState({x: 0, y: 0});
  const [trailPoints, setTrailPoints] = useState<string>("");
  const [trailAngle, setTrailAngle] = useState(0);
  const [captureFill, setCaptureFill] = useState(0);
  const [enemies, setEnemies] = useState<{x:number, y:number}[]>([]);
  const [shards, setShards] = useState<{x:number, y:number, gx:number, gy:number}[]>([]);
  
  const gameRef = useRef({
    grid: [] as number[][],
    cellW: 0,
    gridH: 0,
    player: { x: 0, y: 0, startX: 0, startY: 0 },
    target: { x: 0, y: 0 },
    trailGrid: [] as {x: number, y: number}[],
    trailPts: [] as {x: number, y: number}[],
    enemies: [] as {x: number, y: number, vx: number, vy: number}[],
    shards: [] as {x: number, y: number, gx: number, gy: number}[],
    animFrame: 0,
    lastTime: 0,
    status: 'MENU',
    capturedCells: 0,
    totalEmptyCells: 0,
    score: 0,
    shields: 3,
    level: 1,
    fillQueue: [] as {x: number, y: number}[],
    fillCursor: 0,
    fillCaptured: 0
  });

  const gameLoop = useCallback(() => {
    const g = gameRef.current;
    if (g.status !== 'PLAYING') return;

    let now = Date.now();
    let dt = (now - g.lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    g.lastTime = now;

    let gridChanged = false;
    let entityChanged = false;

    // Capture animation: reveal the secured territory progressively before
    // changing state to victory. This keeps the payoff visible and gives the
    // UI a full-frame, 60fps moment to celebrate the player's move.
    if (g.fillQueue.length > 0) {
      const cellsPerFrame = Math.max(4, Math.min(18, Math.ceil(g.fillQueue.length / 24)));
      for (let i = 0; i < cellsPerFrame && g.fillCursor < g.fillQueue.length; i++) {
        const cell = g.fillQueue[g.fillCursor];
        if (g.grid[cell.y][cell.x] !== CLAIMED) {
          g.grid[cell.y][cell.x] = CLAIMED;
          g.fillCaptured += 1;
        }
        g.fillCursor += 1;
      }

      gridChanged = true;
      setCaptureFill(Math.min(100, Math.round((g.fillCursor / g.fillQueue.length) * 100)));
      syncGrid();

      if (g.fillCursor >= g.fillQueue.length) {
        const newlyCaptured = g.fillCaptured;
        g.capturedCells += newlyCaptured;
        g.score += newlyCaptured * 10;
        g.fillQueue = [];
        g.fillCursor = 0;
        g.fillCaptured = 0;

        const newProgress = Math.floor((g.capturedCells / g.totalEmptyCells) * 100);
        setProgress(newProgress);
        setCaptureFill(100);

        g.shards = g.shards.filter(s => {
          if (g.grid[s.gy][s.gx] === CLAIMED) {
            playSound('pickup');
            saveData(0, 1);
            g.score += 500;
            return false;
          }
          return true;
        });

        if (newProgress >= TARGET_PERCENT) {
          g.status = 'VICTORY';
          setGameState('VICTORY');
        } else {
          setCaptureFill(0);
        }

        syncGrid();
        syncEntities();
      }

      g.animFrame = requestAnimationFrame(gameLoop);
      return;
    }

    // Player Movement
    const MAX_SPEED = 400 * dt;
    const dx = g.target.x - g.player.x;
    const dy = g.target.y - g.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const moveDist = Math.min(dist, MAX_SPEED);
      const moveX = (dx / dist) * moveDist;
      const moveY = (dy / dist) * moveDist;
      
      const steps = Math.ceil(moveDist);
      const stepX = moveX / steps;
      const stepY = moveY / steps;
      
      for (let i = 0; i < steps; i++) {
        g.player.x += stepX;
        g.player.y += stepY;
        
        g.player.x = Math.max(0, Math.min(g.player.x, (GRID_W - 1) * g.cellW));
        g.player.y = Math.max(0, Math.min(g.player.y, (g.gridH - 1) * g.cellW));

        const gx = Math.floor(g.player.x / g.cellW);
        const gy = Math.floor(g.player.y / g.cellW);
        
        const state = g.grid[gy][gx];
        
        if (state === EMPTY) {
          g.grid[gy][gx] = TRAIL;
          g.trailGrid.push({x: gx, y: gy});
          if (g.trailPts.length === 0) {
             g.trailPts.push({x: g.player.startX, y: g.player.startY});
          }
        } else if (state === TRAIL) {
          const lastCells = g.trailGrid.slice(-4);
          const hitSelf = !lastCells.some(c => c.x === gx && c.y === gy);
          if (hitSelf) {
            handlePlayerHit();
            gridChanged = true;
            break;
          }
        } else if (state === CLAIMED) {
          if (g.trailGrid.length > 2) {
            captureArea();
            gridChanged = true;
            break;
          } else if (g.trailGrid.length > 0) {
            for (let t of g.trailGrid) g.grid[t.y][t.x] = EMPTY;
            g.trailGrid = [];
            g.trailPts = [];
            gridChanged = true;
          }
          g.player.startX = g.player.x;
          g.player.startY = g.player.y;
        }
      }
      
      if (g.trailGrid.length > 0) {
          g.trailPts.push({x: g.player.x, y: g.player.y});
      }
      entityChanged = true;
    }

    // Enemy Movement
    for (let e of g.enemies) {
      let nx = e.x + e.vx * dt * 60;
      let ny = e.y + e.vy * dt * 60;
      
      let egx = Math.floor(nx / g.cellW);
      let egy = Math.floor(ny / g.cellW);
      
      if (egx < 0 || egx >= GRID_W) { e.vx *= -1; nx = e.x; }
      if (egy < 0 || egy >= g.gridH) { e.vy *= -1; ny = e.y; }
      
      if (egx >= 0 && egx < GRID_W && egy >= 0 && egy < g.gridH) {
        let state = g.grid[egy][egx];
        if (state === CLAIMED) {
           let cpx = Math.floor(e.x / g.cellW);
           let cpy = Math.floor(e.y / g.cellW);
           if (cpx !== egx && isClaimedSafe(g.grid, egx, cpy, GRID_W, g.gridH)) e.vx *= -1;
           if (cpy !== egy && isClaimedSafe(g.grid, cpx, egy, GRID_W, g.gridH)) e.vy *= -1;
           if (cpx !== egx && cpy !== egy && !isClaimedSafe(g.grid, egx, cpy, GRID_W, g.gridH) && !isClaimedSafe(g.grid, cpx, egy, GRID_W, g.gridH)) {
              e.vx *= -1; e.vy *= -1;
           }
           nx = e.x + (e.vx * dt * 60); 
           ny = e.y + (e.vy * dt * 60);
        } else if (state === TRAIL) {
           handlePlayerHit();
           gridChanged = true;
           break;
        }
      }
      e.x = nx;
      e.y = ny;
      entityChanged = true;
    }

    if (gridChanged) syncGrid();
    if (entityChanged || gridChanged) syncEntities();

    g.animFrame = requestAnimationFrame(gameLoop);
  }, []);

  const dragStartRef = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => gameRef.current.status === 'PLAYING',
      onPanResponderGrant: () => {
        dragStartRef.current = { x: gameRef.current.player.x, y: gameRef.current.player.y };
        gameRef.current.target = { x: dragStartRef.current.x, y: dragStartRef.current.y };
      },
      onPanResponderMove: (evt, gestureState) => {
        const g = gameRef.current;
        if (g.status === 'PLAYING') {
          g.target.x = dragStartRef.current.x + gestureState.dx * 1.5;
          g.target.y = dragStartRef.current.y + gestureState.dy * 1.5;
        }
      },
      onPanResponderRelease: () => {}
    })
  ).current;

  useEffect(() => {
    loadData();
    return () => {
      cancelAnimationFrame(gameRef.current.animFrame);
    };
  }, []);

  const loadData = async () => {
    try {
      const best = await AsyncStorage.getItem('bestScore');
      const shards = await AsyncStorage.getItem('totalShards');
      if (best) setBestScore(parseInt(best, 10));
      if (shards) {
        const parsedShards = parseInt(shards, 10);
        setTotalShards(parsedShards);
        setShardTiers(Math.min(2, Math.floor(parsedShards / 10)));
      }
    } catch (e) {}
  };

  const saveData = async (newScore: number, newShards: number) => {
    try {
      if (newScore > bestScore) {
        setBestScore(newScore);
        await AsyncStorage.setItem('bestScore', newScore.toString());
      }
      const updatedShards = totalShards + newShards;
      setTotalShards(updatedShards);
      setShardTiers(Math.min(2, Math.floor(updatedShards / 10)));
      await AsyncStorage.setItem('totalShards', updatedShards.toString());
    } catch (e) {}
  };

  const playSound = useCallback((sound: 'confirm' | 'pickup' | 'danger') => {
    if (!soundEnabled) return;
    if (sound === 'confirm') { confirmSound.seekTo(0); confirmSound.play(); }
    if (sound === 'pickup') { pickupSound.seekTo(0); pickupSound.play(); }
    if (sound === 'danger') { dangerSound.seekTo(0); dangerSound.play(); }
  }, [soundEnabled, confirmSound, pickupSound, dangerSound]);

  const initLevel = useCallback((lvl: number, currentScore: number = 0, currentShields: number = 3) => {
    setProgress(0);
    setGameState('PLAYING');
    
    const cellW = SCREEN_WIDTH / GRID_W;
    const topPadding = Math.max(insets.top, 20) + 80;
    const bottomPadding = insets.bottom + 40;
    const arenaHeight = SCREEN_HEIGHT - topPadding - bottomPadding; 
    const gridH = Math.floor(arenaHeight / cellW);
    
    const g = gameRef.current;
    g.cellW = cellW;
    g.gridH = gridH;
    g.status = 'PLAYING';
    g.level = lvl;
    g.score = currentScore;
    g.shields = currentShields;
    
    let grid = [];
    let totalEmpty = 0;
    for (let y = 0; y < gridH; y++) {
      let row = [];
      for (let x = 0; x < GRID_W; x++) {
        if (x < 2 || x >= GRID_W - 2 || y < 2 || y >= gridH - 2) {
          row.push(CLAIMED);
        } else {
          row.push(EMPTY);
          totalEmpty++;
        }
      }
      grid.push(row);
    }
    g.grid = grid;
    g.totalEmptyCells = totalEmpty;
    g.capturedCells = 0;
    
    g.player.x = (GRID_W / 2) * cellW;
    g.player.y = (gridH - 2) * cellW;
    g.player.startX = g.player.x;
    g.player.startY = g.player.y;
    g.target.x = g.player.x;
    g.target.y = g.player.y;
    g.trailGrid = [];
    g.trailPts = [];
    
    g.enemies = [];
    const baseSpeed = 1.5 + lvl * 0.4;
    for (let i = 0; i < Math.min(lvl, 5); i++) {
      g.enemies.push({
        x: (GRID_W / 2 + (i%2===0?1:-1) * i * 3) * cellW,
        y: (gridH / 3 + i * 2) * cellW,
        vx: (Math.random() > 0.5 ? 1 : -1) * baseSpeed,
        vy: (Math.random() > 0.5 ? 1 : -1) * baseSpeed
      });
    }
    
    g.shards = [];
    for (let i = 0; i < 2 + lvl; i++) {
      let sx = Math.floor(Math.random() * (GRID_W - 10)) + 5;
      let sy = Math.floor(Math.random() * (gridH - 10)) + 5;
      g.shards.push({
        x: sx * cellW + cellW / 2,
        y: sy * cellW + cellW / 2,
        gx: sx,
        gy: sy
      });
    }
    
    syncGrid();
    syncEntities();
    g.lastTime = Date.now();
    cancelAnimationFrame(g.animFrame);
    g.animFrame = requestAnimationFrame(gameLoop);
  }, [insets]);

  const syncGrid = () => {
    const g = gameRef.current;
    let rects = [];
    for (let y = 0; y < g.gridH; y++) {
      let startX = -1;
      for (let x = 0; x < GRID_W; x++) {
        if (g.grid[y][x] === CLAIMED) {
          if (startX === -1) startX = x;
        } else {
          if (startX !== -1) {
            rects.push({ x: startX, y, w: x - startX });
            startX = -1;
          }
        }
      }
      if (startX !== -1) {
        rects.push({ x: startX, y, w: GRID_W - startX });
      }
    }
    setRenderedGrid(rects);
    setShards([...g.shards]);
  };

  const syncEntities = () => {
    const g = gameRef.current;
    setPlayerPos({ x: g.player.x, y: g.player.y });
    setEnemies(g.enemies.map(e => ({ x: e.x, y: e.y })));
    if (g.trailPts.length > 0) {
      setTrailPoints(g.trailPts.map(p => `${p.x},${p.y}`).join(' '));
      if (g.trailPts.length > 1) {
        const previous = g.trailPts[g.trailPts.length - 2];
        const current = g.trailPts[g.trailPts.length - 1];
        setTrailAngle(Math.atan2(current.y - previous.y, current.x - previous.x) * 180 / Math.PI);
      }
    } else {
      setTrailPoints("");
      setTrailAngle(0);
    }
    
    // Sync UI states
    setScore(g.score);
    setShields(g.shields);
    setLevel(g.level);
  };

  const handlePlayerHit = () => {
    const g = gameRef.current;
    playSound('danger');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    
    for (let t of g.trailGrid) g.grid[t.y][t.x] = EMPTY;
    g.trailGrid = [];
    g.trailPts = [];
    
    g.player.x = g.player.startX;
    g.player.y = g.player.startY;
    g.target.x = g.player.startX;
    g.target.y = g.player.startY;
    
    g.shields -= 1;
    if (g.shields < 0) {
      g.status = 'GAMEOVER';
      setGameState('GAMEOVER');
      saveData(g.score, 0);
    }
  };

  const captureArea = () => {
    const g = gameRef.current;
    playSound('confirm');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    const enemyCells = g.enemies.map(e => ({ 
      x: Math.floor(e.x / g.cellW), 
      y: Math.floor(e.y / g.cellW) 
    }));
    
    let visited = Array(g.gridH).fill(0).map(() => Array(GRID_W).fill(false));
    let queue: {x: number, y: number}[] = [];
    
    for (let ec of enemyCells) {
      if (ec.x >= 0 && ec.x < GRID_W && ec.y >= 0 && ec.y < g.gridH) {
        if (g.grid[ec.y][ec.x] === EMPTY) {
          queue.push(ec);
          visited[ec.y][ec.x] = true;
        }
      }
    }
    
    const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
    while (queue.length > 0) {
      let curr = queue.shift()!;
      for (let d of dirs) {
        let nx = curr.x + d[0];
        let ny = curr.y + d[1];
        if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < g.gridH) {
          if (!visited[ny][nx] && g.grid[ny][nx] === EMPTY) {
            visited[ny][nx] = true;
            queue.push({x: nx, y: ny});
          }
        }
      }
    }
    
    const fillQueue: {x: number, y: number}[] = [];
    for (let y = 0; y < g.gridH; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (g.grid[y][x] === EMPTY && !visited[y][x]) {
          fillQueue.push({ x, y });
        }
      }
    }
    
    for (let t of g.trailGrid) {
      fillQueue.push({ x: t.x, y: t.y });
    }
    
    g.trailGrid = [];
    g.trailPts = [];
    g.fillQueue = fillQueue;
    g.fillCursor = 0;
    g.fillCaptured = 0;
    setCaptureFill(0);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} {...panResponder.panHandlers}>
      {gameState === 'PLAYING' && (
        <View style={[styles.arena, { top: Math.max(insets.top, 20) + 80, bottom: insets.bottom + 40 }]} testID="game-arena">
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <Filter id="blur">
                <FeGaussianBlur stdDeviation="2" />
              </Filter>
            </Defs>
            
            {renderedGrid.map((r, i) => (
              <Rect 
                key={i} 
                x={r.x * gameRef.current.cellW} 
                y={r.y * gameRef.current.cellW} 
                width={r.w * gameRef.current.cellW} 
                height={gameRef.current.cellW} 
                fill={colors.card} 
                stroke={colors.border}
                strokeWidth={0.5}
              />
            ))}

            {shards.map((s, i) => (
              <Circle
                key={`shard-glow-${i}`}
                cx={s.x}
                cy={s.y}
                r={18}
                fill={colors.accent}
                opacity={0.14}
              />
            ))}

            {trailPoints.length > 0 && (
              <>
                <Polyline
                  points={trailPoints}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth={shardTiers > 1 ? 16 : 12}
                  opacity={0.18}
                  filter="url(#blur)"
                />
                <Polyline
                  points={trailPoints}
                  fill="none"
                  stroke={colors.secondary}
                  strokeWidth={shardTiers > 0 ? 8 : 6}
                  opacity={0.48}
                />
                <Polyline
                  points={trailPoints}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth={shardTiers > 1 ? 5 : 3}
                  opacity={0.98}
                />
              </>
            )}
          </Svg>

          {shards.map((s, i) => (
            <Image
              key={`shard-sprite-${i}`}
              source={shardSprite}
              style={[
                styles.shardSprite,
                {
                  left: s.x - 17,
                  top: s.y - 17,
                  transform: [{ rotate: `${(i % 2 === 0 ? 1 : -1) * 8}deg` }],
                },
              ]}
            />
          ))}

          {trailPoints.length > 0 && (
            <Image
              source={beamCapsuleSprite}
              style={[
                styles.beamCapsule,
                {
                  left: playerPos.x - 44,
                  top: playerPos.y - 14,
                  transform: [{ rotate: `${trailAngle}deg` }],
                },
              ]}
            />
          )}

          {captureFill > 0 && captureFill < 100 && (
            <View style={styles.captureStatus} pointerEvents="none">
              <Text style={[styles.captureStatusLabel, { color: colors.primary }]}>
                SECTEUR EN COURS DE SYNCHRONISATION
              </Text>
              <Text style={[styles.captureStatusValue, { color: colors.accent }]}>
                {captureFill}%
              </Text>
            </View>
          )}
          
          <View style={[styles.drone, { transform: [{ translateX: playerPos.x - 16 }, { translateY: playerPos.y - 16 }] }]}>
            <Image source={playerSprite} style={styles.playerSprite} />
          </View>

          {enemies.map((e, i) => (
             <View key={`e${i}`} style={[styles.enemy, { transform: [{ translateX: e.x - 16 }, { translateY: e.y - 16 }] }]}>
               <Image source={enemySprite} style={styles.enemySprite} />
             </View>
          ))}
        </View>
      )}

      {/* Overlays will go here */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]} pointerEvents="none">
        <View style={styles.headerRow}>
           <Text style={[styles.headerText, { color: colors.primary }]}>NIV {level}</Text>
           <Text style={[styles.headerText, { color: colors.foreground }]}>{score.toString().padStart(6, '0')}</Text>
        </View>
        <View style={styles.headerRow}>
            <Text style={[styles.headerText, { color: colors.accent, fontSize: 14 }]}>Boucliers: {shields}</Text>
            <Text style={[styles.headerText, { color: colors.accent, fontSize: 14 }]}>Fragments: {totalShards}</Text>
            <Text style={[styles.headerText, { color: colors.secondary, fontSize: 14 }]}>Capture: {progress}% / {TARGET_PERCENT}%</Text>
        </View>
      </View>

      {gameState === 'MENU' && (
        <View style={styles.overlay}>
          <Text style={[styles.title, { color: colors.primary }]}>FRAGMENTS</Text>
          <Text style={[styles.subtitle, { color: colors.secondary }]}>NEON</Text>
          <Text style={[styles.bestScore, { color: colors.foreground }]}>Meilleur Score: {bestScore}</Text>
          
          <Pressable style={[styles.button, { borderColor: colors.primary }]} onPress={() => { playSound('confirm'); initLevel(1); }}>
            <Text style={[styles.buttonText, { color: colors.primary }]}>DÉMARRER</Text>
          </Pressable>

           <Text style={[styles.tutorial, { color: colors.mutedForeground }]}>
             Glissez depuis le bord sécurisé pour capturer le territoire. Les fragments orange valent +500 et renforcent votre faisceau.
          </Text>

          <Pressable style={styles.soundToggle} onPress={() => setSoundEnabled(s => !s)}>
             <Text style={{color: colors.mutedForeground, fontSize: 12}}>{soundEnabled ? 'SON: ACTIF' : 'SON: MUET'}</Text>
          </Pressable>
        </View>
      )}

      {gameState === 'GAMEOVER' && (
        <View style={styles.overlay}>
          <Text style={[styles.title, { color: colors.destructive }]}>ÉCHEC</Text>
          <Text style={[styles.bestScore, { color: colors.foreground }]}>Score: {score}</Text>
          <Pressable style={[styles.button, { borderColor: colors.primary }]} onPress={() => { playSound('confirm'); initLevel(1); }}>
            <Text style={[styles.buttonText, { color: colors.primary }]}>RÉESSAYER</Text>
          </Pressable>
        </View>
      )}

      {gameState === 'VICTORY' && (
        <View style={styles.overlay}>
          <Text style={[styles.title, { color: colors.primary }]}>SECTEUR SÉCURISÉ</Text>
          <Text style={[styles.bestScore, { color: colors.foreground }]}>Score: {score}</Text>
          <Pressable style={[styles.button, { borderColor: colors.accent }]} onPress={() => { playSound('confirm'); initLevel(level + 1, score, shields); }}>
            <Text style={[styles.buttonText, { color: colors.accent }]}>NIVEAU SUIVANT</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden'
  },
  arena: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden'
  },
  drone: {
    position: 'absolute',
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerSprite: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  enemy: {
    position: 'absolute',
    width: 54,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enemySprite: {
    width: 54,
    height: 54,
    resizeMode: 'contain',
  },
  beamCapsule: {
    position: 'absolute',
    width: 88,
    height: 28,
    resizeMode: 'contain',
    opacity: 0.94,
  },
  captureStatus: {
    position: 'absolute',
    top: '46%',
    left: 24,
    right: 24,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(5, 5, 16, 0.82)',
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  captureStatusLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  captureStatusValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    letterSpacing: 2,
    marginTop: 4,
  },
  shardSprite: {
    position: 'absolute',
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 10
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5
  },
  headerText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    letterSpacing: 1
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 5, 16, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    padding: 20
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 48,
    letterSpacing: 4,
    textAlign: 'center'
  },
  subtitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 40,
    letterSpacing: 8,
    marginBottom: 40,
    textAlign: 'center'
  },
  bestScore: {
    fontFamily: 'Inter_500Medium',
    fontSize: 18,
    marginBottom: 60
  },
  button: {
    borderWidth: 2,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginBottom: 40
  },
  buttonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    letterSpacing: 2
  },
  tutorial: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20
  },
  soundToggle: {
    position: 'absolute',
    bottom: 40,
    padding: 10
  }
});
