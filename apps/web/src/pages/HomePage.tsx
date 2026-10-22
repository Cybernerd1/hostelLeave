/**
 * Home Page — "Campus, Connected."
 *
 * Editorial landing page for the AKGEC Hostel Leave Management Portal.
 * Authored against the real workflow: students submit leave requests,
 * parents review, institutional approvers process them in order, and
 * security verifies QR passes at the gate. The only public routes are
 * "/" and "/login" — every CTA points at one of them.
 */

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import './HomePage.css';

gsap.registerPlugin(ScrollTrigger);

// ─── Role directory (descriptions reflect implemented permissions) ──────────

interface RoleEntry {
  id: string;
  label: string;
  summary: string;
  points: string[];
}

const ROLES: RoleEntry[] = [
  {
    id: 'student',
    label: 'Student',
    summary: 'The applicant. Everything starts — and ends — at your desk.',
    points: [
      'Submit leave requests with dates, reason and destination',
      'Track every approval stage in real time',
      'Download the leave pass once approved',
      'Get notified as each decision comes in',
    ],
  },
  {
    id: 'parent',
    label: 'Parent / Guardian',
    summary: 'The first signature. Requests reach you before the institution.',
    points: [
      'Review your ward\u2019s leave requests',
      'Approve or decline with a recorded decision',
      'See the full history of past requests',
    ],
  },
  {
    id: 'warden',
    label: 'Warden',
    summary: 'The hostel\u2019s first institutional reviewer.',
    points: [
      'Work through a queue of pending approvals',
      'Browse and filter every leave in your hostel',
      'Read reports on leave patterns',
    ],
  },
  {
    id: 'chief_warden',
    label: 'Chief Warden',
    summary: 'Hostel administration and escalated approvals.',
    points: [
      'Approve escalated leave requests',
      'See every student and every warden across hostels',
      'Assign hostels to students and wardens',
      'Review leave reports for all residential blocks',
    ],
  },
  {
    id: 'hod',
    label: 'HOD',
    summary: 'Departmental oversight in the approval chain.',
    points: [
      'Approve department-level leaves',
      'Look up students in the department',
      'Read departmental leave reports',
    ],
  },
  {
    id: 'director',
    label: 'Director',
    summary: 'Institute-wide visibility.',
    points: [
      'Review all leave applications',
      'Read reports across the institute',
    ],
  },
  {
    id: 'guard',
    label: 'Security Guard',
    summary: 'The last checkpoint — where the pass meets the gate.',
    points: [
      'Scan the QR code on a student\u2019s leave pass',
      'Verify leave validity at exit and return',
      'Keep the gate log of movements',
    ],
  },
  {
    id: 'admin',
    label: 'Administrator',
    summary: 'Keeps the system itself running.',
    points: [
      'Manage students, parents, hostels and rooms',
      'Create staff accounts and assign roles',
      'Consult the full audit trail',
    ],
  },
];

// ─── Journey steps (actual workflow) ────────────────────────────────────────

const STEPS = [
  {
    n: '01',
    title: 'A student applies',
    body: 'Leave type, dates, destination, reason — filed from the portal in a couple of minutes, no paper slips.',
  },
  {
    n: '02',
    title: 'A parent reviews',
    body: 'Where the workflow requires it, the request reaches the parent or guardian first for approval.',
  },
  {
    n: '03',
    title: 'The institution follows',
    body: 'Warden, chief warden, HOD and the other approvers configured for the request review it in order — each decision recorded.',
  },
  {
    n: '04',
    title: 'The pass is issued',
    body: 'The student watches the status move, then carries the approved leave pass digitally.',
  },
  {
    n: '05',
    title: 'The gate confirms',
    body: 'Security scans the pass QR at exit and on return, closing the loop in the gate log.',
  },
];

// ─── Small shared bits ──────────────────────────────────────────────────────

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="hp-eyebrow">{children}</p>;
}

function ArrowRight() {
  return (
    <svg className="hp-btn__arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

// ─── Navigation ─────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const close = () => setOpen(false);

  return (
    <header className={`hp-nav ${scrolled ? 'hp-nav--scrolled' : ''} ${open ? 'hp-nav--open' : ''}`}>
      <div className="hp-nav__inner">
        <Link to="/" className="hp-brand" onClick={close} aria-label="Hostel Leave Portal — home">
          <img src="/images/campus/akgec-logo.png" alt="AKGEC logo" className="hp-brand__mark" width="34" height="34" />
          <span className="hp-brand__text">
            <strong>Hostel Leave Portal</strong>
            <span>Ajay Kumar Garg Engineering College</span>
          </span>
        </Link>

        <nav className="hp-nav__links" aria-label="Primary">
          <a href="#hostel-life">Hostel life</a>
          <a href="#how-it-works">How it works</a>
          <a href="#roles">Roles</a>
        </nav>

        <div className="hp-nav__cta">
          <Link to="/login" className="hp-btn hp-btn--ink hp-btn--sm">Sign in<ArrowRight /></Link>
          <button
            className="hp-nav__toggle"
            aria-expanded={open}
            aria-controls="hp-mobile-menu"
            onClick={() => setOpen(o => !o)}
          >
            <span className="hp-nav__toggle-line" />
            <span className="hp-visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>

      <div className="hp-mobile-menu" id="hp-mobile-menu" hidden={!open}>
        <a href="#hostel-life" onClick={close}>Hostel life</a>
        <a href="#how-it-works" onClick={close}>How it works</a>
        <a href="#roles" onClick={close}>Roles</a>
        <Link to="/login" className="hp-btn hp-btn--ink" onClick={close}>Sign in<ArrowRight /></Link>
      </div>
    </header>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="hp-hero" aria-label="Introduction">
      <div className="hp-hero__grid">
        <div className="hp-hero__copy">
          <Eyebrow>AKGEC · Hostel Services</Eyebrow>
          <h1 className="hp-hero__title">
            Your hostel life.
            <br />
            <em>A little less paperwork.</em>
          </h1>
          <p className="hp-hero__lede">
            The leave register moves online. Students submit requests, parents
            respond, and the college approves — in order, on record, without a
            single trip to the warden&rsquo;s desk.
          </p>
          <div className="hp-hero__actions">
            <Link to="/login" className="hp-btn hp-btn--ink">Access the portal<ArrowRight /></Link>
            <a href="#how-it-works" className="hp-link-quiet">How it works</a>
          </div>

          <div className="hp-hero__wayfinding" aria-hidden="true">
            <span className="hp-wayfinding__tick hp-wayfinding__tick--1" />
            <span className="hp-wayfinding__tick hp-wayfinding__tick--2" />
            <span className="hp-wayfinding__tick hp-wayfinding__tick--3" />
            <span className="hp-wayfinding__label">apply · approve · pass</span>
          </div>
        </div>

        <figure className="hp-hero__media hp-img-reveal">
          <div className="hp-hero__frame">
            <img
              src="/images/campus/campus-garden.jpg"
              alt="AKGEC campus buildings and gardens, students walking between blocks"
              width="934" height="584"
              fetchPriority="high"
            />
            <span className="hp-frame-grain" aria-hidden="true" />
          </div>
          <figcaption>Residential campus · Delhi&ndash;Meerut Road, Ghaziabad</figcaption>
        </figure>
      </div>

      <div className="hp-strip" role="presentation">
        <span>3 boys&rsquo; hostels</span>
        <span>3 girls&rsquo; hostels</span>
        <span>Parent approvals on record</span>
        <span>QR gate passes</span>
      </div>
    </section>
  );
}

// ─── Hostel life (photography) ──────────────────────────────────────────────

function HostelLife() {
  return (
    <section className="hp-life" id="hostel-life" aria-labelledby="hostel-life-title">
      <div className="hp-life__head">
        <Eyebrow>Where the passes go</Eyebrow>
        <h2 id="hostel-life-title" className="hp-section-title">
          Six hostels.
          <br />
          <em>One campus that lives here.</em>
        </h2>
      </div>

      <div className="hp-life__pair">
        <figure className="hp-life__figure hp-life__figure--big hp-img-reveal" data-parallax="0.06">
          <img
            src="/images/campus/boys-hostel-exterior.jpg"
            alt="Red-brick boys' hostel building with balconies, seen from the greenery outside"
            width="934" height="584" loading="lazy"
          />
          <span className="hp-frame-grain" aria-hidden="true" />
          <figcaption>Boys&rsquo; hostel blocks · BH1, BH2, BH3</figcaption>
        </figure>

        <figure className="hp-life__figure hp-life__figure--small hp-img-reveal" data-parallax="-0.05">
          <img
            src="/images/campus/girls-hostel-exterior.jpg"
            alt="Girls' hostel buildings seen across a wide green lawn"
            width="934" height="584" loading="lazy"
          />
          <span className="hp-frame-grain" aria-hidden="true" />
          <figcaption>Girls&rsquo; hostels · GH1, GH2, GH3</figcaption>
        </figure>
      </div>

      <div className="hp-life__trio">
        <figure className="hp-life__figure hp-img-reveal">
          <img
            src="/images/campus/common-room-reading.jpg"
            alt="Students reading together in a hostel common room"
            width="934" height="622" loading="lazy"
          />
          <figcaption>Common room, evening prep</figcaption>
        </figure>
        <figure className="hp-life__figure hp-img-reveal">
          <img
            src="/images/campus/common-room-tabletennis.jpg"
            alt="Students gathered around a table tennis match in a common room"
            width="934" height="622" loading="lazy"
          />
          <figcaption>Table tennis, common room</figcaption>
        </figure>
        <figure className="hp-life__figure hp-img-reveal">
          <img
            src="/images/campus/student-mess.jpg"
            alt="Students seated at long tables in the hostel mess"
            width="934" height="622" loading="lazy"
          />
          <figcaption>The mess at lunch hour</figcaption>
        </figure>
      </div>
    </section>
  );
}

// ─── Journey ────────────────────────────────────────────────────────────────

function Journey() {
  return (
    <section className="hp-journey" id="how-it-works" aria-labelledby="journey-title">
      <div className="hp-journey__intro">
        <Eyebrow>How it works</Eyebrow>
        <h2 id="journey-title" className="hp-section-title">
          From application
          <br />
          <em>to gate pass.</em>
        </h2>
        <p className="hp-journey__lede">
          Every request follows the same visible path. No chasing signatures —
          each stage notifies the next, and the record stays intact.
        </p>
      </div>

      <div className="hp-journey__steps-wrap">
        <span className="hp-journey__rail" aria-hidden="true">
          <span className="hp-journey__progress" />
        </span>
        <ol className="hp-journey__steps">
          {STEPS.map(step => (
            <li className="hp-step" key={step.n}>
              <span className="hp-step__node" aria-hidden="true" />
              <span className="hp-step__num">{step.n}</span>
              <div className="hp-step__body">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ─── Roles ──────────────────────────────────────────────────────────────────

function Roles() {
  const [active, setActive] = useState(0);
  const role = ROLES[active];
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    setActive(prev => {
      const next = e.key === 'ArrowDown'
        ? (prev + 1) % ROLES.length
        : (prev - 1 + ROLES.length) % ROLES.length;
      const btn = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
      btn?.focus();
      return next;
    });
  }, []);

  return (
    <section className="hp-roles" id="roles" aria-labelledby="roles-title">
      <div className="hp-roles__head">
        <Eyebrow>Who uses it</Eyebrow>
        <h2 id="roles-title" className="hp-section-title">
          One portal.
          <br />
          <em>Everyone it serves.</em>
        </h2>
      </div>

      <div className="hp-roles__layout">
        <div className="hp-roles__list" role="tablist" aria-label="Portal roles" ref={listRef} onKeyDown={onKeyDown}>
          {ROLES.map((r, i) => (
            <button
              key={r.id}
              role="tab"
              id={`hp-role-tab-${r.id}`}
              aria-selected={i === active}
              aria-controls="hp-role-panel"
              tabIndex={i === active ? 0 : -1}
              className={`hp-roles__item ${i === active ? 'is-active' : ''}`}
              onClick={() => setActive(i)}
            >
              <span className="hp-roles__index">{String(i + 1).padStart(2, '0')}</span>
              {r.label}
            </button>
          ))}
        </div>

        <div className="hp-roles__panel" role="tabpanel" id="hp-role-panel" aria-labelledby={`hp-role-tab-${role.id}`}>
          <p className="hp-roles__summary">{role.summary}</p>
          <ul className="hp-roles__points">
            {role.points.map(p => <li key={p}>{p}</li>)}
          </ul>
          <Link to={`/login?role=${role.id}`} className="hp-link-quiet hp-roles__signin">
            Sign in as {role.label.toLowerCase()}<ArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Product preview ────────────────────────────────────────────────────────

function Preview() {
  return (
    <section className="hp-preview" aria-labelledby="preview-title">
      <div className="hp-preview__head">
        <Eyebrow>Inside the portal</Eyebrow>
        <h2 id="preview-title" className="hp-section-title">
          A record, <em>not a rumour.</em>
        </h2>
        <p className="hp-preview__lede">
          Every request shows where it stands and who holds it next. This is the
          approval trail you&rsquo;ll actually see.
        </p>
      </div>

      <div className="hp-preview__frame" aria-label="Illustration of a leave request status view">
        <div className="hp-preview__chrome" aria-hidden="true">
          <span className="hp-preview__chrome-title">Hostel Leave Portal · leave request</span>
        </div>
        <div className="hp-preview__body">
          <div className="hp-preview__meta">
            <div>
              <span className="hp-preview__label">Leave type</span>
              <span className="hp-preview__value">Home leave</span>
            </div>
            <div>
              <span className="hp-preview__label">Duration</span>
              <span className="hp-preview__value">Fri — Mon</span>
            </div>
            <div>
              <span className="hp-preview__label">Status</span>
              <span className="hp-preview__value hp-preview__value--pending">Awaiting warden</span>
            </div>
          </div>

          <ol className="hp-preview__timeline">
            <li className="is-done">
              <span className="hp-preview__dot" aria-hidden="true" />
              <div><strong>Submitted</strong><span>Request filed by the student</span></div>
            </li>
            <li className="is-done">
              <span className="hp-preview__dot" aria-hidden="true" />
              <div><strong>Parent</strong><span>Approved · on record</span></div>
            </li>
            <li className="is-current">
              <span className="hp-preview__dot" aria-hidden="true" />
              <div><strong>Warden</strong><span>Review in progress</span></div>
            </li>
            <li>
              <span className="hp-preview__dot" aria-hidden="true" />
              <div><strong>Chief warden / HOD</strong><span>Next in the chain</span></div>
            </li>
            <li>
              <span className="hp-preview__dot hp-preview__dot--qr" aria-hidden="true" />
              <div><strong>Gate pass</strong><span>QR issued on approval · verified at the gate</span></div>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}

// ─── Closing CTA + footer ───────────────────────────────────────────────────

function Closing() {
  return (
    <>
      <section className="hp-closing" aria-labelledby="closing-title">
        <h2 id="closing-title">Ready to manage<br /><em>your hostel leave?</em></h2>
        <Link to="/login" className="hp-btn hp-btn--yellow">Sign in to the portal<ArrowRight /></Link>
        <p className="hp-closing__note">
          Accounts are managed by the college. Sign in with the credentials
          issued to you.
        </p>
      </section>

      <footer className="hp-footer">
        <div className="hp-footer__brand">
          <img src="/images/campus/akgec-logo.png" alt="" className="hp-brand__mark" width="30" height="30" />
          <div>
            <strong>Hostel Leave Portal</strong>
            <span>Ajay Kumar Garg Engineering College, Ghaziabad</span>
          </div>
        </div>
        <nav className="hp-footer__links" aria-label="Footer">
          <Link to="/login">Sign in</Link>
          <a href="#hostel-life">Hostel life</a>
          <a href="#how-it-works">How it works</a>
          <a href="#roles">Roles</a>
        </nav>
        <p className="hp-footer__note">
          Photographs: AKGEC official website (akgec.ac.in) · © {new Date().getFullYear()}
        </p>
      </footer>
    </>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const narrow = window.matchMedia('(max-width: 820px)').matches;

    const ctx = gsap.context(() => {
      if (reduce) return; // default CSS state is fully readable — nothing to undo

      // Entrance: hero copy then image reveal
      gsap.from('.hp-hero__copy > *', {
        y: 26, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.09, delay: 0.1,
      });
      gsap.from('.hp-hero__media', {
        clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'power4.inOut', delay: 0.25,
      });
      gsap.from('.hp-hero__frame img', {
        scale: 1.12, duration: 1.4, ease: 'power3.out', delay: 0.25,
      });
      gsap.from('.hp-strip span', { opacity: 0, y: 12, duration: 0.6, stagger: 0.07, delay: 0.7 });

      // Image reveals: unclip as each enters
      gsap.utils.toArray<HTMLElement>('.hp-img-reveal:not(.hp-hero__media)').forEach(fig => {
        gsap.from(fig, {
          clipPath: 'inset(0 0 18% 0)',
          opacity: 0.4,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: fig, start: 'top 88%' },
        });
      });

      // Section headings
      gsap.utils.toArray<HTMLElement>('.hp-section-title, .hp-journey__intro, .hp-roles__head, .hp-preview__head').forEach(el => {
        gsap.from(el, {
          y: 30, opacity: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%' },
        });
      });

      // Journey: progress line draws with scroll; steps light up
      gsap.fromTo('.hp-journey__progress',
        { scaleY: 0 },
        {
          scaleY: 1, ease: 'none',
          scrollTrigger: {
            trigger: '.hp-journey__steps',
            start: 'top 70%',
            end: 'bottom 55%',
            scrub: 0.4,
          },
        });
      gsap.utils.toArray<HTMLElement>('.hp-step').forEach(step => {
        ScrollTrigger.create({
          trigger: step,
          start: 'top 65%',
          onEnter: () => step.classList.add('is-active'),
          onLeaveBack: () => step.classList.remove('is-active'),
        });
      });

      // Restrained parallax on offset figures (desktop only)
      if (!narrow) {
        gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach(fig => {
          const depth = parseFloat(fig.dataset.parallax || '0');
          gsap.fromTo(fig, { y: depth * -260 }, {
            y: depth * 260, ease: 'none',
            scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: 0.5 },
          });
        });
      }
    }, rootRef);

    // Lenis smooth scrolling, synchronized with ScrollTrigger
    let lenis: Lenis | null = null;
    if (!reduce) {
      lenis = new Lenis({ duration: 1.05, touchMultiplier: 1.4 });
      lenis.on('scroll', ScrollTrigger.update);
      const tick = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

    return () => {
      ctx.revert();
      lenis?.destroy();
    };
  }, []);

  return (
    <div className="hp" ref={rootRef}>
      <Nav />
      <main>
        <Hero />
        <HostelLife />
        <Journey />
        <Roles />
        <Preview />
        <Closing />
      </main>
    </div>
  );
}
