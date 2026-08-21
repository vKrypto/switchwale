// Root-absolute paths (e.g. '/contact/', '/logo-light.png') resolve against
// the domain root, not the deployed base path — broken on GitHub Pages
// project sites served from a subpath like /switchwale/. Every internal
// link or asset src must go through this instead of a literal leading slash.
export function withBase(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '');
}
