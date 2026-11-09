const KEYS = ['oven', 'price', 'patience'];
const BASE_COST = {oven: 500, price: 800, patience: 600};
// User-requested progression; these tiers and prices are new design values, not recovered original rules.
export const STALLS = Object.freeze([
  {name:'리어카',cost:0,bonus:0},
  {name:'지붕 리어카',cost:8000,bonus:10},
  {name:'포장마차',cost:18000,bonus:25},
  {name:'동네 노점',cost:35000,bonus:45},
  {name:'작은 가게',cost:65000,bonus:70},
  {name:'골목 맛집',cost:110000,bonus:70},
  {name:'붕어빵 전문점',cost:180000,bonus:70},
  {name:'동네 명물',cost:280000,bonus:70},
  {name:'프리미엄 매장',cost:420000,bonus:70},
  {name:'붕어빵 궁전',cost:600000,bonus:70},
].map(Object.freeze));
export const moldCount = s => Math.min(9, 3 * (s.stall + 1));
export const crowdTarget = s => Math.max(5, Math.min(10, 6 + Math.floor(s.stall / 2) + (s.reputation >= 75 ? 1 : s.reputation < 30 ? -1 : 0)));
const reputation = (s, delta) => {s.reputation = Math.max(0, Math.min(100, s.reputation + delta));};
function fillCrowd(s) {while(s.customers.length < crowdTarget(s)) s.customers.push(customer(s.up.patience, 0, s.customers.map(c=>c.look)));}
const mold = () => ({phase: 'empty', age: 0});
const LOOK_KINDS = [2, 0, 1, 3, 3, 3, 2, 3, 1, 3];
const LEGACY_LOOKS = [1, 2, 0, 3];
const customer = (patience = 0, delay = 0, excludedLooks = []) => {
  let candidates = LOOK_KINDS.map((_, look) => look).filter(look => !excludedLooks.includes(look));
  if (!candidates.length) candidates = LOOK_KINDS.map((_, look) => look);
  const look = candidates[Math.floor(Math.random() * candidates.length)];
  const kind = LOOK_KINDS[look];
  return {anger: 0, look, kind, need: 1 + Math.floor(Math.random() * 3) + (kind === 0 ? 1 : 0), wait: 0, maxWait: (kind === 2 ? 30 : 45) + patience * 10, delay};
};
const customerQueue = (patience = 0, count = 6) => {
  const queue = [];
  for (let i = 0; i < count; i++) queue.push(customer(patience, 0, queue.map(c => c.look)));
  return queue;
};
const otherLooks = (s, index) => s.customers.filter((_, i) => i !== index).map(c => c.look);
export function fresh() {
  return {version: 1, rules: 3, reputation: 50, burntSlot: -1, stall: 0, day: 1, coins: 0, best: 0, totalSold: 0, stock: 0, combo: 0, dayCoins: 0, daySold: 0, time: 120, running: false, heat: 0, up: {oven: 0, price: 0, patience: 0}, molds: Array.from({length: 3}, mold), customers: customerQueue(), notice: '장사를 시작해 보세요!'};
}
export const stallCost = s => Number.isInteger(s.stall) && s.stall >= 0 && s.stall < STALLS.length - 1 ? STALLS[s.stall + 1].cost : null;
export function upgradeStall(s) {
  const cost = stallCost(s);
  if (cost === null) {s.notice = '최고 단계의 가게예요!'; return false;}
  if (s.coins < cost) {s.notice = `다음 가게로 성장하려면 ${cost}원이 필요해요.`; return false;}
  s.coins -= cost; s.stall++;
  while(s.molds.length < moldCount(s)) s.molds.push(mold());
  reputation(s, 5); fillCrowd(s);
  s.notice = `${STALLS[s.stall].name} 오픈! 굽기판 ${moldCount(s)}칸 · 평판 +5!`;
  return true;
}
export const readyAt = s => 4 - .5 * s.up.oven;
export const upgradeCost = (s, key) => KEYS.includes(key) && s.up[key] < 3 ? BASE_COST[key] * (s.up[key] + 1) : null;
const validIndex = (a, i) => Number.isInteger(i) && i >= 0 && i < a.length;
export function tapMold(s, index) {
  if (!s.running || !validIndex(s.molds, index)) return false;
  const m = s.molds[index];
  if (m.phase !== 'burnt') s.burntSlot = -1;
  if (m.phase === 'empty') {m.phase = 'front'; m.age = 0; s.notice = '반죽을 부었어요. 노릇해지면 뒤집어요!';}
  else if (m.phase === 'burnt') {
    if (s.burntSlot === index) {s.molds[index] = mold(); s.burntSlot = -1; s.notice = '탄 빵을 버렸어요. 새로 구워요!';}
    else {s.burntSlot = index; s.notice = '탄 빵 선택! 손님에게 주거나, 다시 눌러 버려요.';}
  }
  else if (m.age < readyAt(s)) {s.notice = '아직 익고 있어요. 조금만 기다려요!'; return false;}
  else if (m.phase === 'front') {m.phase = 'back'; m.age = 0; s.notice = '뒤집었어요! 뒷면도 노릇하게 구워요.';}
  else {
    const golden = m.age < readyAt(s) + 1.2 && (s.totalSold + index + s.day) % 7 === 0;
    s.stock++; s.molds[index] = mold();
    if (golden) {s.coins += 50; s.dayCoins += 50; s.best = Math.max(s.best, s.dayCoins); s.notice = '반짝! 황금붕어빵 완성 · 보너스 +50원!';}
    else s.notice = '노릇한 붕어빵 완성! 손님을 눌러 판매하세요.';
  }
  return true;
}
export function pump(s) {if (!s.running) return false; s.heat = 4; s.notice = '푸슝! 잠깐 화력이 강해져요.'; return true;}
export function tick(s, dt) {
  if (!s.running || !Number.isFinite(dt) || dt <= 0) return false;
  dt = Math.min(dt, 1, s.time);
  const hot = Math.min(dt, s.heat);
  s.heat = Math.max(0, s.heat - dt);
  for (const m of s.molds) if (m.phase === 'front' || m.phase === 'back') {
    m.age += dt + hot * .5;
    if (m.age >= readyAt(s) + 5) {m.phase = 'burnt'; s.combo = 0; s.notice = '앗, 빵이 탔어요! 눌러 선택한 뒤 버리거나 줄 수 있어요.';}
  }
  for (let i = 0; i < s.customers.length; i++) {
    const c = s.customers[i];
    if (c.anger > 0) {
      c.anger = Math.max(0, c.anger - dt);
      if (c.anger === 0) s.customers[i] = customer(s.up.patience, 2, otherLooks(s, i));
      continue;
    }
    const waiting = Math.max(0, dt - c.delay);
    c.delay = Math.max(0, c.delay - dt);
    c.wait += waiting;
    if (c.wait >= c.maxWait) {s.customers[i] = customer(s.up.patience, 3, otherLooks(s, i)); s.combo = 0; reputation(s, -3); s.notice = '평판 -3 · 손님이 기다리다 갔어요. 다음 손님에게 맛있게 구워 주세요!';}
  }
  for(let i=s.customers.length-1;i>=0 && s.customers.length>crowdTarget(s);i--) {
    if(s.customers[i].delay>0 && !s.customers[i].anger) s.customers.splice(i,1);
  }
  fillCrowd(s);
  s.time = Math.max(0, s.time - dt);
  if (s.time === 0) {s.running = false; s.heat = 0; s.best = Math.max(s.best, s.dayCoins); s.notice = '오늘 장사 끝! 번 돈으로 가게를 업그레이드해요.';}
  return true;
}
export function serve(s, index, gift = false) {
  if (!s.running || !validIndex(s.customers, index)) return false;
  const c = s.customers[index];
  if (c.delay > 0 || c.anger > 0) return false;
  if (Number.isInteger(s.burntSlot) && s.burntSlot >= 0 && s.molds[s.burntSlot]?.phase === 'burnt') {
    s.molds[s.burntSlot] = mold(); s.burntSlot = -1; s.combo = 0; c.anger = 6; reputation(s, -10);
    s.notice = '평판 -10 · 탄 빵을 받은 손님이 화났어요! 돈을 내지 않고 떠나요.';
    return true;
  }
  const count = c.need + (gift === true ? 1 : 0);
  if (s.stock < count) {s.notice = `붕어빵 ${count}개가 필요해요. 조금 더 구워 주세요!`; return false;}
  s.stock -= count; reputation(s, gift ? 3 : 2);
  s.combo = gift === true ? s.combo + 1 : 0;
  const gain = c.need * (100 + 25 * s.up.price + STALLS[s.stall].bonus) + s.combo * 25;
  s.coins += gain; s.dayCoins += gain; s.totalSold += c.need; s.daySold += c.need;
  s.best = Math.max(s.best, s.dayCoins);
  s.customers[index] = customer(s.up.patience, 2, otherLooks(s, index));
  s.notice = `${s.combo > 0 ? s.combo + '콤보! ' : ''}맛있게 드세요 · +${gain}원 · 평판 +${gift ? 3 : 2}`;
  return true;
}
export function startDay(s) {
  if (s.running) return false;
  if (s.time <= 0) {
    s.day++; s.burntSlot = -1; s.time = 120; s.dayCoins = 0; s.daySold = 0; s.combo = 0; s.heat = 0;
    s.molds = Array.from({length: moldCount(s)}, mold);
    s.customers = customerQueue(s.up.patience, crowdTarget(s));
  }
  s.running = true; s.notice = '장사 시작! 빈 빵틀을 눌러 반죽을 부으세요.'; return true;
}
export function upgrade(s, key) {
  const cost = upgradeCost(s, key);
  if (cost === null) {s.notice = '최고 단계예요!'; return false;}
  if (s.coins < cost) {s.notice = `${cost}원이 필요해요.`; return false;}
  s.coins -= cost; s.up[key]++;
  if (key === 'patience') for (const c of s.customers) c.maxWait += 10;
  s.notice = '업그레이드 완료!'; return true;
}
const finite = (n, min, max, int = false) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max && (!int || Number.isInteger(n));
export function validate(input, strict = false) {
  try {
    if (!input || typeof input !== 'object' || input.version !== 1) throw Error('Invalid save');
    const s = input;
    if(s.rules !== undefined && ![2,3].includes(s.rules)) throw Error('Invalid rules');
    if(s.reputation !== undefined && !finite(s.reputation,0,100,true)) throw Error('Invalid reputation');
    const stall = s.stall === undefined ? 0 : s.stall;
    const burntSlot = s.burntSlot === undefined ? -1 : s.burntSlot;
    if (!finite(burntSlot, -1, 14, true)) throw Error('Invalid save');
    if (!finite(stall, 0, STALLS.length - 1, true)) throw Error('Invalid save');
    if (!finite(s.day, 1, 1e7, true) || typeof s.running !== 'boolean' || !finite(s.time, 0, 120) || !finite(s.heat, 0, 4)) throw Error('Invalid save');
    for (const k of ['coins', 'best', 'totalSold', 'stock', 'combo', 'dayCoins', 'daySold']) if (!finite(s[k], 0, 1e12, true)) throw Error('Invalid save');
    if (!s.up || KEYS.some(k => !finite(s.up[k], 0, 3, true))) throw Error('Invalid save');
    if (!Array.isArray(s.molds) || (s.rules === 3 ? s.molds.length !== moldCount({stall}) : s.rules === 2 ? s.molds.length !== Math.min(15,3*(stall+1)) : s.molds.length !== 9) || s.molds.some(m => !m || !['empty','front','back','burnt'].includes(m.phase) || !finite(m.age, 0, 12))) throw Error('Invalid save');
    if (!Array.isArray(s.customers) || (s.rules >= 2 ? s.customers.length < 5 || s.customers.length > 10 : s.customers.length !== 3) || s.customers.some(c => !c || !finite(c.kind, 0, 3, true) || !finite(c.need, 1, 4, true) || !finite(c.wait, 0, 75) || !finite(c.maxWait, 30, 75) || !finite(c.delay, 0, 3) || c.wait > c.maxWait)) throw Error('Invalid save');
    if (s.customers.some(c => c.anger !== undefined && !finite(c.anger, 0, 6))) throw Error('Invalid save');
    if (s.customers.some(c => c.look !== undefined && !finite(c.look, 0, 9, true))) throw Error('Invalid save');
    const usedLooks = new Set();
    const customers = s.customers.map(c => {
      let look = c.look === undefined ? LEGACY_LOOKS[c.kind] : c.look;
      if (usedLooks.has(look)) {
        const matching = LOOK_KINDS.findIndex((kind, i) => kind === c.kind && !usedLooks.has(i));
        look = matching >= 0 ? matching : LOOK_KINDS.findIndex((_, i) => !usedLooks.has(i));
      }
      usedLooks.add(look);
      return {anger:c.anger ?? 0, look, kind:c.kind, need:c.need, wait:c.wait, maxWait:c.maxWait, delay:c.delay};
    });
    const result = {version: 1, rules: 3, reputation: s.reputation ?? 50, burntSlot: burntSlot >= 0 && s.molds[burntSlot]?.phase === 'burnt' ? burntSlot : -1, stall, day: s.day, coins: s.coins, best: s.best, totalSold: s.totalSold, stock: s.stock, combo: s.combo, dayCoins: s.dayCoins, daySold: s.daySold, time: s.time, running: false, heat: s.heat, up: Object.fromEntries(KEYS.map(k => [k,s.up[k]])), molds: s.molds.map(m => ({phase: m.phase, age: m.age})), customers, notice: typeof s.notice === 'string' ? s.notice.slice(0, 200) : '저장된 장사를 불러왔어요.'};
    if(s.rules !== 3) {
      // Preserve finished pastries from legacy slots removed by the new capacity.
      result.stock += result.molds.slice(moldCount(result)).filter(m=>m.phase==='back' && m.age>=readyAt(result)).length;
      result.molds = result.molds.slice(0,moldCount(result));
      while(result.molds.length<moldCount(result)) result.molds.push(mold());
    }
    if(result.burntSlot>=result.molds.length) result.burntSlot=-1;
    fillCrowd(result);
    return result;
  } catch(e) {if(strict) throw e; return fresh();}
}

