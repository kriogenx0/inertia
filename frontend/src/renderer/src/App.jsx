import { useEffect, useState } from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const styles = {
  status: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100vw",
    height: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    color: "#444",
    gap: "0.5rem"
  }
};

// Poll the backend and, once it's up, navigate the page straight to it. This
// is a top-level navigation rather than an iframe, so it isn't affected by
// the backend's X-Frame-Options: SAMEORIGIN header — and it works the same
// way whether this page is running inside the Electron shell or as a plain
// static site.
export default function App() {
  const [unreachable, setUnreachable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer;

    const check = () => {
      fetch(BACKEND_URL, { method: "HEAD" })
        .then(() => {
          if (!cancelled) window.location.href = BACKEND_URL;
        })
        .catch(() => {
          if (!cancelled) {
            setUnreachable(true);
            timer = setTimeout(check, 2000);
          }
        });
    };
    check();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div style={styles.status}>
      <div>
        {unreachable ? "Inertia backend is not reachable — retrying…" : "Connecting to Inertia…"}
      </div>
      <div>
        Make sure <code>make dev</code> is running in the backend.
      </div>
    </div>
  );
}
