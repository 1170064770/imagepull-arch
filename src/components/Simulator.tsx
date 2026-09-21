import React, { useState, useMemo } from 'react';
import { Play, RotateCcw, Copy, Check, Terminal, Layers, FileText, ExternalLink, ShieldAlert } from 'lucide-react';
import { WorkflowConfig, ImageMatrixItem } from '../types';
import { generateReleaseTag, generateArchiveName } from '../utils/workflowGenerator';

interface SimulatorProps {
  config: WorkflowConfig;
  x86Content: string;
  setX86Content: (val: string) => void;
  armContent: string;
  setArmContent: (val: string) => void;
}

export const Simulator: React.FC<SimulatorProps> = ({
  config,
  x86Content,
  setX86Content,
  armContent,
  setArmContent,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedItemForNotes, setSelectedItemForNotes] = useState<ImageMatrixItem | null>(null);

  // Parse lines
  const matrixItems = useMemo<ImageMatrixItem[]>(() => {
    const items: ImageMatrixItem[] = [];

    const parseFileLines = (text: string, arch: 'x86' | 'arm', file: 'image_x86.txt' | 'image_arm.txt') => {
      const lines = text.split('\n');
      const platform = arch === 'x86' ? 'linux/amd64' : 'linux/arm64';

      lines.forEach((rawLine, idx) => {
        const trimmed = rawLine.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        const tag = generateReleaseTag(trimmed, arch, config.tagFormat);
        const archive = generateArchiveName(trimmed, arch, config.compression);
        const title = `Docker Image [${arch}]: ${trimmed}`;

        items.push({
          id: `${arch}-${idx}-${trimmed}`,
          image: trimmed,
          arch,
          platform,
          file,
          tag,
          archiveFilename: archive,
          releaseTitle: title,
        });
      });
    };

    parseFileLines(x86Content, 'x86', 'image_x86.txt');
    parseFileLines(armContent, 'arm', 'image_arm.txt');

    return items;
  }, [x86Content, armContent, config.tagFormat, config.compression]);

  const handleCopyCmd = (cmd: string, index: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const loadPreset = (type: 'web' | 'minimal' | 'dev') => {
    if (type === 'web') {
      setX86Content(`# 常用 Web 与服务镜像 (x86_64)
nginx:1.27-alpine
redis:7.4-alpine
caddy:2-alpine`);
      setArmContent(`# 常用 Web 与服务镜像 (ARM64)
nginx:1.27-alpine
redis:7.4-alpine
postgres:16-alpine`);
    } else if (type === 'minimal') {
      setX86Content(`alpine:3.20\nbusybox:latest`);
      setArmContent(`alpine:3.20\nbusybox:latest`);
    } else if (type === 'dev') {
      setX86Content(`node:22-alpine\npython:3.12-slim\ngolang:1.23-alpine`);
      setArmContent(`node:22-alpine\npython:3.12-slim`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Presets */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Play className="w-4 h-4 text-blue-600" />
              镜像解析与 Release 预览模拟器
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              编辑下方两个清单文件内容，实时预览 GitHub Action 将生成的并行 Matrix、Release Tag 与下载命令
            </p>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 mr-1">快捷预设:</span>
            <button
              onClick={() => loadPreset('minimal')}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              轻量系统
            </button>
            <button
              onClick={() => loadPreset('web')}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Web 与服务
            </button>
            <button
              onClick={() => loadPreset('dev')}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              开发运行时
            </button>
          </div>
        </div>

        {/* Input Editors for x86 and arm */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          {/* x86 Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span className="font-mono">image_x86.txt</span>
                <span className="text-[11px] font-normal text-slate-400">(linux/amd64)</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {x86Content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length} 镜像
              </span>
            </div>
            <textarea
              value={x86Content}
              onChange={(e) => setX86Content(e.target.value)}
              rows={5}
              placeholder="每行一个镜像，例如 nginx:alpine&#10;# 支持井号注释"
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-y text-slate-800"
            />
          </div>

          {/* arm Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <span className="font-mono">image_arm.txt</span>
                <span className="text-[11px] font-normal text-slate-400">(linux/arm64)</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {armContent.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length} 镜像
              </span>
            </div>
            <textarea
              value={armContent}
              onChange={(e) => setArmContent(e.target.value)}
              rows={5}
              placeholder="每行一个镜像，例如 redis:7-alpine&#10;# 支持井号注释"
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-y text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Generated Releases Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              生成的 GitHub Releases 列表 (独立发布)
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {matrixItems.length} 个独立 Release
            </span>
          </div>

          <div className="text-xs text-slate-500">
            每个镜像都将以独立的 Tag 和 Release 呈现于 GitHub Releases 页面
          </div>
        </div>

        {matrixItems.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <ShieldAlert className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm">暂无有效镜像，请在上方输入或选择快捷预设。</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-medium">
                  <th className="py-2.5 px-4">架构</th>
                  <th className="py-2.5 px-4">原始镜像</th>
                  <th className="py-2.5 px-4">GitHub Release Tag</th>
                  <th className="py-2.5 px-4">生成的压缩包文件名</th>
                  <th className="py-2.5 px-4 text-right">操作 / 导入命令</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixItems.map((item, index) => {
                  const loadCmd = config.compression === 'gzip'
                    ? `gzip -dc ${item.archiveFilename} | docker load`
                    : `docker load -i ${item.archiveFilename}`;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                            item.arch === 'x86'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {item.arch === 'x86' ? 'x86_64 (amd64)' : 'ARM64 (aarch64)'}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {item.image}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
                          {item.tag}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {item.archiveFilename}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => setSelectedItemForNotes(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                          title="查看该 Release 的说明模板"
                        >
                          <FileText className="w-3 h-3 text-slate-500" />
                          <span>Release Notes</span>
                        </button>

                        <button
                          onClick={() => handleCopyCmd(loadCmd, index)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                          title="复制本地 Docker load 命令"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">已复制</span>
                            </>
                          ) : (
                            <>
                              <Terminal className="w-3 h-3 text-blue-600" />
                              <span>复制导入命令</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Matrix JSON representation preview */}
      <div className="bg-slate-900 rounded-2xl p-5 text-slate-300 font-mono text-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-semibold">$GITHUB_OUTPUT</span>
            <span className="text-slate-400">matrix.include JSON 数据结构</span>
          </div>
          <span className="text-[11px] text-slate-400">由 detect-changes 阶段输出供 release-images 并行消费</span>
        </div>

        <pre className="overflow-x-auto text-[11px] leading-relaxed text-cyan-300 max-h-48 scrollbar-thin">
          {JSON.stringify(
            {
              include: matrixItems.map((m) => ({
                image: m.image,
                arch: m.arch,
                platform: m.platform,
                file: m.file,
              })),
            },
            null,
            2
          )}
        </pre>
      </div>

      {/* Release Notes Modal */}
      {selectedItemForNotes && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-900">
                Release Notes 预览 ({selectedItemForNotes.image})
              </h4>
              <button
                onClick={() => setSelectedItemForNotes(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="my-4 text-xs font-mono bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-800 overflow-y-auto max-h-72">
              <p className="font-bold text-slate-900 mb-2">## Container Image Release</p>
              <p className="text-slate-600 mb-1">- Image: `{selectedItemForNotes.image}`</p>
              <p className="text-slate-600 mb-1">- Architecture: `{selectedItemForNotes.arch}` (`{selectedItemForNotes.platform}`)</p>
              <p className="text-slate-600 mb-1">- Source File: `{selectedItemForNotes.file}`</p>
              <p className="text-slate-600 mb-1">- Compressed File: `{selectedItemForNotes.archiveFilename}`</p>
              <p className="text-slate-600 mb-3">- Verification: SHA256 included in asset</p>
              <p className="font-bold text-slate-900 mb-1">### How to Load:</p>
              <p className="text-emerald-700 bg-emerald-50/80 p-2 rounded border border-emerald-200">
                gzip -dc {selectedItemForNotes.archiveFilename} | docker load
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedItemForNotes(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
