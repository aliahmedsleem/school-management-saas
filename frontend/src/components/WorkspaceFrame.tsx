import { useEffect, useRef } from "react";
import RolePortal from "./RolePortal";
import InstallApp from "./InstallApp";
import { ROLE_NAVIGATION, ROLE_TITLES, type Role } from "../access";
import { NotificationBadge } from "./NotificationProvider";

type Props = { role: Role | null; page: string; menu: boolean; onPage: (page: string) => void; onMenu: (open: boolean) => void; onRole: (role: string) => void; showLogin: boolean; onBack: () => void };

export default function WorkspaceFrame({ role, page, menu, onPage, onMenu, onRole, showLogin, onBack }: Props) {
  const menuButton = useRef<HTMLButtonElement>(null);
  const items = role ? [...ROLE_NAVIGATION[role], { key: "notifications", label: "الإشعارات", icon: "◉" }] : [];
  const currentItem = items.find((item) => item.key === page);

  useEffect(() => {
    if (!menu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onMenu(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      menuButton.current?.focus();
    };
  }, [menu, onMenu]);

  return <div className="shell" dir="rtl">
    <aside id="workspace-navigation" className={`sidebar ${menu ? "open" : ""}`} aria-label="القائمة الجانبية">
      <div className="brand"><div className="brandmark" aria-hidden="true">S</div><div><strong>SchoolCloud</strong><small>إدارة المدارس</small></div></div>
      <div className="nav-label">{role ? ROLE_TITLES[role] : "تسجيل الدخول"}</div>
      <nav aria-label="القائمة الرئيسية">
        {items.map((item) => <button key={item.key} className={`nav-item ${page === item.key ? "selected" : ""}`}
          aria-current={page === item.key ? "page" : undefined}
          onClick={() => { onPage(item.key); onMenu(false); }}>
          <span className="nav-icon" aria-hidden="true">{item.icon}</span><span className="nav-item-label">{item.label}</span>
          {item.key === "notifications" && <NotificationBadge/>}
        </button>)}
      </nav>
      {!role && <p className="sidebar-hint">تظهر الصفحات المصرح بها فقط بعد تسجيل الدخول.</p>}
    </aside>
    {menu && <button className="sidebar-scrim" aria-label="إغلاق القائمة" onClick={() => onMenu(false)}/>}
    <main className="content">
      <header className="topbar">
        <div className="topbar-title"><strong>{currentItem?.label || (role ? ROLE_TITLES[role] : "SchoolCloud")}</strong>
          <small>{role === "owner" ? "إدارة المدارس والاشتراكات والحسابات" : "مساحة العمل المدرسية"}</small></div>
        <div className="topbar-actions">
          {role && <button type="button" className="topbar-notifications" onClick={() => onPage("notifications")} aria-label="فتح الإشعارات">
            <span aria-hidden="true">◉</span><NotificationBadge/>
          </button>}
          <InstallApp/>
          <button ref={menuButton} className="menu-toggle" onClick={() => onMenu(!menu)} aria-label={menu ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={menu} aria-controls="workspace-navigation">☰</button>
        </div>
      </header>
      {!role && showLogin && <button className="public-back" onClick={onBack}>← العودة إلى الصفحة الرئيسية</button>}
      <RolePortal page={page} onRole={onRole} onNavigate={onPage}/>
      <footer>SchoolCloud · نسخة اختبار · يمنع استخدام بيانات مدرسية حقيقية قبل اعتماد الحماية والاختبارات</footer>
    </main>
  </div>;
}
