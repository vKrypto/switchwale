import { useState } from 'react';
import { motion, type MotionValue } from 'framer-motion';

type AgentCharacterProps = {
  energized: boolean;
  reducedMotion: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  x: MotionValue<number>;
  y: MotionValue<number>;
  scale: MotionValue<number>;
  rotate: MotionValue<number>;
};

const waveKeyframes = { rotate: [0, -25, 5, -20, 0] };
const waveTransition = { duration: 1.1, ease: 'easeInOut' as const };

export default function AgentCharacter({
  energized,
  reducedMotion,
  onHoverStart,
  onHoverEnd,
  x,
  y,
  scale,
  rotate,
}: AgentCharacterProps) {
  const [hasWaved, setHasWaved] = useState(false);

  return (
    <motion.div
      className="fixed top-0 left-0 z-40 h-64 w-64 sm:h-80 sm:w-80 cursor-default select-none"
      style={{ x, y, scale, rotate }}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      aria-hidden="true"
    >
      <motion.svg
        viewBox="0 0 200 240"
        className="w-full h-full"
        animate={reducedMotion ? undefined : { y: [0, -12, 0] }}
        transition={reducedMotion ? undefined : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <defs>
          <linearGradient id="agentBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="agentHead" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#60a5fa" />
            <stop offset="1" stopColor="#2563eb" />
          </linearGradient>
        </defs>

        <ellipse cx="100" cy="222" rx="46" ry="9" fill="#0b1220" opacity="0.12" />

        {/* left (static) arm */}
        <rect x="35" y="122" width="14" height="48" rx="7" fill="url(#agentBody)" />

        {/* torso */}
        <rect x="58" y="112" width="84" height="92" rx="34" fill="url(#agentBody)" />
        <circle cx="100" cy="140" r="14" fill="#93c5fd" opacity="0.35" />

        {/* antenna */}
        <motion.g
          animate={reducedMotion ? undefined : { rotate: [0, 6, 0, -6, 0] }}
          transition={reducedMotion ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '100px 40px' }}
        >
          <line x1="100" y1="40" x2="100" y2="16" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
          <circle cx="100" cy="12" r="6" fill="#facc15" />
        </motion.g>

        {/* head */}
        <circle cx="100" cy="75" r="43" fill="url(#agentHead)" />

        {/* eyes (blink) */}
        <motion.g
          animate={reducedMotion ? undefined : { scaleY: [1, 1, 0.08, 1] }}
          transition={
            reducedMotion
              ? undefined
              : { duration: 4.5, repeat: Infinity, repeatDelay: 1.5, times: [0, 0.88, 0.94, 1], ease: 'easeInOut' }
          }
          style={{ transformOrigin: '100px 76px' }}
        >
          <circle cx="83" cy="76" r="8" fill="white" />
          <circle cx="117" cy="76" r="8" fill="white" />
          <circle cx="84" cy="77" r="4" fill="#0b1220" />
          <circle cx="118" cy="77" r="4" fill="#0b1220" />
        </motion.g>

        {/* smile */}
        <path d="M 88 93 Q 100 102 112 93" stroke="#0b1220" strokeWidth="3.5" fill="none" strokeLinecap="round" />

        {/* right (waving) arm — nested transform avoids SVG transform-origin quirks */}
        <g transform="translate(157, 124)">
          <motion.g
            initial={{ rotate: 0 }}
            animate={energized || !hasWaved ? waveKeyframes : { rotate: 0 }}
            transition={waveTransition}
            onAnimationComplete={() => setHasWaved(true)}
          >
            <rect x="-7" y="0" width="14" height="48" rx="7" fill="url(#agentBody)" />
          </motion.g>
        </g>
      </motion.svg>
    </motion.div>
  );
}
