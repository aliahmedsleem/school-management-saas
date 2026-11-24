import { useEffect, useRef } from "react";
import { useNotifications } from "./NotificationProvider";

/** Reads notifications from the shared inbox poller; it does not make another API request. */
export default function NotificationVoiceListener() {
  const { items, loaded } = useNotifications();
  const initialized = useRef(false);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!loaded) return;
    const fresh = items.filter((notice) => !notice.read_at && !seen.current.has(notice.id));
    if (initialized.current && fresh.length && localStorage.getItem("schoolcloud_voice_enabled") === "yes"
        && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
      const speech = new SpeechSynthesisUtterance(fresh[0].body);
      speech.lang = "ar-IQ";
      speech.rate = 0.92;
      const voices = window.speechSynthesis.getVoices();
      speech.voice = voices.find((voice) => voice.lang.toLowerCase() === "ar-iq")
        || voices.find((voice) => voice.lang.toLowerCase().startsWith("ar")) || null;
      window.speechSynthesis.speak(speech);
    }
    seen.current = new Set(items.map((notice) => notice.id));
    initialized.current = true;
  }, [items, loaded]);

  useEffect(() => () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);
  return null;
}
