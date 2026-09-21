# GitHub Action: Docker Save & Release (Multi-Arch)

本项目提供了一个自动化的 GitHub Actions 工作流：当仓库中的 `image_x86.txt` 或 `image_arm.txt` 发生变化时，自动拉取对应的容器镜像，使用 `docker save` 保存为压缩包文件（`.tar.gz`），并为**每一个镜像独立发布为一个 GitHub Release**。

---

## 🚀 核心特性

1. **多架构精准拉取**：
   - `image_x86.txt` 镜像指定 `--platform linux/amd64`
   - `image_arm.txt` 镜像指定 `--platform linux/arm64`（配置了 QEMU 支持跨架构拉取与导出）
2. **一个镜像对应一个独立 Release**：
   - 动态矩阵构建（Matrix Strategy），支持并行处理不同镜像。
   - 命名规则规范：Tag 格式为 `img-<arch>-<sanitized_image_name>`。
3. **高效压缩与校验**：
   - 使用 `gzip -9` 实时管道压缩，大幅缩小体积，节约 Release 存储并防止超出限制。
   - 附带 `.tar.gz.sha256` 校验和文件，确保镜像文件完整性。
4. **增量与幂等检测**：
   - Push 触发时默认自动 diff 提取新增/变动行。
   - 自动检测该镜像 Release 是否已存在，避免重复构建消耗 Runner 时长；支持手动触发（`workflow_dispatch`）强制重新构建（`force_rebuild`）。
5. **详细 Release Notes**：
   - 每个 Release 自动生成表格：包含镜像名称、架构、来源文件、压缩前后大小、SHA256、Docker 加载说明等。

---

## 🛠️ 配置与使用步骤

### 1. 开启 GitHub Actions 写权限（必需）
因为工作流需要创建 GitHub Release 并上传 Assets，请确保：
1. 进入 GitHub 仓库页面，点击 **Settings**。
2. 依次选择左侧栏 **Actions** -> **General**。
3. 滚动到页面底部的 **Workflow permissions**。
4. 勾选 **Read and write permissions** 并点击 **Save**。

### 2. 编写镜像文件
在仓库根目录下的相应文件中添加镜像地址，每行一个：

- **`image_x86.txt`**：
  ```text
  alpine:3.20
  nginx:1.27-alpine
  redis:7.4-alpine
  ```

- **`image_arm.txt`**：
  ```text
  alpine:3.20
  node:22-alpine
  mysql:8.4
  ```

*注：支持以 `#` 开头的注释行以及空行，工作流会自动忽略。*

### 3. 提交与推送
```bash
git add image_x86.txt image_arm.txt
git commit -m "feat: add new images to export"
git push origin main
```
GitHub Actions 会自动触发工作流并开始打包发布！

---

## 📥 如何下载并加载导出的镜像

1. 在 GitHub 仓库的 **Releases** 页面下载对应的 `.tar.gz` 资源文件。
2. 使用以下命令导入到本地 Docker：

```bash
# 方式 A：直接通过 gzip 流式导入（推荐，免解压临时文件）
gzip -dc nginx-1.27-alpine_x86.tar.gz | docker load

# 方式 B：使用 docker load -i
docker load -i nginx-1.27-alpine_x86.tar.gz

# 校验镜像已成功载入
docker images
```

---

## 💡 进阶说明

- **Docker Hub 限流问题**：如果经常遇到 Docker Hub 429 限流错误，可在仓库 **Settings -> Secrets and variables -> Actions** 中添加 `DOCKER_USERNAME` 和 `DOCKER_PASSWORD`，工作流会自动执行登录以获得更高的拉取配额。
- **Release 单文件大小上限**：GitHub Release 单个 Asset 文件上限为 2GB。通过启用 `gzip -9`，绝大多数常见镜像压缩后均在 100MB~1GB 范围。
