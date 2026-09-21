import React from 'react';
import { GitCommit, Cpu, Box, PackageCheck, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export const WorkflowFlowchart: React.FC = () => {
  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 sm:p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            工作流执行管线逻辑 (Workflow Execution Pipeline)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            监听文件变动 → 提取镜像差异 → 动态生成矩阵 → 跨架构独立构建与发布
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-white border border-slate-200 text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>One Release Per Image (独立版本)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
        {/* Step 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs relative group hover:border-blue-300 transition-colors">
          <div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs mb-3 border border-blue-100">
              1
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 mb-1">
              <GitCommit className="w-3.5 h-3.5 text-blue-600" />
              <span>文件变动监听</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              监听 <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-700">image_x86.txt</code> 与 <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-700">image_arm.txt</code> 的 push 提交或手动触发。
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>paths filter</span>
            <span className="text-emerald-600">active</span>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs relative group hover:border-indigo-300 transition-colors">
          <div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs mb-3 border border-indigo-100">
              2
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 mb-1">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span>差异解析与矩阵生成</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              运行 <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-700">detect-changes</code> 任务，通过 git diff / 规则提取增量镜像，输出 JSON matrix。
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>matrix.include</span>
            <span className="text-indigo-600">dynamic JSON</span>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs relative group hover:border-cyan-300 transition-colors">
          <div>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold text-xs mb-3 border border-cyan-100">
              3
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 mb-1">
              <Box className="w-3.5 h-3.5 text-cyan-600" />
              <span>QEMU 与镜像保存</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              针对 ARM64 配置 QEMU 模拟，使用 <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-700">docker pull --platform</code> 拉取，通过 <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-700">docker save | gzip -9</code> 压缩打包。
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>x86 / arm64</span>
            <span className="text-cyan-600">.tar.gz</span>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-xs relative group hover:border-emerald-300 transition-colors">
          <div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs mb-3 border border-emerald-100">
              4
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 mb-1">
              <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>独立发布 GitHub Release</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              自动生成 Tag 与校验和，使用内置 <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-700">gh release</code> 发布，附带完整元数据与导入命令。
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>1 Image = 1 Release</span>
            <span className="text-emerald-600">published</span>
          </div>
        </div>
      </div>
    </div>
  );
};
