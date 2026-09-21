import React, { useState, useMemo } from 'react';
import JSZip from 'jszip';
import { Header } from './components/Header';
import { WorkflowFlowchart } from './components/WorkflowFlowchart';
import { YamlViewer } from './components/YamlViewer';
import { Simulator } from './components/Simulator';
import { ConfigPanel } from './components/ConfigPanel';
import { SetupGuide } from './components/SetupGuide';
import { WorkflowConfig } from './types';
import { generateWorkflowYaml } from './utils/workflowGenerator';
import { Code, PlayCircle, Sliders, BookOpen, Layers, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<WorkflowConfig>({
    compression: 'gzip',
    tagFormat: 'prefix-arch-img',
    changeMode: 'diff-only',
    enableDockerLogin: false,
    enableSha256: true,
    failFast: false,
    defaultBranch: 'main',
  });

  const [x86Content, setX86Content] = useState<string>(
`# x86_64 / amd64 镜像清单 (每行一个镜像)
alpine:3.20
nginx:1.27-alpine
busybox:latest`
  );

  const [armContent, setArmContent] = useState<string>(
`# ARM64 / aarch64 镜像清单 (每行一个镜像)
alpine:3.20
redis:7.4-alpine
node:22-alpine`
  );

  const [activeTab, setActiveTab] = useState<'yaml' | 'simulator' | 'config' | 'guide'>('yaml');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Generate real-time YAML based on active configuration
  const currentYaml = useMemo(() => {
    return generateWorkflowYaml(config);
  }, [config]);

  const handleCopyYaml = async () => {
    try {
      await navigator.clipboard.writeText(currentYaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadAll = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      
      // Add workflow file inside .github/workflows
      zip.file('.github/workflows/docker-save-release.yml', currentYaml);
      
      // Add txt files
      zip.file('image_x86.txt', x86Content);
      zip.file('image_arm.txt', armContent);
      
      // Add README
      zip.file(
        'README.md',
        `# Docker Save & Release GitHub Action

此仓库配置了 GitHub Action：当 \`image_x86.txt\` 或 \`image_arm.txt\` 变动时，自动拉取、使用 docker save 打包并发布为独立 GitHub Release。

## 快速使用
1. 开启仓库 Settings -> Actions -> General -> Workflow permissions -> 勾选 "Read and write permissions"。
2. 在 \`image_x86.txt\` 或 \`image_arm.txt\` 中增删镜像并提交 push。
3. 前往 GitHub Releases 页面下载对应的 .tar.gz 压缩包。
`
      );

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'github-action-docker-release-pack.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <Header
        onCopyYaml={handleCopyYaml}
        copied={copied}
        onDownloadAll={handleDownloadAll}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Top Workflow logic overview */}
        <WorkflowFlowchart />

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto pb-px" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('yaml')}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'yaml'
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>工作流代码 (Action YAML)</span>
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'simulator'
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              <span>解析与 Release 预览模拟器</span>
            </button>

            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'config'
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>工作流定制</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 py-3 px-3 sm:px-4 border-b-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'guide'
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>配置指南与常见问题</span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'yaml' && <YamlViewer yamlCode={currentYaml} />}

          {activeTab === 'simulator' && (
            <Simulator
              config={config}
              x86Content={x86Content}
              setX86Content={setX86Content}
              armContent={armContent}
              setArmContent={setArmContent}
            />
          )}

          {activeTab === 'config' && (
            <div className="space-y-6">
              <ConfigPanel config={config} onChange={setConfig} />
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  配置已实时应用至工作流，可切换至「工作流代码」选项卡查看最新生成的 YAML。
                </span>
                <button
                  onClick={() => setActiveTab('yaml')}
                  className="font-medium text-blue-700 hover:underline shrink-0"
                >
                  查看最新 YAML →
                </button>
              </div>
            </div>
          )}

          {activeTab === 'guide' && <SetupGuide />}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            基于 GitHub Actions 原生矩阵构建与 QEMU 跨架构能力 · 单镜像独立发布为 Release
          </div>
          <div className="font-mono text-slate-400">
            .github/workflows/docker-save-release.yml
          </div>
        </div>
      </footer>
    </div>
  );
}
