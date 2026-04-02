const REALMS = [
  "炼气","筑基","结丹","元婴","化神","婴变","问鼎","阴虚","阳实","天人五衰","空灵","空玄","空劫","金尊","天尊","踏天",
];
const ATTRS = ["智力","体质","幸运","魅力","灵根"];
const EQUIPMENT_SLOTS = ["武器","衣甲","法器","饰品"];

const ITEMS = {
  ore_iron: { key:"ore_iron", name:"玄铁矿", kind:"material", rarity:1, price:30, power:0 },
  ore_myst: { key:"ore_myst", name:"幽冥晶矿", kind:"material", rarity:3, price:180, power:0 },
  herb_qing:{ key:"herb_qing",name:"青灵草", kind:"material", rarity:1, price:25, power:0 },
  herb_xuan:{ key:"herb_xuan",name:"玄息花", kind:"material", rarity:2, price:80, power:0 },
  spirit_rice:{ key:"spirit_rice", name:"灵米", kind:"consumable", rarity:1, price:18, power:0 },
  talisman_flee:{ key:"talisman_flee", name:"遁行符", kind:"consumable", rarity:2, price:95, power:0 },
  pill_qi:  { key:"pill_qi",  name:"回气丹", kind:"pill", rarity:1, price:60, power:0 },
  pill_jing:{ key:"pill_jing",name:"凝神丹", kind:"pill", rarity:2, price:160,power:0 },
  w_sword:  { key:"w_sword",  name:"青锋剑", kind:"equip", rarity:1, price:120, slot:"武器", power:3 },
  a_robe:   { key:"a_robe",   name:"云纹道袍", kind:"equip", rarity:1, price:110, slot:"衣甲", power:2 },
  t_charm:  { key:"t_charm",  name:"护身玉符", kind:"equip", rarity:2, price:260, slot:"饰品", power:4 },
  f_orb:    { key:"f_orb",    name:"聚灵法珠", kind:"equip", rarity:2, price:240, slot:"法器", power:4 },
};

const SECTS = {
  "正道": { name:"太清门", desc:"清规严谨，重功德与传承，擅长阵法与御剑。" },
  "魔道": { name:"血影宗", desc:"行事狠绝，重资源与效率，擅长血炼与夺魄秘术。" },
  "散修": { name:"云游散修", desc:"无门无派，自由洒脱，靠机缘与交易闯荡。" },
  "商盟": { name:"万宝商盟", desc:"以财通天，拍卖与情报无所不包，擅长炼器与经营。" },
};

const RUINS_THEMES = ["古战场遗迹","沉没丹阁","残破剑冢","地脉熔炉","妖族祭坛","天外陨星坑"];
const DUNGEONS = [
  { name:"青石窟", tag:"入门副本" },
  { name:"幽泉洞", tag:"寒魄之地" },
  { name:"赤炎渊", tag:"熔岩险境" },
  { name:"玄木林", tag:"毒瘴迷阵" },
];

const $status = document.querySelector("#status");
const $log = document.querySelector("#log");
const $actions = document.querySelector("#actions");
const $btnSave = document.querySelector("#btnSave");
const $btnReset = document.querySelector("#btnReset");

function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }
function rint(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function chance(p){ return Math.random() < p; }
function pick(xs){ return xs[Math.floor(Math.random()*xs.length)]; }

function nowTag(day){ return `第${day}天`; }
function logLine(text, tone=""){ 
  const div = document.createElement("div");
  div.className = `log-line ${tone}`.trim();
  div.innerHTML = `<span class="t">${nowTag(state.p.day)}</span>${escapeHtml(text)}`;
  $log.appendChild(div);
  $log.scrollTop = $log.scrollHeight;
}
function clearLog(){ $log.innerHTML = ""; }

function escapeHtml(s){
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

function baseState(){
  const attrs = Object.fromEntries(ATTRS.map(k=>[k,0]));
  const equip = Object.fromEntries(EQUIPMENT_SLOTS.map(k=>[k,null]));
  return {
    v: 2,
    screen: "intro",
    p: {
      name: "",
      day: 1,
      realmIdx: 0,
      attrs,
      left: 20,
      stone: 300,
      jade: 1,
      hp: 10,
      mp: 10,
      inv: {},
      equip,
      sect: "散修",
      bond: "无",
      mentor: "无",
      companions: 0,
      cave: 0,
      vein: 0,
      tower: 0,
      fame: 0,
      karma: 0,
      flags: [],
      eventBonus: 0,
      damageHalve: false,
      favor: 0,
    },
  };
}

let state = load() ?? baseState();

function flags(){ return new Set(state.p.flags); }
function setFlag(k){ 
  const s = flags();
  s.add(k);
  state.p.flags = [...s];
}

function invQty(k){ return state.p.inv[k] ?? 0; }
function addInv(k, n){
  const v = (state.p.inv[k] ?? 0) + n;
  if(v <= 0) delete state.p.inv[k];
  else state.p.inv[k] = v;
}

function realm(){ return REALMS[state.p.realmIdx]; }
function maxHP(){ return 10 + state.p.realmIdx*2 + (state.p.cave ?? 0); }
function maxMP(){ return 10 + state.p.realmIdx*2 + Math.min(3, state.p.vein ?? 0); }
function healHpMp(hp=0, mp=0){
  if(hp) state.p.hp = Math.min(maxHP(), state.p.hp + hp);
  if(mp) state.p.mp = Math.min(maxMP(), state.p.mp + mp);
}
function healRest(){
  healHpMp(6, 6);
}
function takeEventBonus(){
  const b = state.p.eventBonus ?? 0;
  state.p.eventBonus = 0;
  return b;
}
function materialPassive(ctx){
  let s = 0;
  const p = state.p;
  if(["dungeon","tower","ruins"].includes(ctx)){
    if(invQty("ore_iron") >= 3) s += 2;
    if(invQty("ore_myst") >= 1) s += 1;
    if(invQty("herb_qing") >= 5) s += 1;
  }
  if(ctx === "daily"){
    if(invQty("herb_qing") >= 2) s += 1;
    if(invQty("spirit_rice") >= 1) s += 1;
  }
  if(ctx === "ruins"){
    if(invQty("t_charm") >= 1 && p.equip["饰品"] !== "t_charm") s += 1;
    if(invQty("pill_jing") >= 1) s += 1;
  }
  if(ctx === "tower"){
    if(invQty("f_orb") >= 1 && p.equip["法器"] !== "f_orb") s += 1;
  }
  if(ctx === "mine"){
    if(invQty("ore_iron") >= 1) s += 1;
  }
  if(ctx === "alchemy"){
    if(invQty("herb_xuan") >= 2) s += 1;
  }
  if(ctx === "breakthrough"){
    if(invQty("ore_myst") >= 1) s += 1;
  }
  return s;
}
function applyDamage(amt){
  let a = Math.max(0, amt);
  if(state.p.damageHalve){ a = Math.floor(a/2); state.p.damageHalve = false; }
  state.p.hp -= a;
  if(state.p.hp < 0) state.p.hp = 0;
  return state.p.hp <= 0;
}

function equipPower(){
  let n = 0;
  for(const slot of EQUIPMENT_SLOTS){
    const k = state.p.equip[slot];
    if(k && ITEMS[k]) n += ITEMS[k].power ?? 0;
  }
  return n;
}
function powerScore(){
  const a = state.p.attrs;
  let base = a["体质"]*2 + a["灵根"]*3 + a["智力"]*2 + a["幸运"] + equipPower();
  base += state.p.realmIdx*3 + state.p.cave*2 + state.p.vein*2 + state.p.companions;
  return base;
}

function endgameCatalogSize(){
  // 5境界段位 x 4阵营 x 3结缘 x 4道途 x 3师承 = 720
  return 5*4*3*4*3;
}

function choosePath(){
  const a = state.p.attrs;
  const best = ATTRS.slice().sort((x,y)=>a[y]-a[x])[0];
  if(best === "体质") return "剑修";
  if(best === "智力") return state.p.sect === "正道" ? "阵修" : "器修";
  if(best === "灵根") return state.p.sect !== "魔道" ? "丹修" : "器修";
  if(best === "幸运") return "丹修";
  return "剑修";
}
function realmBandName(i){
  if(i <= 1) return "凡尘初启";
  if(i <= 4) return "宗门新秀";
  if(i <= 8) return "一域强者";
  if(i <= 12) return "天命巨擘";
  return "尊位临世";
}

function ending(dead=false){
  if(dead){
    const sect = state.p.sect;
    const path = choosePath();
    const key = `${realmBandName(state.p.realmIdx)}|${sect}|${state.p.bond}|${path}|${state.p.mentor}`;
    return {
      title: `【陨落】${state.p.name} · ${realm()}`,
      lines: [
        "你在劫数中气血断绝，道途戛然而止。",
        `最后境界：${realm()}；立场：${SECTS[sect].name}（${sect}）；累计：第${state.p.day}天。`,
        `村望：${state.p.favor ?? 0}；名望：${state.p.fame}。`,
        `（陨落支线关键词：${key}）`,
      ],
      key,
    };
  }
  const rb = realmBandName(state.p.realmIdx);
  const sect = state.p.sect;
  const bond = state.p.bond;
  const mentor = state.p.mentor;
  const path = choosePath();
  const key = `${rb}|${sect}|${bond}|${path}|${mentor}`;
  const wealth = (state.p.stone >= 2000 || state.p.jade >= 5) ? "富甲一方" : (state.p.stone >= 800 ? "囊中尚可" : "拮据度日");
  const karmaTag = (state.p.karma >= 40) ? "功德圆满" : (state.p.karma >= -10 ? "因果平平" : "业障缠身");
  const towerTag = (state.p.tower >= 10) ? "登塔留名" : (state.p.tower >= 3 ? "略试通天塔" : "未触通天塔");
  const f = flags();
  const ruinsTag = f.has("ruins_core") ? "得遗迹核心" : (f.has("ruins_map") ? "仅窥遗迹边缘" : "与遗迹擦肩");
  const heart = f.has("heart_demon") ? "心魔缠身" : "心境澄明";

  const bondLine = bond === "道侣" ? "你与道侣相互扶持，劫难之中仍有归处。" :
                   bond === "孽缘" ? "孽缘如锁，情劫反复，将你的选择推向极端。" :
                   "你孑然一身，凡事只问道心。";
  const mentorLine = mentor === "名师" ? "名师为你点灯，少走弯路，却也多了因果牵系。" :
                     mentor === "邪师" ? "邪师授你捷径，代价在暗处结账。" :
                     "你无师自悟，靠机缘与交易一步步走来。";

  const twist = [];
  if(sect === "商盟" && f.has("auction_win")) twist.push("你在拍卖会一战成名，万宝商盟的账簿里写满你的名字。");
  if(sect === "魔道" && f.has("ruins_sin")) twist.push("你在遗迹趁火打劫，业障凝成血色传闻。");
  if(f.has("disciple") && state.p.fame >= 8) twist.push("弟子遍天下，你的道统在江湖里悄然扎根。");
  if(state.p.cave >= 3 && state.p.vein >= 3) twist.push("洞府与灵脉相合，你在一隅之地自成小天地。");
  if(state.p.realmIdx >= 13 && state.p.jade >= 3) twist.push("仙玉为引，你触碰到更高天机，似有‘尊位’在召唤。");
  if(!twist.length) twist.push("你把无数选择堆成了路，路尽头便是你的结局。");

  const title = `【结局】${rb} · ${SECTS[sect].name} · ${path}`;
  const lines = [
    `你最终停在境界：${realm()}。`,
    `立场/门派：${SECTS[sect].name}（${sect}）。`,
    `身家：${wealth}；因果：${karmaTag}；状态：${heart}。`,
    `经历：${towerTag}；${ruinsTag}。`,
    bondLine,
    mentorLine,
    pick(twist),
    `结局分支编号：${key}`,
  ];
  return { title, lines, key };
}

function breakthrough(){
  if(state.p.realmIdx >= REALMS.length - 1) return { ok:false, msg:"你已踏至尽头，天地间已无更高境界可供突破。" };
  const a = state.p.attrs;
  let base = 0.35;
  base += a["灵根"]*0.02 + a["智力"]*0.015 + a["幸运"]*0.01;
  base -= state.p.realmIdx*0.015;
  base += state.p.vein*0.01 + state.p.cave*0.01;
  base += materialPassive("breakthrough") * 0.01;
  if(invQty("pill_jing") >= 1) base += 0.04;
  if(state.p.sect === "魔道") base += 0.02;
  if(flags().has("ruins_core")) base += 0.03;
  const ch = clamp(Math.floor(base*100), 5, 85)/100;
  const ok = chance(ch);
  if(ok){
    state.p.realmIdx += 1;
    state.p.fame += 1 + Math.floor(state.p.realmIdx/3);
    if(state.p.sect === "正道") state.p.karma = clamp(state.p.karma + 1, -100, 100);
    state.p.hp = Math.min(maxHP(), state.p.hp + 1);
    return { ok:true, msg:`你运转周天，灵海翻涌——突破成功！当前境界：${realm()}。` };
  }
  const dead = applyDamage(3);
  state.p.mp = Math.max(0, state.p.mp - 2);
  if(dead) return { ok:false, msg:"冲关失败，逆流冲心……你当场陨落。" };
  return { ok:false, msg:`灵机不顺，冲关受挫。你气血翻涌（HP-3/MP-2）。成功率约 ${Math.floor(ch*100)}%。` };
}

function render(){
  renderStatus();
  renderActions();
}

function pill(tag, cls=""){ return `<span class="pill ${cls}">${escapeHtml(tag)}</span>`; }

function renderStatus(){
  const p = state.p;
  const sect = SECTS[p.sect]?.name ?? "未知";
  const invCount = Object.values(p.inv).reduce((a,b)=>a+b,0);
  const f = flags();
  const mood = f.has("heart_demon") ? pill("心魔", "bad") : pill("心境", "good");
  const ruins = f.has("ruins_core") ? pill("遗迹核心","warn") : (f.has("ruins_map") ? pill("遗迹线索","warn") : "");
  const bond = p.bond === "道侣" ? pill("道侣","good") : (p.bond === "孽缘" ? pill("孽缘","bad") : pill("无结缘",""));
  const mentor = p.mentor === "名师" ? pill("名师","good") : (p.mentor === "邪师" ? pill("邪师","bad") : pill("无师承",""));

  $status.innerHTML = `
    <div class="kv"><div class="k">出身</div><div class="v">贾嘎村</div></div>
    <div class="kv"><div class="k">姓名</div><div class="v">${escapeHtml(p.name || "未命名")}</div></div>
    <div class="kv"><div class="k">天数</div><div class="v">第${p.day}天</div></div>
    <div class="kv"><div class="k">境界</div><div class="v">${realm()}</div></div>
    <div class="kv"><div class="k">灵石 / 仙玉</div><div class="v">${p.stone} / ${p.jade}</div></div>
    <div class="kv"><div class="k">HP / MP</div><div class="v">${p.hp}/${maxHP()} · ${p.mp}/${maxMP()}</div></div>
    <div class="kv"><div class="k">门派</div><div class="v">${escapeHtml(sect)}（${escapeHtml(p.sect)}）</div></div>
    <div class="kv"><div class="k">名望 / 因果</div><div class="v">${p.fame} / ${p.karma}</div></div>
    <div class="kv"><div class="k">村望 / 判定+</div><div class="v">${p.favor ?? 0} / ${p.eventBonus ?? 0}</div></div>
    <div class="kv"><div class="k">洞府 / 灵脉</div><div class="v">${p.cave} / ${p.vein}</div></div>
    <div class="kv"><div class="k">通天塔</div><div class="v">${p.tower}层</div></div>
    <div class="kv"><div class="k">背包</div><div class="v">${invCount}件</div></div>
    <div class="kv"><div class="k">因缘</div><div class="v">${bond} ${mentor}</div></div>
    <div class="kv"><div class="k">状态</div><div class="v">${mood} ${ruins}</div></div>
    <div class="kv"><div class="k">属性</div><div class="v">
      ${ATTRS.map(k=>`${k}${p.attrs[k]}`).join(" · ")}
    </div></div>
  `;
}

function btn(text, onClick, cls="btn"){
  const b = document.createElement("button");
  b.className = cls;
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

function renderActions(){
  $actions.innerHTML = "";
  if(state.screen === "intro"){
    $actions.appendChild(btn("开始：输入姓名", () => {
      const name = prompt("你的名字（可为空）") ?? "";
      state.p.name = name.trim() || "无名";
      clearLog();
      logLine("你出生在偏远的贾嘎村。村外灵脉纵横、宗门林立、遗迹遍地。");
      logLine("你拥有 20 点基础属性点，可分配到：智力、体质、幸运、魅力、灵根。");
      state.screen = "alloc";
      render();
    }, "btn primary"));
    $actions.appendChild(btn(`结局分支库：${endgameCatalogSize()}（>=50）`, () => {}, "btn"));
    return;
  }

  if(state.screen === "alloc"){
    $actions.appendChild(btn(`剩余点数：${state.p.left}（点此分配）`, () => allocDialog(), "btn primary"));
    $actions.appendChild(btn("确认加点并选门派", () => {
      if(state.p.left !== 0){
        alert("点数还没分完。");
        return;
      }
      state.screen = "sect";
      render();
    }, "btn good"));
    $actions.appendChild(btn("快速推荐加点（稳健）", () => {
      if(state.p.left <= 0) return;
      // 体质/灵根/智力偏稳
      const plan = ["体质","灵根","智力","幸运","魅力"];
      while(state.p.left > 0){
        const k = plan[(20 - state.p.left) % plan.length];
        state.p.attrs[k] += 1;
        state.p.left -= 1;
      }
      render();
    }, "btn"));
    return;
  }

  if(state.screen === "sect"){
    const keys = Object.keys(SECTS);
    for(const k of keys){
      const s = SECTS[k];
      $actions.appendChild(btn(`${s.name}（${k}）\n${s.desc}`, () => {
        state.p.sect = k;
        if(k === "正道") state.p.karma += 10;
        if(k === "魔道") state.p.karma -= 10;
        if(k === "商盟") state.p.fame += 3;
        state.p.hp = maxHP();
        state.p.mp = maxMP();
        state.screen = "main";
        logLine(`你选择了立场：${s.name}（${k}）。`, "warn");
        render();
      }, "btn primary"));
    }
    return;
  }

  if(state.screen === "ending"){
    $actions.appendChild(btn("再开一局", () => { state = baseState(); save(); location.reload(); }, "btn danger"));
    $actions.appendChild(btn("回到主菜单（继续此存档）", () => { state.screen = "main"; render(); }, "btn"));
    return;
  }

  // main
  const actions = [
    ["日常任务", () => doDaily(), "btn primary"],
    ["组队副本", () => doDungeon(), "btn primary"],
    ["自由交易", () => doTrade(), "btn primary"],
    ["挖矿炼器", () => doMineForge(), "btn primary"],
    ["采药炼丹", () => doHerbAlchemy(), "btn primary"],
    ["洞府 / 灵脉", () => doCaveVein(), "btn primary"],
    ["遗迹", () => doRuins(), "btn primary"],
    ["通天塔", () => doTower(), "btn primary"],
    ["拍卖会", () => doAuction(), "btn primary"],
    ["结缘 / 师徒 / 门派", () => doRelations(), "btn primary"],
    ["装备管理", () => doEquip(), "btn"],
    ["背包（查看/使用）", () => doBackpack(), "btn"],
    ["人物 / NPC", () => doNpcHub(), "btn"],
    ["尝试突破", () => {
      state.p.mp = Math.max(0, state.p.mp - 2);
      const r = breakthrough();
      logLine(r.msg, r.ok?"good":"bad");
      state.p.day += 1;
      if(state.p.hp <= 0) doEnding(true);
      else render();
    }, "btn good"],
    ["收束道途（结局）", () => doEnding(), "btn danger"],
  ];
  for(const [t, fn, cls] of actions){
    $actions.appendChild(btn(t, () => { if(state.screen !== "main") return; fn(); }, cls));
  }
}

function allocDialog(){
  const left = state.p.left;
  const lines = ATTRS.map((k,i)=>`${i+1}. ${k}（当前${state.p.attrs[k]}）`).join("\n");
  const pickIdx = prompt(`选择要加点的属性（输入序号）\n剩余：${left}\n\n${lines}`) ?? "";
  const i = Number(pickIdx);
  if(!Number.isFinite(i) || i < 1 || i > ATTRS.length) return;
  const k = ATTRS[i-1];
  const add = Number(prompt(`给 ${k} 加几点？（1~${left}）`) ?? "");
  if(!Number.isFinite(add) || add < 1 || add > left) return;
  state.p.attrs[k] += Math.floor(add);
  state.p.left -= Math.floor(add);
  render();
}

function endDay(){
  state.p.day += 1;
  if(state.p.hp <= 0){
    logLine("你气血枯竭，道途止步。", "bad");
    doEnding(true);
    return;
  }
  render();
}

function useConsumableKey(key){
  if(invQty(key) < 1 || !ITEMS[key]) return "物品不足。";
  if(key === "pill_qi"){
    addInv(key,-1); healHpMp(5,4); state.p.eventBonus = (state.p.eventBonus ?? 0) + 1;
    return "回气丹化开，气韵流转，下次判定+1。";
  }
  if(key === "pill_jing"){
    addInv(key,-1); healHpMp(2,8); state.p.eventBonus = (state.p.eventBonus ?? 0) + 2;
    return "凝神丹让你灵台一清，下次判定+2。";
  }
  if(key === "herb_qing"){
    addInv(key,-1); healHpMp(3,1);
    return "青灵草嚼服，伤势稍缓。";
  }
  if(key === "herb_xuan"){
    addInv(key,-1); healHpMp(1,5);
    const s = flags();
    if(s.has("heart_demon")){
      s.delete("heart_demon");
      state.p.flags = [...s];
      return "玄息花清香入心，心魔阴影退去。";
    }
    return "玄息花让你神思清明。";
  }
  if(key === "spirit_rice"){
    addInv(key,-1); healHpMp(4,3); state.p.favor = Math.min(100, (state.p.favor ?? 0) + 1);
    return "灵米下肚，血气渐稳，村望微涨。";
  }
  if(key === "talisman_flee"){
    addInv(key,-1); state.p.damageHalve = true;
    return "遁行符已扣在手中，下次受伤减半。";
  }
  return "此物无法直接使用。";
}

function doBackpack(){
  const lines = Object.keys(state.p.inv).filter(k=>invQty(k)>0).sort().map(k=>{
    const it = ITEMS[k]; const n = invQty(k);
    return `${it?.name ?? k} x${n} (${it?.kind ?? "?"})`;
  }).join("\n");
  const usable = Object.keys(state.p.inv).filter(k=>{
    const it = ITEMS[k]; if(!it || invQty(k)<1) return false;
    if(it.kind === "pill" || it.kind === "consumable") return true;
    if(it.kind === "material" && ["herb_qing","herb_xuan","spirit_rice"].includes(k)) return true;
    return false;
  }).sort();
  if(!usable.length){
    alert(`背包：\n${lines || "空"}\n\n暂无可直接使用物品。`);
    return;
  }
  const menu = usable.map((k,i)=>`${i+1}. 使用 ${ITEMS[k].name}`).join("\n");
  const s = prompt(`背包（村望${state.p.favor ?? 0} 判定+储备${state.p.eventBonus ?? 0}）\n\n${lines}\n\n${menu}\n0 取消`) ?? "";
  const n = Number(s);
  if(!(n>=1 && n<=usable.length)) return;
  logLine(useConsumableKey(usable[n-1]), "good");
  render();
}

function doNpcHub(){
  const sectName = SECTS[state.p.sect]?.name ?? "";
  const menu = [
    `1. 村长贾老实`,
    `2. 猎户石大山`,
    `3. 郎中叶百草`,
    `4. 行商金不换`,
    `5. 说书人（25灵石）`,
    `6. 拜见执事（${sectName}）`,
    `0. 返回`,
  ].join("\n");
  const s = prompt(`人物 / NPC\n\n${menu}`) ?? "";
  const idx = Number(s);
  if(idx === 1){
    const r = Number(prompt("贾老实：\n1 巡夜\n2 打听灵脉(30灵石)\n3 用灵米慰问（需灵米）\n0 取消") ?? "");
    if(r===1){ state.p.mp = Math.max(0,state.p.mp-1); state.p.stone += 40 + Math.floor((state.p.favor ?? 0)/5); state.p.favor = Math.min(100,(state.p.favor ?? 0)+6); state.p.karma = Math.min(100,state.p.karma+2); logLine("村民谢你巡夜。", "good"); }
    else if(r===2){ if(state.p.stone<30) logLine("灵石不够。", "bad"); else { state.p.stone -= 30; state.p.eventBonus = (state.p.eventBonus ?? 0) + 2; setFlag("npc_intel_vein"); logLine("得到灵脉线索，下次判定+2。", "warn"); } }
    else if(r===3){ if(invQty("spirit_rice")<1) logLine("没有灵米。", "bad"); else { addInv("spirit_rice",-1); state.p.favor = Math.min(100,(state.p.favor ?? 0)+10); state.p.karma = Math.min(100,state.p.karma+4); logLine("孤寡眼底有了光。", "good"); } }
  }else if(idx===2){
    const r = Number(prompt("石大山：\n1 弱点情报(50灵石或1玄铁)\n2 小道消息(10灵石,+1判定)\n0 取消") ?? "");
    if(r===1){ if(state.p.stone>=50) state.p.stone -= 50; else if(invQty("ore_iron")>=1) addInv("ore_iron",-1); else { logLine("钱矿都没有。", "bad"); state.p.day++; render(); return; } state.p.eventBonus = (state.p.eventBonus ?? 0) + 3; setFlag("npc_dungeon_hint"); logLine("副本陷阱烂熟于心，下次判定+3。", "good"); }
    else if(r===2){ if(state.p.stone<10) logLine("灵石不够。", "bad"); else { state.p.stone -= 10; state.p.eventBonus = (state.p.eventBonus ?? 0) + 1; logLine("猎人嘟囔几个地名。", "good"); } }
  }else if(idx===3){
    const r = Number(prompt("叶百草：\n1 调理(30灵石)\n2 玄息花换偏方（耗1花,+1判定）\n0 取消") ?? "");
    if(r===1){ if(state.p.stone<30) logLine("诊金不够。", "bad"); else { state.p.stone -= 30; healHpMp(5,3); state.p.favor = Math.min(100,(state.p.favor ?? 0)+4); logLine("针灸后胸臆通畅。", "good"); } }
    else if(r===2){ if(invQty("herb_xuan")<1) logLine("没有玄息花。", "bad"); else { addInv("herb_xuan",-1); state.p.eventBonus = (state.p.eventBonus ?? 0) + 1; setFlag("npc_herb_bless"); logLine("得丹方残页护心。", "good"); } }
  }else if(idx===4){
    const r = Number(prompt("金不换：\n1 赊人情(名望≥3,+50灵石,-2因果)\n2 打听底价（后几笔交易略便宜）\n0 取消") ?? "");
    if(r===1){
      if(state.p.fame < 3) logLine("你太无名。", "bad");
      else { state.p.stone += 50; state.p.karma = Math.max(-100, state.p.karma - 2); setFlag("npc_debt"); logLine("按下人情印。", "warn"); }
    } else if(r===2){
      setFlag("npc_trade_tip"); logLine("低声报了后门价。", "warn");
    }
  }else if(idx===5){
    if(state.p.stone < 25) logLine("灵石不够听说书。", "bad");
    else { state.p.stone -= 25; const roll = rint(1,4);
      if(roll===1){ setFlag("ruins_map"); logLine("听到遗迹将出世。", "warn"); }
      else if(roll===2){ state.p.fame += 1; logLine("有人认出你。", "good"); }
      else if(roll===3){ state.p.eventBonus = (state.p.eventBonus ?? 0) + 2; logLine("故事里藏步法。", "good"); }
      else { state.p.stone += 15; logLine("捡了袋灵石。", "good"); }
    }
  }else if(idx===6){
    const r = Number(prompt(`拜见${sectName}执事：\n1 点拨(20灵石,+1判定)\n2 供奉(10灵石,+1名望)\n0 取消`) ?? "");
    if(r===1){ if(state.p.stone<20) logLine("供奉不够。", "bad"); else { state.p.stone -= 20; state.p.eventBonus = (state.p.eventBonus ?? 0) + 1; if(state.p.sect==="正道") state.p.karma = Math.min(100,state.p.karma+1); if(state.p.sect==="魔道") state.p.karma = Math.max(-100,state.p.karma-1); logLine("眉心一指点窍。", "good"); } }
    else if(r===2){ if(state.p.stone<10) logLine("灵石不够。", "bad"); else { state.p.stone -= 10; state.p.fame += 1; logLine("礼多人不怪。", "good"); } }
  }else return;
  state.p.day += 1;
  render();
}

function doDaily(){
  const tasks = [
    { name:"护送商队", tag:"商盟", stone:80, jade:0, karma:+2, fame:+2 },
    { name:"清剿妖患", tag:"正道", stone:90, jade:0, karma:+3, fame:+4 },
    { name:"暗取密卷", tag:"魔道", stone:70, jade:+1, karma:-2, fame:+5 },
    { name:"采集灵草", tag:"散修", stone:60, jade:0, karma:+1, fame:+2 },
    { name:"休息一日", rest:true },
  ];
  const menu = tasks.map((t,i)=> t.rest ? `${i+1}. 休息一日（恢复HP/MP）` :
    `${i+1}. ${t.name}（偏向${t.tag}） 灵石+${t.stone} 仙玉+${t.jade} 名望+${t.fame} 因果${t.karma>=0?"+":""}${t.karma}`
  ).join("\n");
  const s = prompt(`日常任务：输入序号\n\n${menu}`) ?? "";
  const idx = Number(s)-1;
  if(!(idx>=0 && idx<tasks.length)) return;
  const t = tasks[idx];
  if(t.rest){
    healRest();
    logLine("你调息养神，心境平稳。", "good");
    endDay();
    return;
  }
  const score = powerScore() + state.p.attrs["魅力"] + state.p.attrs["幸运"] + takeEventBonus() + materialPassive("daily") + rint(0,20);
  const diff = 18 + state.p.realmIdx*2;
  const ok = score >= diff;
  if(ok){
    state.p.stone += t.stone;
    state.p.jade += t.jade;
    state.p.karma = clamp(state.p.karma + t.karma, -100, 100);
    state.p.fame += t.fame;
    if(t.name === "采集灵草"){
      addInv("herb_qing", 1 + rint(0,2));
    }
    logLine(`你完成了【${t.name}】，收获颇丰。`, "good");
  }else{
    applyDamage(2);
    state.p.mp = Math.max(0, state.p.mp - 1);
    state.p.fame = Math.max(0, state.p.fame - 1);
    logLine(`你在【${t.name}】中受挫而归（HP-2/MP-1，名望-1）。`, "bad");
    if(state.p.hp <= 0) logLine("伤势失控，未能回到村口。", "bad");
  }
  endDay();
}

function doDungeon(){
  const d = pick(DUNGEONS);
  const menu = [
    "1. 独自前往",
    "2. 花100灵石雇佣同伴（更稳）",
    "3. 与结缘之人同行（若有）",
  ].join("\n");
  const s = prompt(`组队副本：${d.name}（${d.tag}）\n\n${menu}`) ?? "";
  const idx = Number(s);
  if(!(idx>=1 && idx<=3)) return;
  let bonus = 0;
  if(idx === 2){
    if(state.p.stone < 100) logLine("灵石不足，改为独自前往。", "warn");
    else { state.p.stone -= 100; bonus += 3; state.p.companions += 1; setFlag("hired_once"); }
  }
  if(idx === 3){
    if(state.p.bond === "道侣"){ bonus += 5; setFlag("bond_fight"); }
    else if(state.p.bond === "孽缘"){ bonus -= 2; setFlag("bad_bond_fight"); }
    else logLine("你尚未结缘，只能独自前往。", "warn");
  }
  const score = powerScore() + bonus + takeEventBonus() + materialPassive("dungeon") + rint(0,10);
  const diff = 22 + state.p.realmIdx*2;
  const ok = score >= diff;
  if(ok){
    const gain = 120 + state.p.realmIdx*25;
    state.p.stone += gain;
    addInv("ore_iron", 1 + rint(0,2));
    if(chance(0.25 + state.p.attrs["幸运"]*0.01)){ addInv("ore_myst", 1); setFlag("myst_ore_found"); }
    if(chance(0.12)) setFlag("ruins_map");
    state.p.fame += 2;
    applyDamage(1);
    logLine(`你横推副本，灵石+${gain}，并带回矿材（仍难免擦伤）。`, "good");
  }else{
    applyDamage(4);
    state.p.mp = Math.max(0, state.p.mp - 3);
    if(chance(0.30)) setFlag("heart_demon");
    logLine("你在副本中被围困，侥幸脱身（HP-4/MP-3）。", "bad");
    if(state.p.hp <= 0) logLine("撤离不及，倒在乱石之间……", "bad");
  }
  endDay();
}

function doTrade(){
  const market = ["ore_iron","ore_myst","herb_qing","herb_xuan","spirit_rice","talisman_flee","pill_qi","pill_jing","w_sword","a_robe","t_charm","f_orb"];
  const list = market.map((k,i)=>{
    const it = ITEMS[k];
    let price = Math.floor(it.price*(0.85 + Math.random()*0.5));
    if(flags().has("npc_trade_tip")) price = Math.floor(price * 0.92);
    return `${i+1}. 买 ${it.name}（${it.kind} 稀有${it.rarity}）- ${price}灵石`;
  }).join("\n");
  const extra = [
    `${market.length+1}. 卖出物品`,
    `${market.length+2}. 离开`,
  ].join("\n");
  const s = prompt(`自由交易（灵石${state.p.stone} / 仙玉${state.p.jade}）\n\n${list}\n${extra}`) ?? "";
  const idx = Number(s);
  if(!(idx>=1 && idx<=market.length+2)) return;
  if(idx <= market.length){
    const k = market[idx-1];
    const it = ITEMS[k];
    let price = Math.floor(it.price*(0.85 + Math.random()*0.5));
    if(flags().has("npc_trade_tip")) price = Math.floor(price * 0.92);
    if(state.p.stone < price){ logLine("灵石不足。", "bad"); return; }
    state.p.stone -= price;
    addInv(k, 1);
    logLine(`你买下了 ${it.name}。`, "good");
    endDay();
    return;
  }
  if(idx === market.length+1){
    const keys = Object.keys(state.p.inv);
    if(!keys.length){ logLine("你背包空空。", "warn"); return; }
    const menu = keys.map((k,i)=>`${i+1}. ${ITEMS[k]?.name ?? k} x${invQty(k)}（单价约${ITEMS[k]?.price ?? 10}）`).join("\n");
    const s2 = prompt(`卖出哪件？\n\n${menu}`) ?? "";
    const i = Number(s2)-1;
    if(!(i>=0 && i<keys.length)) return;
    const k = keys[i];
    const qty = Number(prompt(`卖多少？（1~${invQty(k)}）`) ?? "");
    if(!Number.isFinite(qty) || qty<1 || qty>invQty(k)) return;
    const it = ITEMS[k] ?? { price: 10, name: k };
    const unit = Math.floor(it.price*(0.6 + Math.random()*0.3));
    addInv(k, -Math.floor(qty));
    let gain = unit*Math.floor(qty);
    if(state.p.sect === "商盟") gain += Math.floor(gain*0.08);
    state.p.stone += gain;
    logLine(`成交：${it.name} x${Math.floor(qty)}，灵石+${gain}。`, "good");
    endDay();
  }
}

function doMineForge(){
  const menu = ["1. 前往矿脉挖矿","2. 在炉前炼器","3. 返回"].join("\n");
  const s = prompt(`挖矿炼器：输入序号\n\n${menu}`) ?? "";
  const idx = Number(s);
  if(!(idx>=1 && idx<=3)) return;
  if(idx === 1){
    let gainIron = 1 + rint(0,3) + (state.p.vein >= 2 ? 1 : 0);
    gainIron += Math.floor(materialPassive("mine") / 2);
    addInv("ore_iron", gainIron);
    if(chance(0.18 + state.p.attrs["幸运"]*0.01)) addInv("ore_myst", 1);
    applyDamage(1);
    state.p.mp = Math.max(0, state.p.mp - 1);
    logLine(`你挖得玄铁矿 x${gainIron}。`, "good");
    if(state.p.hp <= 0) logLine("矿脉塌方，再未爬出……", "bad");
    endDay();
    return;
  }
  if(idx === 2){
    if(invQty("ore_iron") < 2){ logLine("炼器至少需要 2 个玄铁矿。", "warn"); return; }
    const useMyst = invQty("ore_myst") >= 1 && confirm("是否加入幽冥晶矿提升品质？（确定=加入）");
    addInv("ore_iron", -2);
    if(useMyst) addInv("ore_myst", -1);
    const craftScore = state.p.attrs["智力"] + state.p.attrs["灵根"] + (state.p.sect==="商盟"?2:0) + materialPassive("alchemy");
    let p = 0.45 + craftScore*0.02 + (useMyst?0.08:0);
    p = Math.min(0.85, p);
    const ok = chance(p);
    if(ok){
      const key = chance(0.5) ? "w_sword" : "f_orb";
      addInv(key, 1);
      state.p.fame += 1;
      setFlag("crafted_once");
      logLine(`炉火如龙，你炼出了一件【${ITEMS[key].name}】！`, "good");
    }else{
      applyDamage(2);
      logLine("火候失衡，炼器失败（HP-2）。", "bad");
      if(state.p.hp <= 0) logLine("反噬过猛，倒在炉前。", "bad");
    }
    endDay();
  }
}

function doHerbAlchemy(){
  const menu = ["1. 前往药谷采药","2. 开炉炼丹","3. 返回"].join("\n");
  const s = prompt(`采药炼丹：输入序号\n\n${menu}`) ?? "";
  const idx = Number(s);
  if(!(idx>=1 && idx<=3)) return;
  if(idx === 1){
    const g1 = 1 + rint(0,2);
    const g2 = chance(0.25 + state.p.attrs["幸运"]*0.01) ? 1 : 0;
    addInv("herb_qing", g1);
    if(g2) addInv("herb_xuan", 1);
    state.p.mp = Math.max(0, state.p.mp - 1);
    logLine(`你采得青灵草 x${g1}${g2? "，并得玄息花 x1": "。"} `, "good");
    endDay();
    return;
  }
  if(idx === 2){
    if(invQty("herb_qing") < 2){ logLine("炼丹至少需要青灵草 x2。", "warn"); return; }
    const menu2 = ["1. 回气丹（青灵草x2）","2. 凝神丹（青灵草x2 + 玄息花x1）","3. 返回"].join("\n");
    const s2 = prompt(`炼什么？\n\n${menu2}`) ?? "";
    const t = Number(s2);
    if(!(t>=1 && t<=3) || t===3) return;
    let key, diff;
    if(t === 1){
      addInv("herb_qing", -2);
      key = "pill_qi"; diff = 16;
    }else{
      if(invQty("herb_xuan") < 1){ logLine("缺少玄息花。", "warn"); return; }
      addInv("herb_qing", -2);
      addInv("herb_xuan", -1);
      key = "pill_jing"; diff = 22;
    }
    const score = state.p.attrs["智力"]*2 + state.p.attrs["灵根"] + state.p.attrs["幸运"] + materialPassive("alchemy") + rint(0,12);
    const ok = score >= diff;
    if(ok){
      addInv(key, 1);
      state.p.fame += 1;
      setFlag("alchem_once");
      logLine(`丹香四溢，你炼成【${ITEMS[key].name}】。`, "good");
    }else{
      applyDamage(2);
      logLine("丹炉炸响，炼丹失败（HP-2）。", "bad");
      if(state.p.hp <= 0) logLine("丹火噬身，未能走出丹室。", "bad");
    }
    endDay();
  }
}

function doCaveVein(){
  const caveCost = 200 + state.p.cave*80;
  const veinCost = 250 + state.p.vein*110;
  const menu = [
    `1. 扩建洞府（${caveCost}灵石）`,
    `2. 培育灵脉（${veinCost}灵石）`,
    `3. 在洞府闭关（尝试突破）`,
    `4. 返回`,
  ].join("\n");
  const s = prompt(`洞府/灵脉（洞府${state.p.cave}，灵脉${state.p.vein}）\n\n${menu}`) ?? "";
  const idx = Number(s);
  if(!(idx>=1 && idx<=4) || idx===4) return;
  if(idx === 1){
    if(state.p.stone < caveCost){ logLine("灵石不足。", "bad"); return; }
    state.p.stone -= caveCost;
    state.p.cave += 1;
    setFlag("cave_built");
    logLine("洞府扩建完成，灵气更稳。", "good");
    endDay();
    return;
  }
  if(idx === 2){
    if(state.p.stone < veinCost){ logLine("灵石不足。", "bad"); return; }
    state.p.stone -= veinCost;
    state.p.vein += 1;
    setFlag("vein_raised");
    logLine("灵脉得以滋养，修行更顺。", "good");
    endDay();
    return;
  }
  if(idx === 3){
    const r = breakthrough();
    logLine(r.msg, r.ok ? "good":"bad");
    if(state.p.hp <= 0){ doEnding(true); return; }
    endDay();
  }
}

function doRuins(){
  const theme = pick(RUINS_THEMES);
  const menu = ["1. 谨慎探路（稳）","2. 强闯核心（险）","3. 顺手救人（正）","4. 趁火打劫（邪）","5. 撤离"].join("\n");
  const s = prompt(`遗迹探寻：${theme}\n\n${menu}`) ?? "";
  const idx = Number(s);
  if(!(idx>=1 && idx<=5) || idx===5) { endDay(); return; }
  let score = powerScore() + takeEventBonus() + materialPassive("ruins") + rint(0,12);
  let risk = 18 + state.p.realmIdx*2;
  if(idx === 2){ risk += 6; score += 3; }
  if(idx === 1){ risk -= 2; }
  if(idx === 3){ state.p.karma = clamp(state.p.karma + 6, -100, 100); state.p.fame += 1; }
  if(idx === 4){ state.p.karma = clamp(state.p.karma - 8, -100, 100); state.p.stone += 60; setFlag("ruins_sin"); }
  const ok = score >= risk;
  if(ok){
    state.p.stone += 150 + state.p.realmIdx*30;
    if(chance(0.45)) setFlag("ruins_core");
    if(chance(0.25)) addInv("t_charm", 1);
    state.p.fame += 2;
    logLine("你在遗迹中得了机缘与宝物。", "good");
  }else{
    applyDamage(3);
    if(chance(0.35)) setFlag("heart_demon");
    logLine("遗迹禁制反噬，你狼狈逃出（HP-3）。", "bad");
    if(state.p.hp <= 0) logLine("禁制碾碎生机……", "bad");
  }
  endDay();
}

function doTower(){
  const target = state.p.tower + 1;
  const menu = ["1. 正面硬撼","2. 以阵破敌（偏智力）","3. 以运破劫（偏幸运）","4. 返回"].join("\n");
  const s = prompt(`通天塔：挑战第${target}层（当前记录${state.p.tower}）\n\n${menu}`) ?? "";
  const idx = Number(s);
  if(!(idx>=1 && idx<=4) || idx===4) return;
  let score = powerScore() + takeEventBonus() + materialPassive("tower") + rint(0,10);
  if(idx === 2) score += state.p.attrs["智力"] + (state.p.sect==="正道"?2:0);
  if(idx === 3) score += state.p.attrs["幸运"]*2;
  const diff = 20 + target*2 + state.p.realmIdx;
  const ok = score >= diff;
  if(ok){
    state.p.tower += 1;
    state.p.fame += 2;
    state.p.stone += 120 + target*15;
    if([5,10,15,20].includes(state.p.tower)) state.p.jade += 1;
    logLine(`你破了第${target}层，名望更盛。`, "good");
  }else{
    applyDamage(2);
    state.p.mp = Math.max(0, state.p.mp - 2);
    logLine("你被塔灵击退（HP-2/MP-2）。", "bad");
    if(state.p.hp <= 0) logLine("塔劫临身，道消于此层。", "bad");
  }
  endDay();
}

function doAuction(){
  const pool = ["t_charm","f_orb","pill_jing","ore_myst"];
  const k = pick(pool);
  const it = ITEMS[k];
  const base = it.price * (it.kind==="equip" ? 3 : 2);
  const price = Math.floor(base*(0.9 + Math.random()*0.6));
  const menu = ["1. 出价购买","2. 围观吃瓜","3. 用仙玉走暗门（1仙玉换稳定收益）","4. 离开"].join("\n");
  const s = prompt(`拍卖会：今日拍品 ${it.name}（稀有${it.rarity}）\n起拍价约 ${price} 灵石\n\n${menu}`) ?? "";
  const idx = Number(s);
  if(!(idx>=1 && idx<=4) || idx===4) return;
  if(idx === 1){
    const bid = Number(prompt(`你出多少灵石？（1~${state.p.stone}）`) ?? "");
    if(!Number.isFinite(bid) || bid<1 || bid>state.p.stone) return;
    const win = bid >= price && chance(0.65 + state.p.attrs["魅力"]*0.01);
    if(win){
      state.p.stone -= Math.floor(bid);
      addInv(k, 1);
      state.p.fame += 1;
      setFlag("auction_win");
      logLine(`你拍下了 ${it.name}。`, "good");
    }else{
      state.p.fame = Math.max(0, state.p.fame - 1);
      logLine("你被人抬价压过，只得悻悻离场（名望-1）。", "bad");
    }
    endDay(); return;
  }
  if(idx === 2){
    if(chance(0.25 + state.p.attrs["幸运"]*0.01)){ setFlag("auction_gossip"); logLine("你听到一条秘闻：某处遗迹核心近期将现世。", "warn"); }
    else logLine("你看了一天热闹。", "warn");
    endDay(); return;
  }
  if(idx === 3){
    if(state.p.jade < 1){ logLine("仙玉不足。", "bad"); return; }
    state.p.jade -= 1;
    state.p.stone += 260 + state.p.fame*4;
    setFlag("jade_channel");
    logLine("你走暗门换得一笔稳妥收益。", "good");
    endDay();
  }
}

function doRelations(){
  const menu = ["1. 结缘：邂逅一人","2. 师徒：拜师/收徒","3. 门派：接取宗门差事（偏声望）","4. 返回"].join("\n");
  const s = prompt(`结缘/师徒/门派（结缘：${state.p.bond}；师承：${state.p.mentor}）\n\n${menu}`) ?? "";
  const idx = Number(s);
  if(!(idx>=1 && idx<=4) || idx===4) return;
  if(idx === 1){
    if(state.p.bond !== "无"){ logLine("你已有因缘牵绊，心绪难再起波澜。", "warn"); endDay(); return; }
    const charm = state.p.attrs["魅力"] + state.p.attrs["幸运"] + rint(0,10);
    if(charm >= 14){
      const s2 = prompt("此人眼神复杂，你要？\n1. 以礼相待（道侣线）\n2. 逢场作戏（孽缘线）\n3. 转身离开") ?? "";
      const t = Number(s2);
      if(t === 1){ state.p.bond="道侣"; state.p.karma = clamp(state.p.karma+4,-100,100); setFlag("bond_good"); logLine("你与其以道相契，结为道侣。", "good"); }
      if(t === 2){ state.p.bond="孽缘"; state.p.karma = clamp(state.p.karma-5,-100,100); setFlag("bond_bad"); logLine("情丝缠绕成劫，你结下孽缘。", "bad"); }
      if(t === 3){ logLine("你按下心绪。", "warn"); }
    }else{
      logLine("缘分未到。", "warn");
    }
    endDay(); return;
  }
  if(idx === 2){
    if(state.p.mentor === "无"){
      const s2 = prompt("你要拜何种师？\n1. 名师（正）\n2. 邪师（险）\n3. 算了") ?? "";
      const t = Number(s2);
      if(t === 1){ state.p.mentor="名师"; state.p.karma=clamp(state.p.karma+6,-100,100); setFlag("mentor_good"); logLine("你得名师指点，修行更稳。", "good"); }
      if(t === 2){ state.p.mentor="邪师"; state.p.karma=clamp(state.p.karma-8,-100,100); setFlag("mentor_bad"); logLine("你投身邪师门下，捷径背后暗藏代价。", "bad"); }
      if(t === 3){ logLine("你暂不拜师。", "warn"); }
    }else{
      const s2 = prompt("你已有师承，要？\n1. 收徒（+名望，耗资源）\n2. 与师门切割（风险）\n3. 算了") ?? "";
      const t = Number(s2);
      if(t === 1){
        if(state.p.stone < 120) logLine("资源不足，收徒失败。", "bad");
        else { state.p.stone -= 120; state.p.fame += 2; setFlag("disciple"); logLine("你收下一名弟子，江湖多了你的传说。", "good"); }
      }
      if(t === 2){
        setFlag("mentor_break");
        if(chance(0.5)){ state.p.fame += 1; logLine("你果断切割，反而得几分清名。", "good"); }
        else { applyDamage(2); state.p.fame=Math.max(0,state.p.fame-2); logLine("你被旧缘反噬（HP-2，名望-2）。", "bad"); if(state.p.hp<=0) logLine("旧缘成劫……", "bad"); }
      }
    }
    endDay(); return;
  }
  if(idx === 3){
    const gain = 70 + state.p.fame*3;
    state.p.stone += gain;
    state.p.fame += 1;
    if(state.p.sect === "正道") state.p.karma = clamp(state.p.karma+2,-100,100);
    if(state.p.sect === "魔道") state.p.karma = clamp(state.p.karma-2,-100,100);
    logLine(`你完成宗门差事，得灵石+${gain}。`, "good");
    endDay();
  }
}

function doEquip(){
  const equipKeys = Object.keys(state.p.inv).filter(k => ITEMS[k]?.kind === "equip" && invQty(k) > 0);
  const cur = EQUIPMENT_SLOTS.map(slot => `${slot}:${state.p.equip[slot] ? ITEMS[state.p.equip[slot]].name : "无"}`).join(" · ");
  let menu = equipKeys.map((k,i)=>`${i+1}. 装备 ${ITEMS[k].name}（槽位${ITEMS[k].slot} 战力+${ITEMS[k].power}）x${invQty(k)}`).join("\n");
  if(!menu) menu = "（背包无可装备物品）";
  const s = prompt(`装备管理\n当前：${cur}\n\n${menu}\n\n输入序号装备；输入 0 卸下某槽位；取消返回`) ?? "";
  if(s === "") return;
  const n = Number(s);
  if(!Number.isFinite(n)) return;
  if(n === 0){
    const s2 = prompt(`卸下哪个槽位？\n1.${EQUIPMENT_SLOTS[0]}\n2.${EQUIPMENT_SLOTS[1]}\n3.${EQUIPMENT_SLOTS[2]}\n4.${EQUIPMENT_SLOTS[3]}\n其它返回`) ?? "";
    const i = Number(s2);
    if(!(i>=1 && i<=4)) return;
    const slot = EQUIPMENT_SLOTS[i-1];
    const k = state.p.equip[slot];
    if(!k){ logLine("此槽位无装备。", "warn"); return; }
    state.p.equip[slot] = null;
    addInv(k, 1);
    logLine(`你卸下了 ${ITEMS[k].name}。`, "good");
    return;
  }
  const i = n - 1;
  if(!(i>=0 && i<equipKeys.length)) return;
  const k = equipKeys[i];
  const it = ITEMS[k];
  const slot = it.slot;
  const old = state.p.equip[slot];
  if(old) addInv(old, 1);
  state.p.equip[slot] = k;
  addInv(k, -1);
  logLine(`你装备了 ${it.name}。`, "good");
}

function doEnding(fromDeath=false){
  const e = ending(fromDeath);
  state.screen = "ending";
  logLine(fromDeath ? "你的道途被迫收束。":"你选择收束道途，回望来时路。", "warn");
  logLine(e.title, "warn");
  for(const ln of e.lines) logLine(ln, "");
  render();
}

function save(){
  try{
    localStorage.setItem("jgxx_save_v1", JSON.stringify(state));
    logLine("已保存（本机浏览器可继续）。", "good");
  }catch{
    logLine("保存失败：浏览器存储不可用。", "bad");
  }
}
function load(){
  try{
    const s = localStorage.getItem("jgxx_save_v1");
    if(!s) return null;
    const obj = JSON.parse(s);
    if(!obj || typeof obj !== "object") return null;
    if(obj.v === 1){
      obj.v = 2;
      obj.p.eventBonus = obj.p.eventBonus ?? 0;
      obj.p.damageHalve = obj.p.damageHalve ?? false;
      obj.p.favor = obj.p.favor ?? 0;
    }
    if(obj.v !== 2) return null;
    return obj;
  }catch{
    return null;
  }
}

$btnSave.addEventListener("click", () => save());
$btnReset.addEventListener("click", () => {
  if(!confirm("确定重开？当前进度会丢失（除非你已保存）。")) return;
  localStorage.removeItem("jgxx_save_v1");
  state = baseState();
  location.reload();
});

// 初次进入时给一句提示
if(state.screen === "intro"){
  clearLog();
  logLine(`（系统）结局分支库：${endgameCatalogSize()} 个（>=50 ✅）`, "warn");
  logLine("手机游玩建议：横向滚动不多，主要点按钮即可。");
}

render();

