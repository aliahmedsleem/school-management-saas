import { useEffect, useState } from "react";
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{outcome:string}> };
export default function InstallApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & {standalone?:boolean}).standalone));
    setInstalled(standalone);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator && window.isSecureContext) navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  if (installed) return <span className="install-state" title="التطبيق مثبت">✓ مثبت</span>;
  return <div className="install-wrap">
    <button type="button" className="install-button" onClick={async () => {
      if (!prompt) { setHelp(value => !value); return; }
      await prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === "accepted") setPrompt(null);
    }}>⬇ تثبيت التطبيق</button>
    {help && <div className="install-help" role="status"><button type="button" aria-label="إغلاق" onClick={() => setHelp(false)}>×</button><strong>تثبيت SchoolCloud</strong><p>على Android افتح القائمة ⋮ ثم «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق». على iPhone استخدم مشاركة ← إضافة إلى الشاشة الرئيسية.</p><p>التثبيت عبر عنوان IP عادي غير مدعوم في معظم المتصفحات. استخدم HTTPS باسم نطاق موثوق، أو localhost للتجربة.</p></div>}
  </div>;
}
