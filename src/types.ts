export type CompressionType = 'gzip' | 'none' | 'zstd';

export type TagFormat = 'prefix-arch-img' | 'img-arch' | 'clean-flat';

export type ChangeDetectionMode = 'diff-only' | 'all-lines';

export interface WorkflowConfig {
  compression: CompressionType;
  tagFormat: TagFormat;
  changeMode: ChangeDetectionMode;
  enableDockerLogin: boolean;
  enableSha256: boolean;
  failFast: boolean;
  defaultBranch: string;
}

export interface ImageMatrixItem {
  id: string;
  image: string;
  arch: 'x86' | 'arm';
  platform: 'linux/amd64' | 'linux/arm64';
  file: 'image_x86.txt' | 'image_arm.txt';
  tag: string;
  archiveFilename: string;
  releaseTitle: string;
  estimatedSize?: string;
}

export interface ImageFileState {
  x86Content: string;
  armContent: string;
}
