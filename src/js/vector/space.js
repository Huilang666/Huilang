/**
 * 连续情绪空间 — 12 维正交基底
 * 约定：坐标范围 [0, 1]，正数越大越偏该维度
 * 模型接收精确数值，不接收文本标签
 * 12 个维度互相正交（可独立变化）
 */

/** 12 维维度名称（与 coords 一一对应） */
export const DIMENSIONS = [
  'val', 'ars', 'int', 'stab', 'depth', 'open',
  'trust', 'flight', 'dom', 'self', 'future', 'con'
];

/** 坐标区间 [{min, max}] */
const DIM_INTERVALS = DIMENSIONS.map(() => ({ min: 0, max: 1 }));

/** 维度权重（初始生长速率） */
const DIM_WEIGHTS = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];

/** 基础情绪根部态（初始输入） */
export const EMOTION_ROOTS = [
  { name: '喜欢', pos: [0.8, 0.5, 0.6, 0.4, 0.3, 0.6, 0.7, 0.2, 0.3, 0.6, 0.5, 0.6] },
  { name: '担心', pos: [0.3, 0.6, 0.5, 0.3, 0.5, 0.4, 0.2, 0.6, 0.2, 0.4, 0.7, 0.3] },
  { name: '安心', pos: [0.9, 0.3, 0.3, 0.8, 0.6, 0.7, 0.8, 0.1, 0.2, 0.5, 0.3, 0.9] },
  { name: '愤怒', pos: [0.2, 0.8, 0.9, 0.2, 0.3, 0.1, 0.1, 0.2, 0.8, 0.5, 0.2, 0.2] },
  { name: '悲伤', pos: [0.1, 0.3, 0.7, 0.3, 0.7, 0.2, 0.2, 0.3, 0.3, 0.2, 0.1, 0.2] },
  { name: '快乐', pos: [0.9, 0.7, 0.8, 0.6, 0.2, 0.8, 0.7, 0.1, 0.4, 0.7, 0.8, 0.8] },
  { name: '期待', pos: [0.6, 0.7, 0.5, 0.5, 0.4, 0.5, 0.5, 0.3, 0.5, 0.4, 0.9, 0.5] },
  { name: '困惑', pos: [0.4, 0.5, 0.4, 0.4, 0.6, 0.6, 0.4, 0.4, 0.4, 0.5, 0.3, 0.4] },
];

/** 生成工具：12 维全零基坐标 */
export function base_coordinate() {
  return DIM_INTERVALS.map((d) => d.min);
}

/** 居中坐标 [0.5, ...] */
export function center_coordinate() {
  return DIM_INTERVALS.map((d) => (d.min + d.max) / 2);
}

/** 归一化到 [min, max] */
export function normalize_coord(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** 坐标算术：向量加法 */
export function add(a, b) {
  return a.map((v, i) => v + b[i]);
}

/** 坐标算术：缩放加权 */
export function scale(a, k) {
  return a.map((v) => v * k);
}

/** 距离：欧氏，12 维 */
export function distance(a, b) {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
}

/** 坐标夹角 cos */
export function cosine(a, b) {
  const mag = (c) => Math.sqrt(c.reduce((s, v) => s + v * v, 0));
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  return dot / (mag(a) * mag(b) || 1);
}

/** 从区间读取一个光照扰动坐标 */
export function perturb(base, interval, rng) {
  rng = rng || Math.random;
  return base.map((v, i) => {
    const step = (interval || 0.01) * 0.1;
    const walk = (rng() - 0.5) * step;
    return normalize_coord(v + walk, DIM_INTERVALS[i].min, DIM_INTERVALS[i].max);
  });
}

/** 把一个外部插件/工具传来的 draft 坐标检核为合法
 * - 不足 12 维：用中心值 0.5 补齐
 * - 超出 12 维：截断到前 12 维
 * - 非法值：归一化到 [0, 1]
 */
export function validate_coordinate(pos) {
  if (!Array.isArray(pos)) return center_coordinate();

  const padded = [...pos];
  while (padded.length < 12) padded.push(0.5);
  if (padded.length > 12) padded.length = 12;

  return padded.map((v, i) => {
    const interval = DIM_INTERVALS[i];
    return normalize_coord((typeof v === 'number' && !isNaN(v)) ? v : interval.min, interval.min, interval.max);
  });
}

/** 从数据中构造坐标：返回可以做字段的坐标 + 使用区间 */
export function make_coordinate(data) {
  return validate_coordinate(data.pos);
}
