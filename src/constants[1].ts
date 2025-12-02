import { LaneIndex } from "./types";

// 轨道配置
export const LANE_COUNT = 4;
export const LANE_COLORS: Record<LaneIndex, string> = {
  0: '#00f2ff', // 霓虹蓝
  1: '#bc13fe', // 电磁紫
  2: '#ff0055', // 激光粉
  3: '#00ff9d', // 赛博绿
};

// 判定区域
export const HIT_ZONE_Y_RATIO = 0.85; // 判定线位于屏幕高度的 85% 处
export const HIT_WINDOW_PERFECT = 50; // 像素距离
export const HIT_WINDOW_GOOD = 100;

// 游戏节奏
export const SPAWN_RATE_MS = 600; // 音符生成基础间隔
export const BASE_SPEED = 5; // 基础下落速度
export const GRAVITY = 0.2; // 粒子重力 (用于视觉效果)

// 音频频率 (五声音阶: C minor pentatonic)
export const NOTE_FREQUENCIES: Record<LaneIndex, number> = {
  0: 261.63, // C4
  1: 311.13, // Eb4
  2: 392.00, // G4
  3: 523.25, // C5
};