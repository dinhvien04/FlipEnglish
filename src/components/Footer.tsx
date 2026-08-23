import React from 'react';

interface FooterProps {
  onNavigateHome: () => void;
  onNavigateFlipLens: () => void;
  onNavigateExamCenter: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateHome,
  onNavigateFlipLens,
  onNavigateExamCenter,
}) => {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-12 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-lg font-black tracking-tight text-slate-900">
              Flip<span className="text-indigo-600">English</span>
            </span>
            <p className="text-xs text-slate-500">
              Learn English vocabulary from A1 to C2 through real-world context and structured practice.
            </p>
          </div>

          <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-6 text-xs sm:text-sm font-semibold text-slate-600">
            <button
              type="button"
              onClick={onNavigateHome}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Curriculum
            </button>
            <button
              type="button"
              onClick={onNavigateFlipLens}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              FlipLens
            </button>
            <button
              type="button"
              onClick={onNavigateExamCenter}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              Exam Center
            </button>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-2xs text-slate-400">
          <p>© {new Date().getFullYear()} FlipEnglish. Practice for self-paced language learning and assessment.</p>
          <p>Powered by modern web standards and Google Gemini AI.</p>
        </div>
      </div>
    </footer>
  );
};
