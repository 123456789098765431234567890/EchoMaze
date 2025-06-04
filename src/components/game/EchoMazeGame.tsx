"use client";

import React, { useRef, useEffect, useCallback } from 'react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_RADIUS = 10;
const PLAYER_SPEED = 3; // Pixels per frame
const TRAIL_DURATION = 4000; // 4 seconds in milliseconds
const TRAIL_MAX_LENGTH = 240; // Max segments (4s * 60fps)
const LIGHT_MODE_TOTAL_DURATION = 30000; // 30 seconds
const DARK_MODE_DURATION = 10000; // 10 seconds

const PLAYER_COLOR = '#6200EA'; // Electric Indigo
const TRAIL_COLOR = '#9C27B0'; // Saturated Purple
const WALL_COLOR = '#888888'; // Medium Gray
const DEBUG_TEXT_COLOR = '#FFFFFF'; // White

interface Player {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
  speed: number;
}

interface TrailPoint {
  x: number;
  y: number;
  creationTime: number;
  alpha: number;
}

interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

const initialWalls: Wall[] = [
  { x: 100, y: 100, width: 200, height: 20, color: WALL_COLOR },
  { x: 100, y: 120, width: 20, height: 180, color: WALL_COLOR },
  { x: 500, y: 100, width: 20, height: 250, color: WALL_COLOR },
  { x: 100, y: CANVAS_HEIGHT - 120, width: 300, height: 20, color: WALL_COLOR },
  { x: CANVAS_WIDTH - 300, y: CANVAS_HEIGHT - 250, width: 20, height: 200, color: WALL_COLOR },
  { x: 300, y: 250, width: 150, height: 20, color: WALL_COLOR },
];

const EchoMazeGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameAnimationRef = useRef<number>();

  // Using refs for mutable game state that doesn't need to trigger re-renders directly
  const playerRef = useRef<Player>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    radius: PLAYER_RADIUS,
    vx: 0,
    vy: 0,
    color: PLAYER_COLOR,
    speed: PLAYER_SPEED,
  });
  const trailRef = useRef<TrailPoint[]>([]);
  const wallsRef = useRef<Wall[]>(initialWalls);
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});
  
  const gameModeRef = useRef<'LIGHT' | 'DARK'>('LIGHT');
  const modeTimerRef = useRef<number>(LIGHT_MODE_TOTAL_DURATION); // Time in ms

  const resetGame = useCallback(() => {
    playerRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      radius: PLAYER_RADIUS,
      vx: 0,
      vy: 0,
      color: PLAYER_COLOR,
      speed: PLAYER_SPEED,
    };
    trailRef.current = [];
    keysPressedRef.current = {};
    gameModeRef.current = 'LIGHT';
    modeTimerRef.current = LIGHT_MODE_TOTAL_DURATION;
  }, []);

  const drawPlayer = (ctx: CanvasRenderingContext2D) => {
    if (gameModeRef.current === 'DARK') return;
    const player = playerRef.current;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.closePath();
  };

  const drawTrail = (ctx: CanvasRenderingContext2D) => {
    const trail = trailRef.current;
    trail.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, PLAYER_RADIUS / 2, 0, Math.PI * 2);
      ctx.fillStyle = TRAIL_COLOR;
      ctx.globalAlpha = point.alpha;
      ctx.fill();
      ctx.closePath();
    });
    ctx.globalAlpha = 1; // Reset globalAlpha
  };

  const drawWalls = (ctx: CanvasRenderingContext2D) => {
    if (gameModeRef.current === 'DARK') return;
    const walls = wallsRef.current;
    walls.forEach(wall => {
      ctx.fillStyle = wall.color;
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    });
  };

  const drawDebugInfo = (ctx: CanvasRenderingContext2D) => {
    ctx.font = "16px 'Space Grotesk'";
    ctx.fillStyle = DEBUG_TEXT_COLOR;
    ctx.textAlign = 'left';
    ctx.fillText(`Time until ${gameModeRef.current === 'LIGHT' ? 'Darkness' : 'Light'}: ${(modeTimerRef.current / 1000).toFixed(1)}s`, 10, 20);
    ctx.fillText(`Trail Segments: ${trailRef.current.length}`, 10, 40);
    ctx.fillText(`Mode: ${gameModeRef.current}`, 10, 60);
    ctx.fillText(`Press 'R' to Reset`, 10, 80);
  };

  const updatePlayerPosition = () => {
    const player = playerRef.current;
    let newX = player.x + player.vx;
    let newY = player.y + player.vy;

    // Canvas boundary collision
    if (newX - player.radius < 0) newX = player.radius;
    if (newX + player.radius > CANVAS_WIDTH) newX = CANVAS_WIDTH - player.radius;
    if (newY - player.radius < 0) newY = player.radius;
    if (newY + player.radius > CANVAS_HEIGHT) newY = CANVAS_HEIGHT - player.radius;

    // Wall collision
    const originalX = player.x;
    const originalY = player.y;
    player.x = newX;
    player.y = newY;

    let collisionX = false;
    let collisionY = false;

    for (const wall of wallsRef.current) {
        // Test X movement
        player.x = newX;
        player.y = originalY;
        if (checkCircleRectCollision(player, wall)) {
            collisionX = true;
        }

        // Test Y movement
        player.x = originalX;
        player.y = newY;
        if (checkCircleRectCollision(player, wall)) {
            collisionY = true;
        }
    }
    
    player.x = collisionX ? originalX : newX;
    player.y = collisionY ? originalY : newY;

  };
  
  const checkCircleRectCollision = (circle: Player, rect: Wall): boolean => {
    let testX = circle.x;
    let testY = circle.y;

    if (circle.x < rect.x) testX = rect.x;
    else if (circle.x > rect.x + rect.width) testX = rect.x + rect.width;
    
    if (circle.y < rect.y) testY = rect.y;
    else if (circle.y > rect.y + rect.height) testY = rect.y + rect.height;

    const distX = circle.x - testX;
    const distY = circle.y - testY;
    const distance = Math.sqrt((distX * distX) + (distY * distY));

    return distance <= circle.radius;
  }


  const updateTrail = () => {
    const player = playerRef.current;
    const now = Date.now();

    // Add new trail point if player moved
    if (player.vx !== 0 || player.vy !== 0 || trailRef.current.length === 0) {
         if (trailRef.current.length === 0 || 
            (trailRef.current[trailRef.current.length - 1].x !== player.x ||
             trailRef.current[trailRef.current.length - 1].y !== player.y)) {
            trailRef.current.push({ x: player.x, y: player.y, creationTime: now, alpha: 1 });
        }
    }
    
    // Limit trail length
    if (trailRef.current.length > TRAIL_MAX_LENGTH) {
      trailRef.current.shift();
    }

    // Update alpha and remove old points
    trailRef.current = trailRef.current.filter(point => {
      const age = now - point.creationTime;
      if (age > TRAIL_DURATION) {
        return false;
      }
      point.alpha = Math.max(0, 1 - (age / TRAIL_DURATION));
      return true;
    });
  };

  const updateGameMode = (deltaTime: number) => {
    modeTimerRef.current -= deltaTime;
    if (modeTimerRef.current <= 0) {
      if (gameModeRef.current === 'LIGHT') {
        gameModeRef.current = 'DARK';
        modeTimerRef.current = DARK_MODE_DURATION;
      } else {
        gameModeRef.current = 'LIGHT';
        modeTimerRef.current = LIGHT_MODE_TOTAL_DURATION;
      }
    }
  };
  
  let lastTimestamp = 0;
  const gameLoop = useCallback((timestamp: number) => {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    updatePlayerPosition();
    updateTrail();
    updateGameMode(deltaTime);

    // Clear canvas
    ctx.fillStyle = gameModeRef.current === 'LIGHT' ? '#181818' : '#000000'; // Darker for light, pure black for dark
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawWalls(ctx);
    drawTrail(ctx);
    drawPlayer(ctx);
    drawDebugInfo(ctx);

    gameAnimationRef.current = requestAnimationFrame(gameLoop);
  }, [resetGame]); // Added resetGame to dependencies, though it's stable

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'r') {
        resetGame();
      }
      updatePlayerVelocity();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key.toLowerCase()] = false;
      updatePlayerVelocity();
    };

    const updatePlayerVelocity = () => {
      const player = playerRef.current;
      player.vx = 0;
      player.vy = 0;

      if (keysPressedRef.current['w'] || keysPressedRef.current['arrowup']) player.vy = -player.speed;
      if (keysPressedRef.current['s'] || keysPressedRef.current['arrowdown']) player.vy = player.speed;
      if (keysPressedRef.current['a'] || keysPressedRef.current['arrowleft']) player.vx = -player.speed;
      if (keysPressedRef.current['d'] || keysPressedRef.current['arrowright']) player.vx = player.speed;

      // Normalize diagonal movement
      if (player.vx !== 0 && player.vy !== 0) {
        player.vx /= Math.sqrt(2);
        player.vy /= Math.sqrt(2);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    resetGame(); // Initialize game state
    gameAnimationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (gameAnimationRef.current) {
        cancelAnimationFrame(gameAnimationRef.current);
      }
      lastTimestamp = 0; // Reset lastTimestamp for next mount if any
    };
  }, [gameLoop, resetGame]);

  return (
    <div className="border-2 border-primary shadow-2xl shadow-primary/30 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block"
      />
    </div>
  );
};

export default EchoMazeGame;
