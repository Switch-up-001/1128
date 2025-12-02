import React, { useEffect, useRef, useCallback } from 'react';
import { GameState, HitResult, LaneIndex, Note, Particle, Ripple } from '../types';
import { 
  LANE_COUNT, 
  LANE_COLORS, 
  HIT_ZONE_Y_RATIO, 
  BASE_SPEED, 
  SPAWN_RATE_MS, 
  HIT_WINDOW_PERFECT, 
  HIT_WINDOW_GOOD,
  GRAVITY
} from '../constants';
import { audio } from '../services/AudioEngine';

interface GameCanvasProps {
  gameState: GameState;
  onScoreUpdate: (score: number, combo: number) => void;
  onGameOver: (finalScore: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, onScoreUpdate, onGameOver }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  
  // 游戏实体 Refs (使用Ref而不是State以避免React渲染循环导致的卡顿)
  const notesRef = useRef<Note[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const lastSpawnTimeRef = useRef(0);
  const startTimeRef = useRef(0);
  const touchPointsRef = useRef<Map<number, LaneIndex>>(new Map()); // 触摸ID -> 轨道

  // 生成音符逻辑
  const spawnNote = useCallback((timestamp: number) => {
    if (timestamp - lastSpawnTimeRef.current > SPAWN_RATE_MS - (comboRef.current * 2)) {
      // 随着Combo增加，生成速度微调加快（限制最大值）
      const lane = Math.floor(Math.random() * LANE_COUNT) as LaneIndex;
      const id = `${timestamp}-${Math.random()}`;
      
      const newNote: Note = {
        id,
        lane,
        y: -100, // 从屏幕上方开始
        speed: BASE_SPEED + (comboRef.current * 0.05), // 速度随连击增加
        color: LANE_COLORS[lane],
        isHit: false,
        consumed: false,
        timestamp
      };
      
      notesRef.current.push(newNote);
      lastSpawnTimeRef.current = timestamp;
    }
  }, []);

  // 创建粒子爆炸效果
  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 1.0,
        color,
        size: Math.random() * 3 + 2
      });
    }
  };

  // 创建涟漪效果
  const createRipple = (x: number, y: number, color: string) => {
    ripplesRef.current.push({
      x,
      y,
      radius: 20,
      maxRadius: 100,
      alpha: 1.0,
      color
    });
  };

  // 处理输入判定
  const handleInput = useCallback((lane: LaneIndex) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const hitY = canvas.height * HIT_ZONE_Y_RATIO;
    let hitSomething = false;

    // 查找该轨道上最近的未击中音符
    // 我们倒序遍历，优先检测最接近底部的音符
    for (let i = 0; i < notesRef.current.length; i++) {
      const note = notesRef.current[i];
      if (note.lane === lane && !note.isHit && !note.consumed) {
        const dist = Math.abs(note.y - hitY);
        
        let result: HitResult = null;
        
        if (dist < HIT_WINDOW_PERFECT) {
          result = 'PERFECT';
        } else if (dist < HIT_WINDOW_GOOD) {
          result = 'GOOD';
        }

        if (result) {
          // 命中逻辑
          note.isHit = true;
          note.consumed = true; // 标记为即将移除
          hitSomething = true;
          
          // 更新分数
          const points = result === 'PERFECT' ? 100 : 50;
          scoreRef.current += points * (1 + Math.floor(comboRef.current / 10));
          comboRef.current += 1;
          
          // 视觉反馈
          const laneWidth = canvas.width / LANE_COUNT;
          const x = lane * laneWidth + laneWidth / 2;
          createExplosion(x, hitY, note.color);
          createRipple(x, hitY, note.color);
          
          // 音频反馈
          audio.playHitSound(lane);
          
          onScoreUpdate(scoreRef.current, comboRef.current);
          break; // 一次点击只消除一个音符
        }
      }
    }

    if (!hitSomething) {
      // 空击 (可选：扣除连击或不做惩罚，为了体验更好暂时不重置连击)
      // comboRef.current = 0;
      // onScoreUpdate(scoreRef.current, comboRef.current);
    }
  }, [onScoreUpdate]);

  // 游戏主循环
  const update = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (startTimeRef.current === 0) startTimeRef.current = time;

    // 1. 清空画布 & 绘制背景
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 动态星云背景 (简单的渐变动画)
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.height
    );
    const offset = Math.sin(time / 2000) * 20;
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. 绘制轨道线
    const laneWidth = canvas.width / LANE_COUNT;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 1; i < LANE_COUNT; i++) {
      ctx.beginPath();
      ctx.moveTo(i * laneWidth, 0);
      ctx.lineTo(i * laneWidth, canvas.height);
      ctx.stroke();
    }

    // 3. 绘制判定环 (Resonance Rings)
    const hitY = canvas.height * HIT_ZONE_Y_RATIO;
    for (let i = 0; i < LANE_COUNT; i++) {
      const centerX = i * laneWidth + laneWidth / 2;
      const color = LANE_COLORS[i as LaneIndex];
      
      ctx.beginPath();
      ctx.arc(centerX, hitY, 30, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.stroke();
      
      // 内部发光点
      ctx.beginPath();
      ctx.arc(centerX, hitY, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
    }

    if (gameState === GameState.PLAYING) {
      // 4. 生成音符
      spawnNote(time);

      // 5. 更新和绘制音符
      notesRef.current.forEach(note => {
        if (note.consumed) return;
        
        note.y += note.speed;

        // 绘制音符 (发光的圆角矩形)
        const x = note.lane * laneWidth + laneWidth / 2 - 25; // 居中
        const w = 50;
        const h = 20;
        
        ctx.fillStyle = note.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = note.color;
        
        // 简单的拖尾效果
        ctx.beginPath();
        ctx.roundRect(x, note.y, w, h, 10);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Miss 判定 (超出屏幕底部)
        if (note.y > canvas.height + 50) {
          note.consumed = true;
          // 重置连击
          if (comboRef.current > 0) {
            comboRef.current = 0;
            onScoreUpdate(scoreRef.current, 0);
          }
        }
      });

      // 清理已消费的音符
      notesRef.current = notesRef.current.filter(n => !n.consumed);

      // 6. 更新和绘制粒子
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += GRAVITY; // 重力
        p.life -= 0.02;

        if (p.life > 0) {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
      ctx.globalAlpha = 1.0;

      // 7. 更新和绘制涟漪
      ripplesRef.current.forEach(r => {
        r.radius += 2;
        r.alpha -= 0.03;
        
        if (r.alpha > 0) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.strokeStyle = r.color;
          ctx.lineWidth = 3;
          ctx.globalAlpha = r.alpha;
          ctx.stroke();
        }
      });
      ripplesRef.current = ripplesRef.current.filter(r => r.alpha > 0);
      ctx.globalAlpha = 1.0;
    }

    requestRef.current = requestAnimationFrame(update);
  }, [gameState, onScoreUpdate, spawnNote]);

  // 处理触摸/点击事件
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (gameState !== GameState.PLAYING) return;
    
    // 恢复AudioContext (防止自动播放策略拦截)
    audio.resume();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const laneWidth = canvas.width / LANE_COUNT;

    // 统一处理 Touch 和 Mouse 事件
    const points: {id: number, x: number, y: number}[] = [];

    if ('touches' in e) {
      // TouchEvent
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        points.push({ id: t.identifier, x: t.clientX - rect.left, y: t.clientY - rect.top });
      }
    } else {
      // MouseEvent
      points.push({ id: 1, x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top });
    }

    points.forEach(p => {
      // 检查是否点击在判定区附近 (Y轴容错率很大，主要看X轴轨道)
      if (p.y > canvas.height * 0.7) { 
        const lane = Math.floor(p.x / laneWidth) as LaneIndex;
        if (lane >= 0 && lane < LANE_COUNT) {
          touchPointsRef.current.set(p.id, lane);
          handleInput(lane);
        }
      }
    });
  };

  // 尺寸调整
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 启动/停止循环
  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);

  // 重置游戏逻辑
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      scoreRef.current = 0;
      comboRef.current = 0;
      notesRef.current = [];
      particlesRef.current = [];
      ripplesRef.current = [];
      onScoreUpdate(0, 0);
      audio.startBackgroundAmbience();
    } else {
      audio.stopBackgroundAmbience();
    }
  }, [gameState, onScoreUpdate]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full touch-none"
      onTouchStart={handleTouchStart}
      onMouseDown={handleTouchStart}
    />
  );
};

export default GameCanvas;
