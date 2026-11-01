import React, { useRef, useEffect, useState, useId } from 'react';

interface PauseMarqueeTextProps {
  text: string;
  className?: string;
  pauseSec?: number; // pause duration (default: 1.5s as specified)
  speedSec?: number; // base speed
}

export const PauseMarqueeText: React.FC<PauseMarqueeTextProps> = ({
  text,
  className = '',
  pauseSec = 1.5,
  speedSec
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [overflowDistance, setOverflowDistance] = useState(0);
  const uniqueId = useId().replace(/:/g, '_');

  useEffect(() => {
    const el = containerRef.current;
    const txt = textRef.current;
    if (!el || !txt) return;

    const measure = () => {
      const containerWidth = el.clientWidth;
      const textWidth = txt.scrollWidth;
      if (textWidth > containerWidth + 2) {
        setIsOverflowing(true);
        setOverflowDistance(textWidth - containerWidth);
      } else {
        setIsOverflowing(false);
        setOverflowDistance(0);
      }
    };

    // Run measurement on mount, next frame, and on resize
    measure();
    const frameId = requestAnimationFrame(measure);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        measure();
      });
      resizeObserver.observe(el);
      resizeObserver.observe(txt);
    }

    window.addEventListener('resize', measure);

    return () => {
      cancelAnimationFrame(frameId);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [text]);

  // Dynamic timing calculation for realistic & readable marquee
  // 1. Pause at start for exactly 1.5s
  // 2. Scroll from right to left at comfortable reading speed (~30px/sec)
  // 3. Pause at the end for exactly 1.5s so user reads the end
  // 4. Return smoothly to the left/beginning
  // 5. Infinite loop repeats with 1.5s start pause
  const pauseStart = pauseSec; // 1.5s
  const pauseEnd = pauseSec;   // 1.5s
  const scrollTime = speedSec || Math.max(2.5, Math.min(6.5, overflowDistance / 30));
  const returnTime = Math.max(1.2, Math.min(3.0, overflowDistance / 60));
  const totalCycle = pauseStart + scrollTime + pauseEnd + returnTime;

  const p1 = ((pauseStart / totalCycle) * 100).toFixed(2);
  const p2 = (((pauseStart + scrollTime) / totalCycle) * 100).toFixed(2);
  const p3 = (((pauseStart + scrollTime + pauseEnd) / totalCycle) * 100).toFixed(2);

  const keyframeName = `pause_marquee_${uniqueId}`;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden whitespace-nowrap min-w-0 ${className}`}
      title={text}
    >
      {isOverflowing && (
        <style>{`
          @keyframes ${keyframeName} {
            0% { transform: translateX(0); }
            ${p1}% { transform: translateX(0); }
            ${p2}% { transform: translateX(-${overflowDistance + 10}px); }
            ${p3}% { transform: translateX(-${overflowDistance + 10}px); }
            100% { transform: translateX(0); }
          }
        `}</style>
      )}

      <span
        ref={textRef}
        style={
          isOverflowing
            ? {
                display: 'inline-block',
                animation: `${keyframeName} ${totalCycle.toFixed(2)}s cubic-bezier(0.42, 0, 0.58, 1) infinite`,
                willChange: 'transform'
              }
            : { display: 'inline-block' }
        }
      >
        {text}
      </span>
    </div>
  );
};
