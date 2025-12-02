// 轨道索引 (0-3)
export type LaneIndex = 0 | 1 | 2 | 3;

// 判定结果
export type HitResult = 'PERFECT' | 'GOOD' | 'MISS' | null;

// 音符对象
export interface Note {
  id: string;
  lane: LaneIndex;
  y: number; // 当前Y轴位置
  speed: number; // 下落速度
  color: string;
  isHit: boolean; // 是否已被击中
  consumed: boolean; // 是否已处理完（用于移除）
  timestamp: number; // 生成时间
}

// 粒子对象
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; //以此值为基础递减
  maxLife: number;
  color: string;
  size: number;
}

// 涟漪效果
export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

// 游戏状态
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}