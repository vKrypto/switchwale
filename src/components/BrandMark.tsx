type BrandMarkProps = {
  className?: string;
  size?: number;
};

// SwitchWala "SW" mark. Two pre-rendered PNGs (light/dark) swapped via
// Tailwind's dark: class so no JS/theme hook is needed — mirrors how the
// rest of the app reacts to the html.dark class set in the head bootstrap.
export default function BrandMark({ className, size = 28 }: BrandMarkProps) {
  return (
    <>
      <img
        src="/logo-light.png"
        alt="SwitchWala"
        height={size}
        className={`block dark:hidden w-auto ${className ?? ''}`}
        style={{ height: size }}
      />
      <img
        src="/logo-dark.png"
        alt="SwitchWala"
        height={size}
        className={`hidden dark:block w-auto ${className ?? ''}`}
        style={{ height: size }}
      />
    </>
  );
}
