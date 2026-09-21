import React from 'react';
import { Box, Layers, Download, Check, Copy } from 'lucide-react';

interface HeaderProps {
  onCopyYaml: () => void;
  copied: boolean;
  onDownloadAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onCopyYaml, copied, onDownloadAll }) => {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
                Docker Image Release Action
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                GitHub Actions CI/CD
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Auto-pulls, saves, and creates independent GitHub Releases per image on file change
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCopyYaml}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
            title="Copy workflow YAML to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">Copied YAML</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copy YAML</span>
              </>
            )}
          </button>

          <button
            onClick={onDownloadAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20 transition-all"
            title="Download full starter package (.github, txt files, docs)"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Files</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>
    </header>
  );
};
