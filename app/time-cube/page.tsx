export default function TimeCubePage() {
  return (
    <main style={{ height: "calc(100dvh - 80px)", minHeight: "720px", margin: 0 }}>
      <iframe
        src="/modules/time-cube/index.html"
        title="Куб времени"
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
        allow="autoplay; fullscreen; picture-in-picture"
      />
    </main>
  );
}
