export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "1rem",
        background: "#0f172a",
        color: "white",
      }}
    >
      <img
        src="/ben-head.png"
        alt="Ben"
        style={{ width: 120 }}
      />

      <h1>Welcome Back</h1>

      <p>Login page temporarily restored.</p>

      <a
        href="/signup"
        style={{
          padding: "12px 20px",
          borderRadius: 12,
          background: "#22c55e",
          color: "white",
          textDecoration: "none",
        }}
      >
        Go To Signup
      </a>
    </main>
  );
}
