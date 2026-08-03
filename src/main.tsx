import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";
import {
  Heart,
  Menu,
  X,
  Search,
  ShieldCheck,
  MessageCircle,
  Video,
  Bookmark,
  ArrowRight,
  Bell,
  CalendarDays,
  Paperclip,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  PhoneOff,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Users,
  FileText,
  Clock,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  Plus,
  Flag,
} from "lucide-react";
import { mentors, groups, conversations, docs, nav } from "./data";
import {
  MedicationAutocomplete,
  DiagnosisAutocomplete,
} from "./components/Autocomplete";
import type { MedicationTerm, DiagnosisTerm } from "./health/terminology";
import { DEFAULT_HEALTH_VISIBILITY } from "./features/privacy";
import "./styles.css";

const emergency =
  "Mona’s Heart is not an emergency service. If you believe you are experiencing a medical emergency, call 911 or your local emergency number immediately.";
const Disclaimer = () => (
  <div className="disclaimer">
    <ShieldCheck size={19} />
    <span>
      <b>Demo prototype only.</b> Not medical advice and not approved for
      storing real medical records or PHI. Use fictional information only.
    </span>
  </div>
);
function Logo() {
  return (
    <Link className="logo" to="/">
      <span className="heart">
        <Heart fill="currentColor" />
      </span>
      <span>
        Mona’s <b>Heart</b>
      </span>
    </Link>
  );
}
function Header() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header>
        <Logo />
        <button
          className="menu"
          aria-label="Toggle navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? "open" : ""}>
          <Link to="/about">About</Link>
          <Link to="/matches">Find a match</Link>
          <Link to="/safety">Safety</Link>
          <Link to="/login">Log in</Link>
          <Link className="button small" to="/signup">
            Sign up
          </Link>
        </nav>
      </header>
    </>
  );
}
function Footer() {
  return (
    <footer>
      <div>
        <Logo />
        <p>Compassionate peer connection for every step of the journey.</p>
      </div>
      <div className="footerlinks">
        <Link to="/about">About</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/safety">Safety</Link>
        <a href="mailto:hello@example.com">Contact</a>
        <Link to="/emergency">Emergency Resources</Link>
      </div>
      <p className="copyright">
        © 2026 Prominent Life Investments. Mona’s Heart and all associated
        software, designs, content, workflows, and documentation are
        proprietary. All rights reserved.
      </p>
    </footer>
  );
}
function Public({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
function Home() {
  return (
    <Public>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            PEER SUPPORT, FROM SOMEONE WHO UNDERSTANDS
          </span>
          <h1>
            You don’t have to
            <br />
            <em>face it alone.</em>
          </h1>
          <p>
            Connect with a survivor or caregiver who has walked a similar health
            journey—and is ready to listen, encourage, and share what they
            learned.
          </p>
          <div className="actions">
            <Link className="button" to="/signup">
              Find your match <ArrowRight size={18} />
            </Link>
            <Link className="button ghost" to="/signup">
              Become a survivor mentor
            </Link>
          </div>
          <div className="trust">
            <span>
              <ShieldCheck /> Privacy first
            </span>
            <span>
              <Heart /> Human connection
            </span>
            <span>
              <Users /> Inclusive community
            </span>
          </div>
        </div>
        <div className="hero-art">
          <div className="portrait-card">
            <div className="avatar xl">MR</div>
            <div>
              <b>Meet Maya</b>
              <p>Thyroid cancer survivor · 96% match</p>
            </div>
            <MessageCircle />
          </div>
          <div className="big-heart">
            <Heart fill="currentColor" />
          </div>
          <div className="quote">
            “You deserve support from someone who truly gets it.”
          </div>
        </div>
      </section>
      <Disclaimer />
      <section className="section center">
        <span className="eyebrow">HOW IT WORKS</span>
        <h2>A meaningful connection in three gentle steps</h2>
        <div className="three">
          <Info
            n="01"
            title="Tell us what matters"
            text="Share only the general experiences and preferences you are comfortable sharing."
          />
          <Info
            n="02"
            title="Meet a compatible mentor"
            text="Explore thoughtful demo matches based on experience, language, and availability."
          />
          <Info
            n="03"
            title="Connect your way"
            text="Message privately or schedule a supportive video conversation."
          />
        </div>
      </section>
      <section className="soft section">
        <div>
          <span className="eyebrow">PRIVACY & SAFETY</span>
          <h2>Your story belongs to you.</h2>
          <p>
            You control what is visible. Hide your location or diagnosis, block
            and report concerns, and decide before anything is shared.
          </p>
          <Link to="/safety">See our safety approach →</Link>
        </div>
        <ShieldCheck className="giant" />
      </section>
      <section className="section center">
        <span className="eyebrow">FICTIONAL DEMO STORIES</span>
        <h2>Small moments of understanding matter</h2>
        <div className="three">
          {[
            "Maya gave me a list of questions that helped me feel prepared.",
            "I felt less alone before my surgery after one kind conversation.",
            "Our caregiver group reminds me to care for myself, too.",
          ].map((t, i) => (
            <blockquote key={t}>
              “{t}”
              <b>
                —{" "}
                {
                  [
                    "Elena, demo patient",
                    "Robert, demo patient",
                    "Dana, demo caregiver",
                  ][i]
                }
              </b>
            </blockquote>
          ))}
        </div>
      </section>
      <section className="cta">
        <Heart fill="currentColor" />
        <h2>Someone understands. Let’s help you find them.</h2>
        <Link className="button light" to="/signup">
          Create a demo profile
        </Link>
      </section>
    </Public>
  );
}
function Info({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <article className="info">
      <span>{n}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function Auth({ signup = false }: { signup?: boolean }) {
  const navg = useNavigate();
  const [forgot, setForgot] = useState(false);
  return (
    <Public>
      <section className="auth">
        <div>
          <span className="eyebrow">A SAFE PLACE TO BEGIN</span>
          <h1>
            {forgot
              ? "Reset your password"
              : signup
                ? "Create your account"
                : "Welcome back"}
          </h1>
          <p>
            {forgot
              ? "Enter your email and we’ll send demo reset instructions."
              : signup
                ? "Start with only the details you feel comfortable sharing."
                : "Continue your connections and conversations."}
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navg(signup ? "/onboarding" : "/dashboard");
          }}
        >
          <h2>{forgot ? "Password help" : signup ? "Sign up" : "Log in"}</h2>
          {signup && (
            <label>
              First name
              <input required placeholder="Your first name" />
            </label>
          )}
          <label>
            Email address
            <input required type="email" placeholder="you@example.com" />
          </label>
          {!forgot && (
            <label>
              Password
              <input
                required
                type="password"
                minLength={6}
                placeholder="At least 6 characters"
              />
            </label>
          )}
          {signup && (
            <label className="check">
              <input required type="checkbox" /> I agree to use demo information
              only.
            </label>
          )}
          <button className="button wide">
            {forgot
              ? "Send reset link"
              : signup
                ? "Continue to onboarding"
                : "Log in"}
          </button>
          {!signup && !forgot && (
            <button
              type="button"
              className="textbutton"
              onClick={() => setForgot(true)}
            >
              Forgot password?
            </button>
          )}
          <div className="or">or</div>
          <button
            type="button"
            className="button ghost wide"
            onClick={() => navg("/dashboard")}
          >
            Enter with demo account
          </button>
          <p className="formfoot">
            {signup ? "Already have an account?" : "New to Mona’s Heart?"}{" "}
            <Link to={signup ? "/login" : "/signup"}>
              {signup ? "Log in" : "Sign up"}
            </Link>
          </p>
        </form>
      </section>
      <Disclaimer />
    </Public>
  );
}
function Onboarding() {
  const [step, setStep] = useState(1);
  const navg = useNavigate();
  const fields =
    step === 1
      ? ["First name", "Display name", "Age range", "General location"]
      : step === 2
        ? [
            "Diagnosis or condition",
            "Symptoms",
            "Medications",
            "Procedures or surgeries",
            "Treatments",
            "Year diagnosed",
            "Recovery status",
          ]
        : [
            "Conditions you want support with",
            "Communication preferences",
            "Topics comfortable discussing",
            "Languages spoken",
            "Availability",
            "Privacy preferences",
          ];
  return (
    <Public>
      <section className="narrow">
        <span className="eyebrow">STEP {step} OF 3</span>
        <div className="progress">
          <i style={{ width: `${step * 33.33}%` }} />
        </div>
        <h1>
          {
            [
              "Let’s get to know you",
              "Your health journey",
              "Your connection preferences",
            ][step - 1]
          }
        </h1>
        <p>Share general information only. Every field can be changed later.</p>
        <form
          className="onboard"
          onSubmit={(e) => {
            e.preventDefault();
            step < 3 ? setStep(step + 1) : navg("/dashboard");
          }}
        >
          {step === 1 && (
            <label>
              Which best describes you?
              <select>
                <option>Patient</option>
                <option>Survivor or Mentor</option>
                <option>Caregiver</option>
              </select>
            </label>
          )}
          {step === 2 && (
            <>
              <DiagnosisAutocomplete onSelect={() => undefined} />
              <MedicationAutocomplete
                label="Current or previous medication"
                onSelect={() => undefined}
              />
            </>
          )}
          {fields
            .filter(
              (f) => f !== "Diagnosis or condition" && f !== "Medications",
            )
            .map((f) => (
              <label key={f}>
                {f}
                <input required placeholder={`Enter ${f.toLowerCase()}`} />
              </label>
            ))}
          {step === 3 && (
            <>
              <label className="check">
                <input type="checkbox" /> I am willing to mentor others
              </label>
              <label>
                Profile visibility
                <select>
                  <option>Visible to suggested matches</option>
                  <option>Private</option>
                </select>
              </label>
            </>
          )}
          <div className="actions">
            {step > 1 && (
              <button
                type="button"
                className="button ghost"
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
            )}
            <button className="button">
              {step === 3 ? "Finish setup" : "Continue"}
            </button>
          </div>
        </form>
      </section>
    </Public>
  );
}

function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [mobile, setMobile] = useState(false);
  return (
    <div className="app">
      <aside className={mobile ? "show" : ""}>
        <Logo />
        <button className="asideclose" onClick={() => setMobile(false)}>
          <X />
        </button>
        <nav>
          {nav.map(([n, p]) => (
            <Link key={p} to={p}>
              {n}
            </Link>
          ))}
          <span>TOOLS</span>
          <Link to="/labs">Lab comparison</Link>
          <Link to="/notes">Note comparison</Link>
          <Link to="/medications">Medications</Link>
          <Link to="/timeline">Care timeline</Link>
          <span>ACCOUNT</span>
          <Link to="/notifications">Notifications</Link>
          <Link to="/settings">Settings</Link>
        </nav>
        <Link className="logout" to="/">
          <LogOut /> Log out
        </Link>
      </aside>
      <div className="appmain">
        <div className="topbar">
          <button className="menu" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <h1>{title}</h1>
          <div>
            <Link to="/notifications" aria-label="Notifications">
              <Bell />
            </Link>
            <span className="avatar mini">EP</span>
          </div>
        </div>
        <div className="page">{children}</div>
      </div>
    </div>
  );
}
const Emergency = () => (
  <div className="emergency">
    <AlertTriangle />
    <div>
      <b>Need urgent help?</b>
      <p>{emergency}</p>
    </div>
  </div>
);
function Dashboard() {
  return (
    <AppShell title="Your home">
      <div className="welcome">
        <div>
          <span className="eyebrow">FRIDAY, JULY 31</span>
          <h2>
            Good morning, Elena <span>♥</span>
          </h2>
          <p>Here’s what is waiting for you today.</p>
        </div>
        <Link className="button" to="/matches">
          Find a new match
        </Link>
      </div>
      <Emergency />
      <div className="stats">
        <Stat icon={<Heart />} n="3" t="Recommended matches" />
        <Stat icon={<MessageCircle />} n="2" t="New messages" />
        <Stat icon={<CalendarDays />} n="1" t="Upcoming call" />
        <Stat icon={<Bookmark />} n="4" t="Saved mentors" />
      </div>
      <Section title="Recommended for you" link="/matches">
        {" "}
        <div className="cardgrid">
          {mentors.slice(0, 2).map((m) => (
            <MentorCard m={m} key={m.id} />
          ))}
        </div>
      </Section>
      <div className="twocol">
        <Section title="Coming up">
          <div className="listcard">
            <CalendarDays />
            <div>
              <b>Call with Maya R.</b>
              <p>Tomorrow · 2:00 PM · 30 min</p>
            </div>
            <Link to="/call-room">Join</Link>
          </div>
          <div className="listcard">
            <Clock />
            <div>
              <b>Medication reminder</b>
              <p>Demo only · Levothyroxine · 8:00 AM</p>
            </div>
          </div>
        </Section>
        <Section title="Your spaces">
          <div className="listcard">
            <Users />
            <div>
              <b>Thyroid Cancer Support</b>
              <p>12 new discussions this week</p>
            </div>
          </div>
          <div className="listcard">
            <FileText />
            <div>
              <b>Recent documents</b>
              <p>3 demo files organized</p>
            </div>
            <Link to="/documents">View</Link>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
function Stat({ icon, n, t }: { icon: React.ReactNode; n: string; t: string }) {
  return (
    <div className="stat">
      <span>{icon}</span>
      <b>{n}</b>
      <p>{t}</p>
    </div>
  );
}
function Section({
  title,
  link,
  children,
}: {
  title: string;
  link?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="dashsection">
      <div className="sectionhead">
        <h2>{title}</h2>
        {link && (
          <Link to={link}>
            View all <ChevronRight />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
function MentorCard({ m }: { m: (typeof mentors)[number] }) {
  const [saved, setSaved] = useState(false);
  return (
    <article className="mentor">
      <div className="score">{m.score}% match</div>
      <div className="mentorhead">
        <div className="avatar">{m.initials}</div>
        <div>
          <h3>
            {m.name} <CheckCircle2 />
          </h3>
          <p>
            {m.role} · {m.location}
          </p>
        </div>
      </div>
      <span className="pill">{m.condition}</span>
      <p>{m.story}</p>
      <small>
        <b>Experience</b>
        <br />
        {m.treatments}
        <br />
        {m.medications} · {m.years}
      </small>
      <div className="mentoractions">
        <Link className="button small" to={`/matches/${m.id}`}>
          View profile
        </Link>
        <Link className="iconbtn" to={`/messages/${m.id}`} aria-label="Message">
          <MessageCircle />
        </Link>
        <Link className="iconbtn" to="/calls" aria-label="Video call">
          <Video />
        </Link>
        <button
          className="iconbtn"
          onClick={() => setSaved(!saved)}
          aria-label="Save"
        >
          <Bookmark fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
    </article>
  );
}
function Matches() {
  const [q, setQ] = useState("");
  const [condition, setCondition] = useState("All");
  const list = mentors.filter(
    (m) =>
      (m.name + m.condition + m.location)
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (condition === "All" || m.condition.includes(condition)),
  );
  return (
    <AppShell title="Find your match">
      <p className="lead">
        Meet verified demo mentors whose experiences overlap with yours.
      </p>
      <DiagnosisAutocomplete
        label="Filter by confirmed diagnosis experience"
        onSelect={(d) =>
          setCondition(d?.displayName.includes("Thyroid") ? "Thyroid" : "All")
        }
      />
      <div className="filters">
        <label>
          <Search />{" "}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, condition, or location"
          />
        </label>
        <select
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        >
          <option>All</option>
          <option>Thyroid</option>
          <option>Heart</option>
          <option>Breast</option>
        </select>
        <select>
          <option>Any language</option>
          <option>English</option>
          <option>Spanish</option>
        </select>
        <select>
          <option>Any availability</option>
          <option>This week</option>
        </select>
      </div>
      <p>
        <b>{list.length} thoughtful matches</b> based on diagnosis, treatment,
        language, location, communication, and availability.
      </p>
      <div className="cardgrid threegrid">
        {list.map((m) => (
          <MentorCard key={m.id} m={m} />
        ))}
      </div>
      {!list.length && (
        <div className="empty">
          <Search />
          <h3>No matches found</h3>
          <p>Try broadening your filters.</p>
        </div>
      )}
      <Disclaimer />
    </AppShell>
  );
}
function Profile() {
  const { id } = useParams();
  const m = mentors.find((x) => x.id === id) || mentors[0];
  return (
    <AppShell title="Mentor profile">
      <Link to="/matches">← Back to matches</Link>
      <div className="profilehero">
        <div className="avatar xl">{m.initials}</div>
        <div>
          <span className="pill">
            <CheckCircle2 /> Demo verified
          </span>
          <h1>{m.name}</h1>
          <p>
            {m.role} · {m.location} · {m.languages}
          </p>
          <div className="actions">
            <Link className="button" to={`/messages/${m.id}`}>
              Send message
            </Link>
            <Link className="button ghost" to="/calls">
              Request video call
            </Link>
          </div>
        </div>
        <div className="matchcircle">
          {m.score}%<small>match</small>
        </div>
      </div>
      <div className="profilegrid">
        <Section title="My story">
          <p>{m.story}</p>
          <h3>Diagnosis experience</h3>
          <p>
            {m.condition} · diagnosed {m.years} ago
          </p>
          <h3>Treatments & procedures</h3>
          <p>{m.treatments}</p>
          <h3>Medication history</h3>
          <p>{m.medications}</p>
          <h3>Recovery milestones</h3>
          <p>
            Returned to everyday activities gradually; now supports newly
            diagnosed community members.
          </p>
        </Section>
        <Section title="Let’s talk about">
          <div className="tags">
            {m.topics.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
          <h3>Preferences</h3>
          <p>Messages and 30-minute video calls</p>
          <h3>Availability</h3>
          <p>Weekday evenings · Saturday mornings</p>
          <h3>Community appreciation</h3>
          <p>♥ 18 members found this mentor encouraging</p>
        </Section>
      </div>
      <div className="dangeractions">
        <button>
          <Flag /> Report profile
        </button>
        <button>Block user</button>
      </div>
    </AppShell>
  );
}
function Messages() {
  return (
    <AppShell title="Messages">
      <div className="messages">
        <div className="convos">
          <div className="search">
            <Search />
            <input placeholder="Search conversations" />
          </div>
          {conversations.map((c) => (
            <Link key={c.id} to={`/messages/${c.id}`}>
              <span className="avatar mini">{c.name[0]}</span>
              <div>
                <b>{c.name}</b>
                <p>{c.preview}</p>
              </div>
              <small>
                {c.time}
                {c.unread > 0 && <i>{c.unread}</i>}
              </small>
            </Link>
          ))}
        </div>
        <div className="messageempty">
          <MessageCircle />
          <h2>Your conversations</h2>
          <p>Select a conversation to read and reply.</p>
          <Link className="button" to="/matches">
            Start a conversation
          </Link>
        </div>
      </div>
      <div className="safetyline">
        <ShieldCheck /> Keep personal contact and medical record details
        private. Prototype messages are not HIPAA compliant.
      </div>
    </AppShell>
  );
}
function Conversation() {
  const { id } = useParams();
  const m = mentors.find((x) => x.id === id) || mentors[0];
  const [messages, setMessages] = useState([
    "Hi Elena, I’m glad you reached out. What feels most important to talk through?",
    "Thank you, Maya. I’m nervous about my follow-up visit and want to prepare good questions.",
    "That makes sense. I kept a short list in my phone. We can think through yours together—you are asking all the right questions.",
  ]);
  const [text, setText] = useState("");
  return (
    <AppShell title={m.name}>
      <div className="threadhead">
        <div className="avatar mini">{m.initials}</div>
        <div>
          <b>{m.name}</b>
          <p>Demo verified mentor · Usually replies today</p>
        </div>
        <Link to="/calls">
          <Video />
        </Link>
        <button>
          <Flag />
        </button>
      </div>
      <div className="safetyline">
        <ShieldCheck /> Share only what feels comfortable. Do not share medical
        records in prototype messages.
      </div>
      <div className="thread">
        {messages.map((x, i) => (
          <div key={`${x}-${i}`} className={i % 2 ? "bubble me" : "bubble"}>
            {x}
            <small>{i === 2 ? "10:42 AM" : "10:38 AM"}</small>
          </div>
        ))}
      </div>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) {
            setMessages([...messages, text]);
            setText("");
          }
        }}
      >
        <button type="button" aria-label="Attach">
          <Paperclip />
        </button>
        <input
          aria-label="New message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a supportive message…"
        />
        <button className="button">Send</button>
      </form>
      <div className="dangeractions">
        <button>Block user</button>
        <button>
          <Flag /> Report conversation
        </button>
      </div>
    </AppShell>
  );
}
function Calls() {
  const [sent, setSent] = useState(false);
  return (
    <AppShell title="Video calls">
      <Disclaimer />
      <div className="profilegrid">
        <Section title="Request a call">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <label>
              Meet with
              <select>
                <option>Maya R.</option>
                <option>James T.</option>
              </select>
            </label>
            <label>
              Date and time
              <input required type="datetime-local" />
            </label>
            <label>
              Call length
              <select>
                <option>30 minutes</option>
                <option>15 minutes</option>
                <option>45 minutes</option>
              </select>
            </label>
            <label>
              Short note
              <textarea placeholder="What would you like to talk about?" />
            </label>
            <button className="button">Request call</button>
            {sent && <p className="success">✓ Demo call request sent.</p>}
          </form>
        </Section>
        <Section title="Upcoming calls">
          <div className="listcard">
            <CalendarDays />
            <div>
              <b>Maya R.</b>
              <p>Aug 1 · 2:00 PM · 30 min · Accepted</p>
            </div>
            <Link className="button small" to="/call-room">
              Join call
            </Link>
          </div>
          <div className="listcard">
            <CalendarDays />
            <div>
              <b>James T.</b>
              <p>Aug 6 · 5:30 PM · Pending</p>
            </div>
            <div>
              <button>Accept</button> · <button>Decline</button>
            </div>
          </div>
          <h3>Past calls</h3>
          <p>Nora K. · July 12 · 30 min · Completed</p>
        </Section>
      </div>
    </AppShell>
  );
}
function CallRoom() {
  const [mic, setMic] = useState(true),
    [cam, setCam] = useState(true),
    [ended, setEnded] = useState(false);
  return (
    <AppShell title="Demo call room">
      {ended ? (
        <div className="empty">
          <Heart />
          <h2>Call ended</h2>
          <p>Thank you for showing up for one another.</p>
          <Link className="button" to="/calls">
            Back to calls
          </Link>
        </div>
      ) : (
        <div className="callroom">
          <div className="videopeer">
            <div className="avatar xl">MR</div>
            <b>Maya R.</b>
            <span>Simulated video</span>
          </div>
          <div className="self">
            <div className="avatar">EP</div>
            <span>You</span>
          </div>
          <div className="callcontrols">
            <button onClick={() => setMic(!mic)}>
              {mic ? <Mic /> : <MicOff />}
            </button>
            <button onClick={() => setCam(!cam)}>
              {cam ? <Camera /> : <CameraOff />}
            </button>
            <button className="end" onClick={() => setEnded(true)}>
              <PhoneOff />
            </button>
          </div>
        </div>
      )}
      <p className="center">
        This is a simulated call room. No audio or video is transmitted.
      </p>
    </AppShell>
  );
}
function Documents() {
  const [items, setItems] = useState(docs);
  const [added, setAdded] = useState(false);
  return (
    <AppShell title="Document center">
      <Disclaimer />
      <div className="sectionhead">
        <div>
          <h2>Your demo documents</h2>
          <p>Organize fictional files locally for this prototype.</p>
        </div>
        <button className="button" onClick={() => setAdded(true)}>
          <Upload /> Add document
        </button>
      </div>
      {added && (
        <form
          className="inlineform"
          onSubmit={(e) => {
            e.preventDefault();
            setItems([
              ...items,
              [
                "New demo document",
                "Personal notes",
                "Jul 31, 2026",
                "Personal",
              ],
            ]);
            setAdded(false);
          }}
        >
          <label>
            Document title
            <input required placeholder="Demo document title" />
          </label>
          <label>
            Category
            <select>
              {[
                "Doctor notes",
                "Lab results",
                "Imaging reports",
                "Medication lists",
                "Discharge instructions",
                "Treatment plans",
                "Personal notes",
              ].map((x) => (
                <option>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" />
          </label>
          <label>
            Provider name
            <input placeholder="Optional" />
          </label>
          <label>
            Tags
            <input placeholder="follow-up, questions" />
          </label>
          <button className="button">Save demo file</button>
        </form>
      )}
      <div className="docgrid">
        {items.map((d, i) => (
          <article className="doc">
            <FileText />
            <span className="pill">{d[1]}</span>
            <h3>{d[0]}</h3>
            <p>
              {d[2]} · {d[3]}
            </p>
            <div>
              <button>Preview</button>
              <button
                aria-label="Delete"
                onClick={() => setItems(items.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="safetyline">
        <ShieldCheck /> Documents remain mock/local demo items. Never upload
        real medical records or PHI. Sharing always requires your consent.
      </div>
    </AppShell>
  );
}
const labs = [
  [
    "TSH",
    "2.1 mIU/L",
    "0.4–4.0",
    "Apr 12, 2026",
    "Normal",
    "Routine demo result",
  ],
  [
    "TSH",
    "4.8 mIU/L",
    "0.4–4.0",
    "Jul 18, 2026",
    "High",
    "Discussed at fictional follow-up",
  ],
  [
    "Calcium",
    "8.4 mg/dL",
    "8.6–10.2",
    "Jul 18, 2026",
    "Low",
    "Demo result only",
  ],
];
function Labs() {
  return (
    <AppShell title="Lab comparison">
      <h2>See demo results over time</h2>
      <p className="lead">Organize numbers and notes without interpretation.</p>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              {[
                "Test name",
                "Result",
                "Reference range",
                "Date",
                "Status",
                "Notes",
              ].map((x) => (
                <th>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labs.map((r) => (
              <tr>
                {r.map((x, i) => (
                  <td>
                    {i === 4 ? (
                      <span className={`status ${x.toLowerCase()}`}>{x}</span>
                    ) : (
                      x
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="timelinebar">
        {labs.map((r, i) => (
          <div>
            <i />
            <b>{r[3]}</b>
            <span>
              {r[0]} · {r[1]}
            </span>
          </div>
        ))}
      </div>
      <div className="safetyline">
        <AlertTriangle /> This tool does not interpret results, diagnose
        conditions, or replace a healthcare professional.
      </div>
    </AppShell>
  );
}
function Notes() {
  const categories = [
    "Diagnoses mentioned",
    "Symptoms mentioned",
    "Medications mentioned",
    "Procedures mentioned",
    "Follow-up instructions",
  ];
  return (
    <AppShell title="Doctor note comparison">
      <p className="lead">
        Compare two fictional notes side by side. Highlighting helps organize
        words—it is not medical interpretation.
      </p>
      <div className="noteselect">
        <select>
          <option>Demo follow-up — Apr 12</option>
        </select>
        <span>compared with</span>
        <select>
          <option>Demo follow-up — Jul 18</option>
        </select>
      </div>
      <div className="compare">
        {["Note A · April 12", "Note B · July 18"].map((n, j) => (
          <article>
            <h2>{n}</h2>
            {categories.map((c, i) => (
              <div>
                <b>{c}</b>
                <p>
                  {j === 0
                    ? [
                        "Thyroid cancer history",
                        "Fatigue improving",
                        "Levothyroxine 100 mcg",
                        "Post-thyroidectomy",
                        "Repeat fictional labs in 12 weeks",
                      ][i]
                    : [
                        "Thyroid cancer history",
                        "Mild fatigue noted",
                        "Levothyroxine 112 mcg (changed)",
                        "Post-thyroidectomy",
                        "Repeat fictional labs in 8 weeks",
                      ][i]}
                </p>
              </div>
            ))}
          </article>
        ))}
      </div>
      <div className="difference">
        <b>Differences highlighted:</b> Demo medication dose and fictional
        follow-up interval changed.
      </div>
      <Disclaimer />
    </AppShell>
  );
}
function Medications() {
  const [items, setItems] = useState<
    {
      term: MedicationTerm | null;
      name: string;
      status: string;
      strength: string;
      form: string;
      frequency: string;
      visibility: string;
      verified: boolean;
    }[]
  >([]);
  const [term, setTerm] = useState<MedicationTerm | null>(null),
    [freeText, setFreeText] = useState(""),
    [show, setShow] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [status, setStatus] = useState("Current medication"),
    [strength, setStrength] = useState(""),
    [doseForm, setDoseForm] = useState(""),
    [frequency, setFrequency] = useState(""),
    [visibility, setVisibility] = useState<string>(DEFAULT_HEALTH_VISIBILITY);
  return (
    <AppShell title="Medication timeline">
      <div className="sectionhead">
        <p className="lead">
          My confirmed medication history is private by default and remains
          separate from general educational information.
        </p>
        <button className="button" onClick={() => setShow(!show)}>
          <Plus /> Add medication
        </button>
      </div>
      {show && (
        <form
          className="medform"
          onSubmit={(e) => {
            e.preventDefault();
            if ((term || freeText) && confirmed) {
              setItems([
                ...items,
                {
                  term,
                  name: term?.genericName ?? freeText,
                  status,
                  strength,
                  form: doseForm,
                  frequency: frequency || "Not specified",
                  visibility,
                  verified: Boolean(term),
                },
              ]);
              setTerm(null);
              setFreeText("");
              setStatus("Current medication");
              setStrength("");
              setDoseForm("");
              setFrequency("");
              setVisibility(DEFAULT_HEALTH_VISIBILITY);
              setConfirmed(false);
              setShow(false);
            }
          }}
        >
          <MedicationAutocomplete
            onSelect={(m, f) => {
              setTerm(m);
              setFreeText(f ?? "");
              setStrength(m?.strength ?? "");
              setDoseForm(m?.doseForm ?? "");
              setConfirmed(false);
            }}
          />
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>Current medication</option>
              <option>Previous medication</option>
              <option>I’m not sure</option>
            </select>
          </label>
          <label>
            Strength
            <input
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
            />
          </label>
          <label>
            Dose form
            <input
              value={doseForm}
              onChange={(e) => setDoseForm(e.target.value)}
            />
          </label>
          <label>
            Frequency
            <input
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="Optional; record existing directions only"
            />
          </label>
          <label>
            Start date
            <input type="date" />
          </label>
          <label>
            End date
            <input type="date" />
          </label>
          <label>
            Reason prescribed
            <input />
          </label>
          <label>
            Side effects
            <input />
          </label>
          <label>
            Personal notes
            <textarea />
          </label>
          <label>
            Visibility
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <option value="private">Private</option>
              <option value="approved-connections">Approved connections</option>
              <option value="matched-mentors">Matched mentors</option>
              <option value="authorized-care-organization">
                Authorized participating care organization
              </option>
              <option value="hidden-from-public">
                Hidden from public profile
              </option>
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />{" "}
            I confirm that I chose to add this item to my personal medication
            history.
          </label>
          <button
            className="button"
            disabled={!confirmed || (!term && !freeText)}
          >
            Confirm and add
          </button>
        </form>
      )}
      <div className="meds">
        {items.map((m, i) => (
          <article key={`${m.name}-${i}`}>
            <div>
              <span className="status active">{m.status}</span>
              <h2>{m.name}</h2>
              <b>
                {m.verified
                  ? `Verified terminology · RxCUI ${m.term?.rxcui}`
                  : "Unverified entry"}
              </b>
            </div>
            <dl>
              <dt>Strength / form</dt>
              <dd>
                {m.strength || "Not provided"} · {m.form || "Not provided"}
              </dd>
              <dt>Privacy</dt>
              <dd>{m.visibility}</dd>
            </dl>
          </article>
        ))}
      </div>
      {!items.length && (
        <div className="empty">
          <FileText />
          <h2>No medications recorded</h2>
          <p>
            Nothing is automatically added. Select Add medication when you want
            to record an existing or previous medication.
          </p>
        </div>
      )}
      <Disclaimer />
    </AppShell>
  );
}
function HealthProfile() {
  const [diagnosis, setDiagnosis] = useState<DiagnosisTerm | null>(null);
  return (
    <AppShell title="Health profile">
      <section className="healthform">
        <h2>Private health experience</h2>
        <p>
          Health information is private by default. Choose what, if anything, to
          share.
        </p>
        <DiagnosisAutocomplete onSelect={setDiagnosis} />
        {diagnosis && (
          <>
            <label>
              Experience label
              <select defaultValue="confirmed">
                <option value="confirmed">Confirmed diagnosis</option>
                <option>Suspected or under evaluation</option>
                <option>Survivor experience</option>
                <option>Caregiver experience</option>
                <option>Prefer not to say</option>
              </select>
            </label>
            <dl className="termmeta">
              <dt>Standardized term</dt>
              <dd>{diagnosis.displayName}</dd>
              <dt>Code</dt>
              <dd>
                {diagnosis.system} {diagnosis.code}
              </dd>
              <dt>Source / retrieval</dt>
              <dd>
                {diagnosis.source} · {diagnosis.retrievedAt}
              </dd>
            </dl>
            <details>
              <summary>Medications sometimes used for this condition</summary>
              <p>
                This optional educational section is disabled by default pending
                clinical and pharmacist review. Nothing is preselected or added
                to medication history.
              </p>
            </details>
          </>
        )}
      </section>
      <MedicationAutocomplete
        label="Record an existing medication"
        onSelect={() => undefined}
      />
    </AppShell>
  );
}

function Timeline() {
  const events = [
    ["2023", "Diagnosis", "Received fictional thyroid cancer diagnosis"],
    ["Jan 2024", "Procedure", "Thyroidectomy at Demo Health Center"],
    [
      "Feb 2024",
      "Treatment",
      "Completed fictional radioactive iodine treatment",
    ],
    ["Mar 2024", "Medication change", "Levothyroxine dose adjusted"],
    ["Jun 2024", "Recovery milestone", "Returned to favorite walking trail"],
    ["Jul 2026", "Follow-up", "Routine fictional appointment"],
  ];
  return (
    <AppShell title="My care timeline">
      <p className="lead">Your journey, organized in one calm view.</p>
      <div className="caretimeline">
        {events.map((e, i) => (
          <article>
            <span>{i + 1}</span>
            <small>{e[0]}</small>
            <div>
              <b>{e[1]}</b>
              <p>{e[2]}</p>
            </div>
          </article>
        ))}
      </div>
      <Disclaimer />
    </AppShell>
  );
}
function Groups() {
  const [joined, setJoined] = useState<string[]>(["Thyroid Cancer Support"]);
  return (
    <AppShell title="Community groups">
      <p className="lead">
        Find a moderated space where lived experience is welcomed and respected.
      </p>
      <div className="groupgrid">
        {groups.map((g) => (
          <article>
            <div className="groupicon">
              <Users />
            </div>
            <span>{g[2]} members</span>
            <h2>{g[0]}</h2>
            <p>{g[1]}</p>
            <div>
              <Link
                className="button ghost small"
                to={`/groups/${encodeURIComponent(g[0])}`}
              >
                View group
              </Link>
              <button
                className="button small"
                onClick={() =>
                  setJoined(
                    joined.includes(g[0])
                      ? joined.filter((x) => x !== g[0])
                      : [...joined, g[0]],
                  )
                }
              >
                {joined.includes(g[0]) ? "Joined ✓" : "Join"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
function Group() {
  const { name } = useParams();
  const title = decodeURIComponent(name || groups[0][0]);
  const [posts, setPosts] = useState([
    "What helped you feel prepared for your first follow-up?",
    "Today I celebrated a small recovery milestone: a walk around the block.",
  ]);
  const [text, setText] = useState("");
  return (
    <AppShell title={title}>
      <div className="groupbanner">
        <Users />
        <div>
          <span className="pill">Moderated group</span>
          <h2>{title}</h2>
          <p>
            A kind, confidential-minded space for fictional demo peer
            discussions.
          </p>
        </div>
        <button className="button">Joined ✓</button>
      </div>
      <div className="profilegrid">
        <section>
          <form
            className="postform"
            onSubmit={(e) => {
              e.preventDefault();
              if (text) {
                setPosts([text, ...posts]);
                setText("");
              }
            }}
          >
            <label>
              Create a post
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Share encouragement or ask a question…"
              />
            </label>
            <button className="button">Post</button>
          </form>
          {posts.map((p, i) => (
            <article className="post">
              <div>
                <span className="avatar mini">{i ? "AR" : "EP"}</span>
                <b>{i ? "Ari R. · Demo member" : "You · Demo member"}</b>
                <small> {i ? "Yesterday" : "Just now"}</small>
              </div>
              <p>{p}</p>
              <div>
                <button>♥ {i ? 12 : 0}</button>
                <button>💬 {i ? 4 : 0} comments</button>
                <button>
                  <Flag /> Report post
                </button>
              </div>
            </article>
          ))}
        </section>
        <aside className="rules">
          <h2>Group rules</h2>
          <ol>
            <li>Lead with kindness and respect.</li>
            <li>Protect your privacy and others’.</li>
            <li>Share experience, not medical advice.</li>
            <li>Report safety concerns.</li>
          </ol>
          <p>
            <b>Moderator:</b> Community Care Team (demo)
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
function Notifications() {
  const items = [
    ["New match", "Maya is a 96% compatibility match."],
    ["New message", "Maya sent you an encouraging note."],
    ["Call accepted", "Your call for Aug 1 was accepted."],
    ["Group reply", "Ari replied in Thyroid Cancer Support."],
    ["Saved profile update", "James added new availability."],
    ["Safety alert", "Remember to use demo information only."],
  ];
  return (
    <AppShell title="Notifications">
      <div className="notificationlist">
        {items.map((x, i) => (
          <article className={i < 2 ? "unread" : ""}>
            <span>
              {
                [
                  <Heart />,
                  <MessageCircle />,
                  <Video />,
                  <Users />,
                  <Bookmark />,
                  <ShieldCheck />,
                ][i]
              }
            </span>
            <div>
              <h3>{x[0]}</h3>
              <p>{x[1]}</p>
            </div>
            <small>{i < 2 ? "Today" : "This week"}</small>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
function Settings() {
  const [saved, setSaved] = useState(false);
  return (
    <AppShell title="Settings & privacy">
      <form
        className="settings"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
      >
        <Section title="Profile visibility">
          <label className="switchrow">
            <span>
              <b>Visible to suggested matches</b>
              <small>People with compatible journeys may discover you.</small>
            </span>
            <input type="checkbox" defaultChecked />
          </label>
          <label className="switchrow">
            <span>
              <b>Hide general location</b>
              <small>Your city or region will not appear.</small>
            </span>
            <input type="checkbox" />
          </label>
          <label className="switchrow">
            <span>
              <b>Hide diagnosis details</b>
              <small>Only broad support topics will show.</small>
            </span>
            <input type="checkbox" />
          </label>
        </Section>
        <Section title="Communication">
          <label>
            Email notifications
            <select>
              <option>Important updates only</option>
              <option>All updates</option>
              <option>None</option>
            </select>
          </label>
          <label>
            Preferred contact
            <select>
              <option>Messages</option>
              <option>Video calls</option>
              <option>Both</option>
            </select>
          </label>
        </Section>
        <button className="button">Save settings</button>
        {saved && <p className="success">✓ Preferences saved locally.</p>}
      </form>
    </AppShell>
  );
}

const pageContent: Record<string, { title: string; body: React.ReactNode }> = {
  about: {
    title: "About Mona’s Heart",
    body: (
      <>
        <p className="lead">
          Mona’s Heart is a standalone peer-support prototype built around a
          simple belief: lived experience can make a difficult health journey
          feel less lonely.
        </p>
        <h2>Support, not medical advice</h2>
        <p>
          Patients, survivor mentors, and caregivers can find thoughtful
          connections, ask questions, share lessons learned, and offer
          encouragement. The prototype does not diagnose, treat, or replace
          professional care.
        </p>
        <h2>Designed with dignity</h2>
        <p>
          We use warm, accessible design and put privacy choices in the hands of
          every community member.
        </p>
      </>
    ),
  },
  privacy: {
    title: "Privacy policy",
    body: (
      <>
        <p className="lead">Prototype policy · Last updated July 31, 2026</p>
        <h2>Use demo information only</h2>
        <p>
          This application uses local fictional demo data. It is not approved
          for real medical records, protected health information, or
          confidential personal data.
        </p>
        <h2>Your controls</h2>
        <p>
          You may hide your general location and diagnosis details, limit
          profile visibility, block users, report concerns, and require consent
          before document sharing.
        </p>
        <h2>Local prototype storage</h2>
        <p>
          Interactive additions may exist only during your browser session. No
          production health-data system is configured.
        </p>
      </>
    ),
  },
  terms: {
    title: "Terms of prototype use",
    body: (
      <>
        <h2>Purpose</h2>
        <p>
          Mona’s Heart demonstrates peer support features with fictional
          information. You must be at least 18 for this demo and agree not to
          enter real PHI.
        </p>
        <h2>Community conduct</h2>
        <p>
          Be kind, protect privacy, do not impersonate clinicians, and never
          offer diagnosis or emergency advice. Accounts or content may be
          suspended in the demo moderation flow.
        </p>
        <h2>No warranties</h2>
        <p>
          This prototype is provided for demonstration and does not provide
          medical or emergency services.
        </p>
      </>
    ),
  },
  safety: {
    title: "Safety at Mona’s Heart",
    body: (
      <>
        <Emergency />
        <h2>Community safety guidelines</h2>
        <ul>
          <li>
            Share only what feels comfortable and keep identifying details
            private.
          </li>
          <li>
            Peer stories are personal experience, not treatment recommendations.
          </li>
          <li>Never send medical records in prototype messaging.</li>
          <li>Block and report behavior that feels unsafe.</li>
          <li>Seek qualified professional care for medical questions.</li>
        </ul>
        <h2>Community rules</h2>
        <p>
          Lead with compassion. Respect boundaries. Do not discriminate, harass,
          solicit, or spread dangerous misinformation.
        </p>
      </>
    ),
  },
  wellness: {
    title: "Complementary and Integrative Wellness",
    body: (
      <>
        <p className="draft">
          Draft—requires review by qualified legal, privacy, security, and
          healthcare professionals before production use.
        </p>
        <h2>Supportive education</h2>
        <p>
          Nutrition, sleep, hydration, mindfulness, gentle activity, culturally
          rooted practices, and spiritual support may be topics to discuss with
          a qualified professional. Evidence for complementary approaches can be
          limited or mixed.
        </p>
        <div className="emergency">
          <AlertTriangle />
          <div>
            <b>Important interaction warning</b>
            <p>
              Complementary approaches are not replacements for prescribed
              medication, emergency treatment, surgery, cancer therapy, or
              professional medical care. Do not start, stop, reduce, increase,
              or replace medication based on information in Mona’s Heart.
            </p>
            <p>
              Natural does not necessarily mean safe. Herbs, vitamins, minerals,
              and supplements can interact with medications, anesthesia,
              laboratory tests, and medical conditions.
            </p>
            <p>
              This screening may not identify every interaction. A physician or
              pharmacist should review the complete medication and supplement
              list.
            </p>
          </div>
        </div>
        <h2>Questions to ask</h2>
        <ul>
          <li>
            Could this approach interact with my medications, surgery,
            pregnancy, condition, food, supplements, or lab tests?
          </li>
          <li>What is the quality and region applicability of the evidence?</li>
          <li>When was this information last professionally reviewed?</li>
        </ul>
      </>
    ),
  },
  medical: {
    title: "Medical disclaimer",
    body: (
      <>
        <p className="draft">
          Draft—requires review by qualified legal, privacy, security, and
          healthcare professionals before production use.
        </p>
        <p>
          Mona’s Heart provides peer support, educational information, and
          organizational tools. It does not provide medical advice, diagnosis,
          or treatment.
        </p>
        <p>
          Always consult a qualified healthcare professional regarding medical
          concerns or treatment decisions.
        </p>
        <Emergency />
      </>
    ),
  },
  accessibility: {
    title: "Accessibility statement",
    body: (
      <>
        <p className="draft">
          Draft—requires review by qualified legal, privacy, security, and
          healthcare professionals before production use.
        </p>
        <p>
          We target WCAG 2.2 AA principles but do not claim conformance. Please
          report barriers so they can be investigated.
        </p>
      </>
    ),
  },
  ai: {
    title: "AI disclosure",
    body: (
      <>
        <p className="draft">
          Draft—requires review by qualified legal, privacy, security, and
          healthcare professionals before production use.
        </p>
        <p>
          Mona’s Heart uses artificial intelligence to help organize
          information, explain general concepts, and support peer connections.
          AI output may be incomplete or incorrect and is not medical advice,
          diagnosis, or treatment.
        </p>
        <p>
          High-risk AI features are disabled unless configured, approved, and
          enabled. Human review is required before health content publication.
        </p>
      </>
    ),
  },
  hospital: {
    title: "Hospital and clinic notice",
    body: (
      <>
        <p className="draft">
          Draft—requires review by qualified legal, privacy, security, and
          healthcare professionals before production use.
        </p>
        <p>
          This prototype is not connected to an EHR and is not approved for
          clinical workflows or real patient data. Participating organizations
          require contracts, security review, authorization, consent, and
          operational governance.
        </p>
      </>
    ),
  },
  children: {
    title: "Children’s privacy notice",
    body: (
      <>
        <p className="draft">
          Draft—requires review by qualified legal, privacy, security, and
          healthcare professionals before production use.
        </p>
        <p>
          Minors mode is disabled. This prototype is intended only for adults
          using fictional information.
        </p>
      </>
    ),
  },
  emergency: {
    title: "Emergency resources",
    body: (
      <>
        <Emergency />
        <h2>In the United States</h2>
        <p>
          Call <b>911</b> for a medical emergency. Call or text <b>988</b> for
          the Suicide & Crisis Lifeline. If outside the United States, contact
          your local emergency service or crisis line.
        </p>
        <p>Mona’s Heart cannot monitor or respond to emergencies.</p>
      </>
    ),
  },
};
function InfoPage({ kind }: { kind: string }) {
  const x = pageContent[kind];
  return (
    <Public>
      <section className="legal">
        <span className="eyebrow">MONA’S HEART</span>
        <h1>{x.title}</h1>
        {x.body}
        <Disclaimer />
      </section>
    </Public>
  );
}
function NotFound() {
  return (
    <Public>
      <div className="empty page404">
        <Heart />
        <h1>We couldn’t find that page</h1>
        <p>Let’s bring you back to a familiar place.</p>
        <Link className="button" to="/">
          Return home
        </Link>
      </div>
    </Public>
  );
}
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/signup" element={<Auth signup />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/matches" element={<Matches />} />
      <Route path="/matches/:id" element={<Profile />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/messages/:id" element={<Conversation />} />
      <Route path="/calls" element={<Calls />} />
      <Route path="/call-room" element={<CallRoom />} />
      <Route path="/documents" element={<Documents />} />
      <Route path="/labs" element={<Labs />} />
      <Route path="/notes" element={<Notes />} />
      <Route path="/medications" element={<Medications />} />
      <Route path="/timeline" element={<Timeline />} />
      <Route path="/health-profile" element={<HealthProfile />} />
      <Route path="/groups" element={<Groups />} />
      <Route path="/groups/:name" element={<Group />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/settings" element={<Settings />} />
      {Object.keys(pageContent).map((k) => (
        <Route path={`/${k}`} element={<InfoPage kind={k} />} />
      ))}
      <Route path="/forgot-password" element={<Navigate to="/login" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("/sw.js").catch(() => undefined),
  );
}
