"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RoleKey = "gunner" | "assault" | "sniper";
type Phase = "intro" | "briefing" | "march" | "battle" | "quiz" | "result";

const ROLES: Record<RoleKey, { name: string; tag: string; desc: string; ammo: number; damage: number; cooldown: number; color: string }> = {
  gunner: { name: "机枪兵", tag: "持续压制", desc: "弹量充足，持续射击可为突击队建立安全窗口。", ammo: 64, damage: 1, cooldown: 120, color: "#d5a23b" },
  assault: { name: "冲锋兵", tag: "快速突破", desc: "射速和威力均衡，靠近桥头时推进效率最高。", ammo: 42, damage: 2, cooldown: 260, color: "#c44d35" },
  sniper: { name: "狙击手", tag: "精准清除", desc: "弹药有限，但可远距离一击清除高威胁火力点。", ammo: 18, damage: 4, cooldown: 720, color: "#6d8d77" },
};

const MARCH_EVENTS = [
  { title: "暴雨中的岔路", text: "河岸近路有敌军哨点；山路更隐蔽，却会消耗更多体力。", options: [{ label: "侦察后沿河快速穿插", time: 5, stamina: 8, note: "利用速度抢在哨点合围前通过。" }, { label: "翻越山岭完全避战", time: 12, stamina: 18, note: "安全，但失去宝贵时间。" }] },
  { title: "队伍出现掉队", text: "连续行军后，数名战士体力不支。你必须在速度与队伍完整之间平衡。", options: [{ label: "重分配负重，保持队形", time: 7, stamina: 6, note: "协作比抛下队友更可靠。" }, { label: "原地长时间休整", time: 16, stamina: -12, note: "恢复充分，但夺桥窗口正在缩小。" }] },
  { title: "前方小股阻击", text: "对方尚未完成部署。纠缠越久，泸定桥守备越充分。", options: [{ label: "火力掩护，小组交替前进", time: 6, stamina: 10, note: "用协同换取时间。" }, { label: "展开全面攻击", time: 15, stamina: 8, note: "消灭更多敌人并非本次任务的核心。" }] },
];

const QUESTIONS = [
  { q: "为什么不能只依靠安顺场的渡船？", choices: ["船只少、运力不足，追兵又在逼近", "大渡河已经完全封冻", "泸定桥离目的地更远"], a: 0 },
  { q: "泸定桥的13根铁链如何分布？", choices: ["13根全部铺在桥面", "9根承托桥面，4根形成两侧护栏", "7根桥面，6根护栏"], a: 1 },
  { q: "“飞夺”中的“飞”首先体现了什么？", choices: ["战士从空中降落", "只依靠正面火力", "急行军与敌军争夺时间"], a: 2 },
];

function randomRole(): RoleKey {
  return (["gunner", "assault", "sniper"] as RoleKey[])[Math.floor(Math.random() * 3)];
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [role, setRole] = useState<RoleKey>("assault");
  const [revealing, setRevealing] = useState(false);
  const [time, setTime] = useState(120);
  const [stamina, setStamina] = useState(100);
  const [marchIndex, setMarchIndex] = useState(0);
  const [marchNote, setMarchNote] = useState("");
  const [progress, setProgress] = useState(0);
  const [ammo, setAmmo] = useState(42);
  const [enemies, setEnemies] = useState<{ id: number; x: number; y: number; hp: number; type: "rifle" | "nest" }[]>([]);
  const [battleTime, setBattleTime] = useState(50);
  const [lastShot, setLastShot] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [hits, setHits] = useState(0);
  const enemyId = useRef(0);

  const begin = () => {
    setRevealing(true);
    let rolls = 0;
    const timer = window.setInterval(() => {
      setRole(randomRole());
      rolls += 1;
      if (rolls > 12) {
        window.clearInterval(timer);
        const next = randomRole();
        setRole(next);
        setAmmo(ROLES[next].ammo);
        setRevealing(false);
        setPhase("briefing");
      }
    }, 90);
  };

  const resetGame = () => {
    setPhase("intro"); setTime(120); setStamina(100); setMarchIndex(0); setMarchNote("");
    setProgress(0); setEnemies([]); setBattleTime(50); setQuizIndex(0); setQuizScore(0); setFeedback(""); setHits(0);
  };

  const chooseRoute = (correct: boolean) => {
    setTime(correct ? 120 : 102);
    setFeedback(correct ? "判断正确：泸定桥是大部队迅速渡河的关键通道。" : "这会拖慢全军。安顺场船只有限，必须争夺上游的泸定桥。");
    window.setTimeout(() => { setFeedback(""); setPhase("march"); }, 1700);
  };

  const marchChoice = (option: typeof MARCH_EVENTS[number]["options"][number]) => {
    setTime(v => Math.max(0, v - option.time));
    setStamina(v => Math.max(12, Math.min(100, v - option.stamina)));
    setMarchNote(option.note);
    window.setTimeout(() => {
      setMarchNote("");
      if (marchIndex === MARCH_EVENTS.length - 1) setPhase("battle");
      else setMarchIndex(v => v + 1);
    }, 1250);
  };

  useEffect(() => {
    if (phase !== "battle") return;
    const tick = window.setInterval(() => {
      setBattleTime(v => {
        if (v <= 1) { setPhase("quiz"); return 0; }
        return v - 1;
      });
      setProgress(v => {
        const pressure = Math.max(0, 2.2 - enemies.length * 0.28);
        const roleBoost = role === "gunner" ? 0.42 : role === "assault" && v > 55 ? 0.5 : 0;
        const next = Math.min(100, v + pressure + roleBoost);
        if (next >= 100) window.setTimeout(() => setPhase("quiz"), 200);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [phase, enemies.length, role]);

  useEffect(() => {
    if (phase !== "battle") return;
    const spawn = window.setInterval(() => {
      setEnemies(old => {
        if (old.length >= 6) return old;
        const type = Math.random() > 0.72 ? "nest" : "rifle";
        return [...old, { id: enemyId.current++, x: 56 + Math.random() * 38, y: 18 + Math.random() * 56, hp: type === "nest" ? 4 : 2, type }];
      });
    }, role === "sniper" ? 1500 : 1150);
    return () => window.clearInterval(spawn);
  }, [phase, role]);

  const shoot = useCallback((id: number) => {
    const now = Date.now();
    const r = ROLES[role];
    if (ammo <= 0 || now - lastShot < r.cooldown) return;
    setLastShot(now); setAmmo(v => v - 1);
    setEnemies(old => old.flatMap(enemy => {
      if (enemy.id !== id) return [enemy];
      const damage = role === "sniper" && enemy.type === "nest" ? 5 : r.damage;
      if (enemy.hp - damage <= 0) { setHits(v => v + 1); return []; }
      return [{ ...enemy, hp: enemy.hp - damage }];
    }));
  }, [ammo, lastShot, role]);

  const answer = (index: number) => {
    const correct = index === QUESTIONS[quizIndex].a;
    if (correct) setQuizScore(v => v + 1);
    setFeedback(correct ? "正确" : `正确答案：${QUESTIONS[quizIndex].choices[QUESTIONS[quizIndex].a]}`);
    window.setTimeout(() => {
      setFeedback("");
      if (quizIndex === QUESTIONS.length - 1) setPhase("result");
      else setQuizIndex(v => v + 1);
    }, 1050);
  };

  const r = ROLES[role];

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">泸</span><div><b>泸定 · 与时间赛跑</b><small>历史战术行动</small></div></div>
        <div className="date">1935.05.29 <span>大渡河西岸</span></div>
      </header>

      {phase === "intro" && <section className="hero panel">
        <div className="hero-copy">
          <p className="eyebrow">任务代号 · 生命通道</p>
          <h1>桥在前方，<br/><em>时间在身后。</em></h1>
          <p className="lead">安顺场渡船运力不足，追兵正在逼近。你所在的红四团必须昼夜急行，抢在增援到达前控制泸定桥。</p>
          <div className="facts"><span>约120公里急行军</span><span>13根铁链</span><span>22名突击队员</span></div>
          <button className="primary" onClick={begin} disabled={revealing}>{revealing ? "正在编入战斗小组…" : "接受任务"}</button>
          {revealing && <div className="role-roll" style={{ "--role": r.color } as React.CSSProperties}><small>随机分配</small><strong>{r.name}</strong><span>{r.tag}</span></div>}
        </div>
        <div className="bridge-art" aria-label="泸定桥示意图">
          <div className="mountain m1"/><div className="mountain m2"/><div className="sun"/>
          <div className="chain chain-a"/><div className="chain chain-b"/><div className="planks">{Array.from({length: 17}).map((_,i)=><i key={i}/>)}</div>
          <div className="river">大渡河</div><div className="art-caption">不是为了击杀<br/><b>是为了让大部队通过</b></div>
        </div>
      </section>}

      {phase === "briefing" && <section className="mission panel">
        <div className="stage-label">01 / 战略判断</div>
        <div className="role-card" style={{ "--role": r.color } as React.CSSProperties}><small>本局随机角色</small><h2>{r.name}</h2><b>{r.tag}</b><p>{r.desc}</p><div>初始弹药 <strong>{r.ammo}</strong></div></div>
        <div className="decision"><p className="eyebrow">安顺场 · 紧急军情</p><h2>船只有限，大部队无法及时渡河。你建议——</h2>
          <button onClick={() => chooseRoute(false)}><b>继续在安顺场摆渡</b><span>集中兵力，但预计耗时过长</span></button>
          <button onClick={() => chooseRoute(true)}><b>分路北进，抢占泸定桥</b><span>争夺关键渡河通道</span></button>
          {feedback && <div className="feedback">{feedback}</div>}
        </div>
      </section>}

      {phase === "march" && <section className="march panel">
        <div className="stage-label">02 / 昼夜急行</div>
        <div className="hud"><div><small>剩余行动窗口</small><b>{time}′</b></div><div><small>队伍体力</small><b>{stamina}%</b></div><div><small>行军进度</small><b>{Math.round((marchIndex / 3) * 100)}%</b></div></div>
        <div className="route"><span>安顺场</span><div className="route-line"><i style={{left:`${12 + marchIndex * 36}%`}}/></div><span>泸定桥</span></div>
        <div className="event-card"><p className="eyebrow">事件 {marchIndex + 1} / 3</p><h2>{MARCH_EVENTS[marchIndex].title}</h2><p>{MARCH_EVENTS[marchIndex].text}</p>
          <div className="event-options">{MARCH_EVENTS[marchIndex].options.map((o,i)=><button key={i} onClick={()=>marchChoice(o)} disabled={!!marchNote}><b>{o.label}</b><span>预计耗时 {o.time}′</span></button>)}</div>
          {marchNote && <div className="feedback">{marchNote}</div>}
        </div>
      </section>}

      {phase === "battle" && <section className="battle panel">
        <div className="battle-hud"><div><small>随机角色</small><b style={{color:r.color}}>{r.name}</b></div><div><small>弹药</small><b>{ammo}</b></div><div><small>桥面推进</small><b>{Math.round(progress)}%</b></div><div><small>增援倒计时</small><b>{battleTime}s</b></div></div>
        <div className="battlefield">
          <div className="bank bank-left"><span>火力掩护组</span></div><div className="water-lines"/>
          <div className="battle-bridge"><div className="bridge-progress" style={{width:`${progress}%`}}/><div className="squad" style={{left:`${Math.min(92, progress)}%`}}>▲</div></div>
          <div className="bank bank-right"><span>泸定桥东岸</span></div>
          {enemies.map(e=><button key={e.id} className={`enemy ${e.type}`} style={{left:`${e.x}%`,top:`${e.y}%`}} onClick={()=>shoot(e.id)} aria-label={e.type === "nest" ? "敌方火力点" : "敌军"}><i/><small>{e.type === "nest" ? "火力点" : "守军"}</small></button>)}
          <div className="crosshair">＋</div>
        </div>
        <div className="battle-tip"><b>{r.tag}</b><span>{role === "gunner" ? "连续点击目标保持压制；弹量优势会加快队伍推进。" : role === "assault" ? "快速清除近桥目标；越过桥中段后推进加速。" : "优先点击方形火力点；你的单发伤害最高。"}</span></div>
      </section>}

      {phase === "quiz" && <section className="quiz panel">
        <div className="stage-label">04 / 战后复盘</div><p className="eyebrow">知识检验 {quizIndex+1} / {QUESTIONS.length}</p><h2>{QUESTIONS[quizIndex].q}</h2>
        <div className="quiz-choices">{QUESTIONS[quizIndex].choices.map((c,i)=><button key={c} onClick={()=>answer(i)} disabled={!!feedback}><span>{String.fromCharCode(65+i)}</span>{c}</button>)}</div>
        {feedback && <div className="feedback">{feedback}</div>}
      </section>}

      {phase === "result" && <section className="result panel">
        <p className="eyebrow">任务完成 · 战后报告</p><h1>{progress >= 100 ? "生命通道已经打开" : "突击队抵达东岸"}</h1>
        <p className="result-lead">夺取泸定桥不是一个人的冲锋，而是情报、速度、火力掩护、突击与后续保障共同完成的行动。</p>
        <div className="score-grid"><div><b>{r.name}</b><small>随机角色</small></div><div><b>{hits}</b><small>清除威胁</small></div><div><b>{Math.round(progress)}%</b><small>桥面推进</small></div><div><b>{quizScore}/{QUESTIONS.length}</b><small>知识掌握</small></div></div>
        <div className="history-note"><b>你应该记住</b><p>1935年5月29日，红四团经过昼夜急行抵达泸定桥。22名突击队员在火力掩护下攀越铁索，后续队伍铺设桥板、控制桥头，为中央红军继续北上打开通道。</p></div>
        <button className="primary" onClick={resetGame}>重新随机角色</button>
      </section>}
      <footer><span>基于飞夺泸定桥历史事件设计</span><span>学习目标：地理 · 历史 · 协同决策</span></footer>
    </main>
  );
}
