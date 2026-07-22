import { useEffect, useState } from "react";
import { FiCheck, FiCpu, FiFileText } from "react-icons/fi";

const fallbackDestination = () => ({
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
});

const getAnimationPoints = () => {
  const source = {
    x: Math.max(56, window.innerWidth - 76),
    y: Math.max(96, window.innerHeight - 104),
  };
  const target = document.querySelector('[data-ai-request-target="request-history"]');
  const rect = target?.getBoundingClientRect();
  const rawDestination = rect?.width && rect?.height
    ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    : fallbackDestination();
  const horizontalEdge = Math.min(176, window.innerWidth / 2);
  const verticalEdge = Math.min(112, window.innerHeight / 2);
  const destination = {
    x: Math.min(Math.max(rawDestination.x, horizontalEdge), window.innerWidth - horizontalEdge),
    y: Math.min(Math.max(rawDestination.y, verticalEdge), window.innerHeight - verticalEdge),
  };
  const notificationAnchor = document.querySelector('[data-ai-notification-anchor="account"]');
  const notificationRect = notificationAnchor?.getBoundingClientRect();
  const notification = notificationRect?.width && notificationRect?.height
    ? {
        right: Math.max(16, window.innerWidth - notificationRect.right),
        top: Math.max(72, notificationRect.bottom + 8),
      }
    : { right: 24, top: 80 };

  return { source, destination, notification };
};

const AiRequestSuccessAnimation = ({ request, onComplete }) => {
  const [phase, setPhase] = useState("writing");
  const [points, setPoints] = useState(null);

  useEffect(() => {
    if (!request) return undefined;

    setPhase("writing");
    const frame = window.requestAnimationFrame(() => setPoints(getAnimationPoints()));
    const timers = [
      window.setTimeout(() => setPhase("flying"), 850),
      window.setTimeout(() => setPhase("saving"), 1650),
      window.setTimeout(() => setPhase("success"), 2450),
      window.setTimeout(onComplete, 4400),
    ];

    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach(window.clearTimeout);
    };
  }, [onComplete, request]);

  if (!request) return null;

  const source = points?.source || { x: window.innerWidth - 76, y: window.innerHeight - 104 };
  const destination = points?.destination || fallbackDestination();
  const notification = points?.notification || { right: 24, top: 80 };
  const isNewRequest = request.created !== false;
  const requestLabel = request.type === "leave" ? "leave request" : "request";

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" aria-live="polite">
      {phase === "writing" && (
        <>
          <span className="ai-recording-backdrop" aria-hidden />
          <div className="ai-recording-status" style={{ left: destination.x, top: destination.y }}>
            <span className="ai-recording-bot"><FiCpu className="h-5 w-5" aria-hidden /></span>
            <div>
              <p>AI is recording your {requestLabel}</p>
              <span>Adding it to Request History</span>
            </div>
            <span className="ai-recording-dots"><i /><i /><i /></span>
          </div>
        </>
      )}

      {(phase === "flying" || phase === "saving") && (
        <span
          className="ai-record-target"
          style={{ left: destination.x - 28, top: destination.y - 28 }}
          aria-hidden
        />
      )}

      {phase === "flying" && (
        <span
          className="ai-request-flight"
          style={{
            left: source.x - 24,
            top: source.y - 24,
            "--flight-x": `${destination.x - source.x}px`,
            "--flight-y": `${destination.y - source.y}px`,
          }}
          aria-hidden
        >
          <FiFileText className="h-6 w-6" />
        </span>
      )}

      {phase === "saving" && (
        <div className="ai-save-status" style={{ right: notification.right, top: notification.top }}>
          <span className="ai-save-spinner" aria-hidden />
          <span>Adding to Request History...</span>
        </div>
      )}

      {phase === "success" && (
        <div className="ai-request-success" style={{ right: notification.right, top: notification.top }}>
          <span className="ai-request-success-icon"><FiCheck className="h-5 w-5" aria-hidden /></span>
          <div>
            <p>{isNewRequest ? "Request recorded" : "Request already up to date"}</p>
            <span>{isNewRequest ? "Your request is now pending approval." : "Your existing pending request is still active."}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiRequestSuccessAnimation;
