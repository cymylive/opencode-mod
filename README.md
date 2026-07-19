<p align="center">
  <img src="packages/console/app/src/asset/logo-ornate-dark.svg" alt="OpenCode Mod logo" width="400">
</p>
<p align="center"><b>OpenCode 魔改增强版</b> — 基于 <a href="https://github.com/anomalyco/opencode">OpenCode</a> v1.18.3 的 TUI 深度定制版本。</p>
<p align="center">
  <a href="https://github.com/cymylive/opencode-mod/releases"><img alt="Release" src="https://img.shields.io/github/v/release/cymylive/opencode-mod?style=flat-square" /></a>
  <a href="https://github.com/cymylive/opencode-mod/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/cymylive/opencode-mod/total?style=flat-square" /></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-green?style=flat-square" /></a>
</p>

---

## ✨ 功能特性

### 🎨 UI 美化
- **增强侧边栏** — History 列表（最近 20 条/+ Show more 展开 50 条）、MCP 状态管理、Skill 列表、定时任务
- **顶置会话** — 点击 ☆ 顶置重要对话，顶置会话自动排序到顶部
- **实时状态灯** — 工作中 🟡 黄灯 / 空闲 🟢 绿灯 / 重试 🔴 红灯，每 3 秒自动刷新
- **自动标题提取** — 默认 `New session - ...` 自动显示为对话首句或友好日期 `New 07-19 18:42`
- **消息标签** — User 消息显示 `You` 标签，Assistant 消息显示模型名 + 耗时（秒）
- **彩色状态栏** — LSP 绿色圆点、MCP 青色圆点、Permission 警告三角、`/connect` 提示
- **对话框光条** — 弹窗顶部主色光条装饰
- **启动加载页** — Spinner 跟随主题色，左右边框装饰
- **首页美化** — 去除大 Logo，Prompt 输入框主色上下边框

### 🧩 侧边栏功能
| 功能 | 说明 |
|------|------|
| History 列表 | 同目录最近 20 条会话，按更新时间排序 |
| 当前会话高亮 | ▶ 标记 + 背景色高亮 |
| 删除会话 | 点击一次确认（3 秒超时），再点执行删除 |
| 重命名会话 | `r` 按钮打开 DialogPrompt 修改标题 |
| Model 选择 | 点击打开模型切换面板 |
| + New 按钮 | 快速跳转首页新建会话 |
| MCP 列表 | 显示所有 MCP 服务器状态，ON/OFF 切换，`m` 按钮添加备注 |
| Skill 列表 | 显示已注册 Skills，`m` 按钮添加备注 |
| 工作空间显示 | 会话下方显示所属工作空间，`+w` 按钮添加 |
| ☰ 触发按钮 | 浮动按钮展开/收起侧边栏 |
| ✕ 关闭按钮 | 侧边栏顶部关闭按钮 |
| 点击外侧关闭 | 点击主内容区自动关闭侧边栏 |

### 🚀 性能增强
- **100M 上下文解锁** — 全模型强制覆写 100M 上下文窗口，不受 `models.dev` 的 `limit.input` 限制
- **移除了更新提示** — 编译后的 exe 完全不包含更新检查，无弹出提示

### 🎭 主题系统（5 款自定义主题）
| 主题 | 背景 | 主色 | 风格 |
|------|------|------|------|
| `livecode` | `#c7edcc` 实心 | `#5b8c5b` | 豆沙绿护眼（浅色） |
| `livecode2` | transparent | `#00d4ff` | 深色霓虹磨砂（配合 Acrylic） |
| `livecode3` | `#f5efe8` 实心 | `#e8a87c` | 暖沙浅色 |
| `livecode4` | `#e8f4f8` 实心 | `#55bbee` | 晴空蓝浅色 |
| `livecode5` | `#f2ecf8` 实心 | `#a888dd` | 淡紫雾浅色 |

切换方式：`ctrl+p` → `/themes` → 选择主题

### 🛠 编译增强
- **自定义 exe 图标** — 支持 `OPENCODE_ICON` 环境变量嵌入自定义图标
- **rcedit + LIEF 双重处理** — 解决 Windows 图标 ID 问题，确保图标正确显示

---

## 📦 下载

直接从 [Releases 页](https://github.com/cymylive/opencode-mod/releases) 下载编译好的 exe：

| 文件 | 说明 |
|------|------|
| `opencode.exe` | Windows x64 版本（baseline，兼容旧 CPU） |

---

## 🔧 从源码编译

### 环境要求
- [Bun](https://bun.sh) 1.3+
- Windows x64

### 编译步骤

```powershell
# 1. 安装依赖
bun install --ignore-scripts
bun run --cwd packages/core fix-node-pty

# 2. 设置环境变量
$env:OPENCODE_CHANNEL = "release"
$env:OPENCODE_VERSION = "1.18.3-mod"
$env:OPENCODE_ICON = "app.ico"  # 可选，自定义图标

# 3. 编译（仅当前平台）
bun run packages/opencode/script/build.ts --single --baseline --skip-install
```

### 输出路径
```
packages/opencode/dist/opencode-windows-x64-baseline/bin/opencode.exe
```

### 开发模式
```powershell
bun run dev
```

---

## 🧩 与原版的差异

| 对比项 | 原版 OpenCode | 魔改版 |
|--------|--------------|--------|
| 侧边栏 | 基础功能 | 增强版（History/MCP/Skill/定时任务/顶置/Show more） |
| 消息显示 | 纯文本 | 带标签（You/模型名+耗时） |
| 状态栏 | 文字 | 彩色圆点+三角图标 |
| 对话框 | 无装饰 | 顶部主色光条 |
| 上下文限制 | 按模型定义 | 100M 强制解锁 |
| 更新提示 | 有 | 完全移除 |
| 自定义图标 | 不支持 | 支持 OPENCODE_ICON |

---

## 📝 License

基于 [MIT](LICENSE) 协议开源。修改自 [OpenCode](https://github.com/anomalyco/opencode)。
