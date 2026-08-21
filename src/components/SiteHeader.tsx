import { ArrowRight } from 'lucide-react';
import BrandMark from './BrandMark';
import ThemeToggle from './ThemeToggle';

// Everything routes to /contact/ for now — there's no live signup/login
// flow to send visitors to yet, so every "Sign in" / "Get started" just
// starts a conversation instead.
const CONTACT_URL = '/contact/';

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-semibold text-lg">
          <BrandMark size={26} />
          <span className="hidden sm:inline">GetInterviewed</span>
        </a>
        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <a href={CONTACT_URL} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            Sign in
          </a>
          <a
            href={CONTACT_URL}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 transition-colors"
          >
            Get started
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </header>
  );
}
