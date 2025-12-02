import React, { useState, useCallback, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState } from './types';
import { audio } from './services/AudioEngine';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // 监听 PWA 安装事件
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const startGame = () => {
    audio.init(); // 确保音频上下文已创建
    setGameState(GameState.PLAYING);
    setScore(0);
    setCombo(0);
  };

  const handleScoreUpdate = useCallback((newScore: number, newCombo: number) => {
    // 限制 React 状态更新频率，或者只更新必要部分
    // 在这个简单示例中，直接更新是可以接受的，但在极高频下可能需要优化
    setScore(newScore);
    setCombo(newCombo);
  }, []);

  const handleGameOver = (finalScore: number) => {
    if (finalScore > highScore) {
      setHighScore(finalScore);
    }
    setGameState(GameState.GAME_OVER);
  };

  // 随时可以退回菜单
  const stopGame = () => {
    setGameState(GameState.MENU);
    if (score > highScore) setHighScore(score);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-sans">
      {/* 游戏层 (Canvas) */}
      <div className="absolute inset-0 z-0">
        <GameCanvas 
          gameState={gameState} 
          onScoreUpdate={handleScoreUpdate} 
          onGameOver={handleGameOver}
        />
      </div>

      {/* 游戏内 HUD (仅在游戏进行时显示) */}
      {gameState === GameState.PLAYING && (
        <div className="absolute top-8 left-0 w-full flex flex-col items-center z-10 pointer-events-none">
          <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
            {score}
          </div>
          {combo > 2 && (
            <div className="mt-2 text-xl font-bold text-yellow-300 animate-pulse">
              {combo} COMBO
            </div>
          )}
          <div className="absolute top-4 right-6 text-sm text-gray-400">
            <button 
              className="pointer-events-auto border border-white/20 px-3 py-1 rounded hover:bg-white/10"
              onClick={stopGame}
            >
              退出
            </button>
          </div>
        </div>
      )}

      {/* 主菜单 */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <h1 className="text-6xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 tracking-tighter drop-shadow-lg">
            光谱共振
          </h1>
          <p className="text-gray-400 mb-12 tracking-widest text-sm uppercase">Spectrum Resonance</p>
          
          <button
            onClick={startGame}
            className="px-12 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-xl font-bold shadow-[0_0_20px_rgba(124,58,237,0.5)] hover:scale-105 transition-transform active:scale-95"
          >
            开始游戏
          </button>
          
          {installPrompt && (
            <button
              onClick={handleInstallClick}
              className="mt-6 px-6 py-2 border border-white/30 rounded-full text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              安装应用到手机
            </button>
          )}

          {highScore > 0 && (
            <div className="mt-8 text-gray-300">
              最高分: <span className="text-white font-bold">{highScore}</span>
            </div>
          )}
          
          <div className="absolute bottom-8 text-xs text-gray-600 text-center max-w-md px-4">
            玩法：当流动的光带到达底部圆环时，点击对应区域。
            <br/>戴上耳机体验更佳。
          </div>
        </div>
      )}
    </div>
  );
};

export default App;