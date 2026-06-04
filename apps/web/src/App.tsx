import { useState } from "react";
import { Hero } from "./components/Hero";
import { Chat } from "./components/Chat";
import "./index.css";

type View = "hero" | "chat";

export default function App() {
  const [view, setView] = useState<View>("hero");

  return (
    <main className="app">
      {view === "hero" ? (
        <Hero onChat={() => setView("chat")} />
      ) : (
        <Chat onBack={() => setView("hero")} />
      )}
    </main>
  );
}
