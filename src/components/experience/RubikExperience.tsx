"use client";

import { useEffect, useRef, useState } from "react";
import type { ExperienceTheme } from "./ToothExperience";
import styles from "./experience.module.css";
import { createSceneClock } from "./engines/scene-clock";

export interface RubikExperienceProps {
  className?: string;
  theme?: ExperienceTheme;
  locale?: string;
}

interface RubikScene {
  update: (now: number, delta: number) => void;
  resize: () => void;
  dispose: () => void;
  setReducedMotion: (value: boolean) => void;
  setFinish: (value: string) => void;
  setVisible: (value: boolean) => void;
}

/** The supplied exact-lattice Rubik model, with its original tooth mount. */
export default function RubikExperience({ className = "", theme = "dark", locale = "fa" }: RubikExperienceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<RubikScene | null>(null);
  const themeRef = useRef(theme);
  const [state, setState] = useState<"loading" | "ready" | "fallback">("loading");
  const language = locale.startsWith("fa") ? "fa" : locale.startsWith("ar") ? "ar" : locale.startsWith("tr") ? "tr" : locale.startsWith("ru") ? "ru" : "en";
  const labels = {
    fa: { hint: "با کشیدن وجه‌ها، لایه‌ها را بچرخانید؛ با کشیدن دندان، زاویه دید را تغییر دهید.", aria: "مکعب شیشه‌ای تعاملی ایده‌آل ماکو با دندان سه‌بعدی. با ماوس یا کلیدهای جهت تعامل کنید.", fallback: "نمای مفهومی طراحی و دقت" },
    en: { hint: "Drag a face to turn a layer. Drag the tooth to orbit.", aria: "Interactive Ideal Makoo glass cube with a three-dimensional tooth. Use your pointer or arrow keys.", fallback: "Design and precision illustration" },
    ar: { hint: "اسحب الوجه لتدوير الطبقة؛ واسحب السن لتغيير زاوية الرؤية.", aria: "مكعب إيديال ماكو الزجاجي التفاعلي مع سن ثلاثي الأبعاد. تفاعل بالمؤشر أو مفاتيح الأسهم.", fallback: "رسم توضيحي للتصميم والدقة" },
    tr: { hint: "Katmanı döndürmek için bir yüzü sürükleyin. Görüşü döndürmek için dişi sürükleyin.", aria: "Üç boyutlu dişle etkileşimli Ideal Makoo cam küpü. İşaretçiyi veya ok tuşlarını kullanın.", fallback: "Tasarım ve hassasiyet görseli" },
    ru: { hint: "Перетащите грань, чтобы повернуть слой. Перетащите зуб, чтобы изменить ракурс.", aria: "Интерактивный стеклянный куб Ideal Makoo с трёхмерным зубом. Используйте указатель или стрелки.", fallback: "Иллюстрация дизайна и точности" },
  }[language];

  useEffect(() => {
    themeRef.current = theme;
    controllerRef.current?.setFinish(theme === "light" ? "Glass" : "Neon");
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    let disposed = false;
    let failed = false;
    let loading = false;
    let inViewport = false;
    let frameId = 0;
    const clock = createSceneClock();
    let scene: RubikScene | null = null;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");

    const fail = () => {
      if (disposed) return;
      failed = true;
      cancelAnimationFrame(frameId);
      frameId = 0;
      scene?.setVisible(false);
      setState("fallback");
    };
    const frame = (now: number) => {
      frameId = 0;
      if (disposed || failed || !inViewport || document.hidden || !scene) return;
      const next = clock.frame(now, motion.matches);
      if (next) {
        try { scene.update(next.time, next.delta); } catch { fail(); return; }
      }
      frameId = requestAnimationFrame(frame);
    };
    const updateVisibility = () => {
      clock.setVisible(inViewport && !document.hidden && !failed);
      scene?.setVisible(inViewport && !document.hidden && !failed);
      if (!inViewport || document.hidden || failed) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      } else if (scene && !frameId) frameId = requestAnimationFrame(frame);
    };
    const initialise = async () => {
      if (loading || disposed || failed) return;
      loading = true;
      try {
        const { initRubik } = await import("./engines/rubik");
        if (disposed) return;
        scene = initRubik(canvas, {
          controlsRoot: container,
          bindControls: false,
          maxPixelRatio: 1.5,
          toothQuality: "high",
          autoRotate: true,
          reducedMotion: motion.matches,
          finish: themeRef.current === "light" ? "Glass" : "Neon",
        }) as unknown as RubikScene;
        controllerRef.current = scene;
        setState("ready");
        updateVisibility();
      } catch { fail(); }
    };
    const onMotion = () => scene?.setReducedMotion(motion.matches);
    const onResize = () => scene?.resize();
    const onContextLost = (event: Event) => { event.preventDefault(); fail(); };
    const intersection = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      if (inViewport) void initialise();
      updateVisibility();
    }, { rootMargin: "160px" });
    const resize = new ResizeObserver(onResize);
    intersection.observe(container);
    resize.observe(container);
    document.addEventListener("visibilitychange", updateVisibility);
    motion.addEventListener("change", onMotion);
    canvas.addEventListener("webglcontextlost", onContextLost);
    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      intersection.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", updateVisibility);
      motion.removeEventListener("change", onMotion);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      scene?.dispose();
      if (controllerRef.current === scene) controllerRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} className={`${styles.experience} ${styles.cube} ${className}`} data-theme={theme} data-scene-state={state} data-variant="rubik">
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.halo} aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={labels.aria} tabIndex={state === "ready" ? 0 : -1} aria-hidden={state !== "ready"} />
      {state !== "ready" && (
        <div className={styles.fallback} role="img" aria-label={labels.fallback}>
          <div className={styles.cubeFallback} aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} />)}</div>
        </div>
      )}
      <span className={styles.hint}><span className={styles.hintDot} aria-hidden="true" />{state === "fallback" ? labels.fallback : labels.hint}</span>
    </div>
  );
}
