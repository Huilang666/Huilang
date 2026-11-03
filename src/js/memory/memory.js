/**
 * 情绪记忆池 — 基于 L 层沙盒尖塔结构
 *
 * 核心逻辑：
 * 1. 每段对话都是一个事件，被最近的 L0 吸引子记录（frequency + strength 增长）
 * 2. 每晚（或到 N 个事件后）对同层近距离的柱子做一次融合，升入 L+1 层
 * 3. 所有柱子的总使用率永远 < 70%，永不突破
 * 4. 越后的 L 层强度越低（梯度权重衰减）
 * 5. 长时间不读的事件/柱子逐渐过期
 */

import { AttractorField } from '../vector/attractor.js';
import { center_coordinate, validate_coordinate } from '../vector/space.js';

/** 池子默认配置 */
const MEMORY_DEFAULT_CONFIG = {
  time_constant: 5.0,
  max_events: 100,
  compute_freq: 1.0,
  output_format: 'json',
  merge_decay: 0.7,
  merge_radius: 0.35,
  prune_days: 30,
};

/** 主池子（情绪记忆池） */
export class EmotionMemoryPool {
  field = null;
  events = [];
  current_center = center_coordinate();
  usage = 0;
  event_count = 0;

  constructor(config) {
    const cfg = MEMORY_DEFAULT_CONFIG;
    if (config) {
      Object.assign(cfg, config);
    }
    this.field = new AttractorField(cfg);
    this.usage = this.field.get_state().usage;
  }

  /** 添加事件 */
  add_event(event) {
    // 事件驱动：定位到最近柱子
    const pos = validate_coordinate(event.pos);
    const nearest = this.field.find_closest(pos) || this.field.add_point(pos, event.tags ? event.tags.join(',') : 'event');
    nearest.frequency++;
    nearest.last_used = event.time_pos;

    // 记录事件历史
    this.events.push(event);
    if (this.events.length > this.field.config.max_events) {
      this.events.shift();
    }

    // 检查融合增长
    this.field.check_growth();

    // 更新状态
    this.update_state();
  }

  /** 更状态 */
  update_state() {
    const state = this.field.get_state();
    this.current_center = state.current_center;
    this.usage = state.usage;
    this.event_count++;
  }

  /** 晚间总结 */
  nightly_summarize() {
    this.field.nightly_summary();
    this.update_state();
  }

  /** 状态 */
  query() {
    return this.field.get_state();
  }

  /** 应用直接 */
  apply_direct(pos) {
    this.field.add_point(pos);
  }
}
