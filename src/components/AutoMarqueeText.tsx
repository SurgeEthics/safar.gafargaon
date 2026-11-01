import React, { useState, useEffect, useRef } from 'react';

interface AutoMarqueeTextProps {
  text: string;
  className?: string;
  speed?: number; // pixels per second
  pauseAtEndMs?: number; // pause after full text has scrolled into view (default 1500ms / 1.5s)
  initialPauseMs?: number; // pause before starting scroll (default 1200ms)
}

/**
 * AutoMarqueeText:
 * Detects whether the text overflows its container.
 * If overflowing:
 * 1. Pauses at start so the reader sees the initial content.
 * 2. Smoothly scrolls right-to-left until the entire text has been revealed.
 * 3. Pauses for exactly 1.5 seconds (or pauseAtEndMs) once fully shown.
 * 4. Smoothly returns to start and repeats the process.
 * If not overflowing:
 * Displays cleanly and statically without any jitter.
 */
export const AutoMarqueeText: React.FC<AutoMarqueeTextProps> = ({
  text,
  className = '',
  speed = 34,
  pauseAtEndMs = 1500,
  initialPauseMs = 1200,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const [offset, setOffset] = useState<number>(0);
  const [transitionStyle, setTransitionStyle] = useState<string>('none');

  useEffect(() => {
    let isCancelled = false;
    let stepTimer: any = null;

    const clearTimers = () => {
      if (stepTimer) {
        clearTimeout(stepTimer);
        stepTimer = null;
      }
    };

    const runCycle = (maxScroll: number) => {
      if (isCancelled) return;

      if (maxScroll <= 4) {
        setOffset(0);
        setTransitionStyle('none');
        return;
      }

      // Step 1: Snap to start (offset 0) with no animation
      setTransitionStyle('none');
      setOffset(0);

      // Step 2: Pause at start so user can read the beginning
      stepTimer = setTimeout(() => {
        if (isCancelled) return;

        // Step 3: Smoothly scroll right-to-left until full text is revealed
        const durationSec = Math.max(2.2, maxScroll / speed);
        setTransitionStyle(`transform ${durationSec}s linear`);
        setOffset(-maxScroll);

        // Step 4: After reaching the end, wait 1.5 seconds (pauseAtEndMs)
        stepTimer = setTimeout(() => {
          if (isCancelled) return;

          // Step 5: Smoothly glide back to start
          setTransitionStyle('transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)');
          setOffset(0);

          // Step 6: Rest briefly at start before next iteration
          stepTimer = setTimeout(() => {
            if (isCancelled) return;
            runCycle(maxScroll);
          }, 650 + 600);

        }, durationSec * 1000 + pauseAtEndMs);

      }, initialPauseMs);
    };

    const measureAndRun = () => {
      clearTimers();
      if (!containerRef.current || !contentRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      const contentWidth = contentRef.current.scrollWidth;

      if (containerWidth === 0) {
        // Modal might still be rendering or animating in; check back shortly
        stepTimer = setTimeout(measureAndRun, 80);
        return;
      }

      const maxScroll = Math.max(0, contentWidth - containerWidth);
      runCycle(maxScroll);
    };

    // Initial check (slight delay to let modal transition settle)
    const initialTimer = setTimeout(measureAndRun, 60);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        measureAndRun();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      isCancelled = true;
      clearTimeout(initialTimer);
      clearTimers();
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [text, speed, pauseAtEndMs, initialPauseMs]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden w-full whitespace-nowrap block select-none pointer-events-auto"
      title={text}
    >
      <span
        ref={contentRef}
        className={`inline-block whitespace-nowrap will-change-transform ${className}`}
        style={{
          transform: `translateX(${offset}px)`,
          transition: transitionStyle,
        }}
      >
        {text}
      </span>
    </div>
  );
};
