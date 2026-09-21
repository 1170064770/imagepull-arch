import React from 'react';
import { Sliders, Zap, Shield, Key, Archive, Tag, GitBranch } from 'lucide-react';
import { WorkflowConfig, CompressionType, TagFormat, ChangeDetectionMode } from '../types';

interface ConfigPanelProps {
  config: WorkflowConfig;
  onChange: (newConfig: WorkflowConfig) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onChange }) => {
  const update = (partial: Partial<WorkflowConfig>) => {
    onChange({ ...config, ...partial });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            工作流定制选项 (Workflow Customizer)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            调整配置将实时修改生成的 GitHub Actions YAML 脚本代码
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Compression Method */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
            <Archive className="w-3.5 h-3.5 text-blue-600" />
            <span>压缩格式与算法</span>
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
            {(['gzip', 'zstd', 'none'] as CompressionType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => update({ compression: type })}
                className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                  config.compression === type
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type === 'gzip' ? '.tar.gz (推荐)' : type === 'zstd' ? '.tar.zst' : '.tar (无压缩)'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            {config.compression === 'gzip' && '使用 gzip -9 高度压缩，兼容所有 Linux/Mac 环境。'}
            {config.compression === 'zstd' && '使用 zstd 多线程压缩，压缩率与解压速度极高。'}
            {config.compression === 'none' && '不压缩直接存储 tar，体积较大，请注意 2GB 单文件限制。'}
          </p>
        </div>

        {/* 2. Tag Format */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-indigo-600" />
            <span>Release Tag 命名规范</span>
          </label>
          <select
            value={config.tagFormat}
            onChange={(e) => update({ tagFormat: e.target.value as TagFormat })}
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="prefix-arch-img">img-[arch]-[name] (例: img-x86-nginx-alpine)</option>
            <option value="img-arch">[name]-[arch] (例: nginx-alpine-x86)</option>
            <option value="clean-flat">[arch]-[name] (例: x86-nginx-alpine)</option>
          </select>
          <p className="text-[11px] text-slate-400">
            Git Tag 自动过滤冒号和斜线，确保符合 GitHub Release 规范。
          </p>
        </div>

        {/* 3. Change Detection Mode */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>变动提取策略</span>
          </label>
          <select
            value={config.changeMode}
            onChange={(e) => update({ changeMode: e.target.value as ChangeDetectionMode })}
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="diff-only">仅提取本次 Push 新增行 (git diff 增量 - 推荐)</option>
            <option value="all-lines">提取文件中所有镜像行 (结合已存在 Release 幂等跳过)</option>
          </select>
          <p className="text-[11px] text-slate-400">
            无论哪种模式，脚本均具备已发布 Release 自动检测跳过机制。
          </p>
        </div>
      </div>

      {/* Toggles */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-6 text-xs">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={config.enableSha256}
            onChange={(e) => update({ enableSha256: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="font-medium text-slate-700">生成并上传 .sha256 校验和文件</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={config.enableDockerLogin}
            onChange={(e) => update({ enableDockerLogin: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="font-medium text-slate-700 flex items-center gap-1">
            <Key className="w-3.5 h-3.5 text-slate-400" />
            支持 Docker Hub 登录鉴权 (防 429 限流)
          </span>
        </label>

        <div className="flex items-center gap-2 ml-auto">
          <GitBranch className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500">主分支:</span>
          <input
            type="text"
            value={config.defaultBranch}
            onChange={(e) => update({ defaultBranch: e.target.value })}
            className="w-20 px-2 py-0.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded text-slate-800"
          />
        </div>
      </div>
    </div>
  );
};
