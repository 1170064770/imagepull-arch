import { WorkflowConfig } from '../types';

export function sanitizeImageName(image: string): string {
  return image
    .replace(/^docker\.io\//, '')
    .replace(/^library\//, '')
    .replace(/[/:]/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-');
}

export function generateReleaseTag(image: string, arch: 'x86' | 'arm', tagFormat: string): string {
  const clean = sanitizeImageName(image);
  switch (tagFormat) {
    case 'img-arch':
      return `${clean}-${arch}`;
    case 'clean-flat':
      return `${arch}-${clean}`;
    case 'prefix-arch-img':
    default:
      return `img-${arch}-${clean}`;
  }
}

export function generateArchiveName(image: string, arch: 'x86' | 'arm', compression: string): string {
  const clean = sanitizeImageName(image);
  const base = `${clean}_${arch}`;
  if (compression === 'gzip') return `${base}.tar.gz`;
  if (compression === 'zstd') return `${base}.tar.zst`;
  return `${base}.tar`;
}

export function generateWorkflowYaml(config: WorkflowConfig): string {
  const compExtension = config.compression === 'gzip' ? '.tar.gz' : config.compression === 'zstd' ? '.tar.zst' : '.tar';
  const compressCommand = 
    config.compression === 'gzip'
      ? `docker save "\${RAW_IMAGE}" | gzip -9 > "\${TAR_FILE}"`
      : config.compression === 'zstd'
      ? `docker save "\${RAW_IMAGE}" | zstd -19 -T0 -o "\${TAR_FILE}"`
      : `docker save "\${RAW_IMAGE}" -o "\${TAR_FILE}"`;

  const tagPatternBash =
    config.tagFormat === 'img-arch'
      ? `TAG="\${CLEAN_IMG}-\${ARCH}"`
      : config.tagFormat === 'clean-flat'
      ? `TAG="\${ARCH}-\${CLEAN_IMG}"`
      : `TAG="img-\${ARCH}-\${CLEAN_IMG}"`;

  const diffStrategyBash = config.changeMode === 'diff-only' 
    ? `# Push event: parse newly added lines via git diff
            CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "image_x86.txt image_arm.txt")
            if echo "$CHANGED_FILES" | grep -q "^image_x86.txt$"; then
              extract_diff_images "image_x86.txt" > "$X86_IMAGES"
            fi
            if echo "$CHANGED_FILES" | grep -q "^image_arm.txt$"; then
              extract_diff_images "image_arm.txt" > "$ARM_IMAGES"
            fi`
    : `# Process all lines in the modified file(s)
            CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "image_x86.txt image_arm.txt")
            if echo "$CHANGED_FILES" | grep -q "^image_x86.txt$"; then
              extract_valid_images "image_x86.txt" > "$X86_IMAGES"
            fi
            if echo "$CHANGED_FILES" | grep -q "^image_arm.txt$"; then
              extract_valid_images "image_arm.txt" > "$ARM_IMAGES"
            fi`;

  const dockerLoginStep = config.enableDockerLogin ? `
      - name: Optional Docker Registry Login (avoid rate limits)
        if: env.DOCKER_USERNAME != '' && env.DOCKER_PASSWORD != ''
        uses: docker/login-action@v3
        with:
          username: \${{ secrets.DOCKER_USERNAME }}
          password: \${{ secrets.DOCKER_PASSWORD }}
        env:
          DOCKER_USERNAME: \${{ secrets.DOCKER_USERNAME }}
          DOCKER_PASSWORD: \${{ secrets.DOCKER_PASSWORD }}
` : '';

  const checksumStep = config.enableSha256 ? `
          # Generate SHA256 checksum
          sha256sum "\${TAR_FILE}" > "\${TAR_FILE}.sha256"
          FILE_SHA256=$(awk '{print $1}' "\${TAR_FILE}.sha256")
          echo "file_sha256=\${FILE_SHA256}" >> "$GITHUB_OUTPUT"
` : `
          echo "file_sha256=none" >> "$GITHUB_OUTPUT"
`;

  const checksumUpload = config.enableSha256 ? `"\${SHA_FILE}" \\` : '';

  return `name: Docker Save and Release

on:
  push:
    paths:
      - 'image_x86.txt'
      - 'image_arm.txt'
    branches:
      - ${config.defaultBranch}
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

          echo "Event: \${EVENT_NAME}, Target: \${TARGET_FILE}, Force: \${FORCE}"

          X86_IMAGES=$(mktemp)
          ARM_IMAGES=$(mktemp)

          extract_valid_images() {
            local file="$1"
            if [ -f "$file" ]; then
              sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' "$file" \\
                | grep -v '^[[:space:]]*$' \\
                | grep -v '^[[:space:]]*#' \\
                | sort -u || true
            fi
          }

          extract_diff_images() {
            local file="$1"
            if [ -f "$file" ]; then
              if git rev-parse HEAD~1 >/dev/null 2>&1; then
                git diff -U0 HEAD~1 HEAD -- "$file" 2>/dev/null \\
                  | grep '^\\+[^+]' \\
                  | sed 's/^\\+//' \\
                  | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' \\
                  | grep -v '^[[:space:]]*$' \\
                  | grep -v '^[[:space:]]*#' \\
                  | sort -u || true
              else
                extract_valid_images "$file"
              fi
            fi
          }

          if [ "$EVENT_NAME" = "workflow_dispatch" ]; then
            if [ "$TARGET_FILE" = "all" ] || [ "$TARGET_FILE" = "image_x86.txt" ]; then
              extract_valid_images "image_x86.txt" > "$X86_IMAGES"
            fi
            if [ "$TARGET_FILE" = "all" ] || [ "$TARGET_FILE" = "image_arm.txt" ]; then
              extract_valid_images "image_arm.txt" > "$ARM_IMAGES"
            fi
          else
            ${diffStrategyBash}
          fi

          MATRIX_ITEMS=()

          if [ -s "$X86_IMAGES" ]; then
            while IFS= read -r img; do
              [ -z "$img" ] && continue
              ITEM=$(jq -nc --arg img "$img" --arg arch "x86" --arg platform "linux/amd64" --arg file "image_x86.txt" \\
                '{image: $img, arch: $arch, platform: $platform, file: $file}')
              MATRIX_ITEMS+=("$ITEM")
            done < "$X86_IMAGES"
          fi

          if [ -s "$ARM_IMAGES" ]; then
            while IFS= read -r img; do
              [ -z "$img" ] && continue
              ITEM=$(jq -nc --arg img "$img" --arg arch "arm" --arg platform "linux/arm64" --arg file "image_arm.txt" \\
                '{image: $img, arch: $arch, platform: $platform, file: $file}')
              MATRIX_ITEMS+=("$ITEM")
            done < "$ARM_IMAGES"
          fi

          TOTAL_COUNT=\${#MATRIX_ITEMS[@]}
          echo "Total images to process: $TOTAL_COUNT"

          if [ "$TOTAL_COUNT" -gt 0 ]; then
            MATRIX_JSON=$(printf '%s\\n' "\${MATRIX_ITEMS[@]}" | jq -s -c .)
            echo "matrix={\\"include\\": $MATRIX_JSON}" >> "$GITHUB_OUTPUT"
            echo "has_images=true" >> "$GITHUB_OUTPUT"
          else
            echo "matrix={\\"include\\": []}" >> "$GITHUB_OUTPUT"
            echo "has_images=false" >> "$GITHUB_OUTPUT"
          fi

  release-images:
    name: Save & Release (\${{ matrix.arch }} - \${{ matrix.image }})
    needs: detect-changes
    if: needs.detect-changes.outputs.has_images == 'true'
    runs-on: ubuntu-latest
    strategy:
      fail-fast: ${config.failFast}
      matrix: \${{ fromJSON(needs.detect-changes.outputs.matrix) }}
    env:
      GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
    steps:
      - name: Set up QEMU (ARM64 multi-architecture emulation)
        if: matrix.arch == 'arm'
        uses: docker/setup-qemu-action@v3
        with:
          platforms: linux/arm64

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
${dockerLoginStep}
      - name: Pull and Export Container Image
        id: package-image
        run: |
          set -euo pipefail

          RAW_IMAGE="\${{ matrix.image }}"
          ARCH="\${{ matrix.arch }}"
          PLATFORM="\${{ matrix.platform }}"
          FORCE="\${{ github.event.inputs.force_rebuild || 'false' }}"

          CLEAN_IMG=$(echo "\${RAW_IMAGE}" | sed -e 's|^docker.io/||' -e 's|^library/||' -e 's|[/:]|-|g' -e 's|[^a-zA-Z0-9._-]|-|g')
          ${tagPatternBash}
          ARCHIVE_BASE="\${CLEAN_IMG}_\${ARCH}"
          TAR_FILE="\${ARCHIVE_BASE}${compExtension}"

          echo "Release Tag: \${TAG}"
          echo "Archive Filename: \${TAR_FILE}"

          # Check if Release already exists to ensure idempotency
          if gh release view "\${TAG}" >/dev/null 2>&1; then
            echo "Release \${TAG} already exists."
            if [ "$FORCE" != "true" ]; then
              echo "force_rebuild is false. Skipping existing release."
              echo "skip_release=true" >> "$GITHUB_OUTPUT"
              exit 0
            fi
            echo "force_rebuild is true. Proceeding with update."
          fi

          echo "skip_release=false" >> "$GITHUB_OUTPUT"

          echo "Pulling image with platform \${PLATFORM}..."
          docker pull --platform "\${PLATFORM}" "\${RAW_IMAGE}"

          IMAGE_ID=$(docker inspect --format='{{.Id}}' "\${RAW_IMAGE}" 2>/dev/null || echo "unknown")
          IMAGE_SIZE=$(docker inspect --format='{{.Size}}' "\${RAW_IMAGE}" 2>/dev/null || echo "0")
          HUMAN_SIZE=$(numfmt --to=iec-i --suffix=B "\${IMAGE_SIZE}" 2>/dev/null || echo "\${IMAGE_SIZE} bytes")

          echo "Compressing and exporting image..."
          ${compressCommand}
${checksumStep}
          FILE_SIZE=$(numfmt --to=iec-i --suffix=B $(stat -c%s "\${TAR_FILE}"))

          echo "tag=\${TAG}" >> "$GITHUB_OUTPUT"
          echo "tar_file=\${TAR_FILE}" >> "$GITHUB_OUTPUT"
          echo "file_size=\${FILE_SIZE}" >> "$GITHUB_OUTPUT"
          echo "human_size=\${HUMAN_SIZE}" >> "$GITHUB_OUTPUT"
          echo "image_id=\${IMAGE_ID}" >> "$GITHUB_OUTPUT"

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
          DATE_STR=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

          RELEASE_TITLE="Docker Image [\${ARCH}]: \${IMAGE}"

          cat <<EOF > release_notes.md
          ## Container Image Release

          | Attribute | Value |
          | :--- | :--- |
          | **Image** | \\\`\${IMAGE}\\\` |
          | **Architecture** | \\\`\${ARCH}\\\` (\\\`\${PLATFORM}\\\`) |
          | **Source File** | \\\`\${{ matrix.file }}\\\` |
          | **Archive Size** | \${FILE_SIZE} |
          | **Raw Image Size** | \${HUMAN_SIZE} |
          | **Image ID** | \\\`\${IMAGE_ID}\\\` |
          | **Build Time** | \${DATE_STR} |

          ### Quick Load Command
          \\\`\\\`\\\`bash
          # Direct stream loading
          gzip -dc \${TAR_FILE} | docker load
          # Or standard load
          docker load -i \${TAR_FILE}
          \\\`\\\`\\\`
          EOF

          if gh release view "\${TAG}" >/dev/null 2>&1; then
            gh release edit "\${TAG}" --title "\${RELEASE_TITLE}" --notes-file release_notes.md
            gh release upload "\${TAG}" "\${TAR_FILE}" ${checksumUpload} --clobber
          else
            gh release create "\${TAG}" \\
              "\${TAR_FILE}" \\
              ${checksumUpload} \\
              --title "\${RELEASE_TITLE}" \\
              --notes-file release_notes.md
          fi

          echo "Release successfully published: \${TAG}"
`;
}
