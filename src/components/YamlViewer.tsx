import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, ChevronDown, ChevronUp, Sparkles, HelpCircle } from 'lucide-react';

interface YamlViewerProps {
  yamlCode: string;
}

export const YamlViewer: React.FC<YamlViewerProps> = ({ yamlCode }) => {
  const [copied, setCopied] = useState(false);
  const [showNotes, setShowNotes] = useState(true);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(yamlCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([yamlCode], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'docker-save-release.yml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const lines = yamlCode.split('\n');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      {/* Header bar */}
      <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-mono font-medium text-slate-200">
              .github/workflows/docker-save-release.yml
            </span>
            <span className="ml-2 text-[11px] text-slate-400 font-mono">
              ({lines.length} lines)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Toggle code annotations"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>关键设计说明</span>
            {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>复制 YAML</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>下载 .yml</span>
          </button>
        </div>
      </div>

      {/* Code Annotations / Key architectural highlights */}
      {showNotes && (
        <div className="bg-slate-900/95 border-b border-slate-800 px-5 py-4 text-xs text-slate-300 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
            <div className="font-semibold text-blue-400 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              1. 动态生成 Matrix
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              第一阶段任务解析文件变动，把需要发布的每个镜像输出为 JSON 数组，第二阶段自动并行拉取，真正实现 <strong>一个镜像对应一个独立 Release</strong>。
            </p>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
            <div className="font-semibold text-indigo-400 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              2. QEMU 跨架构拉取 ARM64
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Ubuntu-latest 为 x86_64 宿主，通过配置 <code className="text-indigo-300">docker/setup-qemu-action</code> 与 <code className="text-indigo-300">--platform linux/arm64</code>，完美拉取并导出 ARM64 镜像。
            </p>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
            <div className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              3. 流式压缩与原生 GH CLI
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              通过 <code className="text-emerald-300">docker save | gzip -9</code> 实时压缩，无需落地数百 MB 的未压缩文件；使用 GitHub 自带的 <code className="text-emerald-300">gh release</code> 创建发布。
            </p>
          </div>
        </div>
      )}

      {/* Code Body with line numbers */}
      <div className="p-4 sm:p-5 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[580px] scrollbar-thin scrollbar-thumb-slate-700">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-900/50">
                <td className="pr-4 py-0.5 text-right select-none text-slate-600 text-[11px] w-12 font-mono">
                  {idx + 1}
                </td>
                <td className="py-0.5 text-slate-300 whitespace-pre">
                  {formatYamlLine(line)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Subtle syntax styling helper for readable YAML display
function formatYamlLine(line: string): React.ReactNode {
  if (line.trim().startsWith('#')) {
    return <span className="text-slate-500 italic">{line}</span>;
  }
  if (/^[a-zA-Z0-9_-]+:/.test(line.trim())) {
    const parts = line.split(':');
    const key = parts[0];
    const rest = parts.slice(1).join(':');
    return (
      <>
        <span className="text-cyan-400 font-medium">{key}:</span>
        <span className="text-amber-200">{rest}</span>
      </>
    );
  }
  if (line.includes('uses:')) {
    const [pre, post] = line.split('uses:');
    return (
      <>
        <span className="text-slate-400">{pre}</span>
        <span className="text-cyan-400 font-medium">uses:</span>
        <span className="text-indigo-300">{post}</span>
      </>
    );
  }
  if (line.includes('run:')) {
    const [pre, post] = line.split('run:');
    return (
      <>
        <span className="text-slate-400">{pre}</span>
        <span className="text-cyan-400 font-medium">run:</span>
        <span className="text-amber-300">{post}</span>
      </>
    );
  }
  return <span>{line}</span>;
}
