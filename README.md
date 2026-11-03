# dsh-emotion-tower (情绪沙塔)

基于 L 层沙盒尖塔结构的连续情绪生成器。

## 设计理念

情绪不是离散的标签，而是 12 维空间中的坐标点。

情绪系统让 AI 角色拥有：
- **自主连续的情绪体验**：像人类一样感受喜怒哀乐，但作为 AI 的模拟
- **惯性/记忆**：过去经历会影响当前状态
- **深度细腻的情感**：不只是简单的情绪标记，而是连续的光谱

## 使用方法

### DSH 安装

- 将本目录放入 DSH 的 `node_modules` 中
- 在 `cordis.patch.yml` 中注册插件入口
- 确保 `@deepseek-ai/cordis` 已安装

### 设置系统

本插件支持以下配置项：

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `time_constant` | 记忆衰减时间常数（秒） | 5.0 |
| `max_events` | 记忆池最大神经元数量 | 100 |
| `compute_freq` | 坐标计算频率（秒） | 1.0 |
| `output_format` | 输出格式：json 或 numeric | json |

配置方式：
1. **安装时修改** `package.json` 中的 `config` 字段
2. **运行时查询**：调用 `emo_query` 工具查看当前状态
3. **运行时修改**：调用 `emo_set` 工具手动设置坐标

### 工具列表

| 工具名 | 用途 |
|--------|------|
| `emo_query` | 查询当前情绪坐标和所有柱子 |
| `emo_space` | 获取当前引力场坐标 |
| `emo_set` | 手动修改坐标（调试用） |

### 适用场景

适用于希望对话中的 AI 不"冷冰冰"，而能像真人一样有情绪温度、有记忆、有惯性。

## 架构

```
dsh-emo-core/
├── src/
│   ├── vector/
│   │   ├── space.ts       # 12维正交基底
│   │   └── attractor.ts   # 吸引子场/融合/保护机制
│   ├── style/
│   │   └── params.ts      # 风格参数映射
│   ├── memory/
│   │   └── memory.ts      # 情绪记忆池
│   ├── brain/
│   │   └── emotion-brain.ts   # 情绪计算核心（12维）
│   └── index.ts           # 插件入口
├── package.json
└── docs/
    └── DESIGN.md
```

## 文件说明

- **space.ts** — 12维坐标基础空间，定义维度与边界
- **attractor.ts** — 情绪吸引子、融合（MERGE）、时间保护机制
- **params.ts** — 将坐标映射为 LLM 风格参数
- **memory.ts** — 记忆池，管理神经元衰减
- **brain/emotion-brain.ts** — 核心计算：事件驱动情绪变化
- **index.ts** — DSH 插件入口，绑定工具、事件、定时器
- **package.json** — 出版信息，`main` 指向入口