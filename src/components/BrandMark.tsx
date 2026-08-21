import { useId } from 'react';

type BrandMarkProps = {
  className?: string;
  size?: number;
};

/**
 * GetInterviewed "Gi" icon mark, cropped from marketing/logo.svg (excludes the wordmark text).
 * The "G" follows the surrounding text color (dark navy on light theme, near-white on dark theme);
 * the blue accent stays fixed since it reads clearly on both.
 */
export default function BrandMark({ className, size = 28 }: BrandMarkProps) {
  const blueId = useId();
  return (
    <svg
      viewBox="225 0 460 375"
      width={size}
      height={size}
      className={`text-[#0b1220] dark:text-gray-100 ${className ?? ''}`}
      role="img"
      aria-label="GetInterviewed"
    >
      <defs>
        <linearGradient id={blueId} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stopColor="#034ee8" />
          <stop offset="1" stopColor="#1058ed" />
        </linearGradient>
      </defs>
      <path
        fill="currentColor"
        d="M379 54H524V118H375C330 123 297 160 297 211C297 263 334 304 387 304L533 250V367H484V326C458 354 425 368 389 368C303 368 235 301 235 211C235 123 300 54 379 54Z"
      />
      <path
        fill={`url(#${blueId})`}
        d="M386 305 497 208l-30-31a3 3 0 0 1 2-5h105a4 4 0 0 1 4 5l-11 99a4 4 0 0 1-7 2l-27-29z"
      />
      <circle cx="645" cy="43" r="36" fill={`url(#${blueId})`} />
      <rect x="615" y="102" width="63" height="266" fill={`url(#${blueId})`} />
    </svg>
  );
}
