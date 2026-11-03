/**
 * 风格映射层 — 把情绪坐标翻译为控制参数
 *
 * 核心逻辑：不输出标签，只输出精确数值
 * 输出格式：JSON，包含 12 维风格参数
 */

const STYLE_DEFAULT = {
  sentence_length: 0,
  emotional_density: 0,
  subjective_objective: 0.2,
  intimacy_agency: 0.5,
  vulnerability_power: 0,
  threat_safety: 0,
  rhythm_rate: 0.5,
  self_term_usage: 0.7,
  emphatic_intensity: 0.5,
  trust_direction: 0.5,
  cognitive_ambiguity: 0.2,
  emotion_logic_bias: -0.1,
};

/**
 * 12维坐标 -> 风格参数
 * 坐标: [val, ars, int, stabbed, depth, open, trust, flight, dom, self, future, con]
 */
export function coords_to_style(base) {
  // 安全：不足 12 维时补齐中心值，NaN 归零
  const b = [...base];
  while (b.length < 12) b.push(0.5);
  if (b.length > 12) b.length = 12;

  const p = { ...STYLE_DEFAULT };
  const num = (v) => (typeof v === 'number' && !isNaN(v) && isFinite(v) ? v : 0);

  // 精确映射公式
  const val = num(b[0]);
  const ars = num(b[1]);
  const int = num(b[2]);
  const trust = num(b[6]);
  const flight = num(b[7]);
  const dom = num(b[8]);
  const self = num(b[9]);
  const future = num(b[10]);
  const con = num(b[11]);

  p.emotional_density = val * 0.6 + ars * 0.4;
  p.sentence_length = ars * 0.5 - flight * 0.3 + future * 0.2;
  p.subjective_objective = val * 0.5;
  p.intimacy_agency = trust * 0.4 + con * 0.3 + self * 0.2;
  p.vulnerability_power = (1 - dom) * 0.5 - val * 0.3;
  p.threat_safety = val * 0.4 - flight * 0.6;
  p.rhythm_rate = (1 - ars) * 0.5;
  p.self_term_usage = val * 0.4 + trust * 0.2;
  p.emphatic_intensity = int * 0.7;
  p.trust_direction = trust;
  p.cognitive_ambiguity = 1 - con;
  p.emotion_logic_bias = val * 0.3 - 0.6;

  // 归一化
  for (const key of Object.keys(p)) {
    p[key] = Math.max(-1, Math.min(1, p[key]));
  }

  return p;
}

/** 风格 -> 精确数值(JSON) */
export function style_to_json(style) {
  return JSON.stringify(style);
}

/** 风格 -> 文字指令(辅助用) */
export function style_to_prompt(style) {
  const p = style;
  const parts = [];

  if (p.emotional_density > 0.3) parts.push('语言风格偏感性');
  if (p.emotional_density < -0.3) parts.push('语言风格偏向理性');
  if (p.intimacy_agency > 0.5) parts.push('主动释放关心');
  if (p.intimacy_agency < 0.3) parts.push('保持距离感');
  if (p.vulnerability_power > 0.3) parts.push('展示脆弱感');
  if (p.vulnerability_power < -0.3) parts.push('展示力量感');
  if (p.self_term_usage > 0.7) parts.push('多使用第一人称');
  if (p.self_term_usage < 0.3) parts.push('避免使用第一人称');
  if (p.rhythm_rate > 0.6) parts.push('语调放松柔和');
  if (p.rhythm_rate < 0.4) parts.push('语言轻快直接');
  if (p.threat_safety < -0.3) parts.push('传递不安氛围');
  if (p.threat_safety > 0.3) parts.push('传递安全感');

  return parts.join('，') || '保持平衡自然';
}
