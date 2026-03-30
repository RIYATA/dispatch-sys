# Dispatch Sys (数据派单与流转系统)

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-3-lightgray?logo=sqlite)](https://sqlite.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

Dispatch Sys 是一款专为社区网格化运营、装维及一线业务推广人员打造的 **“轻量化数据派单与流转追踪系统”**。它打通了从「运营端数据导入」到「一线业务员接单、执行、反馈」再到「数据统计看板」的全流程闭环。

## ✨ 核心功能 (Features)

- 📊 **智能数据解析与入库**
  - 支持多格式历史 Excel/CSV 报表导入上传（基于 `xlsx`）。
  - 内置 AI 解析（OpenAI 集成）及容错能力，自动兼容不规则的表头及脏数据清洗。
- 🎯 **一键派单与任务分配**
  - 根据社区（如：江山御花园智社）或网格标签，自动或手动将营销/装维任务分配给指定的社区合伙人（CP/业务员）。
  - 生成唯一任务二维码（基于 `qrcode.react`），业务员扫码即可快速查看并认领任务。
- 📝 **现场反馈与状态追踪**
  - 业务员在移动端提报跟进进度与状态反馈。
  - PWA（渐进式 Web 应用）支持，一线人员可将网页直接“安装”到手机桌面，离线缓存优先加载（Network-first 策略）。
- 📈 **数据可视化看板**
  - 管理后台呈现任务完成率、反馈数据走势（基于 `Recharts`）。
  - 支持复杂条件检索及批量任务清空撤回等管理操作。

## 🛠️ 技术栈 (Tech Stack)

- **前端/框架：** `Next.js 16 (App Router)` + `React 19` 
- **样式方案：** `Tailwind CSS v4` + `clsx` + `tailwind-merge` + 响应式布局 & 暗黑模式支持
- **数据库/后端：** 纯 Serverless 架构，使用 Next.js API Routes 直接连接本地 `better-sqlite3` 数据库，极致轻量部署。
- **数据可视化：** `Recharts` (统计图表)
- **工具链：** `TypeScript` + `ESLint` + `next-pwa`

## 🚀 快速启动 (Getting Started)

1. **克隆项目并安装依赖**
   ```bash
   git clone https://github.com/yourusername/dispatch-sys.git
   cd dispatch-sys
   npm install
   ```

2. **数据库初始化（开发环境）**
   系统基于本地 SQLite。你可以运行内置脚本自动建库建表：
   ```bash
   node scripts/inspect_db.js
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```
   打开 [http://localhost:3000](http://localhost:3000) 即可预览。

## 📂 核心目录结构 (Project Structure)

```text
├── app/               # Next.js App Router 前端页面及后端 API 接口 (api/tasks/* 等)
├── components/        # 封装的 React 组件 (图表、对比卡片、任务列表等)
├── lib/               # 核心逻辑及工具函数 (TS 验证、OpenAI 调用、工具类)
├── scripts/           # Node.js 运维脚本 (如查库 inspect_db, 脏数据处理 test_parse)
├── public/            # 静态资源及 PWA 配置文件
├── dispatch.db        # SQLite 本地数据库
└── package.json       # 项目依赖及系统脚本
```

## 💡 业务落地场景

最初作为辅助网格化地推团队的利器开发。有效将原本依靠微信群发 Excel、人工统计反馈的低效模式，升级为**“扫码接单 - 移动端展示海报报价 - 在线反馈 - 后台自动统计”**的数字化、标准化流水线。
