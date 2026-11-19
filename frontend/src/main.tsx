import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
  return <main><header><h1>منصة الإدارة المدرسية</h1><p>School Management SaaS</p></header><section><h2>المرحلة الأولى</h2><p>تأسيس المنصة متعددة المدارس والأنظمة التعليمية.</p><p>القالب التجريبي الأول: العراق — النظام العراقي.</p></section></main>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
