'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, Volume2, VolumeX, Coffee, BookOpen, Target } from 'lucide-react';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

interface TimerSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  soundEnabled: boolean;
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
  const [timeLeft, setTimeLeft] = useState(settings.workDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleU8aTqLP5L+eSix4o9TswoZXMVSJvebMmWxBPG2byNu0h1s2S3yx1+q+jmI4R3qk0ua6j2Q0Rnqkz+S5jmU0RXqlzuS5jmYzRXumzeO4jmYzRnunzOK3jmczR3uoy+G2jmgySHyoyt+0jGkxSX2px961i2owSX6qx9yzimswSn+rxtyyi2owSoCsxdqximsxS4GtxNmximsxS4Kuw9eviWwyTIOvwtWtiG0yTYSwwdSsh20zToaxv9KqhW40T4eyv9CohG81UIizvc6mg3A2UYm0vMykg3E3Uoq1u8qjgnI3U4u2usihgXM4VIy3uMafgHQ5VY24t8SdgHQ6Vo65tcKbfnU7V4+6s8CZfXY8WJC7sr6Xe3c9WZG8sLyVeng+WpK9rrmTd3k/W5O+rbeSdno/XJS/q7WQdXpAXZXAqbOOdHtBXpbBp7GMc3xCX5fCpq+Kcn1DYJjDpKyIcX5EYZnEoqqGcH9FYprFoKiEb4BGY5vGnqaCboFHZJzHnKSAbIJIZZ3Im6J+a4NJZp7JmZ98aoRKZ5/Kl516aYVLaKDLlZt4aIZMaaDMk5l2Z4dNaqHNkZd0ZohOa6LNj5VyZYlPbKPOjZNwZIpQbaTPi5FuY4tRbqXQiY9sYoxSb6bRh41qYY1TcKfShItpYI5UcajTgolnX49VcqnUgIdlXpBWc6rVfoVjXZFXdKvWfINhXJJYdazXen9fW5NZdq3Yd31dWpRadq7Zdnta');
  }, []);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('pomodoroSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
      setTempSettings(parsed);
      setTimeLeft(parsed.workDuration * 60);
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = () => {
    setSettings(tempSettings);
    localStorage.setItem('pomodoroSettings', JSON.stringify(tempSettings));
    setShowSettings(false);
    // Reset timer with new settings
    setTimeLeft(tempSettings[`${mode}Duration`] * 60);
    setIsRunning(false);
  };

  // Get duration based on mode
  const getDuration = useCallback((timerMode: TimerMode) => {
    switch (timerMode) {
      case 'work':
        return settings.workDuration * 60;
      case 'shortBreak':
        return settings.shortBreakDuration * 60;
      case 'longBreak':
        return settings.longBreakDuration * 60;
    }
  }, [settings]);

  // Play notification sound
  const playSound = useCallback(() => {
    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Ignore audio play errors
      });
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
      
      // Check if it's time for a long break
      if (newCompletedSessions % settings.sessionsBeforeLongBreak === 0) {
        setMode('longBreak');
        setTimeLeft(settings.longBreakDuration * 60);
        if (settings.autoStartBreaks) setIsRunning(true);
        else setIsRunning(false);
      } else {
        setMode('shortBreak');
        setTimeLeft(settings.shortBreakDuration * 60);
        if (settings.autoStartBreaks) setIsRunning(true);
        else setIsRunning(false);
      }
    } else {
      // Break is over, start work
      setMode('work');
      setTimeLeft(settings.workDuration * 60);
      if (settings.autoStartWork) setIsRunning(true);
      else setIsRunning(false);
    }
  }, [mode, completedSessions, settings, playSound, getDuration, onSessionComplete]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, handleTimerComplete]);

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

  // Switch mode manually
  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(getDuration(newMode));
    setIsRunning(false);
  };

  // Mode colors and icons
  const modeConfig = {
    work: {
      color: 'text-red-500',
      bgColor: 'bg-red-500',
      lightBg: 'bg-red-50',
      borderColor: 'border-red-200',
      label: 'Focus Time',
      icon: BookOpen,
    },
    shortBreak: {
      color: 'text-green-500',
      bgColor: 'bg-green-500',
      lightBg: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'Short Break',
      icon: Coffee,
    },
    longBreak: {
      color: 'text-blue-500',
      bgColor: 'bg-blue-500',
      lightBg: 'bg-blue-50',
      borderColor: 'border-blue-200',
      label: 'Long Break',
      icon: Target,
    },
  };

  const currentConfig = modeConfig[mode];
  const ModeIcon = currentConfig.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${currentConfig.lightBg} ${currentConfig.borderColor}`}>
        <div className="relative">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentConfig.bgColor} text-white font-bold text-sm`}>
            {formatTime(timeLeft)}
          </div>
          {/* Progress ring */}
          <svg className="absolute inset-0 w-12 h-12 -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-white/30"
            />
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${2 * Math.PI * 22}`}
              strokeDashoffset={`${2 * Math.PI * 22 * (1 - progress / 100)}`}
              className="text-white transition-all duration-1000"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className={`text-xs font-medium ${currentConfig.color}`}>{currentConfig.label}</p>
          {assignmentTitle && (
            <p className="text-xs text-gray-600 truncate max-w-[120px]">{assignmentTitle}</p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`p-2 rounded-full ${currentConfig.bgColor} text-white hover:opacity-90`}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={resetTimer}
            className="p-2 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden ${currentConfig.lightBg} ${currentConfig.borderColor}`}>
      {/* Header */}
      <div className={`px-4 py-3 ${currentConfig.bgColor} text-white flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <ModeIcon size={18} />
          <span className="font-medium">{currentConfig.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            title={settings.soundEnabled ? 'Mute' : 'Unmute'}
          >
            {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            onClick={() => {
              setTempSettings(settings);
              setShowSettings(!showSettings);
            }}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-white border-b">
          <h4 className="font-medium text-gray-900 mb-3">Timer Settings</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Work (min)</label>
              <input
                type="number"
                value={tempSettings.workDuration}
                onChange={(e) => setTempSettings(s => ({ ...s, workDuration: parseInt(e.target.value) || 25 }))}
                min={1}
                max={60}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Short Break (min)</label>
              <input
                type="number"
                value={tempSettings.shortBreakDuration}
                onChange={(e) => setTempSettings(s => ({ ...s, shortBreakDuration: parseInt(e.target.value) || 5 }))}
                min={1}
                max={30}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Long Break (min)</label>
              <input
                type="number"
                value={tempSettings.longBreakDuration}
                onChange={(e) => setTempSettings(s => ({ ...s, longBreakDuration: parseInt(e.target.value) || 15 }))}
                min={1}
                max={60}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Sessions until long break</label>
              <input
                type="number"
                value={tempSettings.sessionsBeforeLongBreak}
                onChange={(e) => setTempSettings(s => ({ ...s, sessionsBeforeLongBreak: parseInt(e.target.value) || 4 }))}
                min={1}
                max={10}
                className="w-full px-2 py-1.5 border rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={tempSettings.autoStartBreaks}
                onChange={(e) => setTempSettings(s => ({ ...s, autoStartBreaks: e.target.checked }))}
                className="rounded"
              />
              <span>Auto-start breaks</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={tempSettings.autoStartWork}
                onChange={(e) => setTempSettings(s => ({ ...s, autoStartWork: e.target.checked }))}
                className="rounded"
              />
              <span>Auto-start work sessions</span>
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowSettings(false)}
              className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={saveSettings}
              className={`flex-1 px-3 py-1.5 text-sm text-white rounded-lg ${currentConfig.bgColor}`}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Timer Display */}
      <div className="p-6">
        {assignmentTitle && (
          <p className="text-center text-sm text-gray-600 mb-4">
            Working on: <span className="font-medium">{assignmentTitle}</span>
          </p>
        )}
        
        {/* Circular Timer */}
        <div className="relative w-48 h-48 mx-auto mb-6">
          {/* Background circle */}
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-gray-200"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 88}`}
              strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
              className={`${currentConfig.color} transition-all duration-1000`}
            />
          </svg>
          {/* Timer text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${currentConfig.color}`}>
              {formatTime(timeLeft)}
            </span>
            <span className="text-sm text-gray-500 mt-1">
              Session {completedSessions + 1}
            </span>
          </div>
        </div>

        {/* Mode Buttons */}
        <div className="flex justify-center gap-2 mb-6">
          <button
            onClick={() => switchMode('work')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'work' 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Focus
          </button>
          <button
            onClick={() => switchMode('shortBreak')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'shortBreak' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Short Break
          </button>
          <button
            onClick={() => switchMode('longBreak')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              mode === 'longBreak' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Long Break
          </button>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-3">
          <button
            onClick={resetTimer}
            className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            title="Reset"
          >
            <RotateCcw size={24} />
          </button>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`p-4 rounded-full text-white transition-colors ${currentConfig.bgColor} hover:opacity-90`}
          >
            {isRunning ? <Pause size={32} /> : <Play size={32} />}
          </button>
        </div>

        {/* Session Progress */}
        <div className="mt-6 flex justify-center gap-1">
          {Array.from({ length: settings.sessionsBeforeLongBreak }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                i < completedSessions % settings.sessionsBeforeLongBreak
                  ? currentConfig.bgColor
                  : 'bg-gray-200'
              }`}
              title={`Session ${i + 1}`}
            />
          ))}
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">
          {completedSessions} sessions completed today
        </p>
      </div>
    </div>
  );
}
