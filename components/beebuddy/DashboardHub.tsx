"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Brain,
  Check,
  CheckCircle2,
  Flame,
  HeartHandshake,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Pause,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { webAuth } from "@/lib/auth-client";
import type { WebUser } from "@/lib/auth-types";
import {
  wellbeingApi,
  type HabitRoutine,
  type MascotMemory,
  type MascotSuggestion,
  type MemoryCategory,
  type MoodCheckIn,
  type MoodValue,
  type RoutineFrequency,
} from "@/lib/wellbeing-client";

const moods: Array<{ value: MoodValue; emoji: string; label: string }> = [
  { value: "VERY_LOW", emoji: "😞", label: "Rất tệ" },
  { value: "LOW", emoji: "😕", label: "Không tốt" },
  { value: "NEUTRAL", emoji: "😐", label: "Bình thường" },
  { value: "GOOD", emoji: "🙂", label: "Tốt" },
  { value: "GREAT", emoji: "😄", label: "Tuyệt vời" },
];

function localDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function dateKey(value: string) { return value.slice(0, 10); }

function completionStreak(routines: HabitRoutine[]) {
  const completed = new Set(routines.flatMap((routine) => routine.completions.map((item) => dateKey(item.localDate))));
  let cursor = new Date(`${localDate()}T00:00:00`);
  if (!completed.has(localDate())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (completed.has(localDateFrom(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function localDateFrom(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function frequencyLabel(value: RoutineFrequency) {
  if (value === "DAILY") return "Mỗi ngày";
  if (value === "WEEKLY") return "Hàng tuần";
  return "Tùy chỉnh";
}

export default function DashboardHub() {
  const [user, setUser] = useState<WebUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [moodHistory, setMoodHistory] = useState<MoodCheckIn[]>([]);
  const [routines, setRoutines] = useState<HabitRoutine[]>([]);
  const [suggestions, setSuggestions] = useState<MascotSuggestion[]>([]);
  const [memories, setMemories] = useState<MascotMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showMood, setShowMood] = useState(false);
  const [showRoutine, setShowRoutine] = useState(false);
  const [showMemory, setShowMemory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [moodRows, routineRows, suggestionRows, memoryRows] = await Promise.all([
        wellbeingApi.moods(), wellbeingApi.routines(false), wellbeingApi.suggestions(), wellbeingApi.memories(),
      ]);
      setMoodHistory(moodRows);
      setRoutines(routineRows);
      setMemories(memoryRows);
      setSuggestions(suggestionRows.length ? suggestionRows : await wellbeingApi.refreshSuggestions());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    webAuth.me().then((current) => {
      if (!active) return;
      setUser(current);
      return load();
    }).catch(() => { if (active) setUser(null); }).finally(() => { if (active) setAuthResolved(true); });
    return () => { active = false; };
  }, [load]);

  const today = localDate();
  const todayMood = moodHistory.find((item) => dateKey(item.recordedAt) === today);
  const activeRoutines = routines.filter((item) => item.isActive);
  const completedToday = activeRoutines.filter((routine) => routine.completions.some((item) => dateKey(item.localDate) === today));
  const streak = useMemo(() => completionStreak(routines), [routines]);

  const complete = async (routine: HabitRoutine) => {
    setPending(routine.id);
    setError("");
    try {
      await wellbeingApi.completeRoutine(routine.id, today, routine.targetValue);
      setRoutines(await wellbeingApi.routines(false));
      setNotice(`Đã ghi nhận “${routine.name}” hôm nay.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể hoàn thành routine");
    } finally { setPending(null); }
  };

  const toggleRoutine = async (routine: HabitRoutine) => {
    setPending(routine.id);
    try {
      await wellbeingApi.setRoutineActive(routine.id, !routine.isActive);
      setRoutines((current) => current.map((item) => item.id === routine.id ? { ...item, isActive: !item.isActive } : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể cập nhật routine"); }
    finally { setPending(null); }
  };

  const respondSuggestion = async (item: MascotSuggestion, status: "ACCEPTED" | "DISMISSED") => {
    setPending(item.id);
    try {
      await wellbeingApi.respondSuggestion(item.id, status);
      setSuggestions((current) => current.filter((row) => row.id !== item.id));
      setNotice(status === "ACCEPTED" ? "Buzzy đã ghi nhận lựa chọn của bạn." : "Đã ẩn gợi ý này.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể cập nhật gợi ý"); }
    finally { setPending(null); }
  };

  const refreshSuggestions = async () => {
    setPending("suggestions");
    try { setSuggestions(await wellbeingApi.refreshSuggestions()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể làm mới gợi ý"); }
    finally { setPending(null); }
  };

  if (!authResolved) return <div className="bb-dashboard-state"><LoaderCircle className="bb-spin" size={30} /> Đang chuẩn bị ngày mới...</div>;
  if (!user) return <main className="bb-dashboard-guest"><Sparkles size={43} /><h1>Không gian cá nhân của bạn</h1><p>Đăng nhập để theo dõi cảm xúc, thói quen và nhận gợi ý từ Buzzy.</p><Link href="/login">Đăng nhập</Link></main>;

  return (
    <main className="bb-dashboard">
      <section className="bb-dashboard-hero">
        <div><span>Xin chào, {user.profile?.fullName?.split(" ").at(-1) || "bạn"} 👋</span><h1>Mỗi ngày một bước nhỏ</h1><p>Check-in, giữ nhịp thói quen và kết nối với những điều khiến bạn thấy tốt hơn.</p></div>
        <img src="/assets/home/figma-buzzy.png" alt="Buzzy" />
      </section>

      <section className="bb-dashboard-shell">
        {(error || notice) && <div className={`bb-match-alert ${error ? "is-error" : "is-success"}`}>{error || notice}</div>}
        {loading ? <div className="bb-dashboard-state"><LoaderCircle className="bb-spin" size={27} /> Đang tải dữ liệu...</div> : <>
          <div className="bb-dashboard-stats">
            <Stat icon={<Activity size={20} />} label="Mood hôm nay" value={todayMood ? moods.find((item) => item.value === todayMood.mood)?.label || "Đã check-in" : "Chưa check-in"} accent="green" />
            <Stat icon={<CheckCircle2 size={20} />} label="Routine hôm nay" value={`${completedToday.length}/${activeRoutines.length}`} accent="orange" />
            <Stat icon={<Flame size={20} />} label="Chuỗi hoạt động" value={`${streak} ngày`} accent="purple" />
            <Stat icon={<Brain size={20} />} label="Buzzy memory" value={`${memories.length} mục`} accent="blue" />
          </div>

          <div className="bb-dashboard-main-grid">
            <section className="bb-dashboard-panel bb-dashboard-mood-panel">
              <header><div><span>Cảm xúc</span><h2>Hôm nay bạn thế nào?</h2></div><button onClick={() => setShowMood(true)}>{todayMood ? "Check-in lại" : "Check-in"}</button></header>
              {todayMood ? <div className="bb-dashboard-current-mood"><b>{moods.find((item) => item.value === todayMood.mood)?.emoji}</b><div><strong>{moods.find((item) => item.value === todayMood.mood)?.label}</strong><span>Năng lượng {todayMood.energyLevel}/5</span>{todayMood.note && <p>{todayMood.note}</p>}</div></div> : <div className="bb-dashboard-empty-mini"><span>🌤️</span><p>Một phút check-in giúp bạn nhận ra nhịp điệu của chính mình.</p></div>}
              <div className="bb-dashboard-mood-history">{moodHistory.slice(0, 7).map((item) => <div key={item.id} title={`${moods.find((mood) => mood.value === item.mood)?.label} · Năng lượng ${item.energyLevel}/5`}><span>{moods.find((mood) => mood.value === item.mood)?.emoji}</span><small>{new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(new Date(item.recordedAt))}</small></div>)}</div>
            </section>

            <section className="bb-dashboard-panel bb-dashboard-buzzy-panel">
              <header><div><span>Gợi ý từ Buzzy</span><h2>Một chút động lực</h2></div><button title="Làm mới" disabled={pending === "suggestions"} onClick={() => void refreshSuggestions()}><RefreshCw className={pending === "suggestions" ? "bb-spin" : ""} size={18} /></button></header>
              {suggestions.length ? <div className="bb-dashboard-suggestions">{suggestions.slice(0, 3).map((item) => <article key={item.id}><Lightbulb size={20} /><div><strong>{item.title}</strong><p>{item.content}</p><small>{item.reason}</small><footer><button disabled={pending === item.id} onClick={() => void respondSuggestion(item, "ACCEPTED")}><Check size={14} /> Thử ngay</button><button disabled={pending === item.id} onClick={() => void respondSuggestion(item, "DISMISSED")}><X size={14} /> Bỏ qua</button></footer></div></article>)}</div> : <div className="bb-dashboard-empty-mini"><Sparkles size={28} /><p>Bạn đã xử lý hết gợi ý hiện tại.</p></div>}
            </section>
          </div>

          <section className="bb-dashboard-panel bb-dashboard-routines">
            <header><div><span>Thói quen</span><h2>Routine của bạn</h2></div><button onClick={() => setShowRoutine(true)}><Plus size={16} /> Tạo routine</button></header>
            {routines.length ? <div className="bb-dashboard-routine-grid">{routines.map((routine) => { const done = routine.completions.some((item) => dateKey(item.localDate) === today); return <article key={routine.id} className={!routine.isActive ? "is-paused" : ""}><div className="bb-dashboard-routine-icon">{done ? <CheckCircle2 size={23} /> : <Target size={23} />}</div><div><strong>{routine.name}</strong><span>{frequencyLabel(routine.frequency)} · {routine.targetValue} {routine.unit}</span><small>{routine.completions.length} lần trong 14 ngày gần đây</small></div><aside>{routine.isActive && <button className={done ? "is-done" : ""} disabled={done || pending === routine.id} onClick={() => void complete(routine)}>{done ? <><Check size={15} /> Đã xong</> : "Hoàn thành"}</button>}<button title={routine.isActive ? "Tạm dừng" : "Kích hoạt"} disabled={pending === routine.id} onClick={() => void toggleRoutine(routine)}>{routine.isActive ? <Pause size={16} /> : <Activity size={16} />}</button></aside></article>; })}</div> : <div className="bb-dashboard-empty-mini"><Target size={30} /><p>Tạo routine đầu tiên để xây một thói quen nhỏ mỗi ngày.</p></div>}
          </section>

          <div className="bb-dashboard-bottom-grid">
            <section className="bb-dashboard-panel bb-dashboard-memory">
              <header><div><span>Riêng tư & chủ động</span><h2>Điều Buzzy được phép nhớ</h2></div><button onClick={() => setShowMemory(true)}><Plus size={16} /> Thêm</button></header>
              <p className="bb-dashboard-memory-note"><LockKeyhole size={15} /> Chỉ lưu khi bạn xác nhận rõ ràng. Bạn có thể thu hồi bất cứ lúc nào.</p>
              {memories.length ? memories.slice(0, 5).map((memory) => <div className="bb-dashboard-memory-row" key={memory.id}><div><strong>{memory.summary}</strong><span>{memory.category}</span></div><button title="Thu hồi memory" onClick={async () => { setPending(memory.id); try { await wellbeingApi.revokeMemory(memory.id); setMemories((current) => current.filter((item) => item.id !== memory.id)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể thu hồi memory"); } finally { setPending(null); } }}><Trash2 size={15} /></button></div>) : <div className="bb-dashboard-empty-mini is-small"><p>Buzzy chưa lưu điều gì về bạn.</p></div>}
            </section>

            <section className="bb-dashboard-panel bb-dashboard-quick-links">
              <header><div><span>Tiếp tục khám phá</span><h2>Đi đâu tiếp theo?</h2></div></header>
              <Link href="/discover"><HeartHandshake size={20} /><div><strong>Tìm người đồng điệu</strong><span>Matching và kết nối</span></div></Link>
              <Link href="/community"><Users size={20} /><div><strong>Tham gia cộng đồng</strong><span>Chia sẻ và cùng phát triển</span></div></Link>
              <Link href="/messages"><MessageCircle size={20} /><div><strong>Mở hộp thư</strong><span>Trò chuyện với bạn bè</span></div></Link>
              <Link href="/notifications"><Bell size={20} /><div><strong>Xem thông báo</strong><span>Hoạt động mới nhất</span></div></Link>
            </section>
          </div>
        </>}
      </section>

      {showMood && <MoodModal pending={pending === "mood"} onClose={() => setShowMood(false)} onSaved={async () => { setMoodHistory(await wellbeingApi.moods()); setSuggestions(await wellbeingApi.refreshSuggestions()); setShowMood(false); setNotice("Đã lưu mood check-in của bạn."); }} setPending={setPending} setError={setError} />}
      {showRoutine && <RoutineModal pending={pending === "routine"} onClose={() => setShowRoutine(false)} onSaved={async () => { setRoutines(await wellbeingApi.routines(false)); setSuggestions(await wellbeingApi.refreshSuggestions()); setShowRoutine(false); setNotice("Đã tạo routine mới."); }} setPending={setPending} setError={setError} />}
      {showMemory && <MemoryModal pending={pending === "memory"} onClose={() => setShowMemory(false)} onSaved={async () => { setMemories(await wellbeingApi.memories()); setShowMemory(false); setNotice("Buzzy đã lưu điều này với sự đồng ý của bạn."); }} setPending={setPending} setError={setError} />}
    </main>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return <article className={`bb-dashboard-stat is-${accent}`}><i>{icon}</i><div><span>{label}</span><strong>{value}</strong></div></article>;
}

function MoodModal({ pending, onClose, onSaved, setPending, setError }: { pending: boolean; onClose: () => void; onSaved: () => Promise<void>; setPending: (value: string | null) => void; setError: (value: string) => void }) {
  const [mood, setMood] = useState<MoodValue>("GOOD");
  const [energy, setEnergy] = useState(3);
  const [note, setNote] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); setPending("mood"); try { await wellbeingApi.checkIn(mood, energy, note.trim() || undefined); await onSaved(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể lưu check-in"); } finally { setPending(null); } };
  return <Modal title="Mood check-in" subtitle="Không có câu trả lời đúng hay sai." onClose={onClose}><form onSubmit={submit} className="bb-dashboard-form"><div className="bb-dashboard-mood-picker">{moods.map((item) => <button type="button" key={item.value} className={mood === item.value ? "is-active" : ""} onClick={() => setMood(item.value)}><b>{item.emoji}</b><span>{item.label}</span></button>)}</div><label>Mức năng lượng: <strong>{energy}/5</strong><input type="range" min={1} max={5} value={energy} onChange={(event) => setEnergy(Number(event.target.value))} /></label><label>Ghi chú tùy chọn<textarea maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Điều gì đang diễn ra với bạn?" /></label><ModalActions pending={pending} onClose={onClose} label="Lưu check-in" /></form></Modal>;
}

function RoutineModal({ pending, onClose, onSaved, setPending, setError }: { pending: boolean; onClose: () => void; onSaved: () => Promise<void>; setPending: (value: string | null) => void; setError: (value: string) => void }) {
  const [name, setName] = useState(""); const [frequency, setFrequency] = useState<RoutineFrequency>("DAILY"); const [target, setTarget] = useState(1); const [unit, setUnit] = useState("lần");
  const submit = async (event: FormEvent) => { event.preventDefault(); setPending("routine"); try { await wellbeingApi.createRoutine({ name: name.trim(), frequency, schedule: frequency === "DAILY" ? { daysOfWeek: [0,1,2,3,4,5,6] } : { daysPerWeek: 3 }, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh", targetValue: target, unit: unit.trim(), startsOn: localDate() }); await onSaved(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tạo routine"); } finally { setPending(null); } };
  return <Modal title="Tạo routine mới" subtitle="Bắt đầu đủ nhỏ để bạn có thể duy trì." onClose={onClose}><form onSubmit={submit} className="bb-dashboard-form"><label>Tên routine<input required minLength={1} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Đọc sách trước khi ngủ" /></label><div className="bb-dashboard-form-grid"><label>Tần suất<select value={frequency} onChange={(event) => setFrequency(event.target.value as RoutineFrequency)}><option value="DAILY">Mỗi ngày</option><option value="WEEKLY">Hàng tuần</option><option value="CUSTOM">Tùy chỉnh</option></select></label><label>Mục tiêu<input type="number" min={0.1} max={100000} step="0.1" value={target} onChange={(event) => setTarget(Number(event.target.value))} /></label></div><label>Đơn vị<input required maxLength={50} value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="lần, phút, trang..." /></label><ModalActions pending={pending} onClose={onClose} label="Tạo routine" /></form></Modal>;
}

function MemoryModal({ pending, onClose, onSaved, setPending, setError }: { pending: boolean; onClose: () => void; onSaved: () => Promise<void>; setPending: (value: string | null) => void; setError: (value: string) => void }) {
  const [category, setCategory] = useState<MemoryCategory>("PREFERENCE"); const [summary, setSummary] = useState(""); const [consent, setConsent] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!consent) return; setPending("memory"); try { await wellbeingApi.createMemory(category, summary.trim(), true); await onSaved(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể lưu memory"); } finally { setPending(null); } };
  return <Modal title="Cho phép Buzzy ghi nhớ" subtitle="Bạn kiểm soát hoàn toàn nội dung này." onClose={onClose}><form onSubmit={submit} className="bb-dashboard-form"><label>Loại thông tin<select value={category} onChange={(event) => setCategory(event.target.value as MemoryCategory)}><option value="PREFERENCE">Sở thích</option><option value="GOAL">Mục tiêu</option><option value="WELLBEING">Wellbeing</option><option value="CONTEXT">Bối cảnh</option></select></label><label>Nội dung<textarea required minLength={1} maxLength={2000} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Ví dụ: Tôi thích check-in vào buổi tối" /></label><label className="bb-dashboard-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Tôi đồng ý cho BeeBuddy lưu nội dung này để cá nhân hóa trải nghiệm.</span></label><ModalActions pending={pending} onClose={onClose} label="Đồng ý và lưu" disabled={!consent || !summary.trim()} /></form></Modal>;
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="bb-dashboard-modal-overlay" role="dialog" aria-modal="true" onMouseDown={onClose}><div className="bb-dashboard-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><h2>{title}</h2><p>{subtitle}</p></div><button onClick={onClose}><X size={20} /></button></header>{children}</div></div>;
}
function ModalActions({ pending, onClose, label, disabled = false }: { pending: boolean; onClose: () => void; label: string; disabled?: boolean }) {
  return <footer><button type="button" onClick={onClose}>Hủy</button><button type="submit" className="is-primary" disabled={pending || disabled}>{pending ? <LoaderCircle className="bb-spin" size={17} /> : <Check size={17} />} {label}</button></footer>;
}
