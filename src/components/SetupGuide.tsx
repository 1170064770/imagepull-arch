import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Key, Terminal, HelpCircle, Check, Copy } from 'lucide-react';

export const SetupGuide: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copySnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Essential Permission Warning Banner */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-amber-900">
              ⚠️ 关键前提：开启 GitHub Actions 读写权限 (Workflow permissions)
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              因为工作流需要执行 <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded text-amber-900">gh release create</code> 创建发布和上传镜像资源包，默认的只读 token 会报 <code className="font-mono text-rose-700">403 Resource not accessible by integration</code>。
            </p>
            <div className="pt-2 text-xs text-amber-900 flex items-center gap-1 font-medium">
              <span>设置路径：</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200">
                GitHub 仓库 → Settings → Actions → General → Workflow permissions → 勾选 "Read and write permissions"
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step by Step Implementation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
            01
          </div>
          <h4 className="text-sm font-semibold text-slate-900">放入工作流文件</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            在你的 GitHub 仓库根目录下创建目录与文件：
            <code className="block mt-1 font-mono text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 text-[11px]">
              .github/workflows/docker-save-release.yml
            </code>
          </p>
        </div>

        {/* Step 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
            02
          </div>
          <h4 className="text-sm font-semibold text-slate-900">维护镜像清单</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            在仓库根目录添加两个清单文件，每行一个镜像名：
            <code className="block mt-1 font-mono text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 text-[11px]">
              image_x86.txt<br/>
              image_arm.txt
            </code>
          </p>
        </div>

        {/* Step 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
            03
          </div>
          <h4 className="text-sm font-semibold text-slate-900">提交代码自动发布</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            每次 git push 只要修改了上面两个文件，就会自动拉取、保存并为每个镜像生成独立 Release。
            <code className="block mt-1 font-mono text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 text-[11px]">
              git commit -m "add images" && git push
            </code>
          </p>
        </div>
      </div>

      {/* Target Machine Client Load Guide */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-700" />
            目标机器下载与 Docker 加载镜像常用命令
          </h3>
          <span className="text-xs text-slate-400">离线部署 / 服务器同步</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>方法 A：流式解压直接载入 (推荐，无临时大文件)</span>
              <button
                onClick={() => copySnippet('gzip -dc nginx-1.27-alpine_x86.tar.gz | docker load', 'stream-load')}
                className="text-blue-600 hover:text-blue-700 text-[11px] inline-flex items-center gap-1"
              >
                {copiedId === 'stream-load' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>复制</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-cyan-300 font-mono text-xs rounded-xl overflow-x-auto">
              gzip -dc &lt;archive.tar.gz&gt; | docker load
            </pre>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span>方法 B：使用 docker load -i 方式</span>
              <button
                onClick={() => copySnippet('docker load -i nginx-1.27-alpine_x86.tar.gz', 'direct-load')}
                className="text-blue-600 hover:text-blue-700 text-[11px] inline-flex items-center gap-1"
              >
                {copiedId === 'direct-load' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>复制</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-amber-300 font-mono text-xs rounded-xl overflow-x-auto">
              docker load -i &lt;archive.tar.gz&gt;
            </pre>
          </div>
        </div>

        {/* Checksum check command */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700">
            <span>完整性校验命令 (SHA256 校验)</span>
            <button
              onClick={() => copySnippet('sha256sum -c nginx-1.27-alpine_x86.tar.gz.sha256', 'sha256-load')}
              className="text-blue-600 hover:text-blue-700 text-[11px] inline-flex items-center gap-1"
            >
              {copiedId === 'sha256-load' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>复制</span>
            </button>
          </div>
          <pre className="p-3 bg-slate-900 text-slate-300 font-mono text-xs rounded-xl overflow-x-auto">
            sha256sum -c &lt;archive.tar.gz.sha256&gt;
          </pre>
        </div>
      </div>
    </div>
  );
};
