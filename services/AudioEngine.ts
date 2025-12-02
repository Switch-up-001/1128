import { NOTE_FREQUENCIES } from "../constants";
import { LaneIndex } from "../types";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private bgOscillators: OscillatorNode[] = [];
  private isInitialized = false;

  // 初始化音频上下文 (必须在用户交互后调用)
  init() {
    if (this.isInitialized) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // 主音量控制
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.6;
    this.gainNode.connect(this.ctx.destination);
    
    this.isInitialized = true;
  }

  // 播放打击音效
  playHitSound(lane: LaneIndex) {
    if (!this.ctx || !this.gainNode) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine'; // 正弦波听起来比较纯净
    osc.frequency.setValueAtTime(NOTE_FREQUENCIES[lane], t);
    
    // 音量包络：快速冲击后衰减
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(this.gainNode);

    osc.start(t);
    osc.stop(t + 0.5);
    
    // 增加一层高频泛音增加打击感
    const impactOsc = this.ctx.createOscillator();
    const impactGain = this.ctx.createGain();
    impactOsc.type = 'triangle';
    impactOsc.frequency.setValueAtTime(NOTE_FREQUENCIES[lane] * 2, t);
    impactGain.gain.setValueAtTime(0.2, t);
    impactGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    
    impactOsc.connect(impactGain);
    impactGain.connect(this.gainNode);
    impactOsc.start(t);
    impactOsc.stop(t + 0.1);
  }

  // 播放背景氛围音 (Pad)
  startBackgroundAmbience() {
    if (!this.ctx || !this.gainNode) return;

    this.stopBackgroundAmbience();

    // 创建两个低频振荡器产生类似星云的嗡嗡声
    const freqs = [65.41, 98.00]; // C2, G2
    
    freqs.forEach(f => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = f;
      
      // 缓慢的音量波动 (LFO 效果)
      gain.gain.value = 0.1;
      
      osc.connect(gain);
      gain.connect(this.gainNode!);
      osc.start();
      this.bgOscillators.push(osc);
    });
  }

  stopBackgroundAmbience() {
    this.bgOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {
        // 忽略已停止的错误
      }
    });
    this.bgOscillators = [];
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}

export const audio = new AudioEngine();