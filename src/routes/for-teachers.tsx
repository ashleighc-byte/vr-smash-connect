import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import QRCodeLib from "qrcode";

export const Route = createFileRoute("/for-teachers")({
  head: () => ({ meta: [{ title: "For Teachers — VR Table Tennis Tournament" }] }),
  component: ForTeachersPage,
});

/* ── Design tokens (Eleven VR palette, warmer) ── */
const C = {
  black: "#1a1a1a",
  red: "#d42b2b",
  redDK: "#a81e1e",
  redLT: "#fef0f0",
  white: "#fff",
  bg: "#f8f7f5",
  mid: "#555",
  midLT: "#888",
  border: "#e0ddd9",
  cardBg: "#fff",
  green: "#1a7a4a",
  blue: "#1e5fa8",
  blueLT: "#eef4fb",
};

const R = 8;
const R_SM = 6;

/* ── Page ── */
function ForTeachersPage() {
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    QRCodeLib.toDataURL("https://gamefit-vr.lovable.app/signup", {
      width: 240,
      margin: 2,
      color: { dark: C.black, light: C.white },
    }).then(setQrUrl);
  }, []);

  return (
    <div style={{ background: C.bg, color: C.black, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 16, lineHeight: 1.6 }}>
      {/* ── Header ── */}
      <header style={{ background: C.black, color: C.white, padding: "1rem 1.5rem", borderBottom: `3px solid ${C.red}` }}>
        <div style={{ maxWidth: 840, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, letterSpacing: "0.02em", textTransform: "uppercase", fontSize: 13 }}>
            <span style={{ background: C.red, padding: "2px 8px", marginRight: 8, fontWeight: 900 }}>E</span>
            For teachers
          </span>
          <a href="/" style={{ color: C.midLT, fontSize: 13, textDecoration: "none" }}>← Main site</a>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "3rem 1.5rem 5rem" }}>
        {/* ── Hero ── */}
        <Hero />

        {/* ── 4 Cards ── */}
        <FourCards />

        {/* ── Divider line ── */}
        <div style={{ textAlign: "center", margin: "2rem 0", color: C.midLT, fontSize: 15, fontWeight: 600, fontStyle: "italic" }}>
          That's it. Everything else is on us.
        </div>

        {/* ── Timeline ── */}
        <SectionTitle>What will actually happen</SectionTitle>
        <p style={{ color: C.mid, marginBottom: "1.5rem", fontSize: 15 }}>
          Here's how the pilot plays out on your calendar. Your involvement is highlighted so you can see exactly where you fit in.
        </p>
        <Timeline />

        {/* ── FAQ ── */}
        <SectionTitle>What about…</SectionTitle>
        <p style={{ color: C.mid, marginBottom: "1.5rem", fontSize: 15 }}>
          Five questions teachers ask us every time. Honest answers.
        </p>
        <FaqSection />

        {/* ── Ready-to-use assets ── */}
        <SectionTitle>Ready-to-use assets</SectionTitle>
        <p style={{ color: C.mid, marginBottom: "1.5rem", fontSize: 15 }}>
          Four things you can copy and send in under a minute each. No rewriting.
        </p>
        <AssetCards />

        {/* ── Sign-up QR code ── */}
        <SectionTitle>Share this with students</SectionTitle>
        <p style={{ color: C.mid, marginBottom: "1.5rem", fontSize: 15 }}>
          Display this QR code on your classroom screen or print it on the poster so students can sign up right from their phone.
        </p>
        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: R, padding: "2rem", textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: 13, color: C.midLT, marginBottom: "1rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Scan to sign up</div>
          {qrUrl ? (
            <img src={qrUrl} alt="QR code for sign-up page" style={{ width: 200, height: 200, borderRadius: 4, boxShadow: "0 2px 12px rgba(0,0,0,0.1)" }} />
          ) : (
            <div style={{ width: 200, height: 200, margin: "0 auto", background: C.bg, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: C.midLT, fontSize: 13 }}>Generating…</div>
          )}
          <div style={{ marginTop: "1rem" }}>
            <CopyButton label="Copy link" text="https://gamefit-vr.lovable.app/signup" />
          </div>
        </div>

        {/* ── Contact ── */}
        <SectionTitle>Get in touch</SectionTitle>
        <p style={{ color: C.mid, marginBottom: "1.25rem", fontSize: 15 }}>
          Two people who know this pilot inside out. Text or call either of us — we'll get back to you same day.
        </p>
        <ContactSection />
      </div>
    </div>
  );
}

/* ── Hero ── */
function Hero() {
  return (
    <div style={{ marginBottom: "2.5rem" }}>
      <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.red, marginBottom: "0.75rem" }}>
        School staff guide
      </div>
      <h1 style={{ fontSize: "2rem", fontWeight: 900, lineHeight: 1.25, margin: 0, marginBottom: "1rem", letterSpacing: "-0.02em" }}>
        Here's exactly what we need from you
      </h1>
      <p style={{ fontSize: "1.05rem", color: C.mid, lineHeight: 1.55, maxWidth: 600, margin: 0 }}>
        Sport Waikato and Beyond are running this tournament. Your job is to open the door.
      </p>
    </div>
  );
}

/* ── Four numbered cards ── */
const CARD_DATA = [
  { num: 1, title: "Book a room with a screen", body: "40 minutes. 3 lunchtimes a week. A space big enough for a table and a TV or projector. That's your venue." },
  { num: 2, title: "Put the notice in your bulletin", body: 'One copy-paste into your school bulletin system. The text is ready below — just paste and send. Takes 30 seconds.' },
  { num: 3, title: "Be there when we arrive", body: "Beyond brings the headsets and handles all the tech. We just need you in the room for supervision. You don't need to know anything about VR." },
  { num: 4, title: "Fill in a 5-minute feedback form", body: "After the tournament, one short form about how it went. Your opinion shapes whether this keeps running." },
];

function FourCards() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "0.5rem" }}>
      {CARD_DATA.map(card => (
        <div key={card.num} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: R, padding: "1.5rem 1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.black, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, marginBottom: "1rem" }}>
            {card.num}
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.5rem", lineHeight: 1.3 }}>{card.title}</div>
          <div style={{ fontSize: 14, color: C.mid, lineHeight: 1.5 }}>{card.body}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Section heading ── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, marginBottom: "0.5rem", marginTop: "3rem" }}>{children}</h2>;
}

/* ── Timeline ── */
const TIMELINE = [
  { icon: "📢", label: "Week of 27 July", title: "Posters go up. Sign-ups open.", detail: "We put up posters in your school and students start signing up online. You don't need to do anything yet.", teacher: false },
  { icon: "🎮", label: "Week of 10 August", title: "Students run school playoffs at lunchtime.", detail: "Your students play each other using our headsets. Beyond staff are available by phone if anything goes wrong.", teacher: true, teacherNote: "Your job: be in the room." },
  { icon: "🏆", label: "31 August – 4 September", title: "Tournament week.", detail: "The four school champions go head-to-head. Beyond staff are physically at your school on the match day to run everything.", teacher: true, teacherNote: "Your job: open the door, stay for supervision." },
  { icon: "📝", label: "Week of 7 September", title: "Feedback form arrives.", detail: "We send you a short 5-minute form. Click the link, answer a few questions, done.", teacher: true, teacherNote: "Your job: fill it in." },
];

function Timeline() {
  return (
    <div style={{ position: "relative", paddingLeft: "2.5rem" }}>
      {/* Vertical line */}
      <div style={{ position: "absolute", left: 18, top: 8, bottom: 8, width: 2, background: C.border, borderRadius: 1 }} />
      {TIMELINE.map((item, i) => (
        <div key={i} style={{ position: "relative", marginBottom: i < TIMELINE.length - 1 ? "1.5rem" : 0 }}>
          {/* Circle */}
          <div style={{ position: "absolute", left: "-2.5rem", top: 4, width: 36, height: 36, borderRadius: "50%", background: item.teacher ? C.red : C.black, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, zIndex: 1 }}>
            {item.icon}
          </div>
          <div style={{ background: item.teacher ? C.redLT : C.cardBg, border: `1px solid ${item.teacher ? C.red : C.border}`, borderRadius: R_SM, padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: item.teacher ? C.red : C.midLT, marginBottom: "0.2rem" }}>{item.label}</div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.3rem" }}>{item.title}</div>
            <div style={{ fontSize: 14, color: C.mid, lineHeight: 1.5 }}>{item.detail}</div>
            {item.teacherNote && (
              <div style={{ marginTop: "0.5rem", fontSize: 13, fontWeight: 700, color: C.red }}>
                {item.teacherNote}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── FAQ ── */
const FAQ = [
  { q: "What if the tech breaks?", a: "Beyond are on-site during tournament week and available by phone during practice sessions. You'll have a direct number before the first session." },
  { q: "I've never used a VR headset — is that a problem?", a: "No. Beyond will walk you through it in a 10-minute orientation before your first session. There's also a short video guide available." },
  { q: "Do I need to get parent permission?", a: "We recommend a brief note home before the first session. A ready-to-send template is below — copy, paste, send." },
  { q: "Will this cost the school anything?", a: "No. This pilot is fully funded through the Active As KC Cluster budget." },
  { q: "What if not many students sign up?", a: "Even 4 students is enough for a bracket. The house points and bulletin notice do the recruiting — you don't need to chase students." },
];

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      {FAQ.map((faq, i) => (
        <div key={i} style={{ borderBottom: `1px solid ${C.border}`, padding: "0.75rem 0" }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{ width: "100%", background: "none", border: 0, padding: "0.5rem 0", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", fontFamily: "inherit", fontSize: 15, fontWeight: 600, color: C.black, gap: "1rem" }}
          >
            <span>{faq.q}</span>
            <span style={{ fontSize: 18, fontWeight: 300, color: C.midLT, flexShrink: 0, transition: "transform 0.15s", transform: open === i ? "rotate(45deg)" : "rotate(0)" }}>+</span>
          </button>
          {open === i && (
            <div style={{ padding: "0.25rem 0 0.75rem", fontSize: 14, color: C.mid, lineHeight: 1.6 }}>
              {faq.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Asset cards ── */
const ASSET_BULLETIN = "VR Table Tennis is happening at [SCHOOL] this term — students are invited to try it at lunchtime on [DAYS] in [ROOM]. No experience needed, and house points are up for grabs. The four best players will represent our school in the Waikato interschool tournament in September.";

const ASSET_PARENT = "Your child has the opportunity to take part in a VR Table Tennis pilot programme running at school this term. Students will use VR headsets at lunchtime to practice and compete against each other, with the chance to represent our school in a Waikato-wide interschool tournament in early September. The programme is fully funded (no cost to you or the school), fully supervised, and all equipment is provided. If you have any questions, please contact the school office.";

const ASSET_PRINCIPAL = "We've been invited to take part in the Eleven VR Table Tennis pilot, run by Sport Waikato and Beyond, as part of the Active As KC Cluster programme. It's fully funded — no cost to the school — and involves students playing lunchtime VR table tennis sessions during Term 3. The tech and support are provided by Beyond staff, and all I need to do is book a room and put a notice in the bulletin. I'm happy to coordinate this — just letting you know it's happening.";

function AssetCards() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2.5rem" }}>
      <AssetCard icon="📋" title="Bulletin notice" body={ASSET_BULLETIN} />
      <AssetCard icon="📝" title="Parent note" body={ASSET_PARENT} />
      <AssetCard icon="✉️" title="Email to your principal" body={ASSET_PRINCIPAL} />
      <AssetCard icon="🔗" title="Sign-up link for students" body="gamefit-vr.lovable.app/signup" link />
    </div>
  );
}

function AssetCard({ icon, title, body, link }: { icon: string; title: string; body: string; link?: boolean }) {
  return (
    <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: R, padding: "1.25rem 1.5rem", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: 28, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.4rem" }}>{title}</div>
          <div style={{ fontSize: 14, color: C.mid, lineHeight: 1.55, marginBottom: "0.75rem" }}>{body}</div>
          <CopyButton label={link ? "Copy link" : "Copy text"} text={body} />
        </div>
      </div>
    </div>
  );
}

/* ── Copy button ── */
function CopyButton({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        background: copied ? C.green : C.black,
        color: C.white, border: 0, padding: "0.5rem 1rem", borderRadius: R_SM, fontSize: 13,
        fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
      }}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

/* ── Contact ── */
function ContactSection() {
  const people = [
    { name: "Kelly Oldridge", org: "Sport Waikato", email: "kellyo@sportwaikato.org.nz", phone: null },
    { name: "Jessica Manins", org: "Beyond", email: "jessica@beyond.fun", phone: "+64 27 514 9599" },
  ];
  return (
    <div style={{ background: C.black, color: C.white, borderRadius: R, padding: "2rem", textAlign: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "1.25rem" }}>
        {people.map(p => (
          <div key={p.name}>
            <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{p.name}</div>
            <div style={{ fontSize: 13, color: C.midLT, marginTop: 2 }}>{p.org}</div>
            <div style={{ fontSize: 14, marginTop: 6, color: C.red }}>
              <a href={`mailto:${p.email}`} style={{ color: C.white, textDecoration: "underline", textUnderlineOffset: 2 }}>{p.email}</a>
            </div>
            {p.phone && (
              <div style={{ fontSize: 14, marginTop: 2, color: C.midLT }}>or {p.phone}</div>
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 14, color: C.midLT, fontStyle: "italic", borderTop: `1px solid #333`, paddingTop: "1rem" }}>
        Text or call either of us. We'll get back to you same day.
      </div>
    </div>
  );
}
