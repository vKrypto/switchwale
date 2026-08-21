import BrandMark from './BrandMark';

export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 py-8">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-500">
        <BrandMark size={18} />
        SwitchWala
      </div>
    </footer>
  );
}
