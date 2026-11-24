import { useState } from "react";
import { useNotifications } from "./NotificationProvider";
import PushNotificationSettings from "./PushNotificationSettings";

const icons: Record<string, string> = { homework: "▤", grade: "▦", attendance: "◉", support: "✉", announcement: "▣" };

export default function NotificationInbox() {
  const { items, unread, loaded, error, refresh, markRead } = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [voice, setVoice] = useState(() => localStorage.getItem("schoolcloud_voice_enabled") === "yes");
  const [actionError, setActionError] = useState("");
  const visible = filter === "unread" ? items.filter((notice) => !notice.read_at) : items;

  async function handleRead(id: string) {
    try { await markRead(id); setActionError(""); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "تعذر تحديث الإشعار"); }
  }

  return <section className="notification-center" dir="rtl">
    <div className="notification-header"><div><span className="owner-eyebrow">التواصل والتنبيهات</span><h2>مركز الإشعارات</h2><p>التنبيهات محفوظة في حسابك وتُحدّث تلقائياً أثناء استخدام المنصة.</p></div>
      <div className="notification-counter"><strong>{unread}</strong><span>غير مقروء</span></div></div>
    <PushNotificationSettings/>
    <div className="notification-toolbar"><div className="notification-filters">
      <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>جميع الإشعارات <span>{items.length}</span></button>
      <button type="button" aria-pressed={filter === "unread"} onClick={() => setFilter("unread")}>غير المقروءة <span>{unread}</span></button>
    </div><div className="notification-tools">
      <label className="notification-voice"><input type="checkbox" checked={voice} onChange={(event) => {
        setVoice(event.target.checked);
        localStorage.setItem("schoolcloud_voice_enabled", event.target.checked ? "yes" : "no");
      }}/> قراءة صوتية عند فتح المنصة</label>
      <button type="button" className="notification-refresh" onClick={() => void refresh()}>تحديث</button>
    </div></div>
    {(error || actionError) && <p className="live-error" role="alert">{actionError || error}</p>}
    <div className="notification-list" aria-live="polite">
      {visible.length ? visible.map((notice) => <article key={notice.id} className={`notification-card ${!notice.read_at ? "is-unread" : ""}`}>
        <div className="notification-kind" aria-hidden="true">{icons[notice.kind] || "◉"}</div>
        <div className="notification-copy"><div className="notification-title"><strong>{notice.title}</strong>{!notice.read_at && <span className="notification-new">جديد</span>}</div>
          <p>{notice.body}</p><time dateTime={notice.created_at}>{new Date(notice.created_at).toLocaleString("ar-IQ")}</time>
        </div>{!notice.read_at && <button type="button" onClick={() => void handleRead(notice.id)}>تحديد كمقروء</button>}
      </article>) : <div className="notification-empty"><span>◉</span><strong>{loaded ? filter === "unread" ? "لا توجد إشعارات غير مقروءة" : "لا توجد إشعارات حالياً" : "جارٍ تحميل الإشعارات…"}</strong>
        {loaded && <p>ستظهر التنبيهات الجديدة هنا عند وصولها.</p>}</div>}
    </div>
    <p className="notification-note">الإشعارات الفورية تحتاج HTTPS والسماح بها على الجهاز. ويمكن تفعيل القراءة الصوتية عند بقاء المنصة مفتوحة.</p>
  </section>;
}
