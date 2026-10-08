export default function TimeCubePage() {
  return (
    <div
      style={{
        height: "calc(100dvh - 96px)",
        minHeight: "720px",
        margin: 0,
        width: "100%",
      }}
    >
      <iframe
        src="/modules/time-cube/index.html"
        title="Куб времени"
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
        allow="autoplay; fullscreen; picture-in-picture"
      />
    </div>
  );
}
