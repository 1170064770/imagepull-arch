# GitHub Action: Docker Save & Release (Multi-Arch)

本项目提供了一个自动化的 GitHub Actions 工作流：当仓库中的 `image_x86.txt` 或 `image_arm.txt` 发生变化时，自动拉取对应的容器镜像，使用 `docker save` 保存为压缩包文件（`.tar.gz`），并将所有变动镜像**统一发布到一个 GitHub Release 中，每个镜像作为该 Release 下的一个独立文件（Asset）**。

---

## 🚀 核心特性

1. **统一 Release 管理（一个镜像对应 Release 中的一个文件）**：
   - 变动的多个镜像无需创建多个混乱的 Release，统一打包发布到当前运行的 Release 中。
   - 文件命名清晰规范：`<image-name>_<arch>.tar.gz`，例如 `nginx-1.27-alpine_x86.tar.gz`、`redis-7.4-alpine_arm.tar.gz`。
2. **多架构精准拉取**：
   - `image_x86.txt` 镜像指定 `--platform linux/amd64`。
   - `image_arm.txt` 镜像指定 `--platform linux/arm64`（配置 QEMU 支持跨架构拉取与导出）。
3. **高效流式压缩与校验**：
   - 使用 `gzip -9` 实时流式压缩，大幅缩减文件体积。
   - 每个镜像附带同名 `.sha256` 校验文件，确保离线下载的完整性。
4. **变动与增量提取**：
   - Push 触发时自动通过 `git diff` 提取本次 commit 新增/变动的镜像。
   - 支持 `workflow_dispatch` 手动触发，并可自定义发布 Tag。
5. **统一 Release Notes 索引表**：
   - Release 页面自动生成清晰的表格，汇总列出每个镜像的名称、架构、压缩文件名称、文件大小、SHA256 和 Docker 导入命令。

---

## 🛠️ 配置与使用步骤

### 1. 开启 GitHub Actions 写权限（必需）
因为工作流需要创建 GitHub Release 并上传 Assets，请确保：
1. 进入 GitHub 仓库页面，点击 **Settings**。
2. 依次选择左侧栏 **Actions** -> **General**。
3. 滚动到页面底部的 **Workflow permissions**。
4. 勾选 **Read and write permissions** 并点击 **Save**。

### 2. 维护镜像清单
在仓库根目录下的相应文件中添加镜像地址，每行一个（支持 `#` 注释和空行）：

- **`image_x86.txt`**（x86_64 / amd64）：
  ```text
  alpine:3.20
  nginx:1.27-alpine
  redis:7.4-alpine
  ```

- **`image_arm.txt`**（ARM64 / aarch64）：
  ```text
  alpine:3.20
  node:22-alpine
  mysql:8.4
  ```

### 3. 提交与推送
```bash
git add image_x86.txt image_arm.txt
git commit -m "feat: add new images"
git push origin main
```
工作流运行完毕后，在 GitHub 的 **Releases** 页面即可看到包含所有镜像 `.tar.gz` 文件的单一 Release！

---

## 📥 如何下载并加载导出的镜像

1. 在 GitHub 仓库的 **Releases** 页面下载对应的 `.tar.gz` 资源文件。
2. 使用以下命令直接导入到本地 Docker：

```bash
# 方式 A：流式解压直接导入（推荐，免解压临时文件）
gzip -dc nginx-1.27-alpine_x86.tar.gz | docker load

# 方式 B：使用 docker load -i
docker load -i nginx-1.27-alpine_x86.tar.gz

# 校验镜像已成功载入
docker images
```
