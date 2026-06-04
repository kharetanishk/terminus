import { useState } from "react";
import { Hero } from "./components/Hero";
import { Terminal } from "./components/Terminal";
import "./index.css";

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <main className="app">
      {!started ? (
        <Hero onStart={() => setStarted(true)} />
      ) : (
        <Terminal onBack={() => setStarted(false)} />
      )}
    </main>
  );
}
