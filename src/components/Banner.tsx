'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

const BANNER_STORAGE_KEY = 'studytracker_banner_dismissed';

export default function Banner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was dismissed and if it's still within the expiration period
    try {
      const dismissedData = localStorage.getItem(BANNER_STORAGE_KEY);
      
      if (dismissedData) {
        try {
          const { dismissedAt } = JSON.parse(dismissedData);
          const dismissedDate = new Date(dismissedAt);
          const now = new Date();
          
          // Calculate time difference in hours
          const hoursDiff = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60);
          
          // Show banner again after 24 hours
          if (hoursDiff < 24) {
            setIsVisible(false);
            return;
          }
        } catch (e) {
          // If parsing fails, clear the storage and show banner
          localStorage.removeItem(BANNER_STORAGE_KEY);
        }
      }
      
      // Show banner if not dismissed or expired
      setIsVisible(true);
    } catch (e) {
      // Handle case where localStorage is not available (SSR or disabled)
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    try {
      const dismissalData = {
        dismissedAt: new Date().toISOString(),
      };
      localStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(dismissalData));
    } catch (e) {
      // Handle localStorage not available
      console.warn('Unable to save banner dismissal:', e);
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-violet-300 to-pink-300 border-b-4 border-black">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-white border-3 border-black rounded-lg shrink-0 shadow-[2px_2px_0_0_#000]">
              <Sparkles className="h-5 w-5 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base font-bold text-black">
                <span className="hidden sm:inline">Welcome to StudyTracker! </span>
                Track your assignments, generate AI-powered study materials, and stay on top of your studies with smart scheduling.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 bg-white border-3 border-black rounded-lg hover:bg-gray-100 transition-colors shrink-0 shadow-[2px_2px_0_0_#000]"
            aria-label="Dismiss banner"
          >
            <X className="h-5 w-5 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
}
