export type Role = "owner" | "principal" | "registrar" | "teacher" | "student" | "parent";

export type NavigationItem = {
  key: string;
  label: string;
  icon: string;
};

/** One client-side map for navigation visibility and route checks.
 * API authorization remains authoritative and is enforced by Flask.
 */
export const ROLE_NAVIGATION: Record<Role, NavigationItem[]> = {
  owner: [
    { key: "overview", label: "لوحة المؤسسة", icon: "◫" },
    { key: "schools", label: "المدارس", icon: "▣" },
    { key: "accounts", label: "مديرو المدارس", icon: "♧" },
    { key: "subscriptions", label: "الاشتراكات", icon: "▤" },
  ],
  principal: [
    { key: "overview", label: "لوحة إدارة المدرسة", icon: "◫" },
    { key: "accounts", label: "الموظفون والحسابات", icon: "♧" },
    { key: "students", label: "الطلبة", icon: "♙" },
    { key: "teachers", label: "المدرسون", icon: "♧" },
    { key: "classes", label: "الصفوف والشعب", icon: "▦" },
    { key: "onboarding", label: "العام الدراسي", icon: "▣" },
    { key: "learning", label: "المواد والدرجات", icon: "▤" },
    { key: "attendance", label: "الحضور", icon: "◉" },
  ],
  registrar: [
    { key: "overview", label: "لوحة المعاون", icon: "◫" },
    { key: "students", label: "تسجيل الطلبة", icon: "♙" },
    { key: "classes", label: "الصفوف والشعب", icon: "▦" },
    { key: "onboarding", label: "توزيع الطلبة", icon: "▣" },
    { key: "accounts", label: "حسابات الطلبة والأهالي", icon: "♧" },
    { key: "attendance", label: "الحضور", icon: "◉" },
    { key: "learning", label: "المواد الدراسية", icon: "▤" },
  ],
  teacher: [
    { key: "overview", label: "لوحة المعلم", icon: "◫" },
    { key: "learning", label: "موادي وجدولي والدرجات", icon: "▦" },
    { key: "homework", label: "الواجبات الدراسية", icon: "▤" },
    { key: "profile", label: "ملفي الوظيفي", icon: "♙" },
  ],
  student: [
    { key: "overview", label: "بوابة الطالب", icon: "◫" },
    { key: "learning", label: "الدرجات والجدول", icon: "▦" },
    { key: "attendance", label: "الحضور والغياب", icon: "◉" },
    { key: "homework", label: "الواجبات", icon: "▤" },
  ],
  parent: [
    { key: "overview", label: "بوابة ولي الأمر", icon: "◫" },
    { key: "learning", label: "درجات الأبناء والجدول", icon: "▦" },
    { key: "attendance", label: "حضور الأبناء", icon: "◉" },
    { key: "homework", label: "واجبات الأبناء", icon: "▤" },
  ],
};

export const ROLE_TITLES: Record<Role, string> = {
  owner: "إدارة المؤسسة",
  principal: "إدارة المدرسة",
  registrar: "المعاون / شؤون الطلبة",
  teacher: "المعلم",
  student: "الطالب",
  parent: "ولي الأمر",
};

export function isRole(value: string): value is Role {
  return Object.prototype.hasOwnProperty.call(ROLE_NAVIGATION, value);
}

export function canAccessPage(role: string, page: string): boolean {
  if (page === "notifications") return isRole(role);
  return isRole(role) && ROLE_NAVIGATION[role].some((item) => item.key === page);
}
