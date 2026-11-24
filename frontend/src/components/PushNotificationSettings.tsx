import { useEffect, useState } from "react";
import { api, type PushSubscriptionPayload } from "../services/api";

function decodeKey(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bytes = Uint8Array.from(window.atob(padded), (char) => char.charCodeAt(0));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export default function PushNotificationSettings() {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([api.pushConfig(), api.pushSubscriptions()]).then(async ([config, stored]) => {
      if (!active) return;
      const supported = config.enabled && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      setAvailable(supported);
      setSubscriptionId(stored.items[0]?.id ?? null);
      if (supported) {
        const registration = await navigator.serviceWorker.ready;
        const nativeSubscription = await registration.pushManager.getSubscription();
        setEnabled(Boolean(nativeSubscription && stored.items.length));
      }
    }).catch(() => { if (active) setAvailable(false); });
    return () => { active = false; };
  }, []);

  async function enable() {
    setBusy(true); setMessage("");
    try {
      const config = await api.pushConfig();
      if (!config.enabled || !config.public_key) throw new Error("إشعارات الهاتف غير مهيأة على الخادم بعد.");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        throw new Error("هذا المتصفح لا يدعم الإشعارات الفورية.");
      }
      const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (permission !== "granted") throw new Error("لم يتم السماح بإرسال الإشعارات من إعدادات المتصفح.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeKey(config.public_key),
      });
      const saved = await api.savePushSubscription(subscription.toJSON() as PushSubscriptionPayload);
      setSubscriptionId(saved.id);
      setEnabled(true);
      setMessage("تم تفعيل إشعارات هذا الجهاز.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "تعذر تفعيل الإشعارات.");
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true); setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
      if (subscriptionId) await api.removePushSubscription(subscriptionId);
      setSubscriptionId(null); setEnabled(false); setMessage("تم إيقاف إشعارات هذا الجهاز.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "تعذر إيقاف الإشعارات.");
    } finally { setBusy(false); }
  }

  return <section className="push-settings" aria-label="إشعارات الهاتف">
    <div><strong>إشعارات الهاتف</strong><p>استقبل التنبيهات حتى عندما لا تكون المنصة مفتوحة، بعد السماح بها على هذا الجهاز.</p></div>
    {!available ? <span className="push-status">تحتاج HTTPS وإعداد مفاتيح الإشعارات ودعماً من المتصفح</span> : <button type="button" disabled={busy} onClick={enabled ? disable : enable}>
      {busy ? "جارٍ التحديث…" : enabled ? "إيقاف على هذا الجهاز" : "تفعيل على هذا الجهاز"}
    </button>}
    {message && <p className="push-feedback" role="status">{message}</p>}
  </section>;
}

