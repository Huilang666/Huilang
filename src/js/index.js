/**
 * DSH 情绪沙塔插件（dsh-emotion-tower）— 入口
 *
 * 核心机制：
 * 1. 注册给模型的查询工具（emo_query / emo_space / emo_set）
 * 2. 注册事件监听（对话时自动记录情绪）
 * 3. 定时晚间总结（每晚 23:00 触发融合/保护/衰减）
 * 4. 所有使用率严格 < 70%
 */
import { EmotionMemoryPool } from './memory/memory.js';
import { center_coordinate } from './vector/space.js';
import { coords_to_style, style_to_prompt } from './style/params.js';

/** 状态桶 */
function make_state(pool) {
  const state = pool.query();
  return {
    current_center: state.current_center,
    columns: state.attractors,
    usage: state.usage,
    depth_l: state.depth_l,
    style: coords_to_style(state.current_center),
    style_prompt: style_to_prompt(coords_to_style(state.current_center)),
  };
}

/** 工具：查询心情 */
const emq = {
  name: 'emo_query',
  describe: '查询当前情绪空间总览',
  schema: {},
  execute(ctx, args) {
    return make_state(ctx.emotion_pool);
  },
};

/** 工具：空间详细 */
const esp = {
  name: 'emo_space',
  describe: '空间柱状详细数据',
  schema: {},
  execute(ctx, args) {
    return ctx.emotion_pool.query();
  },
};

/** 工具：手动设置坐标 */
const est = {
  name: 'emo_set',
  describe: '手动设置情绪坐标',
  schema: {
    pos: { type: 'array', items: { type: 'number' }, minItems: 0, maxItems: 12 },
  },
  execute(ctx, args) {
    const pos = args.pos || center_coordinate();
    ctx.emotion_pool.apply_direct(pos);
    return { success: true };
  },
};

/** 入口：主框架调用 ctx */
export function apply(ctx, config) {
  const pool = new EmotionMemoryPool(config);
  ctx.emotion_pool = pool;
  // 注册工具
  ctx.tools.register(emq);
  ctx.tools.register(esp);
  ctx.tools.register(est);
  return { name: 'dsh-emotion-tower', version: '3.0.0' };
}
