# AFY Studio

本地 AI 工作区，支持聊天、编码和可视化工作流，提供 Windows 桌面应用及 Web 界面。

## 开发

使用 Node.js 24 或更高版本。

```sh
npm ci --ignore-scripts
npm rebuild node-pty
npm run dev
```

前端 `http://localhost:8649`，开发后端端口 8647。

## Windows 打包

在 GitHub Actions 中运行 **AFY Studio Windows Build**，选择 x64 或 ARM64，从该次运行的 Artifacts 下载安装器。此流程不发布 Release 或更新源。

内置本地 Agent 可直接使用；Hermes 与其他 Coding Agent 使用服务器上已有的安装。本版本移除应用更新、托管运行时/模型下载、云端及手机中继、硬件功能和合作服务。

包标识、命令、API 格式与数据路径保持兼容。详细说明见 [OEM 实施记录](docs/oem/IMPLEMENTATION.md)，许可与第三方署名保留在原文件中。
