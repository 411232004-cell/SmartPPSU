"use client";

import { useRef, useState } from "react";

// Send button animation (desain Send-Button-Animation)
// onSend dipanggil saat klik; animasi berjalan penuh lalu status "Terkirim!"
export default function SendButton({
  onSend,
  label = "Kirim",
  sentLabel = "Terkirim!",
}: {
  onSend?: () => void | Promise<void>;
  label?: string;
  sentLabel?: string;
}) {
  const stageRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const planeRef = useRef<SVGSVGElement>(null);
  const backRef = useRef<SVGSVGElement>(null);
  const arcRef = useRef<SVGSVGElement>(null);
  const checkRef = useRef<SVGSVGElement>(null);
  const sentRef = useRef<HTMLDivElement>(null);
  const sentTextRef = useRef<HTMLSpanElement>(null);
  const rippleRef = useRef<HTMLSpanElement>(null);
  const animsRef = useRef<Animation[]>([]);
  const [state, setState] = useState<"idle" | "running" | "done">("idle");

  const play = (
    el: Element | null | undefined,
    frames: Keyframe[],
    o: KeyframeAnimationOptions & { delay?: number }
  ) => {
    if (!el) return null as unknown as Animation;
    const reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    const k = reduced ? 0 : 1.7;
    const a = el.animate(frames, {
      fill: "forwards",
      easing: "cubic-bezier(.45,0,.25,1)",
      ...o,
      duration: (o.duration as number) * k,
      delay: ((o.delay as number) || 0) * k,
    });
    animsRef.current.push(a);
    return a;
  };

  const send = async (e: React.MouseEvent) => {
    setState("running");
    onSend?.();

    const pill = pillRef.current!;
    const r = pill.getBoundingClientRect();
    const rx = e.detail ? e.clientX - r.left : r.width / 2;
    const ry = e.detail ? e.clientY - r.top : r.height / 2;
    const ripple = rippleRef.current!;
    ripple.style.left = `${rx}px`;
    ripple.style.top = `${ry}px`;

    play(ripple, [
      { transform: "translate(-50%,-50%) scale(.3)", opacity: 0.9 },
      { transform: "translate(-50%,-50%) scale(1.8)", opacity: 0 },
    ], { duration: 450 });

    play(pill, [
      { transform: "scale(1)" },
      { transform: "scale(.95,.9)" },
      { transform: "scale(1)" },
    ], { duration: 220 });
    play(labelRef.current, [
      { transform: "scale(1)", opacity: 1 },
      { transform: "scale(.4)", opacity: 0 },
    ], { delay: 80, duration: 260 });

    play(planeRef.current, [
      { transform: "translate(-54px,0) rotate(0deg) scale(1)", opacity: 1 },
      { transform: "translate(-40px,-64px) rotate(8deg) scale(1.15)", opacity: 1, offset: 0.4 },
      { transform: "translate(130px,-150px) rotate(25deg) scale(.6)", opacity: 0 },
    ], { delay: 100, duration: 520 });

    play(pill, [
      { width: "200px", height: "58px", borderRadius: "12px", transform: "rotate(0deg)" },
      { width: "214px", height: "48px", borderRadius: "10px", transform: "rotate(-7deg)", offset: 0.3 },
      { width: "112px", height: "72px", borderRadius: "30px", transform: "rotate(7deg)", offset: 0.65 },
      { width: "76px", height: "76px", borderRadius: "38px", transform: "rotate(0deg)" },
    ], { delay: 300, duration: 650 });

    play(backRef.current, [
      { transform: "translate(120px,-90px) rotate(170deg) scale(.6)", opacity: 0 },
      { transform: "translate(105px,-40px) rotate(185deg) scale(1)", opacity: 1, offset: 0.2 },
      { transform: "translate(70px,45px) rotate(225deg) scale(1.15)", opacity: 1, offset: 0.5 },
      { transform: "translate(0px,74px) rotate(300deg) scale(1.15)", opacity: 1, offset: 0.78 },
      { transform: "translate(0px,26px) rotate(360deg) scale(.55)", opacity: 0 },
    ], { delay: 480, duration: 720 });
    play(arcRef.current, [
      { transform: "rotate(-100deg)", opacity: 0 },
      { transform: "rotate(20deg)", opacity: 1, offset: 0.35 },
      { transform: "rotate(200deg)", opacity: 0 },
    ], { delay: 450, duration: 800 });

    play(checkRef.current, [
      { transform: "translateY(44px) rotate(-12deg) scale(.7)", opacity: 0 },
      { opacity: 1, offset: 0.25 },
      { transform: "translateY(0) rotate(0deg) scale(1)", opacity: 1 },
    ], { delay: 1150, duration: 450, easing: "cubic-bezier(.34,1.56,.64,1)" });

    play(pill, [
      { transform: "scale(1)", borderRadius: "38px" },
      { transform: "scale(1.14,.84)", borderRadius: "46% 54% 42% 58% / 58% 42% 58% 42%", offset: 0.25 },
      { transform: "scale(.9,1.12)", borderRadius: "56% 44% 54% 46% / 44% 56% 44% 56%", offset: 0.5 },
      { transform: "scale(1.05,.96)", borderRadius: "44% 56% 48% 52% / 52% 48% 56% 44%", offset: 0.75 },
      { transform: "scale(1)", borderRadius: "38px" },
    ], { delay: 1100, duration: 700, easing: "ease-in-out" });

    play(bodyRef.current, [
      { transform: "translateX(0)" },
      { transform: "translateX(-66px)" },
    ], { delay: 1800, duration: 520, easing: "cubic-bezier(.5,0,.2,1)" });
    play(sentRef.current, [
      { transform: "translateX(19px) scaleX(0)" },
      { transform: "translateX(19px) scaleX(1)" },
    ], { delay: 1800, duration: 520, easing: "cubic-bezier(.5,0,.2,1)" });
    play(sentTextRef.current, [
      { opacity: 0, transform: "translateX(-10px)" },
      { opacity: 1, transform: "translateX(0)" },
    ], { delay: 2150, duration: 300 });

    Promise.all(animsRef.current.map((a) => a.finished))
      .then(() => setState("done"))
      .catch(() => {});
  };

  const reset = () => {
    animsRef.current.forEach((a) => a.cancel());
    animsRef.current = [];
    setState("idle");
  };

  return (
    <button
      ref={stageRef}
      type="button"
      className="send-stage"
      aria-label={state === "done" ? sentLabel : label}
      onClick={(e) => {
        if (state === "idle") send(e);
        else if (state === "done") reset();
      }}
    >
      <svg ref={arcRef} className="arc" viewBox="0 0 170 170" aria-hidden="true">
        <circle cx="85" cy="85" r="64" />
      </svg>
      <div ref={sentRef} className="sent" aria-hidden="true">
        <span ref={sentTextRef}>{sentLabel}</span>
      </div>
      <div ref={bodyRef} className="body">
        <div ref={pillRef} className="pill">
          <span ref={labelRef} className="label">
            {label}
          </span>
          <svg ref={checkRef} className="check" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5.4 12.3 10.1 17 18.7 7" />
          </svg>
          <span ref={rippleRef} className="ripple" />
        </div>
      </div>
      <svg ref={planeRef} className="plane" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 3 3 10.5l7.5 3 3 7.5z" />
      </svg>
      <svg ref={backRef} className="plane-back" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2 21 21 12 16.5 3 21z" />
        <path className="crease" d="M12 6.5V15.5" />
      </svg>
    </button>
  );
}
