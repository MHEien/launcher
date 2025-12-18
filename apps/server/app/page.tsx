export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Launcher API Server</h1>
      <p>This is an API-only server. All endpoints are available under <code>/api</code>.</p>
      <p>
        <a href="/api" style={{ color: "#0070f3" }}>
          View API status →
        </a>
      </p>
    </main>
  );
}

