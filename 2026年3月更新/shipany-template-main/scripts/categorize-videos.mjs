#!/usr/bin/env node
/**
 * categorize-videos.mjs
 *
 * 根据标题和提示词关键词为 seedance-data.json 里的每条视频分配 category。
 * 用法：node scripts/categorize-videos.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';

const JSON_PATH = './seedance-data.json';

// 分类规则（优先级从高到低）
const RULES = [
  {
    cat: 'food',
    kws: ['美食', '烹饪', '料理', '食物', '咖啡', '蛋糕', '巧克力', '食品', '厨房', '厨师', '寿司', '烘焙', '汉堡', '披萨', '冰淇淋', '甜点', '饮料', '泡菜', '炒蛋', '蓝莓', '章鱼烧', 'ASMR', 'food', 'chef', 'culinary', 'cooking', 'bak', 'cake', 'coffee'],
  },
  {
    cat: 'nature',
    kws: ['自然', '风景', '森林', '海洋', '沙漠', '海滩', '瀑布', '冰川', '星空', '草原', '日落', '日出', '北极', '南极', '丛林', '湖泊', '荒野', '地球', '花朵', '草地', '延时摄影', 'nature', 'scenery', 'landscape', 'forest', 'ocean', 'desert', 'beach', 'mountain', 'sunset', 'sunrise'],
  },
  {
    cat: 'city',
    kws: ['城市', '建筑', '街道', '都市', '摩天', '大厦', '地标', '广场', '东京', '上海', '迪拜', '首尔', '纽约', '伦敦', '街头', '巷道', 'city', 'urban', 'street', 'tokyo', 'dubai', 'seoul', 'architecture', '城区', '夜城', '霓虹'],
  },
  {
    cat: 'product',
    kws: ['护肤品', '护肤', '美妆', '香水', '腕表', '珠宝', '奢华', '奢侈', '品牌', '广告', '商业广告', '开箱', '产品', 'skincare', 'commercial', 'luxury', 'product', 'brand', 'perfume', 'watch', 'jewelry', 'cosmetic', 'ad', '发布'],
  },
  {
    cat: 'effect',
    kws: ['VFX', '特效', '动漫', 'CGI', '3D', '魔法', '科幻', '超能力', '变身', '赛博朋克', '机甲', '奇幻', '恐龙', '怪兽', '外星', '机器人', '超级英雄', '巨龙', '变形', '爆炸', '动画', 'anime', 'vfx', 'sci-fi', 'dragon', 'robot', 'mecha', 'cyberpunk', 'fantasy', 'magic', 'transform', '龙族', '异形', '史诗'],
  },
  {
    cat: 'people',
    kws: ['舞蹈', '跑酷', '武术', '格斗', '跳舞', '编舞', '舞步', '瑜伽', '健身', '拳击', '摔跤', '运动员', 'MV', '变装', 'GRWM', '舞者', '表演', '比赛', '赛事', '武打', '搏击', '体育', '明星', '演员', 'dance', 'sport', 'fight', 'workout', 'yoga', 'boxing', 'athlete', 'parkour', 'martial', 'wrestling', 'football', 'basketball', 'soccer', '足球', '篮球', '橄榄球', '冰球', '棒球', '网球', 'K-pop', 'kpop'],
  },
];

function classify(title, prompt) {
  const text = (title + ' ' + prompt).toLowerCase();
  for (const rule of RULES) {
    for (const kw of rule.kws) {
      if (text.includes(kw.toLowerCase())) return rule.cat;
    }
  }
  return 'other';
}

const items = JSON.parse(readFileSync(JSON_PATH, 'utf8'));

const counts = {};
for (const item of items) {
  item.category = classify(item.title, item.prompt);
  counts[item.category] = (counts[item.category] ?? 0) + 1;
}

writeFileSync(JSON_PATH, JSON.stringify(items, null, 2), 'utf8');

console.log('✅ 分类完成');
console.log('分类统计:');
for (const [cat, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat.padEnd(10)} ${n}`);
}
