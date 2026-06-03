import { useCallback, useEffect, useRef, useState } from "react";

export default function SlideButton({
  onConfirm,
  disabled = false,
  label = "Slide to Check",
}) {
  const trackRef = useRef(null);
  const handleRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [trackW, setTrackW] = useState(0);

  useEffect(() => {
    const updateTrackWidth = () => {
      if (trackRef.current) {
        setTrackW(trackRef.current.getBoundingClientRect().width);
      }
    };

    updateTrackWidth();
    window.addEventListener("resize", updateTrackWidth);
    return () => window.removeEventListener("resize", updateTrackWidth);
  }, []);

  const resetSlider = useCallback(() => {
    setDragX(0);
    setDragging(false);
  }, []);

  const handleConfirm = useCallback(() => {
    const track = trackRef.current;
    const handle = handleRef.current;
    if (track && handle) {
      const maxX =
        track.getBoundingClientRect().width -
        handle.getBoundingClientRect().width -
        4;
      setDragX(maxX);
      onConfirm?.();
      setTimeout(resetSlider, 700);
    }
  }, [onConfirm, resetSlider]);

  useEffect(() => {
    const handle = handleRef.current;
    const track = trackRef.current;
    if (!handle || !track || disabled) return;

    let startX = 0;
    let currentDragX = 0;

    const onPointerDown = (e) => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      startX = e.clientX;
      currentDragX = dragX;
      setDragging(true);
    };

    const onPointerMove = (e) => {
      if (!dragging) return;

      const rect = track.getBoundingClientRect();
      const handleRect = handle.getBoundingClientRect();
      const max = rect.width - handleRect.width - 4;

      let newX = currentDragX + (e.clientX - startX);
      newX = Math.min(max, Math.max(0, newX));

      setDragX(newX);
    };

    const onPointerUp = () => {
      if (!dragging) return;

      const rect = track.getBoundingClientRect();
      const threshold = rect.width * 0.65;

      if (dragX >= threshold) {
        handleConfirm();
      } else {
        resetSlider();
      }
    };

    handle.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      handle.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragging, dragX, disabled, handleConfirm, resetSlider]);

  const progress = trackW
    ? Math.min(100, Math.round((dragX / trackW) * 100))
    : 0;

  return (
    <div
      ref={trackRef}
      className={`relative h-14 overflow-hidden rounded-full ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
      style={{
        background: "linear-gradient(90deg, #eeeeee 0%, #dddddd 100%)",
        boxShadow:
          "inset 0 1px 3px rgba(15, 23, 42, 0.08), 0 12px 24px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center px-16 text-center text-sm font-semibold text-emerald-800 select-none">
        {dragX >= trackW * 0.65 ? "Verified" : label}
      </div>

      <div
        className="absolute bottom-0 left-0 top-0 rounded-full transition-all duration-75"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(90deg, #0f7a41 0%, #0f6f3a 100%)",
          opacity: 0.16,
        }}
      />

      <div
        ref={handleRef}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging
            ? "none"
            : "transform 0.2s cubic-bezier(0.2, 0.9, 0.4, 1.1)",
        }}
        className={`absolute left-0 top-0 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-800 text-white shadow-[0_14px_28px_rgba(15,111,58,0.28)] touch-none ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {dragX >= trackW * 0.65 ? (
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 6L9 17L4 12"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13 5L20 12L13 19M5 5L12 12L5 19"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
