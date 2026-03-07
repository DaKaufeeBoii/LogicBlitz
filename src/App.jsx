import { useState, useEffect, useCallback, useRef } from "react";
import {
  ADMIN, registerUser, verifyRegistrationOtp, loginUser, adminLogin, logoutUser,
  getAllUsers, getQuizzes, getQuizByCode, createQuiz, updateQuiz,
  deleteQuiz, toggleQuizStatus, submitScore, getScores,
  getScoresByQuiz, getScoresByUser, hasAttempted,
} from "./db";

/* ─── Icons ──────────────────────────────────────────────────────────────── */
const Ic = ({ n, s = 18, c = "currentColor" }) => {
  const p = {
    trophy: "M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-1a2 2 0 012-2h16a2 2 0 012 2v1a2 2 0 01-2 2h-2M6 18h12v4H6z",
    plus: "M12 5v14M5 12h14",
    play: "M5 3l14 9-14 9V3z",
    logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
    trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
    edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z",
    check: "M20 6L9 17l-5-5",
    x: "M18 6L6 18M6 6l12 12",
    mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
    users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    maximize: "M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3",
    refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
    loader: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={p[n]} />
    </svg>
  );
};

/* ─── CSS ────────────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { width:100%; height:100%; overflow:hidden; }
  body { width:100%; height:100%; overflow:hidden; font-family:'DM Sans',sans-serif; background:#080812; color:#dde; }
  #root { width:100%; height:100%; overflow:hidden; display:flex; flex-direction:column; }

  .shell  { width:100vw; height:100vh; display:flex; flex-direction:column; overflow:hidden; }
  .navbar { height:52px; min-height:52px; background:rgba(8,8,18,0.97); border-bottom:1px solid rgba(233,69,96,0.18); display:flex; align-items:center; padding:0 1.25rem; gap:0.75rem; flex-shrink:0; z-index:10; }
  .nav-brand { font-family:'Bebas Neue',sans-serif; font-size:1.45rem; letter-spacing:0.08em; background:linear-gradient(90deg,#e94560,#ff8fa3); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  .page   { flex:1; overflow-y:auto; overflow-x:hidden; min-height:0; }
  .wrap   { padding:1.25rem; max-width:900px; width:100%; margin:0 auto; }
  .wrap-sm{ padding:1.25rem; max-width:620px; width:100%; margin:0 auto; }
  .center-page { width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding:1.5rem; }

  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-thumb { background:#e94560; border-radius:2px; }

  .btn { display:inline-flex; align-items:center; justify-content:center; gap:0.4rem; border:none; border-radius:8px; cursor:pointer; font-family:'DM Sans',sans-serif; font-weight:600; transition:all 0.15s; white-space:nowrap; padding:0.5rem 1rem; font-size:0.85rem; }
  .btn:active:not(:disabled) { transform:scale(0.97); }
  .btn:disabled { opacity:0.45; cursor:not-allowed; }
  .btn-red     { background:#e94560; color:#fff; box-shadow:0 2px 10px rgba(233,69,96,0.3); }
  .btn-red:hover:not(:disabled) { background:#d63850; box-shadow:0 4px 16px rgba(233,69,96,0.45); }
  .btn-outline { background:transparent; color:#e94560; border:1.5px solid rgba(233,69,96,0.45); }
  .btn-outline:hover:not(:disabled) { background:rgba(233,69,96,0.08); border-color:#e94560; }
  .btn-ghost   { background:rgba(255,255,255,0.04); color:#aab; border:1px solid rgba(255,255,255,0.07); }
  .btn-ghost:hover:not(:disabled) { background:rgba(255,255,255,0.08); color:#dde; }
  .btn-sm  { padding:0.35rem 0.7rem; font-size:0.78rem; }
  .btn-lg  { padding:0.7rem 1.6rem; font-size:0.95rem; }
  .btn-full{ width:100%; }

  .card { background:#0f0f28; border:1px solid rgba(233,69,96,0.12); border-radius:12px; padding:1.1rem; }
  .inp  { background:#08081a; border:1.5px solid rgba(255,255,255,0.07); border-radius:8px; color:#dde; padding:0.58rem 0.85rem; font-family:'DM Sans',sans-serif; font-size:0.875rem; outline:none; width:100%; transition:border 0.15s; }
  .inp:focus { border-color:#e94560; }
  .inp::placeholder { color:#334; }
  textarea.inp { resize:vertical; min-height:72px; }

  .field { display:flex; flex-direction:column; gap:0.3rem; }
  .field label { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#e94560; }
  .stack { display:flex; flex-direction:column; gap:0.7rem; }
  .row   { display:flex; align-items:center; gap:0.65rem; }
  .between { display:flex; align-items:center; justify-content:space-between; gap:0.65rem; flex-wrap:wrap; }
  .g2 { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; }
  .g4 { display:grid; grid-template-columns:1fr 1fr; gap:0.65rem; }
  .shead { font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.07em; color:#e94560; margin-bottom:0.5rem; }

  .tag { display:inline-flex; align-items:center; padding:0.18rem 0.55rem; border-radius:99px; font-size:0.68rem; font-weight:700; }
  .tg  { background:rgba(0,220,100,0.1); color:#00dc64; }
  .tgr { background:rgba(150,150,150,0.1); color:#778; }

  .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:0.65rem; }
  .tabs  { display:flex; gap:0.2rem; background:rgba(255,255,255,0.03); border-radius:7px; padding:0.2rem; }
  .tab   { flex:1; padding:0.4rem; border:none; border-radius:5px; font-family:'DM Sans',sans-serif; font-size:0.78rem; font-weight:600; cursor:pointer; color:#667; background:none; transition:all 0.15s; text-transform:capitalize; }
  .tab.on{ background:#e94560; color:#fff; }

  .prog   { width:100%; height:3px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden; }
  .prog-f { height:100%; background:linear-gradient(90deg,#e94560,#ff8fa3); border-radius:2px; transition:width 0.3s ease; }
  .tbar   { width:100%; height:4px; background:rgba(255,255,255,0.05); }
  .tbar-f { height:100%; transition:width 1s linear, background 0.5s; }

  .opt     { width:100%; text-align:left; padding:0.75rem 0.9rem; background:rgba(255,255,255,0.03); border:1.5px solid rgba(255,255,255,0.06); border-radius:9px; color:#bbc; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:0.875rem; font-weight:500; transition:all 0.15s; display:flex; align-items:center; gap:0.65rem; }
  .opt:hover { background:rgba(233,69,96,0.06); border-color:rgba(233,69,96,0.3); color:#fff; }
  .opt.sel   { background:rgba(233,69,96,0.13); border-color:#e94560; color:#fff; font-weight:700; }
  .opt-l { width:24px; height:24px; border-radius:6px; flex-shrink:0; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:800; transition:all 0.15s; }
  .opt.sel .opt-l { background:#e94560; color:#fff; }

  .overlay { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.72); backdrop-filter:blur(5px); display:flex; align-items:center; justify-content:center; padding:1rem; }
  .modal   { background:#0f0f28; border:1px solid rgba(233,69,96,0.28); border-radius:13px; padding:1.6rem; width:100%; max-width:420px; max-height:90vh; overflow-y:auto; position:relative; }
  .modal-w { max-width:680px; }

  .toast { position:fixed; bottom:1.1rem; right:1.1rem; z-index:9999; padding:0.6rem 1rem; border-radius:8px; font-weight:600; font-size:0.82rem; box-shadow:0 4px 20px rgba(0,0,0,0.5); animation:sup 0.25s ease; max-width:420px; }
  @keyframes sup { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
  @keyframes fin { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
  @keyframes spin { to{transform:rotate(360deg)} }
  .fin  { animation:fin 0.3s ease both; }
  .spin { animation:spin 0.9s linear infinite; display:inline-block; }

  /* OTP input */
  .otp-row { display:flex; gap:0.5rem; justify-content:center; }
  .otp-box { width:44px; height:52px; background:#08081a; border:1.5px solid rgba(255,255,255,0.1); border-radius:9px; color:#fff; font-family:'JetBrains Mono',monospace; font-size:1.3rem; font-weight:700; text-align:center; outline:none; transition:border 0.15s; caret-color:#e94560; }
  .otp-box:focus { border-color:#e94560; background:#0a0a1f; }
  .otp-box.filled { border-color:rgba(233,69,96,0.4); }

  /* Step dots */
  .step-dots { display:flex; gap:0.4rem; justify-content:center; margin-bottom:1.25rem; }
  .step-dot  { width:24px; height:4px; border-radius:2px; background:rgba(255,255,255,0.08); transition:all 0.25s; }
  .step-dot.on { background:#e94560; width:32px; }

  .timing-opt    { flex:1; min-width:100px; padding:0.6rem 0.7rem; border-radius:8px; cursor:pointer; border:1.5px solid rgba(255,255,255,0.07); background:rgba(255,255,255,0.02); color:#778; font-family:'DM Sans',sans-serif; font-weight:600; font-size:0.8rem; transition:all 0.15s; text-align:center; }
  .timing-opt.on { border-color:#e94560; background:rgba(233,69,96,0.1); color:#fff; }

  .ratoggle { display:flex; align-items:center; gap:0.75rem; cursor:pointer; user-select:none; }
  .ratoggle-track { width:42px; height:24px; border-radius:12px; background:rgba(255,255,255,0.08); border:1.5px solid rgba(255,255,255,0.1); position:relative; transition:all 0.2s; flex-shrink:0; }
  .ratoggle-track.on { background:rgba(0,220,100,0.25); border-color:#00dc64; }
  .ratoggle-thumb { position:absolute; top:3px; left:3px; width:14px; height:14px; border-radius:50%; background:#556; transition:all 0.2s; }
  .ratoggle-track.on .ratoggle-thumb { left:21px; background:#00dc64; }
  .ratoggle-label { font-size:0.82rem; font-weight:600; color:#aab; }
  .ratoggle-track.on + .ratoggle-label { color:#00dc64; }

  .quiz-shell { width:100vw; height:100vh; background:#080812; display:flex; flex-direction:column; overflow:hidden; }
  .quiz-hd    { height:50px; min-height:50px; background:rgba(8,8,18,0.98); border-bottom:1px solid rgba(255,255,255,0.05); display:flex; align-items:center; padding:0 1.1rem; gap:0.85rem; flex-shrink:0; }
  .quiz-body  { flex:1; overflow-y:auto; padding:1.25rem; min-height:0; }
  .quiz-inner { max-width:660px; width:100%; margin:0 auto; display:flex; flex-direction:column; gap:1.1rem; }

  .lb-row      { display:flex; align-items:center; gap:0.85rem; padding:0.8rem 0.9rem; border-radius:9px; border:1px solid rgba(255,255,255,0.05); }
  .lb-row.me   { border-color:rgba(233,69,96,0.35); background:rgba(233,69,96,0.05); }
  .lb-row.gold { border-color:rgba(255,215,0,0.25); background:rgba(255,215,0,0.03); }

  .code-chip { font-family:'JetBrains Mono',monospace; font-size:0.82rem; font-weight:700; letter-spacing:0.15em; color:#e94560; background:rgba(233,69,96,0.1); border:1px solid rgba(233,69,96,0.25); padding:0.15rem 0.5rem; border-radius:5px; }
  .hero-title { font-family:'Bebas Neue',sans-serif; font-size:clamp(3rem,9vw,5.5rem); letter-spacing:0.04em; line-height:0.95; background:linear-gradient(135deg,#fff 30%,#e94560); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
  .loading-screen { width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1rem; color:#556; }

  @media(max-width:520px) {
    .g2    { grid-template-columns:1fr; }
    .g4    { grid-template-columns:1fr 1fr; }
    .stats { grid-template-columns:repeat(2,1fr); }
    .between { flex-direction:column; align-items:flex-start; }
    .modal { padding:1.1rem; }
    .otp-box { width:38px; height:46px; font-size:1.1rem; }
  }
`;

/* ─── Shared helpers ─────────────────────────────────────────────────────── */
const Modal = ({ show, onClose, children, wide }) => {
  if (!show) return null;
  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className={`modal${wide ? " modal-w" : ""} fin`}>
        {onClose && <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ position: "absolute", top: "0.65rem", right: "0.65rem", padding: "0.25rem" }}><Ic n="x" s={15} /></button>}
        {children}
      </div>
    </div>
  );
};
const Spinner = ({ size = 20 }) => <span className="spin"><Ic n="loader" s={size} c="#e94560" /></span>;
const LoadingScreen = ({ text = "Loading…" }) => (
  <div className="loading-screen"><Spinner size={28} /><span style={{ fontSize: "0.85rem" }}>{text}</span></div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   APP ROOT
═══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lb_user")) || null; } catch { return null; }
  });
  const [page, setPage] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("lb_user"));
      const pg = localStorage.getItem("lb_page");
      if (u && pg && ["adminDash", "playerDash"].includes(pg)) return pg;
      return u ? (u.role === "admin" ? "adminDash" : "playerDash") : "landing";
    } catch { return "landing"; }
  });
  const [pdata, setPdata] = useState({});
  const [toast, setToast] = useState(null);

  const go = (p, d = {}) => {
    setPage(p); setPdata(d);
    if (["adminDash", "playerDash"].includes(p)) localStorage.setItem("lb_page", p);
  };
  const $toast = (msg, type = "info") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };
  const login = (u) => {
    setUser(u);
    localStorage.setItem("lb_user", JSON.stringify(u));
    localStorage.setItem("lb_page", u.role === "admin" ? "adminDash" : "playerDash");
  };
  const logout = async () => {
    await logoutUser();
    setUser(null);
    localStorage.removeItem("lb_user");
    localStorage.removeItem("lb_page");
    go("landing");
  };

  const pages = {
    landing: <Landing go={go} />,
    login: <Login go={go} login={login} toast={$toast} />,
    register: <Register go={go} login={login} toast={$toast} />,
    adminLogin: <AdminLogin go={go} login={login} toast={$toast} />,
    adminDash: <AdminDash user={user} go={go} toast={$toast} logout={logout} />,
    playerDash: <PlayerDash user={user} go={go} toast={$toast} logout={logout} />,
    createQuiz: <CreateEditQuiz go={go} toast={$toast} data={null} />,
    editQuiz: <CreateEditQuiz go={go} toast={$toast} data={pdata} />,
    takeQuiz: <TakeQuiz user={user} go={go} toast={$toast} quiz={pdata} />,
    leaderboard: <Leaderboard user={user} go={go} qdata={pdata} />,
    results: <Results user={user} go={go} res={pdata} />,
  };

  const noNav = page === "takeQuiz";
  return (
    <>
      <style>{CSS}</style>
      <div className="shell">
        {!noNav && (
          <nav className="navbar">
            <span className="nav-brand">LogicBlitz</span>
            <span style={{ flex: 1 }} />
            {user && <span style={{ fontSize: "0.78rem", color: "#556", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{user.email || user.username} · {user.role}</span>}
          </nav>
        )}
        <div className={noNav ? "" : "page"}>{pages[page] || pages.landing}</div>
      </div>
      {toast && (
        <div className="toast" style={{ background: toast.type === "error" ? "#c0192e" : toast.type === "success" ? "#0a7a3e" : "#1a2a50", color: "#fff" }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ LANDING */
function Landing({ go }) {
  return (
    <div className="center-page" style={{ background: "radial-gradient(ellipse 65% 55% at 50% 40%,rgba(233,69,96,0.07) 0%,transparent 70%)" }}>
      <div style={{ textAlign: "center", maxWidth: 500 }} className="fin">
        <div style={{ fontSize: "2.2rem", marginBottom: "0.25rem" }}>⚡</div>
        <h1 className="hero-title">LogicBlitz</h1>
        <p style={{ fontSize: "clamp(0.85rem,2vw,1rem)", color: "#667", lineHeight: 1.65, margin: "0.75rem 0 1.75rem" }}>
          Host live quizzes, challenge players, and dominate the leaderboard.
        </p>
        <div className="row" style={{ justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-red btn-lg" onClick={() => go("login")}>
            <Ic n="mail" s={15} /> Sign In
          </button>
          <button className="btn btn-outline btn-lg" onClick={() => go("register")}>
            <Ic n="users" s={15} /> Create Account
          </button>
        </div>
        <p style={{ marginTop: "1.1rem", fontSize: "0.75rem", color: "#334" }}>
          Admin?{" "}
          <span style={{ color: "#e94560", cursor: "pointer", fontWeight: 600 }} onClick={() => go("adminLogin")}>
            Admin login →
          </span>
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", justifyContent: "center", marginTop: "1.75rem" }}>
          {["🎯 Live Quizzes", "⏱ Custom Timers", "🏆 Leaderboards", "🛡 Anti-Cheat", "☁️ Cloud Sync", "🔒 Secure Auth"].map(b => (
            <span key={b} style={{ padding: "0.25rem 0.7rem", borderRadius: "99px", fontSize: "0.73rem", border: "1px solid rgba(233,69,96,0.2)", color: "#778", background: "rgba(233,69,96,0.04)" }}>{b}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ LOGIN */
function Login({ go, login, toast }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast("Enter a valid email address", "error"); return;
    }
    if (!password) { toast("Enter your password", "error"); return; }
    setLoading(true);
    const { data, error } = await loginUser(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) { toast(error, "error"); return; }
    login(data);
    go("playerDash");
  };

  return (
    <div className="center-page">
      <div className="card fin" style={{ width: "100%", maxWidth: 380, padding: "1.85rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(233,69,96,0.1)", border: "1.5px solid rgba(233,69,96,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem" }}>
            <Ic n="mail" s={22} c="#e94560" />
          </div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>Welcome back</h2>
          <p style={{ color: "#556", fontSize: "0.8rem", marginTop: "0.2rem" }}>Sign in with your email and password</p>
        </div>
        <div className="stack">
          <div className="field">
            <label>Email Address</label>
            <input className="inp" type="email" placeholder="you@example.com" value={email}
              onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
              disabled={loading} autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="inp" type="password" placeholder="Your password" value={password}
              onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
              disabled={loading} />
          </div>
          <button className="btn btn-red btn-full" style={{ marginTop: "0.2rem" }} onClick={submit} disabled={loading}>
            {loading ? <><Spinner size={15} /> Signing in…</> : "Sign In →"}
          </button>
        </div>
        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.75rem", color: "#445" }}>
          No account?{" "}
          <span style={{ color: "#e94560", cursor: "pointer", fontWeight: 600 }} onClick={() => go("register")}>Create one →</span>
          {" · "}
          <span style={{ cursor: "pointer", color: "#556" }} onClick={() => go("landing")}>← Back</span>
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ REGISTER */
function Register({ go, login, toast }) {
  const [step, setStep] = useState("form"); // "form" | "otp"
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submitForm = async () => {
    const u = username.trim();
    const e = email.trim().toLowerCase();
    if (!u || u.length < 3) { toast("Username must be at least 3 characters", "error"); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(u)) { toast("Username can only contain letters, numbers, and underscores", "error"); return; }
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast("Enter a valid email address", "error"); return; }
    if (password.length < 6) { toast("Password must be at least 6 characters", "error"); return; }
    if (password !== confirmPw) { toast("Passwords don't match", "error"); return; }
    setLoading(true);
    const { error } = await registerUser(u, e, password);
    setLoading(false);
    if (error) { toast(error, "error"); return; }
    setStep("otp");
    setCooldown(60);
    toast("Verification code sent! Check your inbox.", "success");
    setTimeout(() => otpRefs.current[0]?.focus(), 150);
  };

  const handleOtpChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
    if (val && i === 5 && next.every(d => d)) setTimeout(() => submitOtp(next), 80);
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) otpRefs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const next = ["", "", "", "", "", ""];
    digits.forEach((d, i) => { next[i] = d; });
    setOtp(next);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
    if (digits.length === 6) setTimeout(() => submitOtp(next), 80);
  };

  const submitOtp = async (boxes = otp) => {
    const code = boxes.join("");
    if (code.length < 6) { toast("Enter the full 6-digit code", "error"); return; }
    setLoading(true);
    const { data, error } = await verifyRegistrationOtp(email.trim().toLowerCase(), code, username.trim());
    setLoading(false);
    if (error) { toast(error, "error"); setOtp(["", "", "", "", "", ""]); otpRefs.current[0]?.focus(); return; }
    toast("Account created! Welcome to LogicBlitz 🎉", "success");
    login(data);
    go("playerDash");
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    const { error } = await registerUser(username.trim(), email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) { toast(error, "error"); return; }
    setCooldown(60);
    setOtp(["", "", "", "", "", ""]);
    toast("New code sent!", "success");
    setTimeout(() => otpRefs.current[0]?.focus(), 150);
  };

  return (
    <div className="center-page">
      <div className="card fin" style={{ width: "100%", maxWidth: 400, padding: "1.85rem" }}>
        <div className="step-dots">
          <div className={`step-dot${step === "form" ? " on" : ""}`} />
          <div className={`step-dot${step === "otp" ? " on" : ""}`} />
        </div>

        {step === "form" ? (
          <>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(233,69,96,0.1)", border: "1.5px solid rgba(233,69,96,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem" }}>
                <Ic n="users" s={22} c="#e94560" />
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>Create your account</h2>
              <p style={{ color: "#556", fontSize: "0.8rem", marginTop: "0.2rem" }}>We'll send a code to verify your email</p>
            </div>
            <div className="stack">
              <div className="field">
                <label>Username</label>
                <input className="inp" type="text" placeholder="e.g. quizmaster42" value={username}
                  onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && submitForm()}
                  disabled={loading} autoFocus />
              </div>
              <div className="field">
                <label>Email Address</label>
                <input className="inp" type="email" placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submitForm()}
                  disabled={loading} />
              </div>
              <div className="field">
                <label>Password</label>
                <input className="inp" type="password" placeholder="Min. 6 characters" value={password}
                  onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submitForm()}
                  disabled={loading} />
              </div>
              <div className="field">
                <label>Confirm Password</label>
                <input className="inp" type="password" placeholder="Repeat your password" value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)} onKeyDown={e => e.key === "Enter" && submitForm()}
                  disabled={loading} />
              </div>
              <button className="btn btn-red btn-full" style={{ marginTop: "0.2rem" }} onClick={submitForm} disabled={loading}>
                {loading ? <><Spinner size={15} /> Sending code…</> : "Create Account →"}
              </button>
            </div>
            <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.75rem", color: "#445" }}>
              Already have an account?{" "}
              <span style={{ color: "#e94560", cursor: "pointer", fontWeight: 600 }} onClick={() => go("login")}>Sign in →</span>
              {" · "}
              <span style={{ cursor: "pointer", color: "#556" }} onClick={() => go("landing")}>← Back</span>
            </p>
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(0,220,100,0.08)", border: "1.5px solid rgba(0,220,100,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem" }}>
                <Ic n="shield" s={22} c="#00dc64" />
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>Verify your email</h2>
              <p style={{ color: "#556", fontSize: "0.8rem", marginTop: "0.2rem", lineHeight: 1.5 }}>
                Code sent to <span style={{ color: "#e94560", fontWeight: 600 }}>{email}</span>
              </p>
            </div>

            <div className="otp-row" style={{ marginBottom: "1.25rem" }} onPaste={handlePaste}>
              {otp.map((v, i) => (
                <input key={i} ref={el => otpRefs.current[i] = el}
                  className={`otp-box${v ? " filled" : ""}`}
                  type="text" inputMode="numeric" maxLength={1} value={v}
                  onChange={e => handleOtpChange(i, e)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  disabled={loading} />
              ))}
            </div>

            <button className="btn btn-red btn-full" onClick={() => submitOtp()} disabled={loading || otp.join("").length < 6}>
              {loading ? <><Spinner size={15} /> Verifying…</> : "Verify & Create Account"}
            </button>

            <div style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.75rem", color: "#445" }}>
              {cooldown > 0
                ? <span>Resend in <span style={{ color: "#e94560", fontWeight: 600 }}>{cooldown}s</span></span>
                : <span>Didn't get it? <span style={{ color: "#e94560", cursor: "pointer", fontWeight: 600 }} onClick={resend}>Resend code</span></span>
              }
              {" · "}
              <span style={{ cursor: "pointer" }} onClick={() => { setStep("form"); setOtp(["", "", "", "", "", ""]); }}>← Change details</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ ADMIN LOGIN */
function AdminLogin({ go, login, toast }) {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!pw) { toast("Enter password", "error"); return; }
    setLoading(true);
    const { data, error } = await adminLogin(pw);
    setLoading(false);
    if (error) { toast(error, "error"); return; }
    login(data);
    go("adminDash");
  };

  return (
    <div className="center-page">
      <div className="card fin" style={{ width: "100%", maxWidth: 340, padding: "1.75rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "1.9rem" }}>🔐</div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", marginTop: "0.4rem" }}>Admin Access</h2>
          <p style={{ color: "#556", fontSize: "0.78rem", marginTop: "0.15rem" }}>Password-protected admin login</p>
        </div>
        <div className="stack">
          <div className="field">
            <label>Admin Password</label>
            <input className="inp" type="password" placeholder="Enter admin password" value={pw}
              onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
              disabled={loading} autoFocus />
          </div>
          <button className="btn btn-red btn-full" onClick={submit} disabled={loading}>
            {loading ? <Spinner size={16} /> : "Sign In as Admin"}
          </button>
        </div>
        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.75rem", color: "#445" }}>
          <span style={{ cursor: "pointer", color: "#556" }} onClick={() => go("landing")}>← Back to home</span>
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ ADMIN DASHBOARD */
function AdminDash({ user, go, toast, logout }) {
  const [tab, setTab] = useState("quizzes");
  const [quizzes, setQuizzes] = useState([]);
  const [scores, setScores] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [q, s, u] = await Promise.all([getQuizzes(), getScores(), getAllUsers()]);
    setQuizzes(q); setScores(s); setUsers(u);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    const { error } = await deleteQuiz(id);
    if (error) { toast(error, "error"); return; }
    setQuizzes(q => q.filter(x => x.id !== id));
    setScores(s => s.filter(x => x.quizId !== id));
    toast("Deleted", "success");
  };

  const toggle = async (id, status) => {
    const { error, newStatus } = await toggleQuizStatus(id, status);
    if (error) { toast(error, "error"); return; }
    setQuizzes(q => q.map(x => x.id === id ? { ...x, status: newStatus } : x));
  };

  const stats = [
    { l: "Quizzes", v: quizzes.length, i: "grid" },
    { l: "Active", v: quizzes.filter(q => q.status === "active").length, i: "play" },
    { l: "Players", v: users.length, i: "users" },
    { l: "Attempts", v: scores.length, i: "trophy" },
  ];

  return (
    <div className="page">
      <div className="wrap">
        <div className="between" style={{ marginBottom: "1.1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>Admin Dashboard</h1>
            <p style={{ fontSize: "0.78rem", color: "#556" }}>Manage quizzes and players</p>
          </div>
          <div className="row">
            <button className="btn btn-ghost btn-sm" onClick={load} title="Refresh"><Ic n="refresh" s={14} /></button>
            <button className="btn btn-red" onClick={() => go("createQuiz")}><Ic n="plus" s={14} /> New Quiz</button>
            <button className="btn btn-ghost" onClick={logout}><Ic n="logout" s={14} /> Logout</button>
          </div>
        </div>

        {loading ? <LoadingScreen text="Fetching data…" /> : (
          <>
            <div className="stats" style={{ marginBottom: "1rem" }}>
              {stats.map(s => (
                <div key={s.l} className="card" style={{ textAlign: "center", padding: "0.9rem" }}>
                  <div style={{ color: "#e94560", opacity: 0.65, marginBottom: "0.3rem" }}><Ic n={s.i} s={18} /></div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", lineHeight: 1 }}>{s.v}</div>
                  <div style={{ fontSize: "0.68rem", color: "#556", marginTop: "0.2rem" }}>{s.l}</div>
                </div>
              ))}
            </div>

            <div className="tabs" style={{ marginBottom: "0.85rem" }}>
              {["quizzes", "scores", "players"].map(t => (
                <button key={t} className={`tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>

            <div className="fin" key={tab}>
              {tab === "quizzes" && (
                <div className="stack">
                  {quizzes.length === 0
                    ? <div className="card" style={{ textAlign: "center", padding: "2rem", color: "#334", fontSize: "0.85rem" }}>No quizzes yet — create one!</div>
                    : quizzes.map(q => (
                      <div key={q.id} className="card" style={{ padding: "0.9rem 1rem" }}>
                        <div className="between">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="row" style={{ flexWrap: "wrap", marginBottom: "0.25rem" }}>
                              <span style={{ fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}>{q.title}</span>
                              <span className={`tag ${q.status === "active" ? "tg" : "tgr"}`}>{q.status}</span>
                              <span className="code-chip">{q.code}</span>
                            </div>
                            <div style={{ fontSize: "0.73rem", color: "#556" }}>
                              {q.questions?.length || 0} Qs · {q.timing_mode === "quiz" || q.timingMode === "quiz" ? `${q.quiz_time_limit || q.quizTimeLimit}s total` : q.timing_mode === "question" || q.timingMode === "question" ? "per-Q timer" : "no timer"} · {(q.allow_reattempts ?? q.allowReattempts ?? true) ? "♻ re-attempts on" : "🔒 one attempt"}
                            </div>
                          </div>
                          <div className="row">
                            <button className="btn btn-ghost btn-sm" onClick={() => toggle(q.id, q.status)}>{q.status === "active" ? "Close" : "Open"}</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => go("editQuiz", q)}><Ic n="edit" s={13} /></button>
                            <button className="btn btn-ghost btn-sm" onClick={() => go("leaderboard", q)}><Ic n="trophy" s={13} /></button>
                            <button className="btn btn-ghost btn-sm" style={{ color: "#e94560" }} onClick={() => del(q.id)}><Ic n="trash" s={13} /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}

              {tab === "scores" && (
                <div className="stack">
                  {scores.length === 0
                    ? <div className="card" style={{ textAlign: "center", padding: "2rem", color: "#334", fontSize: "0.85rem" }}>No scores yet</div>
                    : [...scores].sort((a, b) => b.score - a.score).map((s, i) => {
                      const q = quizzes.find(x => x.id === s.quizId || x.id === s.quiz_id);
                      return (
                        <div key={s.id} className="lb-row" style={{ background: "#0f0f28" }}>
                          <span style={{ width: "2rem", textAlign: "center", fontSize: i < 3 ? "1.2rem" : "0.82rem", fontWeight: 800, color: ["#FFD700", "#C0C0C0", "#CD7F32"][i] || "#445", flexShrink: 0 }}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: "#dde", fontSize: "0.87rem" }}>{s.username}</div>
                            <div style={{ fontSize: "0.7rem", color: "#556" }}>{q?.title || "—"} · {new Date(s.timestamp || s.created_at).toLocaleDateString()}</div>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: "1rem", color: "#e94560" }}>{s.score}<span style={{ fontSize: "0.7rem", color: "#445", fontWeight: 400 }}>/{s.total}</span></div>
                        </div>
                      );
                    })
                  }
                </div>
              )}

              {tab === "players" && (
                <div className="stack">
                  {users.length === 0
                    ? <div className="card" style={{ textAlign: "center", padding: "2rem", color: "#334", fontSize: "0.85rem" }}>No players yet</div>
                    : users.map(u => {
                      const ps = scores.filter(s => s.username === u.username);
                      return (
                        <div key={u.id} className="card" style={{ padding: "0.85rem 1rem" }}>
                          <div className="between">
                            <div className="row">
                              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#e94560,#0f2060)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "0.85rem", flexShrink: 0 }}>{u.username[0].toUpperCase()}</div>
                              <div>
                                <div style={{ fontWeight: 600, color: "#dde", fontSize: "0.87rem" }}>{u.username}</div>
                                <div style={{ fontSize: "0.7rem", color: "#556" }}>{u.email || ""} · {ps.length} attempt{ps.length !== 1 ? "s" : ""}</div>
                              </div>
                            </div>
                            <div style={{ color: "#e94560", fontWeight: 700, fontSize: "0.87rem" }}>
                              Best: {ps.length > 0 ? Math.max(...ps.map(s => s.score)) : "—"}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ CREATE/EDIT QUIZ */
function CreateEditQuiz({ go, toast, data: ed }) {
  const isEdit = !!ed;
  const [title, setTitle] = useState(ed?.title || "");
  const [timing, setTiming] = useState(ed?.timing_mode || ed?.timingMode || "none");
  const [qtime, setQtime] = useState(ed?.quiz_time_limit || ed?.quizTimeLimit || 300);
  const [allowReattempts, setAllowReattempts] = useState(ed?.allow_reattempts ?? ed?.allowReattempts ?? true);
  const [questions, setQuestions] = useState(ed?.questions || []);
  const [qModal, setQModal] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [qf, setQf] = useState({ text: "", options: ["", "", "", ""], correctIndex: 0, timeLimit: 30 });
  const [saving, setSaving] = useState(false);

  const openNew = () => { setQf({ text: "", options: ["", "", "", ""], correctIndex: 0, timeLimit: 30 }); setEditIdx(null); setQModal(true); };
  const openEdit = i => { const q = questions[i]; setQf({ text: q.text, options: [...q.options], correctIndex: q.correctIndex, timeLimit: q.timeLimit || 30 }); setEditIdx(i); setQModal(true); };

  const saveQ = () => {
    if (!qf.text.trim()) { toast("Enter question text", "error"); return; }
    if (qf.options.some(o => !o.trim())) { toast("Fill all options", "error"); return; }
    if (editIdx !== null) { const q = [...questions]; q[editIdx] = { ...qf }; setQuestions(q); }
    else setQuestions([...questions, { ...qf }]);
    setQModal(false);
  };

  const save = async () => {
    if (!title.trim()) { toast("Enter a title", "error"); return; }
    if (questions.length < 1) { toast("Add at least 1 question", "error"); return; }
    setSaving(true);
    const payload = { title, timingMode: timing, quizTimeLimit: Number(qtime), questions, allowReattempts, status: ed?.status || "active" };
    const { data, error } = isEdit ? await updateQuiz(ed.id, payload) : await createQuiz(payload);
    setSaving(false);
    if (error) { toast(error, "error"); return; }
    toast(`Quiz ${isEdit ? "updated" : "created"}! Code: ${data.code}`, "success");
    go("adminDash");
  };

  return (
    <div className="page">
      <div className="wrap">
        <div className="between" style={{ marginBottom: "1.1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>{isEdit ? "Edit Quiz" : "New Quiz"}</h1>
            <p style={{ fontSize: "0.78rem", color: "#556" }}>Configure and add questions</p>
          </div>
          <button className="btn btn-ghost" onClick={() => go("adminDash")}>← Back</button>
        </div>

        <div className="card" style={{ marginBottom: "0.85rem" }}>
          <div className="shead">Settings</div>
          <div className="stack">
            <div className="field">
              <label>Title</label>
              <input className="inp" placeholder="e.g. General Knowledge" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label>Timing Mode</label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {[["none", "⏸ No Timer"], ["quiz", "🕐 Whole Quiz"], ["question", "⏱ Per Question"]].map(([v, l]) => (
                  <button key={v} className={`timing-opt${timing === v ? " on" : ""}`} onClick={() => setTiming(v)}>{l}</button>
                ))}
              </div>
            </div>
            {timing === "quiz" && (
              <div className="field" style={{ maxWidth: 200 }}>
                <label>Total Seconds</label>
                <input className="inp" type="number" min={30} max={7200} value={qtime} onChange={e => setQtime(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label>Re-attempts</label>
              <label className="ratoggle" onClick={() => setAllowReattempts(v => !v)}>
                <div className={`ratoggle-track${allowReattempts ? " on" : ""}`}><div className="ratoggle-thumb" /></div>
                <span className="ratoggle-label">{allowReattempts ? "✅  Players can retake this quiz" : "🔒  One attempt only"}</span>
              </label>
              <p style={{ fontSize: "0.7rem", color: "#445", marginTop: "0.25rem" }}>
                {allowReattempts ? "Players may attempt this quiz as many times as they like." : "Each player can only submit once. Further attempts will be blocked."}
              </p>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: "0.85rem" }}>
          <div className="between" style={{ marginBottom: "0.75rem" }}>
            <div className="shead" style={{ marginBottom: 0 }}>Questions ({questions.length})</div>
            <button className="btn btn-red btn-sm" onClick={openNew}><Ic n="plus" s={12} /> Add</button>
          </div>
          {questions.length === 0
            ? <div style={{ textAlign: "center", padding: "1.5rem", color: "#334", fontSize: "0.82rem" }}>No questions yet</div>
            : <div className="stack">
              {questions.map((q, i) => (
                <div key={i} style={{ background: "#08081a", borderRadius: 7, padding: "0.7rem 0.9rem", display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
                  <span style={{ background: "#e94560", color: "#fff", borderRadius: 5, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#dde", fontSize: "0.85rem", marginBottom: "0.3rem" }}>{q.text}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                      {q.options.map((o, oi) => (
                        <span key={oi} style={{ fontSize: "0.68rem", padding: "0.12rem 0.45rem", borderRadius: 4, background: oi === q.correctIndex ? "rgba(0,220,100,0.1)" : "rgba(255,255,255,0.04)", color: oi === q.correctIndex ? "#00dc64" : "#667" }}>{o}{oi === q.correctIndex ? " ✓" : ""}</span>
                      ))}
                      {timing === "question" && <span style={{ fontSize: "0.68rem", padding: "0.12rem 0.45rem", borderRadius: 4, background: "rgba(233,69,96,0.1)", color: "#e94560" }}>⏱{q.timeLimit}s</span>}
                    </div>
                  </div>
                  <div className="row" style={{ flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(i)}><Ic n="edit" s={12} /></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: "#e94560" }} onClick={() => setQuestions(questions.filter((_, x) => x !== i))}><Ic n="trash" s={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>

        <button className="btn btn-red btn-full btn-lg" onClick={save} disabled={saving}>
          {saving ? <><Spinner size={16} /> Saving…</> : isEdit ? "💾 Save Changes" : "🚀 Create Quiz"}
        </button>
      </div>

      <Modal show={qModal} onClose={() => setQModal(false)} wide>
        <h3 style={{ color: "#fff", fontWeight: 700, marginBottom: "1.1rem", fontSize: "1rem", paddingRight: "1.5rem" }}>
          {editIdx !== null ? "Edit Question" : "New Question"}
        </h3>
        <div className="stack">
          <div className="field">
            <label>Question</label>
            <textarea className="inp" placeholder="Enter question…" value={qf.text} onChange={e => setQf({ ...qf, text: e.target.value })} />
          </div>
          <div>
            <div className="shead">Options <span style={{ color: "#445", textTransform: "none", fontWeight: 400, fontSize: "0.65rem" }}>(radio = correct answer)</span></div>
            <div className="g2" style={{ gap: "0.5rem" }}>
              {qf.options.map((opt, i) => (
                <div key={i} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  <input type="radio" name="correct" checked={qf.correctIndex === i} onChange={() => setQf({ ...qf, correctIndex: i })} style={{ accentColor: "#e94560", width: 15, height: 15, flexShrink: 0, cursor: "pointer" }} />
                  <input className="inp" placeholder={`Option ${String.fromCharCode(65 + i)}`} value={opt} onChange={e => { const o = [...qf.options]; o[i] = e.target.value; setQf({ ...qf, options: o }) }} style={{ borderColor: qf.correctIndex === i ? "rgba(0,220,100,0.35)" : "" }} />
                </div>
              ))}
            </div>
          </div>
          {timing === "question" && (
            <div className="field" style={{ maxWidth: 180 }}>
              <label>Time Limit (s)</label>
              <input className="inp" type="number" min={5} max={300} value={qf.timeLimit} onChange={e => setQf({ ...qf, timeLimit: Number(e.target.value) })} />
            </div>
          )}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => setQModal(false)}>Cancel</button>
            <button className="btn btn-red" onClick={saveQ}>Save</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ PLAYER DASHBOARD */
function PlayerDash({ user, go, toast, logout }) {
  const [code, setCode] = useState("");
  const [myScores, setMyScores] = useState([]);
  const [warnModal, setWarnModal] = useState(false);
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    getScoresByUser(user.username).then(s => { setMyScores(s); setLoading(false); });
  }, [user]);

  const join = async () => {
    if (!code.trim()) { toast("Enter a code", "error"); return; }
    setJoining(true);
    const quiz = await getQuizByCode(code);
    if (!quiz) { setJoining(false); toast("Quiz not found or inactive", "error"); return; }
    const allowReattempts = quiz.allow_reattempts ?? quiz.allowReattempts ?? true;
    if (!allowReattempts) {
      const already = await hasAttempted(quiz.id, user.username);
      if (already) { setJoining(false); toast("You have already attempted this quiz. Re-attempts are not allowed.", "error"); return; }
    }
    setJoining(false); setPending(quiz); setWarnModal(true);
  };

  return (
    <div className="page">
      <div className="wrap-sm">
        <div className="between" style={{ marginBottom: "1.1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>Player Hub</h1>
            <p style={{ fontSize: "0.78rem", color: "#556" }}>Hey, <span style={{ color: "#e94560" }}>{user.username}</span>!</p>
          </div>
          <div className="row">
            <button className="btn btn-ghost btn-sm" onClick={() => go("leaderboard", { global: true })}><Ic n="trophy" s={13} /> Board</button>
            <button className="btn btn-ghost btn-sm" onClick={logout}><Ic n="logout" s={13} /> Out</button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: "0.85rem", background: "linear-gradient(135deg,#0f0f28,#121230)" }}>
          <div className="shead">Join a Quiz</div>
          <div className="row">
            <input className="inp" placeholder="Enter code (e.g. AB12C)" value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && join()} style={{ fontFamily: "JetBrains Mono", letterSpacing: "0.1em", flex: 1 }} disabled={joining} />
            <button className="btn btn-red" style={{ flexShrink: 0 }} onClick={join} disabled={joining}>
              {joining ? <Spinner size={15} /> : "Join →"}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="shead">My Results</div>
          {loading
            ? <div style={{ padding: "1.5rem", display: "flex", justifyContent: "center" }}><Spinner /></div>
            : myScores.length === 0
              ? <div style={{ textAlign: "center", padding: "1.5rem", color: "#334", fontSize: "0.82rem" }}>No quizzes taken yet</div>
              : <div className="stack">
                {myScores.slice(0, 8).map((s, i) => {
                  const pct = Math.round((s.score / s.total) * 100);
                  return (
                    <div key={s.id || i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 0.8rem", background: "#08081a", borderRadius: 7 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: "#dde", fontSize: "0.85rem" }}>{s.quizTitle || "Quiz"}</div>
                        <div style={{ fontSize: "0.68rem", color: "#556" }}>{new Date(s.timestamp || s.created_at).toLocaleDateString()}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, color: pct >= 80 ? "#00dc64" : pct >= 50 ? "#ffc800" : "#e94560", fontSize: "0.95rem" }}>{s.score}/{s.total}</div>
                        <div style={{ fontSize: "0.65rem", color: "#556" }}>{pct}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      </div>

      <Modal show={warnModal}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.2rem", marginBottom: "0.6rem" }}>⚠️</div>
          <h2 style={{ color: "#fff", fontWeight: 700, marginBottom: "0.4rem", fontSize: "1.15rem" }}>Before You Start</h2>
          <p style={{ color: "#556", fontSize: "0.78rem", marginBottom: "1rem" }}>Playing: <strong style={{ color: "#e94560" }}>{pending?.title}</strong></p>
          <div style={{ background: "rgba(233,69,96,0.06)", border: "1px solid rgba(233,69,96,0.2)", borderRadius: 8, padding: "0.85rem", marginBottom: "1.1rem", textAlign: "left" }}>
            {["🖥️ Quiz runs in fullscreen", "⚠️ Exiting once = warning", "🚫 2nd exit = auto-submit", "⏱️ Respect any time limits", "✅ Stable connection needed"].map(r => (
              <div key={r} style={{ fontSize: "0.78rem", color: "#99a", padding: "0.22rem 0" }}>{r}</div>
            ))}
          </div>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn btn-ghost" onClick={() => setWarnModal(false)}>Not Yet</button>
            <button className="btn btn-red" onClick={() => { setWarnModal(false); go("takeQuiz", pending); }}>🚀 Start</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ TAKE QUIZ */
function TakeQuiz({ user, go, quiz }) {
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState({});
  const [fsModal, setFsModal] = useState(false);
  const [quizSec, setQuizSec] = useState(quiz.quiz_time_limit || quiz.quizTimeLimit || 300);
  const [qSec, setQSec] = useState(quiz.questions[0]?.timeLimit || 30);
  const doneRef = useRef(false);
  const answersRef = useRef({});
  const fsCountRef = useRef(0);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const timingMode = quiz.timing_mode || quiz.timingMode || "none";

  useEffect(() => {
    const el = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || function () { })?.call(el).catch(() => { });
    const onChange = () => {
      if (doneRef.current) return;
      const inFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!inFs) {
        fsCountRef.current += 1;
        if (fsCountRef.current >= 2) setTimeout(() => submit(true), 500);
        else setFsModal(true);
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch { }
    };
  }, []);

  useEffect(() => {
    if (timingMode !== "quiz" || doneRef.current) return;
    if (quizSec <= 0) { submit(false); return; }
    const t = setTimeout(() => setQuizSec(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [quizSec, timingMode]);

  useEffect(() => {
    if (timingMode !== "question") return;
    setQSec(quiz.questions[cur]?.timeLimit || 30);
  }, [cur]);

  useEffect(() => {
    if (timingMode !== "question" || doneRef.current) return;
    if (qSec <= 0) { advance(); return; }
    const t = setTimeout(() => setQSec(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [qSec, cur, timingMode]);

  const submit = useCallback(async (auto = false) => {
    if (doneRef.current) return;
    doneRef.current = true;
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch { }
    const ans = answersRef.current;
    let score = 0;
    quiz.questions.forEach((q, i) => { if (ans[i] === q.correctIndex) score++; });
    const entry = await submitScore({ quizId: quiz.id, username: user.username, score, total: quiz.questions.length, answers: ans, autoSubmitted: auto });
    go("results", { quiz, entry: { ...entry.data, score, total: quiz.questions.length, autoSubmitted: auto }, answers: ans });
  }, [quiz, user, go]);

  const advance = () => {
    if (cur < quiz.questions.length - 1) setCur(c => c + 1);
    else submit(false);
  };

  const reFs = () => {
    setFsModal(false);
    const el = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen || function () { })?.call(el).catch(() => { });
  };

  const q = quiz.questions[cur];
  const total = quiz.questions.length;
  const qTimerTotal = quiz.questions[cur]?.timeLimit || 30;
  const qzTotal = quiz.quiz_time_limit || quiz.quizTimeLimit || 300;
  const qtp = timingMode === "question" ? (qSec / qTimerTotal) * 100 : 100;
  const qzp = timingMode === "quiz" ? (quizSec / qzTotal) * 100 : 100;
  const tc = p => p > 50 ? "#00dc64" : p > 20 ? "#ffc800" : "#e94560";

  return (
    <div className="quiz-shell">
      <div className="quiz-hd">
        <span style={{ fontFamily: "Bebas Neue", fontSize: "1.25rem", letterSpacing: "0.06em", color: "#e94560", flexShrink: 0 }}>LogicBlitz</span>
        <div className="prog" style={{ flex: 1 }}><div className="prog-f" style={{ width: `${((cur + 1) / total) * 100}%` }} /></div>
        <span style={{ fontSize: "0.72rem", color: "#556", whiteSpace: "nowrap" }}>Q{cur + 1}/{total}</span>
        {timingMode === "quiz" && <span style={{ fontFamily: "JetBrains Mono", fontSize: "0.82rem", fontWeight: 700, color: tc(qzp), whiteSpace: "nowrap" }}>{Math.floor(quizSec / 60)}:{String(quizSec % 60).padStart(2, "0")}</span>}
        {timingMode === "question" && <span style={{ fontFamily: "JetBrains Mono", fontSize: "0.85rem", fontWeight: 700, color: tc(qtp), whiteSpace: "nowrap" }}>{qSec}s</span>}
        <button onClick={() => submit(false)} className="btn btn-ghost btn-sm" style={{ fontSize: "0.7rem", flexShrink: 0 }}>Submit</button>
      </div>

      {timingMode !== "none" && (
        <div className="tbar"><div className="tbar-f" style={{ width: `${timingMode === "question" ? qtp : qzp}%`, background: tc(timingMode === "question" ? qtp : qzp) }} /></div>
      )}

      <div className="quiz-body">
        <div className="quiz-inner">
          <div className="card fin" key={cur} style={{ padding: "1.25rem" }}>
            <div style={{ fontSize: "0.65rem", color: "#e94560", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>Question {cur + 1}</div>
            <h2 style={{ fontSize: "clamp(0.95rem,2.5vw,1.25rem)", fontWeight: 700, color: "#fff", lineHeight: 1.45 }}>{q.text}</h2>
          </div>
          <div className="g4">
            {q.options.map((opt, i) => (
              <button key={i} className={`opt${answers[cur] === i ? " sel" : ""}`} onClick={() => setAnswers({ ...answers, [cur]: i })}>
                <span className="opt-l">{String.fromCharCode(65 + i)}</span>
                <span style={{ flex: 1 }}>{opt}</span>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-red btn-lg" onClick={advance}>{cur < total - 1 ? "Next →" : "Submit ✓"}</button>
          </div>
        </div>
      </div>

      <Modal show={fsModal}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.2rem", marginBottom: "0.6rem" }}>🚨</div>
          <h2 style={{ color: "#ffc800", fontWeight: 800, marginBottom: "0.5rem" }}>Fullscreen Warning!</h2>
          <p style={{ color: "#99a", fontSize: "0.82rem", marginBottom: "1.1rem", lineHeight: 1.6 }}>
            You exited fullscreen. <strong style={{ color: "#fff" }}>Warning 1 of 2.</strong><br />
            A second exit will <strong style={{ color: "#e94560" }}>auto-submit</strong> your quiz.
          </p>
          <button className="btn btn-red btn-full" onClick={reFs}><Ic n="maximize" s={15} /> Back to Fullscreen</button>
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ RESULTS */
function Results({ user, go, res }) {
  const { quiz, entry, answers } = res;
  const pct = Math.round((entry.score / entry.total) * 100);
  const g = pct >= 90 ? { l: "🏆 Excellent!", c: "#FFD700" } : pct >= 70 ? { l: "🎉 Great Job!", c: "#00dc64" } : pct >= 50 ? { l: "👍 Good Effort", c: "#ffc800" } : { l: "📚 Keep Going", c: "#e94560" };

  return (
    <div className="page">
      <div className="wrap-sm">
        <div className="card fin" style={{ textAlign: "center", padding: "1.75rem", marginBottom: "0.85rem", background: "linear-gradient(135deg,#0f0f28,#121230)" }}>
          {entry.autoSubmitted && (
            <div style={{ background: "rgba(233,69,96,0.08)", border: "1px solid rgba(233,69,96,0.25)", borderRadius: 7, padding: "0.55rem", marginBottom: "0.85rem", color: "#e94560", fontSize: "0.78rem", fontWeight: 600 }}>
              ⚠️ Auto-submitted due to fullscreen violation
            </div>
          )}
          <div style={{ fontSize: "clamp(2.2rem,7vw,3.2rem)", fontWeight: 800, color: g.c, lineHeight: 1 }}>{pct}%</div>
          <div style={{ color: g.c, fontWeight: 700, fontSize: "1rem", marginTop: "0.25rem", marginBottom: "0.25rem" }}>{g.l}</div>
          <div style={{ color: "#556", fontSize: "0.78rem", marginBottom: "1.1rem" }}>{quiz.title}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: "1.75rem" }}>
            {[["✅", entry.score, "Correct", "#00dc64"], ["❌", entry.total - entry.score, "Wrong", "#e94560"], ["📊", entry.total, "Total", "#fff"]].map(([e, v, l, c]) => (
              <div key={l}><div style={{ fontSize: "1.6rem", fontWeight: 800, color: c }}>{v}</div><div style={{ fontSize: "0.65rem", color: "#556" }}>{l}</div></div>
            ))}
          </div>
        </div>

        <div className="shead" style={{ marginBottom: "0.6rem" }}>Review</div>
        <div className="stack" style={{ marginBottom: "1.1rem" }}>
          {quiz.questions.map((q, i) => {
            const ua = answers[i], ok = ua === q.correctIndex;
            return (
              <div key={i} className="card" style={{ padding: "0.85rem", borderColor: ok ? "rgba(0,220,100,0.18)" : "rgba(233,69,96,0.18)" }}>
                <div className="row" style={{ marginBottom: "0.5rem", alignItems: "flex-start" }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: ok ? "rgba(0,220,100,0.12)" : "rgba(233,69,96,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <Ic n={ok ? "check" : "x"} s={11} c={ok ? "#00dc64" : "#e94560"} />
                  </span>
                  <span style={{ color: "#ccd", fontWeight: 600, fontSize: "0.85rem", lineHeight: 1.4 }}>{q.text}</span>
                </div>
                <div style={{ paddingLeft: "1.6rem", display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                  {q.options.map((o, oi) => {
                    const isC = oi === q.correctIndex, isU = oi === ua;
                    return (
                      <span key={oi} style={{ fontSize: "0.72rem", padding: "0.18rem 0.55rem", borderRadius: 4, background: isC ? "rgba(0,220,100,0.09)" : isU && !isC ? "rgba(233,69,96,0.09)" : "transparent", color: isC ? "#00dc64" : isU && !isC ? "#e94560" : "#556", border: isC ? "1px solid rgba(0,220,100,0.22)" : isU && !isC ? "1px solid rgba(233,69,96,0.22)" : "1px solid transparent", fontWeight: isC || isU ? 600 : 400 }}>
                        {String.fromCharCode(65 + oi)}. {o}{isC ? " ✓" : ""}{isU && !isC ? " ✗" : ""}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="g2">
          <button className="btn btn-red btn-full btn-lg" onClick={() => go("playerDash")}>Dashboard</button>
          <button className="btn btn-outline btn-full btn-lg" onClick={() => go("leaderboard", quiz)}>Leaderboard</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ LEADERBOARD */
function Leaderboard({ user, go, qdata }) {
  const [rows, setRows] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const isGlobal = qdata?.global;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (isGlobal) {
        const [scores, qs] = await Promise.all([getScores(), getQuizzes()]);
        setQuizzes(qs);
        const best = {};
        scores.forEach(s => {
          if (!best[s.username] || s.score / s.total > best[s.username].score / best[s.username].total) best[s.username] = s;
        });
        setRows(Object.values(best).sort((a, b) => b.score / b.total - a.score / a.total));
      } else {
        const scores = await getScoresByQuiz(qdata?.id);
        const best = {};
        scores.forEach(s => {
          if (!best[s.username] || s.score > best[s.username].score) best[s.username] = s;
        });
        setRows(Object.values(best).sort((a, b) => b.score - a.score));
      }
      setLoading(false);
    };
    load();
  }, [isGlobal, qdata?.id]);

  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="page">
      <div className="wrap-sm">
        <div className="between" style={{ marginBottom: "1.1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>{isGlobal ? "🌍 Global Leaderboard" : `🏆 ${qdata?.title}`}</h1>
            <p style={{ fontSize: "0.78rem", color: "#556" }}>{rows.length} ranked</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => go(user?.role === "admin" ? "adminDash" : "playerDash")}>← Back</button>
        </div>

        {loading
          ? <LoadingScreen text="Loading scores…" />
          : rows.length === 0
            ? <div className="card" style={{ textAlign: "center", padding: "2.5rem", color: "#334", fontSize: "0.85rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.6rem" }}>🏆</div>No scores yet
            </div>
            : <div className="stack">
              {rows.map((s, i) => {
                const pct = Math.round((s.score / s.total) * 100);
                const isMe = s.username === user?.username;
                const q = quizzes.find(x => x.id === s.quizId || x.id === s.quiz_id);
                return (
                  <div key={s.id || i} className={`lb-row${isMe ? " me" : ""}${i === 0 ? " gold" : ""}`} style={{ background: "#0f0f28" }}>
                    <span style={{ width: "2rem", textAlign: "center", fontSize: i < 3 ? "1.2rem" : "0.78rem", fontWeight: 800, color: ["#FFD700", "#C0C0C0", "#CD7F32"][i] || "#334", flexShrink: 0 }}>{i < 3 ? medals[i] : `#${i + 1}`}</span>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: isMe ? "linear-gradient(135deg,#e94560,#800)" : "linear-gradient(135deg,#1a2a50,#08081a)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "0.8rem", flexShrink: 0 }}>{s.username[0].toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: isMe ? "#e94560" : "#dde", fontSize: "0.87rem" }}>{s.username}{isMe && " (you)"}</div>
                      {isGlobal && q && <div style={{ fontSize: "0.68rem", color: "#556", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.title}</div>}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, color: ["#FFD700", "#C0C0C0", "#CD7F32"][i] || "#dde", fontSize: "0.95rem" }}>{s.score}/{s.total}</div>
                      <div style={{ fontSize: "0.65rem", color: "#556" }}>{pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
}