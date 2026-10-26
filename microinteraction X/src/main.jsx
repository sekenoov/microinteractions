import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  motion,
  AnimatePresence,
  MotionConfig,
  useReducedMotion,
} from "motion/react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Play,
  RotateCcw,
  Maximize2,
  X,
  Check,
  Copy,
  GitBranch,
  Paperclip,
  Send,
  Plus,
  BookOpen,
  Link2,
  CheckCheck,
  Volume2,
  VolumeX,
  Command,
  Minus,
  CornerDownLeft,
} from "lucide-react";
import { studies } from "./studies";
import "./style.css";

const spring = { type: "spring", stiffness: 400, damping: 32 };
const pad = (n) => String(n).padStart(2, "0");
function Glyph({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 24V8l11 16V8l11 16V8"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function SmallLabel({ children }) {
  return <div className="small-label">{children}</div>;
}
function Card({ children, className = "", ...props }) {
  return (
    <motion.div className={`paper ${className}`} {...props}>
      {children}
    </motion.div>
  );
}
function Slider({
  value,
  onChange,
  label = "Interaction progress",
  left = "Before",
  right = "After",
}) {
  return (
    <div className="slider-wrap">
      <div className="slider-labels">
        <span>{left}</span>
        <span>{right}</span>
      </div>
      <input
        aria-label={label}
        type="range"
        min="0"
        max="100"
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
      />
    </div>
  );
}
function Demo({ id, p, setP, playing }) {
  const [direction, setDirection] = useState("");
  const peelDrag = useRef(null);
  const active = id === "commit" ? p >= 1 : p > 0.5,
    toggle = () => setP(active ? 0 : 1),
    hold = useRef(null),
    start = useRef(0);
  useEffect(() => () => cancelAnimationFrame(hold.current), []);
  function begin(e) {
    if (active || playing) return;
    e.preventDefault();
    start.current = performance.now();
    const tick = (t) => {
      let v = Math.min((t - start.current) / 1200, 1);
      setP(v);
      if (v < 1) hold.current = requestAnimationFrame(tick);
    };
    hold.current = requestAnimationFrame(tick);
  }
  function end() {
    cancelAnimationFrame(hold.current);
    if (p < 1) setP(0);
  }
  if (id === "peel")
    return (
      <div className="peel-scene">
        <div className="source-sheet">
          <SmallLabel>
            <BookOpen size={14} /> ORIGINAL NOTE · EXAMPLE
          </SmallLabel>
          <p>
            “The best interface is the one that helps you stay with your
            thought.”
          </p>
          <div className="source-footer">
            <span>Design notebook</span>
            <span>
              Page 04 <ArrowUpRight size={13} />
            </span>
          </div>
        </div>
        <motion.div
          className="answer-sheet"
          style={{
            clipPath:
              p <= 0.5
                ? `polygon(0 0,100% 0,100% ${100 - p * 200}%,${100 - p * 200}% 100%,0 100%)`
                : `polygon(0 0,${200 - p * 200}% 0,0 ${200 - p * 200}%)`,
          }}
        >
          <div className="answer-top">
            <Glyph size={20} />
            <span>A thought on good interfaces</span>
          </div>
          <h3>
            Less interface.
            <br />
            More <span>thought.</span>
          </h3>
          <p>The best tools leave room for what you came to do.</p>
          <div className="answer-bottom">
            <span>1 source underneath</span>
            <ArrowUpRight size={14} />
          </div>
        </motion.div>
        <motion.button
          aria-label="Peel answer to reveal source"
          className="peel-handle"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            peelDrag.current = { x: e.clientX, p, moved: false };
          }}
          onPointerMove={(e) => {
            let d = peelDrag.current;
            if (!d) return;
            if (Math.abs(e.clientX - d.x) > 4) d.moved = true;
            if (d.moved)
              setP(Math.max(0, Math.min(1, d.p + (d.x - e.clientX) / 220)));
          }}
          onPointerUp={() => {
            let d = peelDrag.current;
            peelDrag.current = null;
            if (d?.moved) setP(p > 0.5 ? 1 : 0);
            else toggle();
          }}
          onPointerCancel={() => {
            peelDrag.current = null;
          }}
          onClick={(e) => {
            if (e.detail === 0) toggle();
          }}
          animate={{
            x: -p * 276,
            y: -p * 187,
            rotate: active ? -12 : 0,
            scale: 1 - p * 0.3,
          }}
        >
          <ArrowUpRight size={23} />
        </motion.button>
        <div className="peel-slider">
          <Slider
            value={p}
            onChange={setP}
            label="Reveal source"
            left="The answer"
            right="The source"
          />
        </div>
      </div>
    );
  if (id === "branch")
    return (
      <div className="branch-scene">
        <motion.button
          className="thought-root"
          onClick={toggle}
          animate={{ y: active ? -95 : 0 }}
        >
          <span className="tiny-icon">
            <GitBranch size={19} />
          </span>
          <SmallLabel>START WITH A QUESTION</SmallLabel>
          <h3>
            What if we
            <br />
            went another way?
          </h3>
          <span className="inline-action">
            {active ? "Bring it back" : "Split the thought"} <Plus size={16} />
          </span>
        </motion.button>
        <svg className="branch-lines" viewBox="0 0 460 210">
          <motion.path
            d="M230 20 V75 Q230 95 210 95 H130 Q110 95 110 115 V150 M230 75 Q230 95 250 95 H330 Q350 95 350 115 V150"
            fill="none"
            stroke="#002fa7"
            strokeWidth="1.5"
            animate={{ pathLength: active ? 1 : 0, opacity: active ? 1 : 0 }}
            transition={{ duration: 0.45 }}
          />
        </svg>
        <AnimatePresence>
          {active && (
            <motion.div
              className="branch-options"
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <button
                className={direction === "a" ? "chosen" : ""}
                onClick={() => setDirection(direction === "a" ? "" : "a")}
                aria-pressed={direction === "a"}
              >
                <span>Direction A</span>
                <strong>Make it simpler.</strong>
                <ArrowUpRight size={17} />
                {direction === "a" && (
                  <p>
                    One clear action.
                    <br />
                    Nothing extra.
                  </p>
                )}
              </button>
              <button
                className={direction === "b" ? "chosen" : ""}
                onClick={() => setDirection(direction === "b" ? "" : "b")}
                aria-pressed={direction === "b"}
              >
                <span>Direction B</span>
                <strong>Make it stranger.</strong>
                <ArrowUpRight size={17} />
                {direction === "b" && (
                  <p>
                    A new gesture.
                    <br />
                    Same intention.
                  </p>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  if (id === "context")
    return (
      <div className="context-scene">
        {["Research.md", "Voice notes", "References"].map((s, i) => (
          <motion.div
            className="context-note"
            key={s}
            animate={{
              x: active ? (i - 1) * 120 : [-130, 115, -30][i],
              y: active ? 58 : [-115, -95, -40][i],
              rotate: active ? 0 : [-12, 9, -4][i],
              scale: active ? 0.73 : 1,
            }}
          >
            <Paperclip size={15} />
            <span>{s}</span>
          </motion.div>
        ))}
        <Card className="prompt-box">
          <SmallLabel>YOUR NEXT IDEA</SmallLabel>
          <h3>Where do we start?</h3>
          <div className="prompt-bottom">
            <span>
              {active ? "3 notes attached" : "Give your thought some context"}
            </span>
            <button
              aria-label="Gather context"
              className="blue-icon"
              onClick={toggle}
            >
              {active ? <Check size={18} /> : <Plus size={18} />}
            </button>
          </div>
        </Card>
      </div>
    );
  if (id === "commit")
    return (
      <div className="commit-scene">
        <div className="envelope">
          <motion.div animate={{ y: active ? 22 : 0, opacity: active ? 0 : 1 }}>
            <SmallLabel>A NOTE, READY TO GO</SmallLabel>
            <p>
              Let’s make something
              <br />
              worth paying attention to.
            </p>
          </motion.div>
          <AnimatePresence>
            {active && (
              <motion.div
                className="sent-mark"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <Check size={32} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          className={`hold-button ${active ? "complete" : ""}`}
          onPointerDown={begin}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) begin(e);
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") end();
          }}
          onBlur={end}
          onClick={() => {
            if (active) setP(0);
          }}
        >
          <span className="hold-fill" style={{ transform: `scaleX(${p})` }} />
          <span>
            {active ? <Check size={18} /> : <Send size={18} />}{" "}
            {active ? "Sent · reset" : "Hold to send"}
          </span>
          <span>{active ? "Done" : "1.2 s"}</span>
        </button>
        <p className="under-control">
          {active
            ? "A little intention goes a long way."
            : "Release early to cancel."}
        </p>
      </div>
    );
  if (id === "focus")
    return (
      <div className={`focus-scene ${active ? "focused" : ""}`}>
        <SmallLabel>A NOTE ON ATTENTION</SmallLabel>
        <motion.p
          animate={{ opacity: active ? 0.18 : 0.55, y: active ? -18 : 0 }}
        >
          We open another tab. Follow another link.
          <br />
          Somewhere along the way, we lose the idea.
        </motion.p>
        <button className="focus-line" onClick={toggle}>
          <motion.span
            animate={{
              color: active ? "#002fa7" : "#151619",
              scale: active ? 1.03 : 1,
            }}
          >
            Make room for
            <br />
            one good thought.
          </motion.span>
        </button>
        <motion.p
          animate={{ opacity: active ? 0.18 : 0.55, y: active ? 18 : 0 }}
        >
          Maybe the interface could do a little less.
          <br />
          And help us stay a little longer.
        </motion.p>
        <div className="focus-bracket top" />
        <div className="focus-bracket bottom" />
      </div>
    );
  if (id === "tone") {
    let step = Math.min(2, Math.floor(p * 2.99));
    return (
      <div className="tone-scene">
        <div className="tone-dial">
          <div className="dial-ticks">
            {Array.from({ length: 25 }, (_, i) => (
              <i
                key={i}
                style={{
                  transform: `rotate(${-120 + i * 10}deg) translateY(-64px)`,
                }}
              />
            ))}
          </div>
          <motion.div
            className="dial-knob"
            animate={{ rotate: -120 + p * 240 }}
          >
            <i />
          </motion.div>
          <span>{["Formal", "Clear", "Warm"][step]}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="tone-text"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {
              [
                "I would appreciate your feedback.",
                "What do you think?",
                "Would love to hear your thoughts.",
              ][step]
            }
          </motion.div>
        </AnimatePresence>
        <Slider
          value={p}
          onChange={setP}
          label="Message tone"
          left="Straight to business"
          right="A little warmer"
        />
      </div>
    );
  }
  if (id === "bookmark")
    return (
      <div className="bookmark-scene">
        <Card className="book-page">
          <SmallLabel>THOUGHT NO. 07</SmallLabel>
          <h3>
            Good ideas
            <br />
            deserve a<br />
            <span>way back.</span>
          </h3>
          <div className="text-lines">
            <i />
            <i />
            <i />
          </div>
          <button
            className={`fold-corner ${active ? "folded" : ""}`}
            aria-label={active ? "Remove bookmark" : "Bookmark this page"}
            aria-pressed={active}
            onClick={toggle}
          >
            <motion.div animate={{ rotateY: active ? -165 : 0 }} />
          </button>
        </Card>
        <motion.div
          className="bookmark-label"
          animate={{ opacity: active ? 1 : 0, y: active ? 0 : -15 }}
        >
          <Check size={14} /> Saved for later
        </motion.div>
      </div>
    );
  if (id === "undo")
    return (
      <div className="undo-scene">
        <motion.div
          animate={{
            scaleY: active ? 0.018 : 1,
            scaleX: active ? 0.78 : 1,
            y: active ? 50 : 0,
            opacity: active ? 0.4 : 1,
          }}
          style={{ transformOrigin: "center bottom" }}
        >
          <Card>
            <SmallLabel>AN UNFINISHED THOUGHT</SmallLabel>
            <h3>
              Maybe there’s
              <br />
              something here.
            </h3>
            <div className="text-lines">
              <i />
              <i />
            </div>
            <button
              className="text-button"
              onClick={() => setP(1)}
              tabIndex={active ? -1 : 0}
            >
              Remove note <Minus size={16} />
            </button>
          </Card>
        </motion.div>
        <AnimatePresence>
          {active && (
            <motion.button
              className="undo-pill"
              onClick={() => setP(0)}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <RotateCcw size={16} /> Bring it back <span>Undo</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    );
  if (id === "stack")
    return (
      <button
        className="stack-scene"
        aria-label={active ? "Close page stack" : "Spread page stack"}
        aria-expanded={active}
        onClick={toggle}
      >
        {["The spark", "The process", "The next thing"].map((s, i) => (
          <Card
            key={s}
            className="stack-card"
            animate={{
              x: active ? (i - 1) * 124 : (i - 1) * 9,
              y: active ? Math.abs(i - 1) * 20 : (2 - i) * -13,
              rotate: active ? (i - 1) * 13 : (i - 1) * -5,
              scale: active ? 0.82 : 1,
            }}
            transition={{ ...spring, delay: i * 0.04 }}
          >
            <SmallLabel>0{i + 1} / NOTEBOOK</SmallLabel>
            <h3>{s}</h3>
            <div className={`stack-art art-${i}`}>
              <span />
              <span />
              <span />
            </div>
            <span className="stack-footer">
              Open a possibility <ArrowUpRight size={15} />
            </span>
          </Card>
        ))}
      </button>
    );
  if (id === "thread")
    return (
      <div className="thread-scene">
        <svg viewBox="0 0 440 200">
          <motion.path
            d="M100 80 C150 200 290 200 340 80"
            fill="none"
            stroke="#002fa7"
            strokeWidth="2"
            animate={{ pathLength: p }}
          />
        </svg>
        {["An observation", "A possibility"].map((s, i) => (
          <Card
            key={s}
            className="thread-card"
            animate={{
              x: (i === 0 ? -1 : 1) * (active ? 86 : 125),
              rotate: active ? 0 : i === 0 ? -6 : 6,
              y: active ? -12 : 0,
            }}
          >
            <span className="connection-dot" />
            <SmallLabel>NOTE 0{i + 1}</SmallLabel>
            <h3>{s}</h3>
            <div className="text-lines">
              <i />
              <i />
            </div>
          </Card>
        ))}
        <button className="pill-button" onClick={toggle}>
          <Link2 size={16} />
          {active ? "Connected · unlink" : "Connect the notes"}
        </button>
      </div>
    );
  if (id === "resolve")
    return (
      <div className="resolve-scene">
        <SmallLabel>LESS, BUT BETTER</SmallLabel>
        <h3>A little progress.</h3>
        <motion.button
          className="task-row"
          onClick={toggle}
          animate={{ opacity: active ? 0.45 : 1, y: active ? 90 : 0 }}
        >
          <span className={`checkbox ${active ? "checked" : ""}`}>
            {active && <Check size={16} />}
          </span>
          <span>
            Make the first move.
            <motion.i animate={{ scaleX: p }} />
          </span>
        </motion.button>
        <motion.div
          className="task-row passive"
          animate={{ y: active ? -65 : 0 }}
        >
          <span className="checkbox" />
          <span>See where it takes you.</span>
          <ArrowUpRight size={16} />
        </motion.div>
        <motion.div
          className="task-status"
          animate={{ opacity: active ? 1 : 0 }}
        >
          <CheckCheck size={16} /> One less thing on your mind.
        </motion.div>
      </div>
    );
  if (id === "scrub") {
    let step = Math.min(2, Math.floor(p * 2.99));
    return (
      <div className="scrub-scene">
        <SmallLabel>EVERY VERSION BELONGS</SmallLabel>
        <div className="revision">
          <span>0{step + 1}</span>
          <AnimatePresence mode="wait">
            <motion.h3
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              {
                [
                  "Make a thing.",
                  "Make a useful thing.",
                  "Make something\nworth keeping.",
                ][step]
              }
            </motion.h3>
          </AnimatePresence>
        </div>
        <div className="history-ticks">
          {Array.from({ length: 31 }, (_, i) => (
            <i key={i} className={i <= p * 30 ? "past" : ""} />
          ))}
        </div>
        <Slider
          value={p}
          onChange={setP}
          label="Revision history"
          left="The first thought"
          right="The right words"
        />
      </div>
    );
  }
  if (id === "send")
    return (
      <div className="send-scene">
        <motion.div
          animate={{
            scale: active ? 0.15 : 1,
            rotate: active ? -35 : 0,
            opacity: active ? 0 : 1,
            x: active ? 80 : 0,
          }}
          transition={{ duration: 0.45 }}
        >
          <Card>
            <SmallLabel>A SMALL HELLO</SmallLabel>
            <h3>
              Hey, I made
              <br />
              you something.
            </h3>
            <div className="message-footer">
              <span>Hope it makes you smile.</span>
              <button
                className="blue-icon"
                aria-label="Send note"
                onClick={() => setP(1)}
                tabIndex={active ? -1 : 0}
              >
                <ArrowUpRight size={19} />
              </button>
            </div>
          </Card>
        </motion.div>
        <AnimatePresence>
          {active && (
            <motion.div
              className="flying-plane"
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
              animate={{
                x: [0, 60, 240],
                y: [0, -30, -170],
                opacity: [0, 1, 0],
                scale: [0.4, 1, 1],
              }}
              transition={{ duration: 1.3 }}
            >
              <Send size={70} strokeWidth={1} fill="#002fa7" color="#002fa7" />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          className="send-again"
          tabIndex={active ? 0 : -1}
          onClick={() => setP(0)}
          animate={{ opacity: active ? 1 : 0 }}
          tabIndex={active ? 0 : -1}
        >
          <Check size={18} /> A little hello, delivered.
          <span>
            Write another <CornerDownLeft size={14} />
          </span>
        </motion.button>
      </div>
    );
  return (
    <div className="quiet-scene">
      <div className="quiet-orbit">
        {Array.from({ length: 12 }, (_, i) => {
          let angle = (i / 12) * Math.PI * 2,
            dist = 75 + (i % 3) * 28;
          return (
            <motion.div
              key={i}
              className="noise-dot"
              animate={{
                x: Math.cos(angle) * dist * (1 - p),
                y: Math.sin(angle) * dist * (1 - p),
                scale: 1 - p * 0.6,
                opacity: 1 - p * 0.7,
              }}
              transition={spring}
            />
          );
        })}
        <motion.div
          className="quiet-center"
          animate={{
            scale: 0.75 + p * 0.25,
            background: active ? "#002fa7" : "#fff",
            color: active ? "#fff" : "#002fa7",
          }}
        >
          {active ? <VolumeX size={26} /> : <Volume2 size={26} />}
        </motion.div>
      </div>
      <h3>
        {active ? "Just you. And the thought." : "A little too much going on."}
      </h3>
      <Slider
        value={p}
        onChange={setP}
        label="Quiet level"
        left="The world"
        right="A little quiet"
      />
    </div>
  );
}

function App() {
  const initial = Math.max(
    0,
    studies.findIndex(
      (x) => x.id === new URLSearchParams(location.search).get("study"),
    ),
  );
  const [index, setIndex] = useState(initial),
    [p, setP] = useState(0),
    [playing, setPlaying] = useState(false),
    [clean, setClean] = useState(
      new URLSearchParams(location.search).get("capture") === "1",
    ),
    [copied, setCopied] = useState(false),
    [view, setView] = useState("studio");
  const study = studies[index],
    reduced = useReducedMotion(),
    timers = useRef([]),
    copyTimer = useRef(null);
  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }
  function select(i) {
    clearTimers();
    setPlaying(false);
    setP(0);
    setIndex(i);
    setCopied(false);
    const u = new URL(location.href);
    u.searchParams.set("study", studies[i].id);
    history.replaceState(null, "", u);
  }
  function replay() {
    clearTimers();
    setP(0);
    setPlaying(true);
    const later = (fn, t) => timers.current.push(setTimeout(fn, t));
    if (
      !reduced &&
      ["tone", "scrub", "peel", "quiet", "commit"].includes(study.id)
    ) {
      for (let n = 1; n <= 40; n++) later(() => setP(n / 40), 650 + n * 45);
    } else later(() => setP(1), 900);
    later(() => setP(0), 4200);
    later(() => setPlaying(false), 5000);
  }
  useEffect(
    () => () => {
      clearTimers();
      clearTimeout(copyTimer.current);
    },
    [],
  );
  useEffect(() => {
    function key(e) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "Escape") setClean(false);
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        replay();
      }
      if (e.key === "ArrowRight") select((index + 1) % studies.length);
      if (e.key === "ArrowLeft")
        select((index + studies.length - 1) % studies.length);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [index]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(study.caption);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setView("plan");
    }
  }
  return (
    <MotionConfig
      transition={reduced ? { duration: 0 } : spring}
      reducedMotion="user"
    >
      <div className={`app ${clean ? "capture-mode" : ""}`}>
        <header className="site-header">
          <a href="/" className="wordmark">
            <Glyph size={27} />
            <span>
              small moves<span className="wordmark-period">.</span>
            </span>
          </a>
          <nav>
            <button
              className={view === "studio" ? "nav-active" : ""}
              onClick={() => setView("studio")}
            >
              The playground
            </button>
            <button
              className={view === "plan" ? "nav-active" : ""}
              onClick={() => setView("plan")}
            >
              The week <span>14</span>
            </button>
          </nav>
          <a
            className="author"
            href="https://x.com/sekenoov"
            target="_blank"
            rel="noreferrer"
          >
            by @sekenoov <ArrowUpRight size={15} />
          </a>
        </header>
        <main>
          <div className="intro">
            <div>
              <div className="edition">
                <span className="edition-dot" /> INTERACTION STUDIES / VOL. 01
              </div>
              <h1>
                Small moves.
                <br />
                <span>Big feeling.</span>
              </h1>
            </div>
            <div className="intro-aside">
              <p>
                Little experiments in how
                <br />
                an interface could feel.
              </p>
              <div className="intro-count">
                <strong>14</strong>
                <span>
                  studies
                  <br />
                  one week
                </span>
                <ArrowRight size={24} />
              </div>
            </div>
          </div>
          {view === "studio" ? (
            <section className="workspace">
              <aside className="study-nav">
                <div className="nav-label">
                  <span>THE COLLECTION</span>
                  <span>01—14</span>
                </div>
                <div className="study-list">
                  {studies.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => select(i)}
                      className={`study-item ${i === index ? "selected" : ""}`}
                      aria-current={i === index ? "true" : undefined}
                    >
                      <span className="study-number">{pad(i + 1)}</span>
                      <span>
                        {s.title}
                        <small>{s.category}</small>
                      </span>
                      {i === index ? (
                        <ArrowUpRight size={16} />
                      ) : (
                        <span className="item-dot" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="nav-bottom">
                  <span className="edition-dot" /> Made to be played with.
                </div>
              </aside>
              <div className="studio">
                <div className="stage-top">
                  <div>
                    <span className="study-number">STUDY {pad(index + 1)}</span>
                    <span className="stage-divider" />
                    <span>{study.category}</span>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Open clean capture mode"
                    title="Clean capture mode"
                    onClick={() => setClean(true)}
                  >
                    <Maximize2 size={17} />
                  </button>
                </div>
                <div className="stage">
                  <div className="stage-cross cross-one" />
                  <div className="stage-cross cross-two" />
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={study.id}
                      className="demo-wrap"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: reduced ? 0 : 0.22 }}
                    >
                      <Demo
                        id={study.id}
                        p={p}
                        setP={(v) => {
                          if (!playing) setP(v);
                        }}
                        playing={playing}
                      />
                    </motion.div>
                  </AnimatePresence>
                  <div className="stage-signature">
                    <Glyph size={15} />
                    <span>@sekenoov</span>
                  </div>
                  <span className="stage-note">INTERACTIVE CONCEPT</span>
                </div>
                <div className="stage-toolbar">
                  <span>
                    <span
                      className={`status-dot ${playing ? "playing" : ""}`}
                    />
                    {playing ? "Playing the sequence" : study.hint}
                  </span>
                  <div>
                    <button
                      className="icon-button"
                      aria-label="Reset study"
                      onClick={() => {
                        clearTimers();
                        setPlaying(false);
                        setP(0);
                      }}
                    >
                      <RotateCcw size={15} />
                    </button>
                    <button className="replay-button" onClick={replay}>
                      <Play size={13} fill="currentColor" />
                      {playing ? "Replay" : "Play sequence"}
                    </button>
                  </div>
                </div>
                <div className="study-description">
                  <div>
                    <SmallLabel>THE IDEA</SmallLabel>
                    <h2>{study.title}</h2>
                    <p>{study.description}</p>
                  </div>
                  <button className="copy-button" onClick={copy}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
                    {copied ? "Copied" : "Copy post"}
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="week-plan">
              <div className="plan-header">
                <h2>Two small moves. Every day.</h2>
                <p>One useful gesture. One unexpected detail.</p>
              </div>
              {Array.from({ length: 7 }, (_, day) => (
                <div className="day-row" key={day}>
                  <div className="day-number">
                    <span>DAY</span>
                    {pad(day + 1)}
                  </div>
                  {studies.slice(day * 2, day * 2 + 2).map((s, j) => (
                    <article className="plan-card" key={s.id}>
                      <SmallLabel>
                        {j === 0 ? "FIRST POST" : "SECOND POST"} · {s.time}
                      </SmallLabel>
                      <h3>{s.title}</h3>
                      <p>{s.caption}</p>
                      <button
                        onClick={() => {
                          select(day * 2 + j);
                          setView("studio");
                        }}
                      >
                        Try the interaction <ArrowUpRight size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              ))}
            </section>
          )}
          <footer>
            <span>Built around a feeling. Refined through play.</span>
            <span>14 studies / 7 days / @sekenoov</span>
          </footer>
        </main>
        {clean && (
          <div className="capture-controls">
            <span>
              {pad(index + 1)} / {study.title}
            </span>
            <button onClick={replay}>
              <Play size={14} /> Play
            </button>
            <button
              onClick={() => select((index + 1) % 14)}
              aria-label="Next study"
            >
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => setClean(false)}
              aria-label="Exit capture mode"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
createRoot(document.getElementById("root")).render(<App />);
