<p align="center">
  <img src="packages/opencode/app.ico" alt="opencode-mod icon" width="64" height="64">
</p>
<p align="center"><strong>opencode-mod</strong> — 基于 <a href="https://github.com/anomalyco/opencode">opencode</a> v1.18.1 的 TUI 魔改增强版</p>

<p align="center">
  <a href="https://github.com/cymylive/opencode-mod/releases"><img alt="GitHub Release" src="https://img.shields.io/github/v/release/cymylive/opencode-mod?style=flat-square" /></a>
  <a href="https://github.com/cymylive/opencode-mod/releases/tag/v1.18.1-mod-20260715"><img alt="GitHub Release Date" src="https://img.shields.io/badge/release-20260715-blue?style=flat-square" /></a>
</p>

---

## 与官方版区别

| 功能 | 官方版 | 魔改版 |
|------|--------|--------|
| 侧边栏 | 仅显示模型选择 | 增强侧边栏：History + Model + MCP + Skill + 状态圆点 + 工作空间 |
| 会话管理 | - | 历史列表，删除/重命名，当前会话高亮 |
| MCP 管理 | 无 | 状态开关 + 备注 |
| Skill 管理 | 无 | 备注功能 |
| 会话状态 | 无 | 🟡 busy / 🟢 idle / 🔴 retry 圆灯，3 秒自动轮询 |
| 工作空间 | 无 | 显示所属工作空间 + 类型，`+w` 按钮快捷添加 |
| 状态栏 | 无 | LSP ● / MCP ● / Permission ▲ 指示器 |
| 100M 上下文 | 按模型限制 | 所有模型解锁 100M 上下文 |
| 消息气泡 | 纯文本 | User 标签 + 模型名 + 响应耗时 |
| 拖入文件 | 嵌入 base64 | jpg/png/pdf 直接插入绝对路径 |
| 自定义主题 | 默认主题 | +5 款主题（豆沙绿/霓虹/暖沙/晴空蓝/淡紫雾） |
| 自定义图标 | opencode 默认 | 自定义 app.ico |
| 自动标题提取 | 无 | 默认标题自动从首条消息提取文字，无需 AI 模型 |
| 更新提示 | 自动检查更新 | **已移除**，编译时禁用 |

## 下载

仅提供 **baseline 单文件** 版本（无需运行时），下载即可直接运行：

[▶ 下载 opencode-windows-x64-baseline.exe](https://github.com/cymylive/opencode-mod/releases/latest)

## 编译

```powershell
# bun 路径含中文会失败，先复制到 $env:TEMP
$bunDst="$env:TEMP\opencode-bun.exe"
Copy-Item -LiteralPath "path\to\bun.exe" -Destination $bunDst -Force

$env:OPENCODE_CHANNEL="release"
$env:OPENCODE_VERSION="1.18.1"
$env:OPENCODE_ICON="app.ico"
$env:RCEDit_PATH="rcedit.exe"

& $bunDst run packages/opencode/script/build.ts --single --baseline --skip-install
```

环境要求：Bun 1.3.14+，Python + `lief` 模块（用于图标嵌入）。

## License

AGPL-3.0 — 基于 [opencode](https://github.com/anomalyco/opencode) 开源项目修改。
