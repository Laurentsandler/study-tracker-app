'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, Volume2, VolumeX, SkipForward } from 'lucide-react';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

interface TimerSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  soundEnabled: boolean;
}

interface TimerState {
  mode: TimerMode;
  timeLeft: number;
  isRunning: boolean;
  completedSessions: number;
  lastUpdate: number;
  assignmentTitle?: string;
}

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true,
};

const STORAGE_KEY_SETTINGS = 'pomodoroSettings';
const STORAGE_KEY_STATE = 'pomodoroState';

interface PomodoroTimerProps {
  onSessionComplete?: (mode: TimerMode, duration: number) => void;
  assignmentTitle?: string;
  compact?: boolean;
}

export default function PomodoroTimer({ 
  onSessionComplete, 
  assignmentTitle,
  compact = false 
}: PomodoroTimerProps) {
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(DEFAULT_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleU8aTqLP5L+eSix4o9TswoZXMVSJvebMmWxBPG2byNu0h1s2S3yx1+q+jmI4R3qk0ua6j2Q0Rnqkz+S5jmU0RXqlzuS5jmYzRXumzeO4jmYzRnunzOK3jmczR3uoy+G2jmgySHyoyt+0jGkxSX2px961i2owSX6qx9yzimswSn+rxtyyi2owSoCsxdqximsxS4GtxNmximsxS4Kuw9eviWwyTIOvwtWtiG0yTYSwwdSsh20zToaxv9KqhW40T4eyv9CohG81UIizvc6mg3A2UYm0vMykg3E3Uoq1u8qjgnI3U4u2usihgXM4VIy3uMafgHQ5VY24t8SdgHQ6Vo65tcKbfnU7V4+6s8CZfXY8WJC7sr6Xe3c9WZG8sLyVeng+WpK9rrmTd3k/W5O+rbeSdno/XJS/q7WQdXpAXZXAqbOOdHtBXpbBp7GMc3xCX5fCpq+Kcn1DYJjDpKyIcX5EYZnEoqqGcH9FYprFoKiEb4BGY5vGnqaCboFHZJzHnKSAbIJIZZ3Im6J+a4NJZp7JmZ98aoRKZ5/Kl516aYVLaKDLlZt4aIZMaaDMk5l2Z4dNaqHNkZd0ZohOa6LNj5VyZYlPbKPOjZNwZIpQbaTPi5FuY4tRbqXQiY9sYoxSb6bRh41qYY1TcKfShItpYI5UcajTgolnX49VcqnUgIdlXpBWc6rVfoVjXZFXdKvWfINhXJJYdazXen9fW5NZdq3Yd31dWpRadq7Zdnta');
  }, []);

  // Load saved state on mount - handles persistence across navigation
  useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
    const savedState = localStorage.getItem(STORAGE_KEY_STATE);

    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        setTempSettings(parsed);
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }

    if (savedState) {
      try {
        const state: TimerState = JSON.parse(savedState);
        const now = Date.now();
        const elapsed = Math.floor((now - state.lastUpdate) / 1000);
        
        // If timer was running, calculate actual time remaining
        if (state.isRunning && state.timeLeft > 0) {
          const newTimeLeft = Math.max(0, state.timeLeft - elapsed);
          setTimeLeft(newTimeLeft);
          setIsRunning(newTimeLeft > 0);
        } else {
          setTimeLeft(state.timeLeft);
          setIsRunning(false);
        }
        
        setMode(state.mode);
        setCompletedSessions(state.completedSessions);
      } catch (e) {
        console.error('Error loading timer state:', e);
      }
    }
    
    setIsInitialized(true);
  }, []);

  // Persist state whenever it changes
  useEffect(() => {
    if (!isInitialized) return;
    
    const state: TimerState = {
      mode,
      timeLeft,
      isRunning,
      completedSessions,
      lastUpdate: Date.now(),
      assignmentTitle,
    };
    localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
  }, [mode, timeLeft, isRunning, completedSessions, assignmentTitle, isInitialized]);

  // Get duration based on mode
  const getDuration = useCallback((timerMode: TimerMode) => {
    switch (timerMode) {
      case 'work': return settings.workDuration * 60;
      case 'shortBreak': return settings.shortBreakDuration * 60;
      case 'longBreak': return settings.longBreakDuration * 60;
    }
  }, [settings]);

  // Play notification sound
  const playSound = useCallback(() => {
    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [settings.soundEnabled]);

  // Handle timer completion
  const handleTimerComplete = useCallback(() => {
    playSound();
    
    const duration = getDuration(mode);
    onSessionComplete?.(mode, duration / 60);

    if (mode === 'work') {
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);
      
      if (newCompletedSessions % settings.sessionsBeforeLongBreak === 0) {
        setMode('longBreak');
        setTimeLeft(settings.longBreakDuration * 60);
        setIsRunning(settings.autoStartBreaks);
      } else {
        setMode('shortBreak');
        setTimeLeft(settings.shortBreakDuration * 60);
        setIsRunning(settings.autoStartBreaks);
      }
    } else {
      setMode('work');
      setTimeLeft(settings.workDuration * 60);
      setIsRunning(settings.autoStartWork);
    }
  }, [mode, completedSessions, settings, playSound, getDuration, onSessionComplete]);

  // Timer countdown
  useEffect(() => {
    if (!isInitialized) return;
    
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, handleTimerComplete, isInitialized]);

  // Save settings
  const saveSettings = () => {
    setSettings(tempSettings);
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(tempSettings));
    setShowSettings(false);
    if (!isRunning) {
      const newDuration = tempSettings[`${mode}Duration` as keyof typeof tempSettings] as number;
      setTimeLeft(newDuration * 60);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progress = ((getDuration(mode) - timeLeft) / getDuration(mode)) * 100;

  // Reset timer
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getDuration(mode));
  };

  // Skip to next phase
  const skipPhase = () => {
    if (mode === 'work') {
      const nextSession = completedSessions + 1;
      if (nextSession % settings.sessionsBeforeLongBreak === 0) {
        setMode('longBreak');
        setTimeLeft(settings.longBreakDuration * 60);
      } else {
        setMode('shortBreak');
        setTimeLeft(settings.shortBreakDuration * 60);
      }
    } else {
      setMode('work');
      setTimeLeft(settings.workDuration * 60);
    }
    setIsRunning(false);
  };

  // Mode config - Neo-Brutalism colors
  const modeConfig = {
    work: { color: 'text-rose-700', bgColor: 'bg-rose-400', lightBg: 'bg-rose-100', borderColor: 'border-black', label: 'FOCUS' },
    shortBreak: { color: 'text-emerald-700', bgColor: 'bg-emerald-400', lightBg: 'bg-emerald-100', borderColor: 'border-black', label: 'BREAK' },
    longBreak: { color: 'text-cyan-700', bgColor: 'bg-cyan-400', lightBg: 'bg-cyan-100', borderColor: 'border-black', label: 'LONG BREAK' },
  };

  const currentConfig = modeConfig[mode];

  // Compact view for dashboard sidebar
  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-4 border-3 border-black shadow-[4px_4px_0_0_#000] ${currentConfig.lightBg}`}>
        <div className={`w-16 h-16 flex items-center justify-center ${currentConfig.bgColor} border-3 border-black font-black text-lg`}>
          {formatTime(timeLeft)}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-black ${currentConfig.color}`}>{currentConfig.label}</p>
          {assignmentTitle && (
            <p className="text-xs text-gray-700 font-medium truncate">{assignmentTitle}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`p-2 ${currentConfig.bgColor} border-3 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all`}
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={resetTimer}
            className="p-2 bg-gray-200 border-3 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-3 border-black shadow-[4px_4px_0_0_#000] overflow-hidden ${currentConfig.lightBg}`}>
      {/* Header */}
      <div className={`px-4 py-3 ${currentConfig.bgColor} border-b-3 border-black flex items-center justify-between`}>
        <span className="font-black text-sm tracking-wide">{currentConfig.label}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
            className="p-1.5 border-2 border-black bg-white hover:bg-gray-100 transition-colors"
          >
            {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          <button
            onClick={() => { setTempSettings(settings); setShowSettings(!showSettings); }}
            className="p-1.5 border-2 border-black bg-white hover:bg-gray-100 transition-colors"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="p-4 bg-white border-b-3 border-black">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Focus</label>
              <input type="number" value={tempSettings.workDuration}
                onChange={(e) => setTempSettings(s => ({ ...s, workDuration: parseInt(e.target.value) || 25 }))}
                className="w-full px-2 py-2 border-3 border-black text-center font-bold focus:outline-none focus:ring-2 focus:ring-yellow-300" min={1} max={90} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Break</label>
              <input type="number" value={tempSettings.shortBreakDuration}
                onChange={(e) => setTempSettings(s => ({ ...s, shortBreakDuration: parseInt(e.target.value) || 5 }))}
                className="w-full px-2 py-2 border-3 border-black text-center font-bold focus:outline-none focus:ring-2 focus:ring-yellow-300" min={1} max={30} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Long</label>
              <input type="number" value={tempSettings.longBreakDuration}
                onChange={(e) => setTempSettings(s => ({ ...s, longBreakDuration: parseInt(e.target.value) || 15 }))}
                className="w-full px-2 py-2 border-3 border-black text-center font-bold focus:outline-none focus:ring-2 focus:ring-yellow-300" min={1} max={60} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowSettings(false)} className="flex-1 px-3 py-2 bg-gray-200 font-bold border-3 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all">Cancel</button>
            <button onClick={saveSettings} className={`flex-1 px-3 py-2 font-bold border-3 border-black shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#000] transition-all ${currentConfig.bgColor}`}>Save</button>
          </div>
        </div>
      )}

      {/* Timer */}
      <div className="p-6">
        {assignmentTitle && (
          <p className="text-center text-sm text-gray-700 font-bold mb-3 truncate px-2">
            {assignmentTitle}
          </p>
        )}
        
        {/* Chunky Timer Display */}
        <div className="relative w-36 h-36 mx-auto mb-4">
          <svg className="w-full h-full -rotate-90">
            <circle cx="72" cy="72" r="66" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-300" />
            <circle cx="72" cy="72" r="66" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="square"
              strokeDasharray={`${2 * Math.PI * 66}`}
              strokeDashoffset={`${2 * Math.PI * 66 * (1 - progress / 100)}`}
              className={`${currentConfig.color} transition-all duration-1000`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-black ${currentConfig.color}`}>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-3">
          <button onClick={resetTimer} className="p-3 bg-gray-200 border-3 border-black shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] transition-all">
            <RotateCcw size={20} />
          </button>
          <button onClick={() => setIsRunning(!isRunning)}
            className={`p-4 border-3 border-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all ${currentConfig.bgColor}`}>
            {isRunning ? <Pause size={28} /> : <Play size={28} />}
          </button>
          <button onClick={skipPhase} className="p-3 bg-gray-200 border-3 border-black shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] transition-all" title="Skip to next phase">
            <SkipForward size={20} />
          </button>
        </div>

        {/* Session dots */}
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: settings.sessionsBeforeLongBreak }).map((_, i) => (
            <div key={i} className={`w-3 h-3 border-2 border-black ${i < (completedSessions % settings.sessionsBeforeLongBreak) ? currentConfig.bgColor : 'bg-gray-200'}`} />
          ))}
        </div>
        <p className="text-center text-xs font-bold text-gray-600 mt-2">{completedSessions} sessions today</p>
      </div>
    </div>
  );
}
