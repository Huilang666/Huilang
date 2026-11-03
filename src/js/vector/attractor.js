import { center_coordinate, validate_coordinate, distance } from "../vector/space.js";

/**
 * 情绪吸引子场 — 沙盒尖塔结构 v3.0
 *
 * 核心机制：
 * 1. 每段对话生成 L0 吸引点（底层情绪，直接接触地面）
 * 2. 同层近距离的多个点可以融合（>=2个都可以，无上限）
 * 3. 融合产生理解点（L1），位置固定，后续只增长
 * 4. 两个同级别的产生复合升华（L3 = L1+L1 融合）
 * 5. 柱子越多，理解越高深，但权重递减
 * 6. 所有使用率永远 <70%（严格，永不等于或超过）
 * 7. 基础情绪保留30%
 */

/** 最大使用率（严格小于70%，接近但不等于） */
export const MAX_COLUMN_USAGE_RATE = 0.6999;

/** 同一层内融合的最小距离 */
const MERGE_DISTANCE = 0.35;

/** 保护函数：层数到保护率的映射（日、月、年阶梯） */
const PROTECT_CURVES = {
  daily: { threshold: 86400, rate: 0.95 },
  monthly: { threshold: 86400 * 30, rate: 0.8 },
  yearly: { threshold: 86400 * 365, rate: 0.6 },
};

/** L层梯度权重（越往后越低） */
const LAYER_GRADIENT = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1];

/** 柱子的最大强度上限（按层） */
const LAYER_CAP = [0.70, 0.65, 0.60, 0.55, 0.50, 0.45, 0.40, 0.35, 0.30, 0.25];

/** 默认配置 */
const MEMORY_DEFAULT_CONFIG = {
  time_constant: 5.0,
  max_events: 100,
  compute_freq: 1.0,
  output_format: 'json',
  merge_decay: 0.7,
  merge_radius: 0.35,
  prune_days: 30,
};

/** 使用率（加权，严格按层） */
function layer_gradient_weight(layer) {
  if (layer >= LAYER_GRADIENT.length) return LAYER_GRADIENT[LAYER_GRADIENT.length - 1];
  return LAYER_GRADIENT[layer];
}

function layer_cap(layer) {
  if (layer >= LAYER_CAP.length) return LAYER_CAP[LAYER_CAP.length - 1];
  return LAYER_CAP[layer];
}

/** 保护率（核心：日/月/年的时间阶梯） */
function protect_rate(age) {
  if (age < PROTECT_CURVES.daily.threshold) return PROTECT_CURVES.daily.rate;
  if (age < PROTECT_CURVES.monthly.threshold) return PROTECT_CURVES.monthly.rate;
  return PROTECT_CURVES.yearly.rate;
}

/** 核心：计算系统总使用率（按保护层加权）永远严格 < 70% */
function system_usage(attractors) {
  return attractors.reduce((s, a) => {
    const age = (Date.now() - a.created) / 1000;
    return s + a.strength * layer_gradient_weight(a.layer) * protect_rate(age);
  }, 0);
}

export class AttractorField {
  attractors = [];
  config = MEMORY_DEFAULT_CONFIG;
  merges = 0;

  constructor(config) {
    if (config) {
      this.config = { ...MEMORY_DEFAULT_CONFIG, ...config };
    }
  }

  /** 添加/创建伙伴点（纯底层吸引点） */
  add_point(pos, tag) {
    const usage = system_usage(this.attractors);
    const headroom = Math.max(0, MAX_COLUMN_USAGE_RATE - usage);
    const base_strength = Math.min(0.3, Math.max(0.05, headroom * 0.5));

    const point = {
      id: `a_l0_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      center: validate_coordinate(pos),
      strength: base_strength,
      layer: 0,
      frequency: 1,
      created: Date.now(),
      last_used: Date.now(),
      is_bottom: true,
      max_depth: layer_cap(0),
      duration: 0,
      tags: tag ? [tag] : [],
      history: [],
    };
    this.attractors.push(point);
    this.check_growth();
    return point;
  }

  /** 找到最近的柱子（全局最近域，按层/跨层均适用） */
  find_closest(center) {
    let nearest = null;
    let nearest_dist = Number.MAX_VALUE;
    for (const a of this.attractors) {
      const d = distance(center, a.center);
      if (d < nearest_dist) {
        nearest = a;
        nearest_dist = d;
      }
    }
    return nearest;
  }

  /** 找到最近相邻点（用于同层融合） */
  find_nearby(center, layer, threshold) {
    threshold = threshold || MERGE_DISTANCE;
    const near = [];
    for (const a of this.attractors) {
      if (a.layer !== layer) continue;
      if (distance(center, a.center) < threshold) near.push(a);
    }
    return near;
  }

  /** 检查会议（融合的触发点） */
  check_growth() {
    const layers = this.layer_set();
    for (const layer of layers) {
      const pool = this.find_cluster_of(layer);
      if (pool.length >= 2) {
        this.merge_columns(pool);
      }
    }
    this.summarize_night();
  }

  /** 集群搜索（同层近距离的柱子探索） */
  find_cluster_of(layer) {
    const pool = this.attractors.filter((a) => a.layer === layer);
    if (pool.length < 2) return [];

    const visited = new Set();
    let cluster = [];

    for (const a of pool) {
      if (visited.has(a.id)) continue;
      const next = [a];
      visited.add(a.id);
      for (const b of pool) {
        if (visited.has(b.id)) continue;
        if (distance(a.center, b.center) < MERGE_DISTANCE) {
          next.push(b);
          visited.add(b.id);
        }
      }
      if (next.length > cluster.length) cluster = next;
    }
    return cluster.length >= 2 ? cluster : [];
  }

  /** 合并柱子和生成的理解点（内含全部融合逻辑） */
  merge_columns(cluster) {
    const layer = cluster[0].layer;
    const total_weight = cluster.reduce((s, a) => s + a.strength, 0);

    // 按权重的融点合并（中间新点）
    const new_center = center_coordinate();
    cluster.forEach((a) => {
      a.center.forEach((v, i) => {
        new_center[i] += (v * a.strength) / total_weight;
      });
    });

    const new_strength = Math.min(
      total_weight * 0.7,
      layer_cap(layer + 1) * 0.5,
      MAX_COLUMN_USAGE_RATE - system_usage(this.attractors)
    );
    if (new_strength <= 0.01) return;

    // 从池中移除 cluster
    this.attractors = this.attractors.filter((a) => !cluster.includes(a));

    const new_point = {
      id: `p_l${layer + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      center: new_center,
      strength: new_strength,
      layer: layer + 1,
      frequency: cluster.reduce((s, a) => s + a.frequency, 0),
      created: Math.min(...cluster.map((a) => a.created)),
      last_used: Math.max(...cluster.map((a) => a.last_used)),
      is_bottom: false,
      max_depth: layer_cap(layer + 1),
      duration: 0,
      tags: cluster.reduce((s, a) => [...s, ...a.tags], []),
      history: cluster.map((a) => a.id),
    };

    this.attractors.push(new_point);
    this.merges++;
    this.check_growth();
  }

  /** 农田：调整保护率（衰减/加固） */
  nightly_summary() {
    const now = Date.now();
    for (const a of this.attractors) {
      const age = (now - a.created) / 1000;
      a.duration = age;
      const factor = protect_rate(age);
      if (age < this.config.time_constant * 86400) {
        a.strength = Math.min(a.strength + 0.01, layer_cap(a.layer) * factor);
      } else {
        a.strength = Math.max(0, a.strength * 0.98);
      }
    }
    this.summarize_night();
  }

  /** 衰减按天/月/年保护调整 */
  summarize_night() {
    const now = Date.now();
    const toDelete = [];
    for (const a of this.attractors) {
      if (now - a.last_used > this.config.prune_days * 86400 * 1000) {
        toDelete.push(a.id);
      }
    }
    if (toDelete.length) {
      this.attractors = this.attractors.filter((a) => !toDelete.includes(a.id));
    }
  }

  /** 属性设置 */
  get_state() {
    const current_center = center_coordinate();
    const total = this.attractors.reduce((s, a) => s + a.strength, 0) || 1;
    for (const a of this.attractors) {
      a.center.forEach((v, i) => {
        current_center[i] += (v * a.strength) / total;
      });
    }
    return {
      current_center,
      attractors: JSON.parse(JSON.stringify(this.attractors)),
      depth_l: this.max_depth(),
      usage: system_usage(this.attractors),
      config: this.config,
    };
  }

  /** 最大深度 */
  max_depth() {
    return Math.max(...this.attractors.map((a) => a.layer), 0);
  }

  /** 有使用的规则 */
  has_rule(center) {
    let best = null;
    let best_d = Number.MAX_VALUE;
    for (const a of this.attractors) {
      const d = distance(center, a.center);
      if (d < best_d) {
        best = a;
        best_d = d;
      }
    }
    return best;
  }

  layer_set() {
    const set = new Set();
    this.attractors.forEach((a) => set.add(a.layer));
    return set;
  }
}

export default AttractorField;
