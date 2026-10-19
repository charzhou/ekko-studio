# OEM 品牌与原项目关联标识清单

> 历史探索快照：以下数量与行号对应原始版本。当前 AFY Studio 改造见 [实施记录](IMPLEMENTATION.md)。

探索日期：2026-10-19。分支：`oem`。源码版本：`0.7.36`。基线提交：`dfca4ba7f9cd9c5ad66187eb326301043e097898`。

本轮只创建分支和清单，未替换名称、图标、域名、密钥、许可证、协议或数据目录，未打包、推送或发布。这里的“建议”是后续改造的分类依据，不是已经执行的修改。

## 1. 先看这些结论

1. 当前产品品牌是 **Ekko Studio**，旧品牌 **Hermes Studio / Hermes Web UI** 尚大量存在；应用身份还保留 `com.hermeswebui.studio`、`hermes-studio`。仅替换页面标题不能完成 OEM。
2. 原所属方标识主要为 **EKKOLearnAI**；历史 Docker 镜像还有 **ekkoye8888/hermes-web-ui**。本地 Git remote 已指向 `charzhou/ekko-studio`，但应用内的更新、下载、官网、APK、公告和中继地址仍指向原方。
3. 优先审查实际服务依赖：**自动更新、运行时/语音下载、App 与设备中继、App 授权公钥、版本清单、公告、模型请求归属头**。改 Git remote 或 `homepage` 不会自动改变这些入口。
4. **APIKEY.FAN、推广码 LIBAPI** 是明确的预置商业服务关联，涉及界面、Provider 预设、图片生成、用量查询和启动迁移；源码不足以证明它与原方的法律所属关系。
5. **Hermes Agent / Nous Research、OpenClaw、第三方 Coding Agent 与模型供应商** 是实际依赖或素材来源，应与 Studio 自身品牌区分；禁止把检索结果当作全局替换指令。
6. 根 `LICENSE` 当前声明 BSL 1.1，许可方 `EKKOLearnAI`，附加授权写明商业使用需另行取得商业许可，转换日期为 **2029-05-10**。本清单保留并记录这些原文，不因 OEM 意图而修改声明。

## 2. 扫描范围、数量与查阅方式

扫描所有 2,761 个已跟踪及未忽略的仓库文件（本清单目录自身排除），包含隐藏的 `.github`、测试、lockfile、生成的 OpenAPI、文档、技能和固件。跳过二进制内容，并另外列出图像候选；未扫描 `.git` 历史、忽略的依赖/构建目录、本机用户配置、线上服务或未包含在本仓库的移动 App 源码。

| 检索分类 | 文件数 | 命中行数 | 匹配次数 | 含义 |
| --- | ---: | ---: | ---: | --- |
| 产品名称及其旧写法 | 451 | 3,490 | 3,893 | Ekko Studio / EkkoStudio / ekko-studio / Hermes Studio / Hermes Web UI / hermeswebui 等 |
| 所属方、历史镜像账号与第三方署名 | 68 | 148 | 152 | EKKOLearnAI、ekkoye8888、CharZhou、Nous Research、OpenClaw Foundation；不代表同属一家 |
| 所有 Ekko / Hermes 字样 | 1,598 | 22,550 | 26,114 | 包含目录、类型、真实 Agent 名、环境变量与测试，不能按此数量直接替换 |
| 商业服务与推广关联 | 34 | 116 | 140 | apikey.fan / apikey.fun / LIBAPI |
| 补充协议、设备前缀 | 8 | 17 | 17 | HSC1、HGC1、HSTUDIO、hstudio_*、sk-ekko-、ekko_r1. |

各分类有重叠；总候选文件 **1,789** 个（含仅路径命中），总命中行 **22,698**。另列出 **45** 个图像候选、**12** 个许可/署名文件、**245** 个环境变量样式的标识（包括内部常量和测试标识，不等于 245 个可配置环境变量）。这些统计是词法扫描结果，不是待改文件数或改造工时。

- [逐文件索引](FILE_INDEX.md)：产品、署名、合作服务的文件清单，以及图像、许可候选列表。
- [完整机器清单](branding-inventory.json)：所有候选文件的逐行记录、匹配分类、品牌 URL、环境变量样式标识和跳过的二进制路径。
- [扫描脚本](scan-branding.mjs)：只读源码、重建 JSON 和索引，无第三方依赖。运行 `node docs/oem/scan-branding.mjs`。

JSON 的 `files[].hits` 每项为 `[源码行号, {分类: 本行实际匹配的词}]`；没有复制整行源码或凭证。`brandedUrls` 给出地址与来源行；地址清单同时包含文档、测试和默认配置，不能据此推断每次启动都会联网。

## 3. 用户可见品牌与界面入口

| 编号 | 当前标识/入口 | 代表位置 | OEM 处理范围 |
| --- | --- | --- | --- |
| UI-01 | 标签页、Apple Web App 名称 `Ekko Studio` | `packages/client/index.html:12,14` | 主标题、主屏幕名称与 HTML 启动页 |
| UI-02 | PWA name / short_name / description | `packages/client/public/manifest.webmanifest:2` | 安装式 Web App 的名称及描述 |
| UI-03 | 运行时动态标题、启动失败标题 | `packages/client/src/views/hermes/ChatView.vue:37`；`packages/client/src/main.ts:79` | 静态 HTML 改名后仍可能被运行时代码覆盖；错误兜底页也需处理 |
| UI-04 | 12 个 locale 的品牌、登录、权限、迁移、更新、通知、推送和语音文案 | `packages/client/src/i18n/locales/*.ts` | locale 内有 282 次 `Ekko Studio`；同时存在旧 Hermes 文案，所有语言须统一 |
| UI-05 | `Ekko Studio Mobile`、原版 App 下载 | `packages/client/src/components/hermes/connections/AppConnectionsPanel.vue:47,48,710` | 手机页面标题、二维码、APK 文件名与来源 |
| UI-06 | `Studio v...`、官网与 GitHub 入口 | `packages/client/src/components/layout/SidebarAccountControls.vue:129,142,172` | 通用短称、外部链接与版本展示 |
| UI-07 | `Ekko AI`、`Ekko · Agent troubleshooting` | `packages/client/src/i18n/locales/en.ts:677,679` | 内置助手的显示名；是否连同 Ekko Agent 品牌一起替换需单独决定 |
| UI-08 | “Every idea deserves a good partner.” / “每个想法，都有一个好搭档。” | `packages/client/src/i18n/locales/en.ts:1342`；`zh.ts:1342` | 产品标语，字面上不含原产品名，普通名称搜索会遗漏 |
| UI-09 | `Little Box` / `小方盒`、硬件购买入口 | `packages/client/src/i18n/locales/en.ts:780`；`zh.ts:780`；`components/hermes/connections/McuDevicesPanel.vue:20` | 取决于是否继续提供原硬件业务 |
| UI-10 | `hermes-web-ui`、`ekko-studio cli update` 等救援/升级命令 | `packages/client/src/views/LoginView.vue:104,106`；`components/layout/VersionManagementModal.vue:349` | 跟随实际 CLI 规划，不能仅改显示导致命令失效 |
| UI-11 | 桌面窗口、托盘菜单、下载/启动/失败页、麦克风授权提示 | `packages/desktop/src/main/index.ts`；`desktop-i18n.ts`；`packages/desktop/electron-builder.yml:92` | 桌面有独立语言资源，前端 locale 改名不会覆盖这一层 |

语言文件：`ar`、`de`、`en`、`es`、`fr`、`ja`、`ko`、`pt`、`ru`、`tr`、`zh-TW`、`zh`。较少命中的语言还可能由英文 fallback 补齐，不应遗漏。

## 4. 图片、图标、动图与截图

| 编号 | 资源 | 发现/后续处理 |
| --- | --- | --- |
| ART-01 | `packages/client/public/logo.png`、`logo-original.png` | 产品人物形象；HTML、登录、共享群聊、手机页、加载组件共用；原图为 RGB，不能假定透明 |
| ART-02 | `packages/client/public/favicon.ico` | 多尺寸 favicon；还有 Apple/PWA 对 logo 的引用，须一起替换 |
| ART-03 | `packages/client/public/logo-loading.css` | 将 logo 用作 mask，不能只搜索 `<img>` |
| ART-04 | `packages/client/public/coding-agents/ekko-agent.png` | 与产品人物形象关联；需决定 Agent 是否单独改名换图 |
| ART-05 | `packages/client/src/assets/thinking.gif` | 首帧含同一人物，运行中的思考状态会显示；`LiveReasoningStatus.vue:4` 引入 |
| ART-06 | `packages/client/src/assets/image.gif` | 旧应用录屏，首帧标题为 Hermes Studio；当前未找到代码引用，仍是仓库历史宣传素材 |
| ART-07 | `packages/client/public/relay-logo.png` | AK 合作服务图标；中转页、导航栏、侧栏均有入口 |
| ART-08 | `packages/desktop/build/{icon.png,icon.ico,icon.icns,iconLinux.png,iconWindows.png}`、`icons/*.png`、`tray*.png` | 各平台安装器、应用、托盘与尺寸衍生图；应从自有源图重新生成 |
| ART-09 | `packages/desktop/build/icon.icon/` | macOS Icon Composer，含 `Assets/hermes-logo.png` 和 `Ekko Studio` 图层文字 |
| ART-10 | `packages/tos/icon.svg` | NAS/TOS 图标 |
| ART-11 | `docs/screenshots/overview/*.png` | 含 Ekko 品牌、人物头像、左侧 AK 入口；应在 OEM 版上重新截图 |
| ART-12 | `docs/screenshots/link-opening-preference/*.png` | 代表图 `default.png` 仍可见 Hermes Studio；二进制文字无法由 rg 穷尽 |

`public/coding-agents/` 的 Hermes、Claude、OpenAI、Cursor 等图标对应真实第三方能力，不与 OEM 产品 logo 混作一类。图像列表是候选资产清单；本轮仅对代表资源和 GIF 首帧做视觉核对，未对全部帧、二进制元数据或全部截图做 OCR。

## 5. 原方网络服务、下载与推广入口

| 编号 | 当前值 | 代表位置 | 影响/建议 |
| --- | --- | --- | --- |
| NET-01 | `download.ekkolearnai.com/latest`，备用 `github.com/EKKOLearnAI/ekko-studio/releases/latest/download` | `packages/desktop/src/main/updater-source.ts:4,5` | 桌面升级内容仍来自原方；只改 electron-builder 的 publish.url 不够，OEM 必须选择自己的 feed 或明确关闭策略 |
| NET-02 | `publish.url: https://download.ekkolearnai.com` | `packages/desktop/electron-builder.yml:11` | 打包内嵌更新元数据也要与实际 updater 一致 |
| NET-03 | 默认下载域名及仓库 `EKKOLearnAI/ekko-studio` | `packages/desktop/src/main/runtime-manager.ts:47,48` | Hermes runtime 获取/更新；替换源时必须配套 manifest、checksum 和平台资产 |
| NET-04 | 同域名的 Web UI 更新和本地语音模型 | `packages/server/src/modules/hermes/services/runtime/version-manager.ts:17,18`；`modules/studio/services/voice/stt/local-model-manager.ts:15,16` | 后端与桌面有各自下载配置，需同时检查 fallback |
| NET-05 | `api.ekkostudio.xyz`、`cn.ekkostudio.xyz` | `packages/server/src/modules/studio/public/config.ts:86,89`；`services/app-relay/route.ts:7` | 远程设备/App 中继；默认配置不等于所有启动都会发送请求；若保留业务能力需部署对应服务 |
| NET-06 | `api.ekkostudio.xyz/api/studio/versions`；备用 `ekkostudio.xyz/versions.json` | `packages/client/src/api/studio/versions.ts:1`；`packages/server/src/modules/hermes/services/runtime/version-manager.ts:15,16` | 前端手机信息与后端版本清单分别取数；仅覆盖后端主 URL 仍会留下 fallback |
| NET-07 | `api.ekkostudio.xyz/api/studio/announcements` | `packages/server/src/modules/studio/services/notifications/announcements.ts:1` | 公告标题、内容及行动链接可动态带入原品牌，静态换字不能解决 |
| NET-08 | `ekkostudio.xyz`、`/pricing/`、硬件说明/购买页 | `SidebarAccountControls.vue:142`；`AppConnectionsPanel.vue:36`；`McuDevicesPanel.vue:20` | 官网导航、App 权益购买、硬件业务入口 |
| NET-09 | 原仓库和下载站的 `Ekko Studio.apk` | `AppConnectionsPanel.vue:47,48` | 本仓库不含完整移动 App 源码；保留该入口仍会下载原版手机 App |
| NET-10 | `ekkostudio.xyz/agents.json`、原站 Coding Agent 图标 | `docs/app-agent-catalog.md:4`；`config/agents.json:310,338,366,394,421,449` | App catalog 发布地址及远程图标，单纯 fork 仓库不会换源 |
| NET-11 | `HTTP-Referer: https://ekkostudio.xyz`、`X-OpenRouter-Title: Ekko Studio` | `packages/ekko-agent/src/model/openrouter-attribution.ts:2,3` | 请求 OpenRouter 时的应用归属信息；Hermes Bridge 另有环境变量注入路径 |
| NET-12 | `apikey.fan/register?aff=LIBAPI` | `packages/client/src/views/hermes/ApiRelayView.vue:70`；`components/hermes/models/ProviderFormModal.vue:132,133` | 伙伴注册入口和推广码，需明确保留/替换/移除 |
| NET-13 | `fun-codex`、`fun-claude`、`api.apikey.fan` | `packages/server/src/modules/studio/contracts/providers.ts:33,48`；`controllers/media.ts:40,107` | 预设模型中转与图片 fallback；还有专属用量查询和 `apikey.fun → apikey.fan` 启动迁移 |
| NET-14 | `EKKOLearnAI/ekko-studio-update-test` | `packages/desktop/scripts/publish-update-test.mjs:14`；`.github/workflows/desktop-update-test.yml:42` | 测试包发布目的地；需要自有测试仓库与 token，不是生产版正常启动的回连 |

以上记录的是源码默认值、链接或调用能力，不是抓包结论，也不说明模型数据默认会上传到原方。未做运行时联网审计。JEV 的 `api.typesafe.ai`、Petdex 资源源、真实模型 API、OAuth、STUN、Node/Python/Git/sherpa 下载等属于另外的第三方依赖面，不能仅因 OEM 就认定为原方服务。

## 6. 应用身份、包名、命令与发行流程

| 编号 | 当前值 | 位置 | 耦合与建议 |
| --- | --- | --- | --- |
| DIST-01 | npm `ekko-studio` 与兼容发布名 `hermes-web-ui` | 根 `package.json`；`scripts/pack-npm-releases.mjs:11,21`；`publish-npm-releases.mjs` | 发布脚本含双包和包名校验，不能只改 manifest |
| DIST-02 | CLI `ekko-studio-web`、`hermes-web-ui`、`ekko-studio-mcp`、`hermes-studio-mcp`、`hermes-web-ui-mcp` | 根 `package.json:38`；`bin/` | 用户命令、npm bin、内部脚本引用和帮助文案需同步 |
| DIST-03 | Electron package `hermes-studio`，productName `Ekko Studio` | `packages/desktop/package.json:2`；`electron-builder.yml:2` | 旧包身份和显示名故意分开；`desktop-identity.ts` 固定旧 userData。`scripts/electron-builder.mjs:18` 还对 deb 强制设置 productName / executableName 为 `hermes-studio`、desktop 显示名为 `Ekko Studio`，只改 YAML 无效 |
| DIST-04 | appId `com.hermeswebui.studio`，desktopName `com.hermeswebui.studio.desktop` | `electron-builder.yml:1`；`packages/desktop/package.json:3`；`src/main/index.ts:68` | Windows AppUserModelId、Linux desktop 文件和启动项；独立 OEM 与原版并存通常需独立身份 |
| DIST-05 | author `Ekko Studio Contributors`、邮箱 `noreply@hermes-studio.local`、原 homepage | `packages/desktop/package.json:5` | 包属性、发布者信息与说明；不能覆盖应保留的版权/许可证 |
| DIST-06 | `Ekko.Studio-${version}-${arch}.${ext}` | `packages/desktop/electron-builder.yml:93,100,111` | 安装包/zip/dmg 文件名；Actions 下载 glob、mac 更新清单正则必须一起修改 |
| DIST-07 | 桌面 CLI `ekko-studio`、fish 文件 `ekko-studio.fish` | `packages/desktop/src/main/cli-shim.ts` | 实际写入 PATH/shim；旧 alias 清理、shell marker、help 同样相关 |
| DIST-08 | 安装时清理 `Ekko Studio.exe` / `Hermes Studio.exe`、旧启动项与 updater cache | `build/installer.nsh:8,12`；`src/main/login-item-migration.ts`；`updater-helpers.ts:22` | 独立 OEM 不能不加区分地关闭、迁移或清理原版进程与数据 |
| DIST-09 | TOS id `com.hermeswebui.studio`；package/system_id/user `ekko-studio-tos`；publisher `EKKOLearnAI` | `packages/tos/config.json:2`；`scripts/pack-tos-deb.mjs:257,292` | NAS 应用、服务账号、systemd、安装路径一起规划；pack 脚本 `:75,257,258,292,294` 还硬编码显示名、官网、原 GitHub、Maintainer 和 Description，仅改 config.json 不够 |
| DIST-10 | Docker service/container `hermes-webui`、本地镜像 `hermes-web-ui-local`、发布镜像 `hermes-web-ui` | `docker-compose.yml`；`.github/workflows/docker-publish.yml` | 部署资源名、镜像仓库和发布 secrets |
| DIST-11 | 历史镜像 `ekkoye8888/hermes-web-ui` | `packages/ekko-agent/skills/hermes-studio-installation/references/studio.md:55,71,72` | README/技能也可能教用户拉原版，不能仅检查运行代码 |
| DIST-12 | `hermes-web-ui-<version>.tar.gz/.json` 与 `hermes-runtime-*` | `.github/workflows/webui-release.yml`；`packages/desktop/scripts/runtime-asset-name.mjs`；后端 version-manager | 资产命名、内包 CLI 检查、下载器和发布工作流相互依赖；Hermes runtime 格式不必随首轮显示品牌改名 |

Windows NSIS、macOS 更新清单合并、Linux 包生命周期、TOS 与更新测试是分开的流程。更名后应逐一验证，不应只验证 Windows 安装器能生成。

## 7. 持久化、协议与兼容标识

这些项目可对外暴露旧名称，但不能按文案直接替换。先决定“独立新应用”还是“接管/导入旧版数据”。

| 编号 | 当前标识 | 代表位置 | 改动风险 |
| --- | --- | --- | --- |
| COMP-01 | `HERMES_WEB_UI_HOME` / `HERMES_WEBUI_STATE_DIR`、`~/.hermes-web-ui` | `packages/server/src/modules/studio/public/config.ts:53`；桌面 `paths.ts`；CLI | token、凭据、上传、运行时与日志根目录；改名可能让用户看不到旧数据 |
| COMP-02 | `hermes-web-ui.db` / `.json`，`.ekko/ekko.db` | `modules/studio/infrastructure/database/index.ts:19`；`packages/ekko-agent/src/directories.ts:86` | 生产/开发数据路径有例外；Ekko 自己还有独立配置、记忆和会话数据 |
| COMP-03 | `hermes_api_key`、`hermes_server_url`、`hermes_active_profile_name` | `packages/client/src/api/client.ts:5,25,29` | 浏览器认证与 Profile；换名会表现为退出登录或切回默认配置 |
| COMP-04 | `hermes-*` 主题/语言/语音/草稿/布局键，公告与通知锁 | client 的 theme/i18n/chat/group-chat/notification utilities | HTML 启动预读、跨窗口协调和迁移代码必须一致；245 个环境变量样式标识另见 JSON |
| COMP-05 | 本地 JWT `aud=hermes-studio` | `modules/studio/middleware/auth.ts:62` | 改名会使旧 token 失效 |
| COMP-06 | App entitlement issuer `hermes-studio-server`、audience `ekko-studio`、内置 RSA 公钥 | `modules/studio/services/auth/app-entitlement.ts:3,10,68` | 默认要求云授权；自有服务需要配套签发/验签与身份体系，不能只改域名 |
| COMP-07 | `/api/ekko-studio/models/v1`、`sk-ekko-`、`ekko_r1.` | `modules/studio/routes/model-api.ts:8`；`services/model-api/keys.ts:6`；`reasoning.ts:8` | 模型 API 路径、密钥解析/生成、reasoning 编码需共同兼容 |
| COMP-08 | `hermes-studio.app-connection`、`HSC1`、`hermes-studio://share/session` | App 连接 controller/client；`docs/session-share-tokens.md:99` | 二维码、分享、移动端协议；本仓库不包含对应 App 全部实现，无法保证单仓改名后互通 |
| COMP-09 | `hermes-studio.workflow`、`ekko-studio-theme` | `services/workflow/portability.ts:4`；`packages/shared/theme-archive.ts:3` | 已导出工作流/主题的导入格式，应考虑接受旧格式 |
| COMP-10 | `window.hermesDesktop`、`hermes-desktop:*`、`hermes:open-desktop-browser-panel`、`hermes.group-chat.*` | 前端 `utils/desktop-bridge.ts`、`desktop-browser.ts`；desktop preload | IPC、自定义事件和跨窗口消息需两端同步 |
| COMP-11 | `/hermes/*`、`/ekko/*`、`X-Hermes-Profile` | router、API helper、service worker、server controller | 书签、通知路由、API Profile 隔离、第三方调用可能依赖 |
| COMP-12 | `hermes.discover` / `hermes.announce`、role `hermes-studio` | `services/network/lan-discovery.ts`；App/global-agent relay | LAN 发现及远端握手协议，MCU/移动 App 需同步 |
| COMP-13 | `hermes_web_ui_version`、`X-Hermes-Studio-Canonical-Path`、旧 `/api/hermes/*` | system-info、devices-store、`middleware/legacy-app-api.ts` | API 字段、数据库列和已发布固件的兼容接口 |
| COMP-14 | `ekko` / `ekko-agent` / `ekko_agent` 的 runtime/history source | `modules/studio/contracts/history-source.ts:1` 等 | 实际运行时枚举和会话归属，不能只换 UI 名称后改持久化 ID |

环境变量改名建议保留兼容映射；但新 OEM 的默认应用目录、更新缓存、CLI 与注册项应避免无意接管原版。保留 `.hermes` 作为真实 Hermes Agent 数据目录与保留 Studio 旧目录，是两个不同决定。

## 8. 模型可见品牌、MCP 与注入管理身份

| 编号 | 标识 | 代表位置 | OEM 影响 |
| --- | --- | --- | --- |
| AI-01 | `You are Ekko Agent...` | `packages/ekko-agent/src/runtime/system-prompt.ts:22` | 即使 UI 已换名，模型仍可能自称 Ekko |
| AI-02 | `Ekko Studio` 操作说明、群聊总结维护者身份、memory 示例 | `packages/server/src/modules/studio/public/runs/prompt.ts:147`；`services/group-chat/room-summary.ts:93`；`packages/ekko-agent/src/memory/tools.ts` | 模型能看到并可能复述的品牌；提示词中还有 `/Users/ekko/Desktop` 示例 |
| AI-03 | MCP server `ekko-studio-api/browser/devices/use/interaction`，旧 `hermes-studio-*` | Hermes `services/mcp/studio-autoinject.ts`；Ekko `services/mcp.ts`；Coding Agent `services/index.ts` | 会写入多个外部 Agent 配置，需同步处理旧配置识别 |
| AI-04 | `ekko_studio_*`、`mcp__ekko_studio*`、旧 aliases | `bin/ekko-studio-mcp.mjs`；Coding Agent `protocol/adapters/responses.ts` | 外部调用和模型工具 schema 依赖名称，需整体迁移或兼容别名 |
| AI-05 | `HERMES_WEB_UI_MANAGED_MCP`、managed owner marker | 上述 MCP factories；`services/mcp-manager.ts` | 用于区分用户配置和 Studio 管理配置，随意改名会失去旧配置归属 |
| AI-06 | provider ID `hermes-studio`，DSH `ekko-studio` 与 stream plugin，Cursor plugin | Coding Agent `services/index.ts`、opencode/grok/dsh/cursor 相关配置 | 外部 CLI 的 provider、模型 ID 和 plugin 依赖这些值 |
| AI-07 | Pi 旧 AAD `hermes-studio/pi-proxy-target/v1` | `modules/coding-agents/services/index.ts:81` | 兼容解密标识，直接删除会影响已保存目标配置 |
| AI-08 | `BEGIN HERMES WEB UI PROMPT`、Grok scoped identity block | Coding Agent `services/prompt-file.ts:5`；`services/grok/config.ts:36` | 外部提示词归属边界；必须能识别旧块，避免重复注入 |
| AI-09 | `.webui-managed-skills.json`、owner `hermes-web-ui` | Hermes `services/skills/injector.ts:8` | 已注入技能的归属和更新关系 |
| AI-10 | `hermes-studio-installation`、6 份内置 skill 的 `author: Ekko` | `packages/ekko-agent/skills/hermes-studio-installation/`；`packages/skills/*/SKILL.md:5` | 技能名、说明与安装教程；原版权与许可单独保留处理 |
| AI-11 | UA `hermes-studio`、`hermes-web-ui/*`、`Ekko Agent`；TTS `X-TTS-Engine: hermes-studio` | providers/auth/runtime/petdex；`controllers/tts.ts:561`；`packages/ekko-agent/src/model/authorized-providers.ts:102` | 网络可见归属标识；部分 OAuth/兼容头不能未经验证替换 |

## 9. ESP32-C3、移动 App 与硬件范围

固件 v1/v2 均有原品牌，以 `packages/esp32-c3/v2/src/main.cpp` 为例：

| 标识 | 位置 | 处理范围 |
| --- | --- | --- |
| `Ekko Studio-WIFI` | `:66,6374` | 配网热点名称 |
| OLED `HSTUDIO` | `:785` | 屏幕显示 |
| `hstudio_esp32c3_`、`hstudio_mcu_` | `:1188,1198` | 硬件身份及绑定，改前缀可能被当成新设备 |
| 默认服务 `https://api.ekkostudio.xyz` | `:121` | 设备远端发现/连接服务 |
| `Ekko Studio ESP32-C3` | `:2805,2862,3037,3063,6282` | 配网、设备、OTA 网页与请求身份 |
| `X-Hermes-Device-*`、`X-Hermes-Mcu-*`、`X-Hermes-Profile` | `:3238,3239,5021,5023,5025` | 与后端共享协议头 |
| `hermes.announce` / `hermes.discover` / role `hermes-studio` | `:2286,2655,5913` | LAN/远端协议 |
| UA `Ekko Studio-ESP32C3`、启动日志 | `:6251,6588` | 网络与串口可见品牌 |

还需同步两个 `manifest.json`、README 与构建/OTA 流程。若 OEM 暂只做 Windows 桌面，可将固件、NAS、Docker 与移动 App 作为范围外功能先记录，不能误认为已完成全平台改名。

## 10. 许可、署名与真实第三方名称

- 根 [LICENSE](../../LICENSE#L5) 写明许可方与 Licensed Work 名称，以及商业使用限制和转换日期。这些是许可声明，不能与产品 UI 字符串一起机械替换。本轮没有判断用户是否已另获授权，也不据此阻止探索。
- `packages/ekko-agent/skills/THIRD_PARTY_NOTICES.md` 记录 **OpenClaw Foundation**、**Nous Research** 的原素材来源与 MIT 声明。
- `docx/pdf/powerpoint/xlsx/ocr-and-documents/document-to-action-items` 等目录有单独 LICENSE；fixture 还有 `UPSTREAM-LICENSE`，原署名应单列审查。
- `Hermes Agent`、`NousResearch/hermes-agent`、Docker 基础镜像 `nousresearch/hermes-agent:latest`、`.hermes`、Nous Portal/OAuth 是真实上游依赖，不等同旧 Studio 品牌。
- OpenAI、Claude、Codex、Grok、Pi、DeepSeek、Cursor、OpenCode 等标识对应具体服务和 Agent；保留集成时通常也要保留准确的能力归属。
- 合作服务、素材来源、模型供应商之间的法律关系不能由字符串相似性判断；本清单只记录仓库明确出现的名字与来源。

## 11. 测试、生成物与后续决策

### 需要一起维护的验证点

- `tests/server/studio-package-identity.test.ts`、`tests/desktop/desktop-identity.test.ts`、`app-icon.test.ts`、`cli-shim.test.ts`、updater 与 startup migration 测试。
- `tests/client/studio-version-manifest.test.ts`、`ekko-display-name.test.ts`、`studio-announcements.test.ts` 和相关 Playwright 用例。
- `scripts/harness-check.mjs` 对品牌历史、发布包、下载/更新源有显式断言；不能只删断言让 OEM 通过，应同步新的身份设计与回归测试。
- 根和 desktop 的 lockfile、`docs/openapi.json`、Ekko `docs/API.md` 属生成/派生内容，应从相应源生成，不能仅手工替换输出。
- `.github/workflows` 中安装包名称匹配、下载来源、Docker/npm 发布命名空间、更新测试仓库和签名 secrets 需同步规划。

### 后续开始改造前需要明确的事项

1. 自有产品名、简称、公司/作者展示信息、logo 与图标源文件。
2. 只做 Windows x64，还是连同 ARM64、macOS、Web、Docker、NAS、移动 App、硬件一起做。
3. 独立安装共存，还是允许从原版显式导入数据；这决定 appId、目录、CLI、启动项与迁移边界。
4. 是否保留 Ekko Agent 名称，是否保留 Hermes Agent 集成；两者与 Studio 主品牌可以分别决策。
5. 自有更新、下载、官网、公告服务；是否继续提供 App/远程设备/分享和云授权能力。
6. APIKEY.FAN 预设、推广入口、原移动 App 和硬件购买功能的取舍。
7. 当前商业许可及第三方声明的处理方式，签名证书与包发布账号。

建议实施顺序：先确定独立应用身份与服务边界，再处理可见品牌/美术，然后完善持久化/协议兼容及发布链路。此轮没有开始这些改造。

## 12. 本轮验证与边界

- 创建并确认 `oem` 分支。
- 原始源码基于 `git ls-files` 加未忽略的新文件扫描，排除本目录以避免清单自我计数；索引与 JSON 可重新生成。
- 数量通过扫描结果核对；文档引用检查文件存在性。匹配来源仍需逐项语义判断，不能证明每一个 `Hermes` 都是品牌。
- 未安装依赖、未启动应用、未抓包、未构建安装包、未修改任何运行时代码或美术资源。
- `node --check docs/oem/scan-branding.mjs` 通过；已核对索引链接、JSON 行号与来源文件，并验证重复生成结果一致。
- 已尝试 `npm run harness:check`，但当前未安装 `node_modules`，检查在加载阶段因缺少 `typescript`（`ERR_MODULE_NOT_FOUND`）退出，未进入规则验证。未验证 Windows、移动 App、硬件或原线上服务的运行行为。
