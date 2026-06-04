import { useEffect, useState } from "react";
import "./Hero.css";

interface HeroProps {
  onChat: () => void;
}

export function Hero({ onChat }: HeroProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="hero">
      <div className="hero-grain" />

      <nav className={`hero-nav ${visible ? "visible" : ""}`}>
        <span className="hero-logo">
          <span className="hero-logo-bracket">[</span>
          terminus
          <span className="hero-logo-bracket">]</span>
        </span>
        <div className="hero-nav-pills">
          <span className="hero-pill">v0.1.0</span>
          <span className="hero-pill hero-pill-green">● live</span>
        </div>
      </nav>

      <div className={`hero-main ${visible ? "visible" : ""}`}>
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-line" />
            Coding Agent
            <span className="hero-eyebrow-line" />
          </div>

          <h1 className="hero-title">
            Your codebase.
            <br />
            <span className="hero-title-accent">Understood.</span>
          </h1>

          <button type="button" className="hero-cta" onClick={onChat}>
            <span className="hero-cta-prefix">$</span>
            run terminus
            <span className="hero-cta-arrow">→</span>
          </button>
        </div>

        <div className="hero-media" aria-hidden="true">
          <video
            className="hero-video hero-video--desktop"
            autoPlay
            muted
            loop
            playsInline
            src="/terminal-bg.mp4"
          />
          <video
            className="hero-video hero-video--mobile"
            autoPlay
            muted
            loop
            playsInline
            src="/terminal-bg1.mp4"
          />
          <div className="hero-video-overlay" />
        </div>
      </div>

      <div className="hero-fade-bottom" />
    </section>
  );
}
