import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Shield, ShieldCheck, ShieldAlert, Camera, MapPin, Fingerprint, Lock,
  LogOut, LayoutDashboard, FilePlus2, History, Map as MapIcon, Users,
  ScrollText, Settings as SettingsIcon, ChevronRight, ChevronLeft,
  CheckCircle2, XCircle, AlertTriangle, Search, Download, Eye,
  RefreshCw, Menu, X, Clock, User, Hash, KeyRound, TrendingUp,
  UploadCloud, RotateCcw, ArrowLeft, BadgeCheck, Loader2, Wifi,
  ChevronDown, FileText, BarChart3, Info, Signal
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";

/* ============================================================
   MOCK DATA
   ============================================================ */

const CITIES = [
  { name: "New Delhi", lat: 28.6139, lng: 77.209 },
  { name: "Ghaziabad", lat: 28.6692, lng: 77.4538 },
  { name: "Noida", lat: 28.5355, lng: 77.391 },
  { name: "Gurugram", lat: 28.4595, lng: 77.0266 },
  { name: "Faridabad", lat: 28.4089, lng: 77.3178 },
  { name: "Meerut", lat: 28.9845, lng: 77.7064 },
  { name: "Aligarh", lat: 27.8974, lng: 78.088 },
  { name: "Agra", lat: 27.1767, lng: 78.0081 },
  { name: "Kanpur", lat: 26.4499, lng: 80.3319 },
  { name: "Lucknow", lat: 26.8467, lng: 80.9462 },
];

const OPERATORS = [
  { id: "NCB-0471", name: "Officer A. Sharma", role: "Field Officer", status: "Active", lastActivity: "Today", tests: 124 },
  { id: "NCB-0512", name: "Officer R. Verma", role: "Field Officer", status: "Active", lastActivity: "Today", tests: 98 },
  { id: "NCB-0398", name: "Officer K. Iyer", role: "Senior Field Officer", status: "Active", lastActivity: "Yesterday", tests: 156 },
  { id: "NCB-0605", name: "Officer P. Singh", role: "Field Officer", status: "Inactive", lastActivity: "3 days ago", tests: 42 },
  { id: "NCB-0223", name: "Supervisor N. Rao", role: "Supervisor", status: "Active", lastActivity: "Today", tests: 12 },
];

async function sha256Hex(input) {
  const data = typeof input === "string"
    ? new TextEncoder().encode(input)
    : new Uint8Array(await input.arrayBuffer());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Deterministic display hash for pre-seeded demo records.
// New uploads/camera captures use the real SHA-256 function above.
function demoHash(seed) {
  let h1 = 0xdeadbeef ^ seed.length, h2 = 0x41c6ce57 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = (Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)) >>> 0;
  h2 = (Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)) >>> 0;
  const combo = h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
  let out = "";
  while (out.length < 64) out += combo;
  return out.slice(0, 64);
}
const shortHash = (h) => `${h.slice(0, 12)}…${h.slice(-6)}`;

const RESULT_POOL = [
  "Negative", "Negative", "Negative", "Negative", "Negative",
  "Presumptive Positive", "Presumptive Positive", "Negative",
  "Inconclusive", "Negative", "Negative", "Presumptive Positive",
  "Negative", "Negative", "Inconclusive", "Negative",
  "Presumptive Positive", "Negative", "Negative", "Negative",
];

function buildTests() {
  const baseTime = new Date("2026-09-06T10:35:22+05:30").getTime();
  const rows = [];
  for (let i = 0; i < 20; i++) {
    const num = 124 - i;
    const id = `FT-2026-${String(num).padStart(5, "0")}`;
    const city = CITIES[i % CITIES.length];
    const op = OPERATORS[i % 4];
    const result = RESULT_POOL[i];
    const ts = new Date(baseTime - i * 41 * 60 * 1000 - (i > 12 ? 20 * 3600 * 1000 : 0));
    const confidence =
      result === "Presumptive Positive" ? 90 + ((i * 7) % 7) :
      result === "Negative" ? 91 + ((i * 5) % 8) :
      55 + ((i * 3) % 12);
    const hash = demoHash(id + "-v1");
    rows.push({
      id,
      result,
      confidence,
      operator: op.id,
      operatorName: op.name,
      location: city.name,
      lat: city.lat + (((i * 37) % 10) - 5) * 0.01,
      lng: city.lng + (((i * 53) % 10) - 5) * 0.01,
      timestamp: ts,
      integrity: i === 7 ? "Warning" : "Verified",
      imageHash: hash,
      currentHash: hash,
      signature: "Prototype-signed",
      signatureStatus: "Demo signature",
      hashAlgorithm: "SHA-256",
      modelVersion: "CV-Prototype-1.0",
      gpsAccuracy: 4 + (i % 9),
    });
  }
  return rows;
}

const fmtDate = (d) =>
  d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (d) =>
  d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const fmtDateTime = (d) => `${fmtDate(d)}, ${fmtTime(d).slice(0, 5)}`;

/* ============================================================
   SMALL SHARED COMPONENTS
   ============================================================ */

function StatusBadge({ result, size = "md" }) {
  const map = {
    "Presumptive Positive": "bg-rose-500/10 text-rose-400 border-rose-500/30",
    "Negative": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    "Inconclusive": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  };
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span className={`inline-flex items-center gap-1.5 ${pad} rounded-full border font-medium whitespace-nowrap ${map[result]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {result}
    </span>
  );
}

function IntegrityBadge({ status, size = "md" }) {
  const map = {
    Verified: { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", Icon: CheckCircle2 },
    Warning: { cls: "bg-amber-500/10 text-amber-400 border-amber-500/30", Icon: AlertTriangle },
    Failed: { cls: "bg-rose-500/10 text-rose-400 border-rose-500/30", Icon: XCircle },
  };
  const { cls, Icon } = map[status];
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span className={`inline-flex items-center gap-1 ${pad} rounded-full border font-medium whitespace-nowrap ${cls}`}>
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {status}
    </span>
  );
}

function KpiCard({ label, value, Icon, tone = "slate", sub }) {
  const toneMap = {
    slate: "text-slate-300 bg-slate-800/60",
    teal: "text-teal-400 bg-teal-500/10",
    rose: "text-rose-400 bg-rose-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex items-start justify-between">
      <div>
        <p className="text-slate-400 text-xs font-medium mb-2">{label}</p>
        <p className="text-2xl font-semibold text-slate-50 tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
      </div>
      <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${toneMap[tone]}`}>
        <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
      </div>
    </div>
  );
}

function Card({ title, right, children, className = "", bodyClass = "p-5" }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-lg ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          {right}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">{label}</p>
      <p className={`text-sm text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", className = "", Icon, disabled, size = "md" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const sizes = size === "lg" ? "px-5 py-3 text-sm" : size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm";
  const variants = {
    primary: "bg-teal-600 hover:bg-teal-500 text-white",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700",
    ghost: "hover:bg-slate-800 text-slate-300",
    danger: "bg-rose-600/90 hover:bg-rose-600 text-white",
  };
  return (
    <button disabled={disabled} onClick={onClick} className={`${base} ${sizes} ${variants[variant]} ${className}`}>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

function ColorSwatchScale({ observedIndex = 4 }) {
  const colors = ["#fef3c7", "#fde68a", "#fbbf24", "#f97316", "#dc2626", "#7f1d1d"];
  return (
    <div>
      <div className="flex rounded-md overflow-hidden border border-slate-800 h-8">
        {colors.map((c, i) => (
          <div key={i} className="flex-1 relative" style={{ backgroundColor: c }}>
            {i === observedIndex && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-slate-50 border border-slate-400" />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mt-2.5 font-mono">
        <span>0.0</span><span>reagent reference range</span><span>1.0</span>
      </div>
    </div>
  );
}

/* ============================================================
   NAVIGATION
   ============================================================ */

const NAV = [
  { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { key: "newTest", label: "New Field Test", Icon: FilePlus2 },
  { key: "history", label: "Test History", Icon: History },
  { key: "map", label: "Map View", Icon: MapIcon },
  { key: "supervisor", label: "Supervisor Dashboard", Icon: BarChart3 },
  { key: "operators", label: "Operators", Icon: Users },
  { key: "audit", label: "Audit Logs", Icon: ScrollText },
  { key: "settings", label: "Settings", Icon: SettingsIcon },
];

function Emblem({ size = 34 }) {
  return (
    <div
      className="rounded-md flex items-center justify-center shrink-0 border border-amber-500/20"
      style={{ width: size, height: size, background: "linear-gradient(160deg,#0f172a,#1e293b)" }}
    >
      <Shield className="text-amber-400/90" style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={1.75} />
    </div>
  );
}

function Sidebar({ page, goTo, mobileOpen, setMobileOpen, onLogout, operator }) {
  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-800 shrink-0">
        <Emblem />
        <div>
          <p className="text-slate-50 font-semibold tracking-tight text-sm leading-none">FIELDTEST</p>
          <p className="text-slate-500 text-[10px] mt-1 leading-none">Digital Companion</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {NAV.map(({ key, label, Icon }) => {
          const active = page === key;
          return (
            <button
              key={key}
              onClick={() => { goTo(key); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                active ? "bg-teal-500/10 text-teal-400" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
              {active && <span className="ml-auto w-1 h-1 rounded-full bg-teal-400" />}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-medium text-slate-300">
            {operator.id.slice(-2)}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-200 truncate">{operator.id}</p>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Secure session
            </p>
          </div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-md text-xs text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-colors">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-slate-900/60 border-r border-slate-800 h-screen sticky top-0">
        {content}
      </aside>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-slate-950 border-r border-slate-800 h-full">{content}</div>
          <div className="flex-1 bg-slate-950/70" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}

function TopBar({ title, subtitle, setMobileOpen, right }) {
  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 md:px-8 h-16 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={() => setMobileOpen(true)} className="md:hidden text-slate-400 p-1.5 -ml-1.5">
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-slate-100 font-semibold text-base leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-slate-500 text-xs mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/25 rounded-full px-2.5 py-1">
          DEMO MODE
        </span>
        {right}
      </div>
    </header>
  );
}

/* ============================================================
   LOGIN PAGE
   ============================================================ */

function LoginPage({ onLogin }) {
  const [remember, setRemember] = useState(true);
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4" style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(20,184,166,0.06), transparent 55%)" }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Emblem size={52} />
          <h1 className="mt-4 text-xl font-semibold text-slate-50 tracking-tight">FIELDTEST</h1>
          <p className="text-slate-500 text-sm mt-1 text-center">Digital Companion for Field Drug Testing</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-7">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Operator ID</label>
              <input defaultValue="NCB-0471" className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Password</label>
              <input type="password" defaultValue="••••••••••" className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/50" />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-teal-500 w-3.5 h-3.5" />
              Remember this device
            </label>
            <Btn className="w-full mt-2" size="lg" Icon={Lock} onClick={onLogin}>
              Secure Login
            </Btn>
          </div>
          <div className="flex items-center gap-2 mt-5 pt-5 border-t border-slate-800 text-slate-500 text-[11px]">
            <Fingerprint className="w-3.5 h-3.5 shrink-0" />
            Authorized personnel only. All access is logged and audited.
          </div>
        </div>
        <p className="text-center text-slate-600 text-[11px] mt-6">Ministry of Home Affairs · Narcotics Control Bureau</p>
      </div>
    </div>
  );
}

/* ============================================================
   OFFICER DASHBOARD
   ============================================================ */

function DashboardPage({ tests, goTo, operator }) {
  const recent = tests.slice(0, 5);
  const counts = useMemo(() => ({
    total: tests.length,
    positive: tests.filter((t) => t.result === "Presumptive Positive").length,
    negative: tests.filter((t) => t.result === "Negative").length,
    inconclusive: tests.filter((t) => t.result === "Inconclusive").length,
  }), [tests]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-slate-500 text-sm">Good morning, Officer</p>
          <p className="text-slate-200 text-sm mt-0.5 font-mono">{operator.id} · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>
        <Btn size="lg" Icon={FilePlus2} onClick={() => goTo("newTest")}>New Field Test</Btn>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Tests" value={counts.total} Icon={FileText} tone="slate" sub="All time" />
        <KpiCard label="Presumptive Positive" value={counts.positive} Icon={AlertTriangle} tone="rose" />
        <KpiCard label="Negative" value={counts.negative} Icon={CheckCircle2} tone="emerald" />
        <KpiCard label="Inconclusive" value={counts.inconclusive} Icon={Info} tone="amber" />
      </div>

      <Card title="Recent Tests" bodyClass="" right={<button onClick={() => goTo("history")} className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1">View all <ChevronRight className="w-3.5 h-3.5" /></button>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs border-b border-slate-800">
                <th className="px-5 py-3 font-medium">Test ID</th>
                <th className="px-5 py-3 font-medium">Result</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Integrity</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t.id} onClick={() => goTo("testDetail", t.id)} className="border-b border-slate-800/70 last:border-0 hover:bg-slate-800/30 cursor-pointer">
                  <td className="px-5 py-3 font-mono text-slate-300">{t.id}</td>
                  <td className="px-5 py-3"><StatusBadge result={t.result} size="sm" /></td>
                  <td className="px-5 py-3 text-slate-400">{fmtDateTime(t.timestamp)}</td>
                  <td className="px-5 py-3 text-slate-400">{t.location}</td>
                  <td className="px-5 py-3"><IntegrityBadge status={t.integrity} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   NEW FIELD TEST WIZARD
   ============================================================ */

const STEPS = ["Capture", "Analyze", "Review", "Secure Record"];

function StepIndicator({ step }) {
  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "active" : "pending";
        return (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border ${
                state === "done" ? "bg-teal-500/15 border-teal-500/40 text-teal-400" :
                state === "active" ? "bg-teal-600 border-teal-600 text-white" :
                "bg-slate-900 border-slate-700 text-slate-500"
              }`}>
                {state === "done" ? <CheckCircle2 className="w-3.5 h-3.5" /> : String(n).padStart(2, "0")}
              </div>
              <span className={`text-xs font-medium ${state === "pending" ? "text-slate-500" : "text-slate-200"}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`h-px flex-1 min-w-6 ${n < step ? "bg-teal-500/40" : "bg-slate-800"}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ReferenceCardArt({ highlight }) {
  const colors = ["#fef3c7", "#fde68a", "#fbbf24", "#f97316", "#dc2626", "#7f1d1d"];
  return (
    <div className="bg-slate-100 rounded-md p-2 shadow-lg" style={{ width: 150 }}>
      <p className="text-[8px] text-slate-500 font-medium mb-1 text-center tracking-wide">REFERENCE COLOUR CARD</p>
      <div className="grid grid-cols-3 gap-1">
        {colors.map((c, i) => (
          <div key={i} className="h-6 rounded-sm border border-black/10" style={{ backgroundColor: c, outline: i === highlight ? "2px solid #0f172a" : "none" }} />
        ))}
      </div>
    </div>
  );
}

function NewFieldTestPage({ onRecordCreated, goTo }) {
  const [step, setStep] = useState(1);
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [pipeline, setPipeline] = useState([]);
  const [draft, setDraft] = useState(null);
  const [markedInconclusive, setMarkedInconclusive] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [location, setLocation] = useState({ status: "Checking…", lat: null, lng: null, accuracy: null });
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const timeouts = useRef([]);

  useEffect(() => {
    return () => {
      timeouts.current.forEach(clearTimeout);
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
      if (capturedImage?.url) URL.revokeObjectURL(capturedImage.url);
    };
  }, [capturedImage?.url]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({ status: "Unavailable", lat: null, lng: null, accuracy: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({
        status: "Permission granted",
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy || 0),
      }),
      () => setLocation({ status: "Permission unavailable", lat: null, lng: null, accuracy: null }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, []);

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Camera access is not available in this browser. Use Upload Image instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play?.();
        }
      }, 50);
    } catch {
      alert("Camera permission was denied or unavailable. You can upload an image instead.");
    }
  }

  function closeCamera() {
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  async function captureFromCamera() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const hash = await sha256Hex(blob);
      setCapturedImage({ url, dataUrl, blob, hash, source: "Camera" });
      closeCamera();
      setCaptured(true);
      setDraft(makeDraft(hash));
    }, "image/jpeg", 0.92);
  }

  async function handleFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    const hash = await sha256Hex(file);
    const url = URL.createObjectURL(file);
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setCapturedImage({ url, dataUrl, blob: file, hash, source: "Upload" });
    setCaptured(true);
    setDraft(makeDraft(hash));
    event.target.value = "";
  }

  function makeDraft(seed) {
    const roll = Math.abs(seed?.charCodeAt?.(0) || Math.floor(Math.random() * 10)) % 100;
    const result = roll < 62 ? "Negative" : roll < 85 ? "Presumptive Positive" : "Inconclusive";
    return {
      result,
      confidence: result === "Inconclusive" ? 58 + (roll % 10) : 90 + (roll % 8),
      swatchIndex: result === "Presumptive Positive" ? 4 : result === "Inconclusive" ? 2 : 0,
    };
  }

  const PIPELINE_STEPS = [
    "Image validation",
    "Reference card detection",
    "Colour calibration",
    "Test region analysis",
    "Feature extraction",
    "Classification",
    "Integrity preparation",
  ];

  function handleCapture() {
    setCapturing(true);
    const t = setTimeout(() => {
      setCapturing(false);
      setCaptured(true);
      const seed = `demo-capture-${Date.now()}`;
      setDraft(makeDraft(seed));
      setCapturedImage({
        url: null,
        dataUrl: null,
        blob: null,
        hash: demoHash(seed),
        source: "Demo Capture",
      });
    }, 900);
    timeouts.current.push(t);
  }

  async function handleAnalyze() {
    setStep(2);
    setPipeline(PIPELINE_STEPS.map((s) => ({ label: s, done: false })));

    let backendResult = null;
    try {
      if (capturedImage?.blob) {
        const formData = new FormData();
        formData.append("image", capturedImage.blob, "field-test.jpg");
        const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const response = await fetch(`${API_BASE_URL}/analyze`, {
          method: "POST",
          body: formData,
        });
        if (!response.ok) throw new Error(`Backend returned ${response.status}`);
        backendResult = await response.json();
      }
    } catch (error) {
      console.warn("Backend analysis unavailable; using local prototype fallback.", error);
    }

    const resultDraft = backendResult ? {
      result: backendResult.result,
      confidence: backendResult.confidence,
      swatchIndex: backendResult.swatch_index ?? 0,
      quality: backendResult.quality || "Prototype assessment",
      modelVersion: backendResult.model_version || "CV-Prototype-1.0",
      analysisSource: "FastAPI + OpenCV",
    } : draft;

    if (resultDraft) setDraft(resultDraft);

    PIPELINE_STEPS.forEach((_, i) => {
      const t = setTimeout(() => {
        setPipeline((prev) => prev.map((p, idx) => (idx === i ? { ...p, done: true } : p)));
        if (i === PIPELINE_STEPS.length - 1) {
          const t2 = setTimeout(() => setStep(3), 450);
          timeouts.current.push(t2);
        }
      }, 300 * (i + 1));
      timeouts.current.push(t);
    });
  }

  async function generateRecord() {
    const finalResult = markedInconclusive ? "Inconclusive" : draft.result;
    const num = 125;
    const id = `FT-2026-${String(num + Math.floor(Math.random() * 900)).padStart(5, "0")}`;
    const hash = capturedImage?.hash || await sha256Hex(`${id}-${Date.now()}`);
    const canonicalRecord = JSON.stringify({
      id,
      result: finalResult,
      operator: "NCB-0471",
      timestamp: new Date().toISOString(),
      lat: location.lat ?? 28.6139,
      lng: location.lng ?? 77.209,
      imageHash: hash,
    });
    const recordFingerprint = await sha256Hex(canonicalRecord);
    const newTest = {
      id,
      result: finalResult,
      confidence: draft.confidence,
      operator: "NCB-0471",
      operatorName: "Officer A. Sharma",
      location: location.lat ? "Current device location" : "New Delhi (demo fallback)",
      lat: location.lat ?? 28.6139,
      lng: location.lng ?? 77.209,
      timestamp: new Date(),
      integrity: "Verified",
      imageHash: hash,
      currentHash: hash,
      signature: "Prototype-signed",
      signatureStatus: "Prototype signature",
      recordFingerprint,
      hashAlgorithm: "SHA-256",
      modelVersion: "CV-1.0.0",
      gpsAccuracy: location.accuracy || 8,
      captureSource: capturedImage?.source || "Demo Capture",
      previousHash: null,
    };
    onRecordCreated(newTest);
    goTo("record", newTest.id);
  }

  return (
    <>
      {cameraOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div>
                <p className="text-sm font-semibold text-slate-100">Live Camera Capture</p>
                <p className="text-xs text-slate-500 mt-0.5">Keep the reference colour card and test region visible.</p>
              </div>
              <button onClick={closeCamera} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400" aria-label="Close camera">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative bg-black aspect-video">
              <video ref={videoRef} playsInline muted className="w-full h-full object-contain" />
              <div className="absolute inset-5 border-2 border-dashed border-teal-400/60 rounded-xl pointer-events-none" />
              <div className="absolute left-7 top-7 px-2 py-1 rounded bg-slate-950/80 text-[10px] font-mono text-teal-300">
                REFERENCE CARD + TEST REGION
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4">
              <Btn variant="secondary" onClick={closeCamera}>Cancel</Btn>
              <Btn Icon={Camera} onClick={captureFromCamera}>Capture Image</Btn>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-3xl">
      <h2 className="text-lg font-semibold text-slate-100">New Field Test</h2>
      <p className="text-slate-500 text-sm mt-1 mb-6">Capture the field-test result with the reference colour card visible in frame.</p>
      <StepIndicator step={step} />

      {step === 1 && !captured && (
        <Card>
          <div className="relative bg-slate-950 rounded-lg overflow-hidden border border-slate-800" style={{ aspectRatio: "4/3" }}>
            <div className="absolute inset-0 flex items-center justify-center gap-6 p-6">
              <ReferenceCardArt highlight={-1} />
              <div className="bg-slate-800 rounded-md border border-slate-600" style={{ width: 26, height: 90 }}>
                <div className="h-1/3 bg-slate-700 rounded-t-md" />
              </div>
            </div>
            <div className="absolute left-6 top-6 border border-teal-400/60 rounded px-1.5 py-0.5 text-[9px] font-mono text-teal-300 bg-slate-950/70">REFERENCE CARD</div>
            <div className="absolute right-10 bottom-10 border border-teal-400/60 rounded px-1.5 py-0.5 text-[9px] font-mono text-teal-300 bg-slate-950/70">TEST REGION</div>
            {capturing && (
              <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
              </div>
            )}
            <div className="absolute inset-3 border border-dashed border-slate-700 rounded-md pointer-events-none" />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            {["Reference card detected", "Test region detected", "Lighting acceptable", "Image quality acceptable"].map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-slate-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />{s}</div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-5 flex-wrap gap-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400"><MapPin className="w-3.5 h-3.5" /> GPS location — permission granted</div>
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
              <Btn variant="secondary" Icon={UploadCloud} onClick={() => fileInputRef.current?.click()}>Upload Image</Btn>
              <Btn variant="secondary" Icon={Camera} onClick={openCamera}>Camera</Btn>
              <Btn Icon={Camera} onClick={handleCapture} disabled={capturing}>{capturing ? "Capturing…" : "Demo Capture"}</Btn>
            </div>
          </div>
        </Card>
      )}

      {step === 1 && captured && (
        <Card>
          <div className="flex items-center gap-2 text-emerald-400 text-sm mb-4"><CheckCircle2 className="w-4 h-4" /> Image captured successfully.</div>
          <div className="bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center p-3 overflow-hidden" style={{ aspectRatio: "4/3" }}>
            {capturedImage?.dataUrl ? (
              <img src={capturedImage.dataUrl} alt="Captured field test" className="w-full h-full object-contain rounded-md" />
            ) : (
              <ReferenceCardArt highlight={draft?.swatchIndex} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Reference card detected</div>
            <div className="flex items-center gap-1.5 text-slate-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />Test region detected</div>
            <div className="flex items-center gap-1.5 text-slate-400"><Hash className="w-3.5 h-3.5 text-teal-400" />SHA-256 generated</div>
            <div className="flex items-center gap-1.5 text-slate-400"><MapPin className="w-3.5 h-3.5 text-teal-400" />{location.status}</div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <Btn variant="secondary" Icon={RotateCcw} onClick={() => { setCaptured(false); setDraft(null); }}>Retake</Btn>
            <Btn onClick={handleAnalyze}>Analyze Result</Btn>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <p className="text-sm text-slate-300 mb-5">Running automated analysis pipeline…</p>
          <div className="space-y-3">
            {pipeline.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className={p.done ? "text-slate-300" : "text-slate-500"}>{p.label}</span>
                {p.done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />}
              </div>
            ))}
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-6 overflow-hidden">
            <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: `${(pipeline.filter((p) => p.done).length / PIPELINE_STEPS.length) * 100}%` }} />
          </div>
        </Card>
      )}

      {step === 3 && draft && (
        <Card>
          <div className="text-center py-4">
            <p className={`text-2xl font-semibold tracking-tight ${
              (markedInconclusive ? "Inconclusive" : draft.result) === "Presumptive Positive" ? "text-rose-400" :
              (markedInconclusive ? "Inconclusive" : draft.result) === "Negative" ? "text-emerald-400" : "text-amber-400"
            }`}>
              {(markedInconclusive ? "Inconclusive" : draft.result).toUpperCase()}
            </p>
            <p className="text-slate-500 text-sm mt-1">Confidence: {draft.confidence}%</p>
            <p className="inline-block mt-3 text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700 rounded-full px-3 py-1">Presumptive field-test result</p>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-md px-4 py-3 text-xs text-amber-300/90 flex gap-2 mt-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            This application provides a presumptive field-test result and does not replace laboratory confirmatory testing.
          </div>

          <div className="grid sm:grid-cols-2 gap-5 mt-6">
            <Field label="Reference Calibration" value="Within tolerance" />
            <Field label="Image Quality" value={draft.quality || "Acceptable"} />
            <Field label="Classification Confidence" value={`${draft.confidence}%`} />
            <Field label="Model Version" value={draft.modelVersion || "CV-Prototype-1.0"} mono />
          </div>

          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Observed Colour vs Reference Range</p>
            <ColorSwatchScale observedIndex={draft.swatchIndex} />
          </div>

          <div className="flex flex-wrap justify-end gap-2 mt-6">
            <Btn variant="ghost" onClick={() => setMarkedInconclusive((v) => !v)}>
              {markedInconclusive ? "Undo Inconclusive Mark" : "Mark as Inconclusive"}
            </Btn>
            <Btn variant="secondary">Review Record</Btn>
            <Btn Icon={ShieldCheck} onClick={generateRecord}>Generate Secure Record</Btn>
          </div>
        </Card>
      )}
    </div>
    </>
  );
}

/* ============================================================
   DIGITAL RECORD / RECORD CARD (shared)
   ============================================================ */

function RecordCard({ test, goTo }) {
  return (
    <div>
      <div className={`rounded-lg border px-5 py-4 flex items-center gap-3 mb-5 ${
        test.integrity === "Failed" ? "bg-rose-500/10 border-rose-500/30" : "bg-emerald-500/10 border-emerald-500/30"
      }`}>
        {test.integrity === "Failed" ? <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" /> : <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />}
        <p className={`text-sm font-medium ${test.integrity === "Failed" ? "text-rose-300" : "text-emerald-300"}`}>
          {test.integrity === "Failed" ? "RECORD INTEGRITY COMPROMISED" : "RECORD INTEGRITY VERIFIED"}
        </p>
      </div>

      <Card>
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div>
            <p className="font-mono text-slate-100 text-lg">{test.id}</p>
            <p className="text-slate-500 text-xs mt-0.5">Secure Digital Record</p>
          </div>
          <StatusBadge result={test.result} />
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Operator" value={test.operator} mono />
          <Field label="Timestamp" value={`${fmtDate(test.timestamp)}, ${fmtTime(test.timestamp)} IST`} />
          <Field label="GPS Coordinates" value={`${test.lat.toFixed(4)}° N, ${test.lng.toFixed(4)}° E`} mono />
          <Field label="GPS Accuracy" value={`± ${test.gpsAccuracy} m`} />
          <Field label="Image Hash (SHA-256)" value={shortHash(test.currentHash)} mono />
          <Field label="Digital Signature" value={test.signature} />
              <Field label="Hash Algorithm" value={test.hashAlgorithm || "SHA-256"} mono />
              <Field label="Signature Status" value={test.signatureStatus || "Demo signature"} />
          <Field label="Model Version" value={test.modelVersion} mono />
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Record Status</p>
            <IntegrityBadge status={test.integrity} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-slate-800">
          <Btn variant="secondary" Icon={Download}>Export Record</Btn>
          <Btn variant="secondary" Icon={Fingerprint} onClick={() => goTo("verification", test.id)}>Verify Integrity</Btn>
          <Btn variant="ghost" Icon={Eye}>View Image</Btn>
        </div>
      </Card>
    </div>
  );
}

function DigitalRecordPage({ test, goTo }) {
  if (!test) return <EmptyState label="No record selected." />;
  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-slate-100 mb-1">Secure Digital Record</h2>
      <p className="text-slate-500 text-sm mb-6">Cryptographically sealed evidence record generated from this field test.</p>
      <RecordCard test={test} goTo={goTo} />
    </div>
  );
}

/* ============================================================
   VERIFICATION PAGE
   ============================================================ */

function VerificationPage({ tests, selectedId, setSelectedId, onTamper, onRestore }) {
  const test = tests.find((t) => t.id === selectedId) || tests[0];
  const match = test.currentHash === test.imageHash;
  const failed = test.integrity === "Failed";

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-slate-100 mb-1">Record Integrity Verification</h2>
      <p className="text-slate-500 text-sm mb-6">Cross-check the stored cryptographic proofs for any field-test record.</p>

      <Card className="mb-5">
        <label className="text-xs text-slate-400 mb-1.5 block">Select test record</label>
        <div className="relative">
          <select
            value={test.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full appearance-none bg-slate-950 border border-slate-700 rounded-md px-3 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/40"
          >
            {tests.map((t) => <option key={t.id} value={t.id}>{t.id} — {t.result}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Original Image Hash</p>
              <p className="font-mono text-sm text-slate-300 mt-0.5">{shortHash(test.imageHash)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Current Image Hash</p>
              <p className={`font-mono text-sm mt-0.5 ${match ? "text-slate-300" : "text-rose-400"}`}>{shortHash(test.currentHash)}</p>
            </div>
            {match ? <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />MATCH</span> :
              <span className="text-xs text-rose-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />MISMATCH</span>}
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <p className="text-sm text-slate-300">Digital Signature</p>
            {match ? <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />VALID</span> :
              <span className="text-xs text-rose-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />UNVERIFIABLE</span>}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-300">Audit Chain</p>
            {match ? <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />VALID</span> :
              <span className="text-xs text-rose-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />BROKEN</span>}
          </div>
        </div>

        <div className={`mt-6 rounded-md border px-4 py-4 flex items-center gap-3 ${match ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30"}`}>
          {match ? <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" /> : <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />}
          <div>
            <p className={`text-sm font-medium ${match ? "text-emerald-300" : "text-rose-300"}`}>
              {match ? "RECORD INTEGRITY VERIFIED" : "INTEGRITY CHECK FAILED"}
            </p>
            {!match && <p className="text-xs text-rose-400/80 mt-0.5">Image hash mismatch detected — this record may have been altered after signing.</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-slate-800">
          {failed ? (
            <Btn variant="secondary" Icon={RefreshCw} onClick={() => onRestore(test.id)}>Restore Demo Record</Btn>
          ) : (
            <Btn variant="danger" Icon={AlertTriangle} onClick={() => onTamper(test.id)}>Demo Tamper</Btn>
          )}
        </div>
      </Card>
      <p className="text-[11px] text-slate-600 mt-3">Demo Tamper simulates post-signing modification of the stored image to illustrate why cryptographic sealing matters — no real files are altered.</p>
    </div>
  );
}

/* ============================================================
   TEST HISTORY
   ============================================================ */

function EmptyState({ label }) {
  return <div className="text-center py-16 text-slate-500 text-sm">{label}</div>;
}

function TestHistoryPage({ tests, goTo }) {
  const [q, setQ] = useState("");
  const [resultFilter, setResultFilter] = useState("All");
  const [integrityFilter, setIntegrityFilter] = useState("All");

  const filtered = tests.filter((t) => {
    const matchesQ = q === "" || t.id.toLowerCase().includes(q.toLowerCase()) || t.operator.toLowerCase().includes(q.toLowerCase());
    const matchesResult = resultFilter === "All" || t.result === resultFilter;
    const matchesIntegrity = integrityFilter === "All" || t.integrity === integrityFilter;
    return matchesQ && matchesResult && matchesIntegrity;
  });

  const Select = ({ value, onChange, options }) => (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none bg-slate-900 border border-slate-800 rounded-md pl-3 pr-8 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/40">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-slate-100">Test History</h2>
      </div>
      <p className="text-slate-500 text-sm mb-5">Searchable, filterable log of every field test on record.</p>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Test ID or Operator…" className="w-full bg-slate-900 border border-slate-800 rounded-md pl-8 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40" />
        </div>
        <Select value={resultFilter} onChange={setResultFilter} options={["All", "Presumptive Positive", "Negative", "Inconclusive"]} />
        <Select value={integrityFilter} onChange={setIntegrityFilter} options={["All", "Verified", "Warning", "Failed"]} />
      </div>

      <Card bodyClass="">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-slate-500 text-xs border-b border-slate-800">
                <th className="px-5 py-3 font-medium">Test ID</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Operator</th>
                <th className="px-5 py-3 font-medium">Result</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Integrity</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-slate-800/70 last:border-0 hover:bg-slate-800/30">
                  <td className="px-5 py-3 font-mono text-slate-300">{t.id}</td>
                  <td className="px-5 py-3 text-slate-400 whitespace-nowrap">{fmtDateTime(t.timestamp)}</td>
                  <td className="px-5 py-3 text-slate-400 font-mono">{t.operator}</td>
                  <td className="px-5 py-3"><StatusBadge result={t.result} size="sm" /></td>
                  <td className="px-5 py-3 text-slate-400">{t.location}</td>
                  <td className="px-5 py-3"><IntegrityBadge status={t.integrity} size="sm" /></td>
                  <td className="px-5 py-3">
                    <button onClick={() => goTo("testDetail", t.id)} className="text-teal-400 hover:text-teal-300 text-xs flex items-center gap-1">
                      View <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7}><EmptyState label="No records match these filters." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   TEST DETAIL
   ============================================================ */

function TestDetailPage({ test, goTo }) {
  if (!test) return <EmptyState label="Test record not found." />;
  const timeline = [
    { label: "Test Created", offset: -12 },
    { label: "Image Captured", offset: -9 },
    { label: "Analysis Completed", offset: -4 },
    { label: "Record Signed", offset: -1 },
    { label: "Record Verified", offset: 0 },
  ];
  return (
    <div className="max-w-3xl">
      <button onClick={() => goTo("history")} className="text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Test History
      </button>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 font-mono">{test.id}</h2>
          <p className="text-slate-500 text-sm mt-0.5">{fmtDate(test.timestamp)} · {test.location}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge result={test.result} />
          <IntegrityBadge status={test.integrity} />
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-5">
        <div className="md:col-span-3 space-y-5">
          <Card title="Test Information">
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Test ID" value={test.id} mono />
              <Field label="Operator" value={`${test.operator} — ${test.operatorName}`} />
              <Field label="Timestamp" value={`${fmtDate(test.timestamp)}, ${fmtTime(test.timestamp)} IST`} />
              <Field label="Location" value={`${test.location} (${test.lat.toFixed(4)}, ${test.lng.toFixed(4)})`} mono />
            </div>
          </Card>

          <Card title="Captured Evidence">
            <div className="bg-slate-950 border border-slate-800 rounded-md flex items-center justify-center p-6" style={{ aspectRatio: "16/9" }}>
              <ReferenceCardArt highlight={test.result === "Presumptive Positive" ? 4 : test.result === "Inconclusive" ? 2 : 0} />
            </div>
            <div className="grid sm:grid-cols-2 gap-5 mt-4">
              <Field label="Image Hash (SHA-256)" value={shortHash(test.currentHash)} mono />
              <Field label="Capture Device" value="Field Unit — Mobile Camera" />
            </div>
          </Card>

          <Card title="AI-Assisted Colour Classification">
            <div className="grid sm:grid-cols-2 gap-5 mb-4">
              <Field label="Result" value={test.result} />
              <Field label="Confidence" value={`${test.confidence}%`} />
              <Field label="Model Version" value={test.modelVersion} mono />
              <Field label="Reference Calibration" value="Within tolerance" />
            </div>
            <ColorSwatchScale observedIndex={test.result === "Presumptive Positive" ? 4 : test.result === "Inconclusive" ? 2 : 0} />
            <p className="text-[11px] text-amber-400/80 mt-4 flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />Presumptive field-test result — laboratory confirmation required.</p>
          </Card>

          <Card title="Cryptographic Integrity">
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="SHA-256 Hash" value={shortHash(test.currentHash)} mono />
              <Field label="Digital Signature" value={test.signature} />
              <Field label="Previous Record Hash" value={shortHash(demoHash(test.id + "-prev"))} mono />
              <Field label="Audit Chain" value={test.integrity === "Failed" ? "Broken" : "Valid"} />
            </div>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-5">
          <Card title="Audit Timeline">
            <ol className="relative border-l border-slate-800 ml-2 space-y-6">
              {timeline.map((ev, i) => (
                <li key={i} className="ml-4">
                  <span className="absolute -translate-x-[calc(0.5rem+1px)] w-2.5 h-2.5 rounded-full bg-teal-500 border-2 border-slate-900 mt-1" />
                  <p className="text-sm text-slate-200">{ev.label}</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{fmtTime(new Date(test.timestamp.getTime() + ev.offset * 1000))}</p>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="Actions">
            <div className="flex flex-col gap-2">
              <Btn variant="secondary" Icon={Download} className="justify-start">Export Record</Btn>
              <Btn variant="secondary" Icon={Fingerprint} className="justify-start" onClick={() => goTo("verification", test.id)}>Verify Integrity</Btn>
              <Btn variant="secondary" Icon={ShieldCheck} className="justify-start" onClick={() => goTo("record", test.id)}>View Digital Record</Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAP VIEW
   ============================================================ */

function MapPage({ tests, goTo }) {
  const [selected, setSelected] = useState(null);
  const lats = tests.map((t) => t.lat), lngs = tests.map((t) => t.lng);
  const minLat = Math.min(...lats) - 0.3, maxLat = Math.max(...lats) + 0.3;
  const minLng = Math.min(...lngs) - 0.3, maxLng = Math.max(...lngs) + 0.3;
  const colorFor = { "Presumptive Positive": "#fb7185", "Negative": "#34d399", "Inconclusive": "#fbbf24" };

  const sel = tests.find((t) => t.id === selected);

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-100 mb-1">Map View</h2>
      <p className="text-slate-500 text-sm mb-5">Geotagged distribution of field-test records across operating districts.</p>

      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-slate-400">
        {Object.entries(colorFor).map(([k, c]) => (
          <div key={k} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />{k}</div>
        ))}
      </div>

      <div
        className="relative rounded-lg border border-slate-800 overflow-hidden"
        style={{
          height: 460,
          backgroundColor: "#0b1220",
          backgroundImage: "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      >
        {tests.map((t) => {
          const left = ((t.lng - minLng) / (maxLng - minLng)) * 100;
          const top = 100 - ((t.lat - minLat) / (maxLat - minLat)) * 100;
          return (
            <button
              key={t.id}
              onClick={() => setSelected(t.id)}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-950 hover:scale-125 transition-transform"
              style={{ left: `${left}%`, top: `${top}%`, width: 12, height: 12, backgroundColor: colorFor[t.result], boxShadow: `0 0 0 3px ${colorFor[t.result]}22` }}
              title={t.id}
            />
          );
        })}

        {sel && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-72 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg p-4 shadow-xl">
            <div className="flex items-start justify-between mb-2">
              <p className="font-mono text-sm text-slate-100">{sel.id}</p>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between"><span>Result</span><StatusBadge result={sel.result} size="sm" /></div>
              <div className="flex justify-between"><span>Operator</span><span className="font-mono text-slate-300">{sel.operator}</span></div>
              <div className="flex justify-between"><span>Timestamp</span><span>{fmtDateTime(sel.timestamp)}</span></div>
              <div className="flex justify-between items-center"><span>Integrity</span><IntegrityBadge status={sel.integrity} size="sm" /></div>
            </div>
            <Btn size="sm" className="w-full mt-3" onClick={() => goTo("testDetail", sel.id)}>View Full Record</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   SUPERVISOR DASHBOARD
   ============================================================ */

function SupervisorDashboardPage({ tests }) {
  const [range, setRange] = useState("7 Days");

  const byDay = useMemo(() => {
    const map = {};
    tests.forEach((t) => {
      const k = fmtDate(t.timestamp);
      map[k] = (map[k] || 0) + 1;
    });
    return Object.entries(map).slice(0, 8).reverse().map(([date, count]) => ({ date: date.slice(0, 6), count }));
  }, [tests]);

  const distribution = useMemo(() => {
    const cats = ["Negative", "Presumptive Positive", "Inconclusive"];
    const colors = { Negative: "#34d399", "Presumptive Positive": "#fb7185", Inconclusive: "#fbbf24" };
    return cats.map((c) => ({ name: c, value: tests.filter((t) => t.result === c).length, color: colors[c] }));
  }, [tests]);

  const byLocation = useMemo(() => {
    const map = {};
    tests.forEach((t) => { map[t.location] = (map[t.location] || 0) + 1; });
    return Object.entries(map).map(([location, count]) => ({ location, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [tests]);

  const byOperator = useMemo(() => {
    const map = {};
    tests.forEach((t) => { map[t.operator] = (map[t.operator] || 0) + 1; });
    return Object.entries(map).map(([operator, count]) => ({ operator, count }));
  }, [tests]);

  const kpis = {
    total: tests.length,
    positive: tests.filter((t) => t.result === "Presumptive Positive").length,
    negative: tests.filter((t) => t.result === "Negative").length,
    inconclusive: tests.filter((t) => t.result === "Inconclusive").length,
    verified: tests.filter((t) => t.integrity === "Verified").length,
    alerts: tests.filter((t) => t.integrity !== "Verified").length,
  };

  const axisColor = "#64748b";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Supervisor Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">Bureau-wide oversight across operators and districts.</p>
        </div>
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-md p-1">
          {["Today", "7 Days", "30 Days", "Custom"].map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${range === r ? "bg-teal-600 text-white" : "text-slate-400 hover:text-slate-200"}`}>{r}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <KpiCard label="Total Tests" value={kpis.total} Icon={FileText} tone="slate" />
        <KpiCard label="Positive" value={kpis.positive} Icon={AlertTriangle} tone="rose" />
        <KpiCard label="Negative" value={kpis.negative} Icon={CheckCircle2} tone="emerald" />
        <KpiCard label="Inconclusive" value={kpis.inconclusive} Icon={Info} tone="amber" />
        <KpiCard label="Integrity Verified" value={kpis.verified} Icon={ShieldCheck} tone="teal" />
        <KpiCard label="Integrity Alerts" value={kpis.alerts} Icon={ShieldAlert} tone="rose" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Tests Over Time">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={byDay}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke={axisColor} tick={{ fontSize: 11 }} />
              <YAxis stroke={axisColor} tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="count" stroke="#2dd4bf" strokeWidth={2} dot={{ r: 3, fill: "#2dd4bf" }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Results Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {distribution.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Tests by Location">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byLocation}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="location" stroke={axisColor} tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={40} />
              <YAxis stroke={axisColor} tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Tests by Operator">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byOperator}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="operator" stroke={axisColor} tick={{ fontSize: 10 }} />
              <YAxis stroke={axisColor} tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   OPERATORS
   ============================================================ */

function OperatorsPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-100 mb-1">Operators</h2>
      <p className="text-slate-500 text-sm mb-5">Field officers and supervisors with platform access.</p>
      <Card bodyClass="">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-slate-500 text-xs border-b border-slate-800">
                <th className="px-5 py-3 font-medium">Operator ID</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Last Activity</th>
                <th className="px-5 py-3 font-medium">Tests</th>
              </tr>
            </thead>
            <tbody>
              {OPERATORS.map((o) => (
                <tr key={o.id} className="border-b border-slate-800/70 last:border-0 hover:bg-slate-800/30">
                  <td className="px-5 py-3 font-mono text-slate-300">{o.id}</td>
                  <td className="px-5 py-3 text-slate-200">{o.name}</td>
                  <td className="px-5 py-3 text-slate-400">{o.role}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] border ${o.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-500 border-slate-700"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />{o.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400">{o.lastActivity}</td>
                  <td className="px-5 py-3 text-slate-300">{o.tests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   AUDIT LOGS
   ============================================================ */

function AuditLogsPage({ tests, extraEvents }) {
  const events = useMemo(() => {
    const list = [];
    tests.forEach((t) => {
      const base = t.timestamp.getTime();
      list.push({ time: new Date(base - 12000), action: `Test ${t.id} created`, operator: t.operator, record: t.id, status: "Info" });
      list.push({ time: new Date(base - 9000), action: "Image captured", operator: t.operator, record: t.id, status: "Info" });
      list.push({ time: new Date(base - 4000), action: "Analysis completed", operator: t.operator, record: t.id, status: "Info" });
      list.push({ time: new Date(base - 1000), action: "Digital record signed", operator: t.operator, record: t.id, status: "Info" });
      list.push({ time: new Date(base), action: "Integrity verified", operator: t.operator, record: t.id, status: "Success" });
    });
    return [...list, ...extraEvents].sort((a, b) => b.time - a.time).slice(0, 60);
  }, [tests, extraEvents]);

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-100 mb-1">Audit Logs</h2>
      <p className="text-slate-500 text-sm mb-5">Immutable, chronological record of every system and evidence event.</p>
      <Card bodyClass="">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-slate-500 text-xs border-b border-slate-800">
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">Operator</th>
                <th className="px-5 py-3 font-medium">Record</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-b border-slate-800/70 last:border-0 hover:bg-slate-800/30">
                  <td className="px-5 py-3 font-mono text-slate-400 whitespace-nowrap">{fmtDate(e.time)} {fmtTime(e.time)}</td>
                  <td className="px-5 py-3 text-slate-200">{e.action}</td>
                  <td className="px-5 py-3 font-mono text-slate-400">{e.operator}</td>
                  <td className="px-5 py-3 font-mono text-slate-400">{e.record}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${e.status === "Alert" ? "bg-rose-500/10 text-rose-400 border-rose-500/30" : e.status === "Success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-400 border-slate-700"}`}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   SETTINGS
   ============================================================ */

function SettingsPage({ operator }) {
  const [locationOn, setLocationOn] = useState(true);
  const [syncOn, setSyncOn] = useState(true);
  const Toggle = ({ on, onChange }) => (
    <button onClick={() => onChange(!on)} className={`w-10 h-5.5 rounded-full transition-colors relative shrink-0 ${on ? "bg-teal-600" : "bg-slate-700"}`} style={{ height: 22 }}>
      <span className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform" style={{ width: 18, height: 18, transform: on ? "translateX(21px)" : "translateX(2px)" }} />
    </button>
  );
  return (
    <div className="max-w-2xl space-y-5">
      <h2 className="text-lg font-semibold text-slate-100">Settings</h2>

      <Card title="Profile">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Operator ID" value={operator.id} mono />
          <Field label="Role" value="Field Officer" />
        </div>
      </Card>

      <Card title="Security">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-200">Change password</p>
            <p className="text-xs text-slate-500 mt-0.5">Last changed 42 days ago</p>
          </div>
          <Btn variant="secondary" Icon={KeyRound} size="sm">Update</Btn>
        </div>
      </Card>

      <Card title="Device">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-200"><Signal className="w-4 h-4 text-slate-500" />Field Unit — Registered Device</div>
          <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">Trusted</span>
        </div>
      </Card>

      <Card title="Location Permissions">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-200"><MapPin className="w-4 h-4 text-slate-500" />GPS tagging for field tests</div>
          <Toggle on={locationOn} onChange={setLocationOn} />
        </div>
      </Card>

      <Card title="Data Synchronization">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-200"><Wifi className="w-4 h-4 text-slate-500" />Auto-sync records when online</div>
          <Toggle on={syncOn} onChange={setSyncOn} />
        </div>
      </Card>

      <Card title="Model Information">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Model" value="Colour Classification Model" />
          <Field label="Version" value="CV-1.0.0" mono />
          <Field label="Status" value="Active" />
          <Field label="Validation" value="Prototype — not production-validated" />
        </div>
      </Card>
    </div>
  );
}

/* ============================================================
   APP ROOT
   ============================================================ */

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tests, setTests] = useState(buildTests);
  const [selectedId, setSelectedId] = useState(null);
  const [extraEvents, setExtraEvents] = useState([]);
  const [wizardKey, setWizardKey] = useState(0);
  const operator = OPERATORS[0];

  function goTo(p, id) {
    if (id) setSelectedId(id);
    setPage(p);
    if (p === "newTest") setWizardKey((k) => k + 1);
    window.scrollTo?.({ top: 0 });
  }

  function handleRecordCreated(newTest) {
    setTests((prev) => [newTest, ...prev]);
    setExtraEvents((prev) => [{ time: new Date(newTest.timestamp.getTime() + 500), action: "New field test recorded", operator: newTest.operator, record: newTest.id, status: "Success" }, ...prev]);
  }

  function handleTamper(id) {
    setTests((prev) => prev.map((t) => t.id === id ? { ...t, currentHash: demoHash(id + "-tampered-" + Date.now()), integrity: "Failed" } : t));
    setExtraEvents((prev) => [{ time: new Date(), action: "⚠ Integrity check failed — hash mismatch", operator: operator.id, record: id, status: "Alert" }, ...prev]);
  }

  function handleRestore(id) {
    setTests((prev) => prev.map((t) => t.id === id ? { ...t, currentHash: t.imageHash, integrity: "Verified" } : t));
    setExtraEvents((prev) => [{ time: new Date(), action: "Demo record restored", operator: operator.id, record: id, status: "Success" }, ...prev]);
  }

  if (!authed) return <LoginPage onLogin={() => setAuthed(true)} />;

  const selectedTest = tests.find((t) => t.id === selectedId);
  const titles = {
    dashboard: ["Officer Dashboard", null],
    newTest: ["New Field Test", "Guided capture-to-record workflow"],
    record: ["Digital Record", null],
    verification: ["Verification", null],
    history: ["Test History", null],
    testDetail: ["Test Details", null],
    map: ["Map View", null],
    supervisor: ["Supervisor Dashboard", null],
    operators: ["Operators", null],
    audit: ["Audit Logs", null],
    settings: ["Settings", null],
  };
  const [title, subtitle] = titles[page] || ["FIELDTEST", null];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <Sidebar page={page} goTo={goTo} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onLogout={() => setAuthed(false)} operator={operator} />
      <div className="flex-1 min-w-0">
        <TopBar title={title} subtitle={subtitle} setMobileOpen={setMobileOpen} />
        <div className="px-4 md:px-8 pt-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-[11px] text-amber-300/80">
            <Info className="w-3.5 h-3.5" />
            Prototype / Demo Mode — presumptive field-test workflow; laboratory confirmation required.
          </div>
        </div>
        <main className="p-4 md:p-8">
          {page === "dashboard" && <DashboardPage tests={tests} goTo={goTo} operator={operator} />}
          {page === "newTest" && <NewFieldTestPage key={wizardKey} onRecordCreated={handleRecordCreated} goTo={goTo} />}
          {page === "record" && <DigitalRecordPage test={selectedTest} goTo={goTo} />}
          {page === "verification" && <VerificationPage tests={tests} selectedId={selectedId || tests[0].id} setSelectedId={setSelectedId} onTamper={handleTamper} onRestore={handleRestore} />}
          {page === "history" && <TestHistoryPage tests={tests} goTo={goTo} />}
          {page === "testDetail" && <TestDetailPage test={selectedTest} goTo={goTo} />}
          {page === "map" && <MapPage tests={tests} goTo={goTo} />}
          {page === "supervisor" && <SupervisorDashboardPage tests={tests} />}
          {page === "operators" && <OperatorsPage />}
          {page === "audit" && <AuditLogsPage tests={tests} extraEvents={extraEvents} />}
          {page === "settings" && <SettingsPage operator={operator} />}
        </main>
      </div>
    </div>
  );
}
