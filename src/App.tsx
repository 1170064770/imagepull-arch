import React, { useState } from 'react';
import { Copy, Check, FileCode, CheckCircle2, GitCommit, Box, Download } from 'lucide-react';

const WORKFLOW_YAML = `name: Docker Save and Release

on:
  push:
    paths:
      - 'image_x86.txt'
      - 'image_arm.txt'
    branches:
      - main
      - master
  workflow_dispatch:
    inputs:
      target_file:
        description: 'Target image list file to process (or both)'
        required: true
        default: 'all'
        type: choice
        options:
          - all
          - image_x86.txt
          - image_arm.txt
      force_rebuild:
        description: 'Rebuild and overwrite existing releases'
        required: false
        default: false
        type: boolean

permissions:
  contents: write

jobs:
  detect-changes:
    name: Detect Changed Images
    runs-on: ubuntu-latest
    outputs:
      matrix: \${{ steps.set-matrix.outputs.matrix }}
      has_images: \${{ steps.set-matrix.outputs.has_images }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Parse image lists and generate matrix
        id: set-matrix
        run: |
          set -euo pipefail

          TARGET_FILE="\${{ github.event.inputs.target_file || '' }}"
          EVENT_NAME="\${{ github.event_name }}"
          FORCE="\${{ github.event.inputs.force_rebuild || 'false' }}"

          X86_IMAGES=\$(mktemp)
          ARM_IMAGES=\$(mktemp)

          # 提取清洗后的有效镜像行（过滤注释与空行）
          extract_valid_images() {
            local file="\$1"
            if [ -f "\$file" ]; then
              sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*\$//' "\$file" \\
                | grep -v '^[[:space:]]*\$' \\
                | grep -v '^[[:space:]]*#' \\
                | sort -u || true
            fi
          }

          # 提取 git diff 中新增/修改的行
          extract_diff_images() {
            local file="\$1"
            if [ -f "\$file" ]; then
              if git rev-parse HEAD~1 >/dev/null 2>&1; then
                git diff -U0 HEAD~1 HEAD -- "\$file" 2>/dev/null \\
                  | grep '^\\+[^+]' \\
                  | sed 's/^\\+//' \\
                  | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*\$//' \\
                  | grep -v '^[[:space:]]*\$' \\
                  | grep -v '^[[:space:]]*#' \\
                  | sort -u || true
              else
                extract_valid_images "\$file"
              fi
            fi
          }

          if [ "\$EVENT_NAME" = "workflow_dispatch" ]; then
            if [ "\$TARGET_FILE" = "all" ] || [ "\$TARGET_FILE" = "image_x86.txt" ]; then
              extract_valid_images "image_x86.txt" > "\$X86_IMAGES"
            fi
            if [ "\$TARGET_FILE" = "all" ] || [ "\$TARGET_FILE" = "image_arm.txt" ]; then
              extract_valid_images "image_arm.txt" > "\$ARM_IMAGES"
            fi
          else
            CHANGED_FILES=\$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "image_x86.txt image_arm.txt")
            if echo "\$CHANGED_FILES" | grep -q "^image_x86.txt\$"; then
              extract_diff_images "image_x86.txt" > "\$X86_IMAGES"
            fi
            if echo "\$CHANGED_FILES" | grep -q "^image_arm.txt\$"; then
              extract_diff_images "image_arm.txt" > "\$ARM_IMAGES"
            fi
          fi

          MATRIX_ITEMS=()

          if [ -s "\$X86_IMAGES" ]; then
            while IFS= read -r img; do
              [ -z "\$img" ] && continue
              ITEM=\$(jq -nc --arg img "\$img" --arg arch "x86" --arg platform "linux/amd64" --arg file "image_x86.txt" \\
                '{image: \$img, arch: \$arch, platform: \$platform, file: \$file}')
              MATRIX_ITEMS+=("\$ITEM")
            done < "\$X86_IMAGES"
          fi

          if [ -s "\$ARM_IMAGES" ]; then
            while IFS= read -r img; do
              [ -z "\$img" ] && continue
              ITEM=\$(jq -nc --arg img "\$img" --arg arch "arm" --arg platform "linux/arm64" --arg file "image_arm.txt" \\
                '{image: \$img, arch: \$arch, platform: \$platform, file: \$file}')
              MATRIX_ITEMS+=("\$ITEM")
            done < "\$ARM_IMAGES"
          fi

          TOTAL_COUNT=\${#MATRIX_ITEMS[@]}
          echo "Total images to process: \$TOTAL_COUNT"

          if [ "\$TOTAL_COUNT" -gt 0 ]; then
            MATRIX_JSON=\$(printf '%s\\n' "\${MATRIX_ITEMS[@]}" | jq -s -c .)
            echo "matrix={\\"include\\": \$MATRIX_JSON}" >> "\$GITHUB_OUTPUT"
            echo "has_images=true" >> "\$GITHUB_OUTPUT"
          else
            echo "matrix={\\"include\\": []}" >> "\$GITHUB_OUTPUT"
            echo "has_images=false" >> "\$GITHUB_OUTPUT"
          fi

  release-images:
    name: Save & Release (\${{ matrix.arch }} - \${{ matrix.image }})
    needs: detect-changes
    if: needs.detect-changes.outputs.has_images == 'true'
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix: \${{ fromJSON(needs.detect-changes.outputs.matrix) }}
    env:
      GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
    steps:
      - name: Set up QEMU (for ARM64 emulation)
        if: matrix.arch == 'arm'
        uses: docker/setup-qemu-action@v3
        with:
          platforms: linux/arm64

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Pull and Export Container Image
        id: package-image
        run: |
          set -euo pipefail

          RAW_IMAGE="\${{ matrix.image }}"
          ARCH="\${{ matrix.arch }}"
          PLATFORM="\${{ matrix.platform }}"
          FORCE="\${{ github.event.inputs.force_rebuild || 'false' }}"

          CLEAN_IMG=\$(echo "\${RAW_IMAGE}" | sed -e 's|^docker.io/||' -e 's|^library/||' -e 's|[/:]|-|g' -e 's|[^a-zA-Z0-9._-]|-|g')
          TAG="img-\${ARCH}-\${CLEAN_IMG}"
          ARCHIVE_BASE="\${CLEAN_IMG}_\${ARCH}"
          TAR_FILE="\${ARCHIVE_BASE}.tar.gz"

          # 检查 Release 是否已存在
          if gh release view "\${TAG}" >/dev/null 2>&1; then
            echo "Release \${TAG} already exists."
            if [ "\$FORCE" != "true" ]; then
              echo "force_rebuild is false. Skipping existing release."
              echo "skip_release=true" >> "\$GITHUB_OUTPUT"
              exit 0
            fi
            echo "force_rebuild is true. Proceeding with update."
          fi

          echo "skip_release=false" >> "\$GITHUB_OUTPUT"

          # 1. 拉取镜像
          echo "Pulling image with platform \${PLATFORM}..."
          docker pull --platform "\${PLATFORM}" "\${RAW_IMAGE}"

          IMAGE_ID=\$(docker inspect --format='{{.Id}}' "\${RAW_IMAGE}" 2>/dev/null || echo "unknown")
          IMAGE_SIZE=\$(docker inspect --format='{{.Size}}' "\${RAW_IMAGE}" 2>/dev/null || echo "0")
          HUMAN_SIZE=\$(numfmt --to=iec-i --suffix=B "\${IMAGE_SIZE}" 2>/dev/null || echo "\${IMAGE_SIZE} bytes")

          # 2. 压缩保存
          echo "Saving and compressing image to \${TAR_FILE}..."
          docker save "\${RAW_IMAGE}" | gzip -9 > "\${TAR_FILE}"

          # 3. 校验和计算
          sha256sum "\${TAR_FILE}" > "\${TAR_FILE}.sha256"
          FILE_SHA256=\$(awk '{print \$1}' "\${TAR_FILE}.sha256")
          FILE_SIZE=\$(numfmt --to=iec-i --suffix=B \$(stat -c%s "\${TAR_FILE}"))

          echo "tag=\${TAG}" >> "\$GITHUB_OUTPUT"
          echo "tar_file=\${TAR_FILE}" >> "\$GITHUB_OUTPUT"
          echo "file_size=\${FILE_SIZE}" >> "\$GITHUB_OUTPUT"
          echo "human_size=\${HUMAN_SIZE}" >> "\$GITHUB_OUTPUT"
          echo "file_sha256=\${FILE_SHA256}" >> "\$GITHUB_OUTPUT"
          echo "image_id=\${IMAGE_ID}" >> "\$GITHUB_OUTPUT"

      - name: Publish to GitHub Release
        if: steps.package-image.outputs.skip_release != 'true'
        run: |
          set -euo pipefail

          TAG="\${{ steps.package-image.outputs.tag }}"
          TAR_FILE="\${{ steps.package-image.outputs.tar_file }}"
          SHA_FILE="\${TAR_FILE}.sha256"
          IMAGE="\${{ matrix.image }}"
          ARCH="\${{ matrix.arch }}"
          PLATFORM="\${{ matrix.platform }}"
          FILE_SIZE="\${{ steps.package-image.outputs.file_size }}"
          HUMAN_SIZE="\${{ steps.package-image.outputs.human_size }}"
          FILE_SHA256="\${{ steps.package-image.outputs.file_sha256 }}"
          IMAGE_ID="\${{ steps.package-image.outputs.image_id }}"
          DATE_STR=\$(date -u +"%Y-%m-%d %H:%M:%S UTC")

          RELEASE_TITLE="Docker Image [\${ARCH}]: \${IMAGE}"

          cat <<EOF > release_notes.md
          ## Container Image Release

          | Attribute | Value |
          | :--- | :--- |
          | **Image** | \\\`\${IMAGE}\\\` |
          | **Architecture** | \\\`\${ARCH}\\\` (\\\`\${PLATFORM}\\\`) |
          | **Source File** | \\\`\${{ matrix.file }}\\\` |
          | **Compressed Size** | \${FILE_SIZE} |
          | **Raw Image Size** | \${HUMAN_SIZE} |
          | **File SHA256** | \\\`\${FILE_SHA256}\\\` |
          | **Image ID** | \\\`\${IMAGE_ID}\\\` |
          | **Build Time** | \${DATE_STR} |

          ### How to Load
          \\\`\\\`\\\`bash
          gzip -dc \${TAR_FILE} | docker load
          \\\`\\\`\\\`
          EOF

          if gh release view "\${TAG}" >/dev/null 2>&1; then
            gh release edit "\${TAG}" --title "\${RELEASE_TITLE}" --notes-file release_notes.md
            gh release upload "\${TAG}" "\${TAR_FILE}" "\${SHA_FILE}" --clobber
          else
            gh release create "\${TAG}" \\
              "\${TAR_FILE}" \\
              "\${SHA_FILE}" \\
              --title "\${RELEASE_TITLE}" \\
              --notes-file release_notes.md
          fi`;

export default function App() {
  const [copied, setCopied] = useState(false);

  const copyYaml = () => {
    navigator.clipboard.writeText(WORKFLOW_YAML);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadYaml = () => {
    const blob = new Blob([WORKFLOW_YAML], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'docker-save-release.yml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Box className="w-4 h-4" />
              </div>
              <h1 className="text-lg font-bold text-slate-100">
                .github/workflows/docker-save-release.yml
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              监听 image_x86.txt / image_arm.txt 变动 · 自动 pull / save · 一个镜像独立发布为一个 Release
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyYaml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">已复制 YAML</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>复制 YAML</span>
                </>
              )}
            </button>

            <button
              onClick={downloadYaml}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 .yml</span>
            </button>
          </div>
        </div>

        {/* Essential Repository Files Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              工作流路径
            </div>
            <code className="text-cyan-300 text-[11px]">.github/workflows/docker-save-release.yml</code>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
              <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
              监听的清单文件
            </div>
            <code className="text-indigo-300 text-[11px]">image_x86.txt / image_arm.txt</code>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              必要权限
            </div>
            <code className="text-emerald-300 text-[11px]">Workflow: Read and write</code>
          </div>
        </div>

        {/* YAML Code Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Workflow YAML</span>
            <span>{WORKFLOW_YAML.split('\n').length} 行</span>
          </div>

          <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[640px] leading-relaxed select-text">
            {WORKFLOW_YAML}
          </pre>
        </div>
      </div>
    </div>
  );
}
