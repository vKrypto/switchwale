import { useEffect, useRef, useState } from 'react';
import { motion, MotionConfig, useScroll, useTransform, type MotionValue, type Variants } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  FileText,
  Mail,
  Calendar,
  Send,
  LayoutDashboard,
  GraduationCap,
  Briefcase,
  Search,
  TrendingUp,
  Upload,
  Radar,
  Zap,
  MessageSquare,
  PhoneCall,
  Mic,
  Users,
  Globe,
} from 'lucide-react';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';
import AnimatedCounter from './components/AnimatedCounter';
import AgentCharacter from './components/AgentCharacter';

const CONTACT_URL = '/contact/';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function useViewportSize() {
  const [size, setSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

// The bot's screen position is driven by whole-page scroll progress (0 → 1)
// as a sequence of waypoints it glides between:
//  1. Hero (progress 0): full-size, centered near the top.
//  2. One waypoint per content section (progress DOCK_START..CTA_START): a
//     small badge anchored next to that section's heading, alternating
//     left/right margins so the bot visibly travels across the page and
//     stays attached to whichever section is current — instead of parking
//     in one fixed corner while you read. Each section's own breakpoint is
//     its real scroll position (not an even split), so sections of very
//     different lengths (e.g. the multi-step timeline) still hand off to
//     the bot right as they reach the top of the viewport.
//  3. CTA (progress CTA_START..1): flies back in — bigger again — to sit
//     next to the closing "Get started" button.
// Coordinates are the box's top-left corner; since scale/rotate share the
// default center transform-origin, computing "center point minus half the
// (always-unscaled) box size" keeps it visually centered through scaling.
const HEADER_HEIGHT = 64;
const HERO_TOP_OFFSET = 80;
const DOCK_SIZE = 72;
const DOCK_MARGIN = 20;
const CTA_SIZE = 140;
const CTA_GAP = 48;
const DOCK_START = 0.15;
const CTA_START = 0.85;

type Waypoint = { cx: number; cy: number; scale: number; rotate: number };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

function useCharacterMotion(
  scrollYProgress: MotionValue<number>,
  sectionRefs: React.RefObject<HTMLElement>[],
  ctaRef: React.RefObject<HTMLElement>,
) {
  const { width: vw, height: vh } = useViewportSize();
  const baseSize = vw < 640 ? 256 : 320;

  const heroWaypoint: Waypoint = {
    cx: vw / 2,
    cy: HEADER_HEIGHT + HERO_TOP_OFFSET + baseSize / 2,
    scale: 1,
    rotate: 0,
  };
  const dockScale = DOCK_SIZE / baseSize;
  const ctaScale = CTA_SIZE / baseSize;
  const safeTop = HEADER_HEIGHT + DOCK_MARGIN + DOCK_SIZE / 2;
  const safeBottom = vh - DOCK_MARGIN - DOCK_SIZE / 2;
  const rightX = vw - DOCK_MARGIN - DOCK_SIZE / 2;
  const leftX = DOCK_MARGIN + DOCK_SIZE / 2;

  function ctaWaypoint(): Waypoint {
    const rect = ctaRef.current?.getBoundingClientRect();
    return {
      cx: rect ? rect.right + CTA_GAP : rightX,
      cy: rect ? rect.top + rect.height / 2 : safeBottom,
      scale: ctaScale,
      rotate: 6,
    };
  }

  // Reads every section's live heading position each call — both for its
  // breakpoint (rect.top + scrollY is the section's fixed document
  // position, so dividing by the scrollable height gives the progress
  // value at which it reaches the viewport top) and its on-screen anchor —
  // so timing and position both track real layout instead of a fixed split.
  function stateAt(progress: number): Waypoint {
    const totalScrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const breakpoints = [0];
    const waypoints: Waypoint[] = [heroWaypoint];
    sectionRefs.forEach((ref, index) => {
      const rect = ref.current?.getBoundingClientRect();
      const onRight = index % 2 === 0;
      const sectionProgress = rect ? (window.scrollY + rect.top) / totalScrollable : DOCK_START;
      breakpoints.push(clamp(sectionProgress, DOCK_START, CTA_START));
      // Anchor to the section's own edge, not the viewport's, so the bot
      // never travels past that section's actual content width.
      const edgeX = rect ? (onRight ? rect.right - DOCK_SIZE / 2 : rect.left + DOCK_SIZE / 2) : onRight ? rightX : leftX;
      waypoints.push({
        cx: edgeX,
        cy: clamp(rect ? rect.top : safeBottom, safeTop, safeBottom),
        scale: dockScale,
        rotate: onRight ? -10 : 10,
      });
    });
    breakpoints.push(1);
    waypoints.push(ctaWaypoint());

    let i = 0;
    while (i < breakpoints.length - 2 && progress > breakpoints[i + 1]) i++;
    const t = (progress - breakpoints[i]) / (breakpoints[i + 1] - breakpoints[i] || 1);
    const a = waypoints[i];
    const b = waypoints[i + 1];
    return {
      cx: lerp(a.cx, b.cx, t),
      cy: lerp(a.cy, b.cy, t),
      scale: lerp(a.scale, b.scale, t),
      rotate: lerp(a.rotate, b.rotate, t),
    };
  }

  const x = useTransform(scrollYProgress, (p) => stateAt(p).cx - baseSize / 2);
  const y = useTransform(scrollYProgress, (p) => stateAt(p).cy - baseSize / 2);
  const scale = useTransform(scrollYProgress, (p) => stateAt(p).scale);
  const rotate = useTransform(scrollYProgress, (p) => stateAt(p).rotate);

  return { x, y, scale, rotate };
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const viewportOnce = { once: true, amount: 0.15 } as const;

type Audience = {
  icon: typeof GraduationCap;
  title: string;
  description: string;
};

const AUDIENCES: Audience[] = [
  {
    icon: GraduationCap,
    title: 'New grad',
    description: 'No network, no idea which of 500 postings are even worth your time. Let the agent find out for you.',
  },
  {
    icon: Briefcase,
    title: 'Experienced professional',
    description: "You know your worth. You don't have hours a day to prove it to an ATS, one rewrite at a time.",
  },
  {
    icon: Search,
    title: 'Between jobs',
    description: "Every day matters. Apply to hundreds of tailored roles at once, not the dozen you'd manage by hand.",
  },
  {
    icon: TrendingUp,
    title: 'Employed, looking for better',
    description: "Quietly explore better offers in the background while you're still doing your current job.",
  },
];

type JourneyStep = {
  step: string;
  title: string;
  description: string;
  image: string;
  note?: string;
};

const JOURNEY: JourneyStep[] = [
  {
    step: '1',
    title: 'Paste your resume',
    description: 'One upload. The agent reads it once and reuses it everywhere — every tailored resume starts here.',
    image: '/landing/profile-optimizer-resume-on-file.png',
  },
  {
    step: '2',
    title: 'Set your preferences',
    description: 'Roles, locations, salary, interview availability — set it once and the agent respects it every time.',
    image: '/landing/settings-interview-availability.png',
  },
  {
    step: '3',
    title: 'Wait for the interview call',
    description:
      "The agent applies, follows up, and requests referrals in the background. You just acknowledge actions in one click and watch your calendar fill itself.",
    image: '/landing/actions-inbox-one-click.png',
    note: 'Interview invites land on your calendar automatically — no manual entry.',
  },
];

type FlowNode = {
  icon: typeof Upload;
  title: string;
  description: string;
};

const FLOW: FlowNode[] = [
  {
    icon: Upload,
    title: 'Paste your resume & set preferences',
    description: 'One upload, your target roles, locations, salary, and interview availability — set once.',
  },
  {
    icon: Radar,
    title: 'The agent finds every matching job',
    description: 'Naukri, LinkedIn, Instahyre, JSearch — plus market intel on what recruiters are actually searching for.',
  },
  {
    icon: Sparkles,
    title: 'AI tailors a resume + cover letter for each one',
    description: 'Every application gets its own ATS-scored resume and cover letter, rewritten to match that exact JD.',
  },
  {
    icon: Zap,
    title: 'Auto-apply fires across every channel',
    description: "No click required — new matches get applied to the moment they're found.",
  },
  {
    icon: Send,
    title: 'Referral requests go out in parallel',
    description: 'Personalized asks to recruiters and hiring managers by email and LinkedIn, in your voice.',
  },
  {
    icon: MessageSquare,
    title: 'Recruiters reply — AI drafts your reply',
    description: 'Every conversation lands in one inbox; anything that needs you shows up in your one-click Actions list.',
  },
  {
    icon: Calendar,
    title: 'Interviews land on your calendar automatically',
    description: 'Parsed straight out of your inbox — no manual entry, ever.',
  },
  {
    icon: PhoneCall,
    title: 'You get the call.',
    description: "That's it. You just show up.",
  },
];

type Feature = {
  icon: typeof Sparkles;
  title: string;
  description: string;
  image: string;
};

const FEATURES: Feature[] = [
  {
    icon: Sparkles,
    title: 'Multi-channel auto-apply',
    description: 'Naukri, LinkedIn, Instahyre, JSearch — new matching jobs get applied to automatically, no click required.',
    image: '/landing/job-detail-auto-apply.png',
  },
  {
    icon: FileText,
    title: 'AI-tailored resume + ATS score',
    description: 'Every application gets its own resume, rewritten to match the JD, scored against it. 2,200+ generated so far.',
    image: '/landing/job-resumes-ats-score.png',
  },
  {
    icon: FileText,
    title: 'AI cover letter, on demand',
    description: 'Paste the JD, get a tailored cover letter as a polished PDF. No template, no writer’s block.',
    image: '/landing/resume-maker-cover-letter.png',
  },
  {
    icon: LayoutDashboard,
    title: 'One dashboard, every platform',
    description: 'Every application and its status, tracked automatically across every connected job board.',
    image: '/landing/dashboard-overview.png',
  },
  {
    icon: Mail,
    title: 'AI Reply on every conversation',
    description: 'A recruiter pings you anywhere — one click drafts a reply that sounds like you, not a bot.',
    image: '/landing/instahyre-conversations-ai-reply.png',
  },
  {
    icon: Send,
    title: 'Referrals sent for you',
    description: 'Personalized referral requests to recruiters and hiring managers, sent in your voice, at scale.',
    image: '/landing/referral-email-sent.png',
  },
];

type Metric = {
  value: number;
  suffix: string;
  label: string;
};

const METRICS: Metric[] = [
  { value: 20000, suffix: '+', label: 'Jobs tracked for you every month' },
  { value: 1000, suffix: '+', label: 'Jobs applied to per month' },
  { value: 500, suffix: '+', label: "Where you're a top applicant" },
  { value: 400, suffix: '+', label: 'Referral requests sent per month' },
  { value: 200, suffix: '', label: 'Recruiter calls' },
  { value: 50, suffix: '', label: 'Interviews scheduled' },
];

type RoadmapItem = {
  icon: typeof PhoneCall;
  title: string;
  description: string;
};

const ROADMAP: RoadmapItem[] = [
  {
    icon: PhoneCall,
    title: 'A referral bot that calls',
    description: 'Real outbound calls asking for a referral, not just an email.',
  },
  {
    icon: Mic,
    title: 'Auto-transcribed calls & WhatsApp',
    description: 'Every recruiter call and WhatsApp thread transcribed straight into an updated application status.',
  },
  {
    icon: Users,
    title: 'Team & coach mode',
    description: 'Manage pipelines for multiple candidates on the same engine.',
  },
  {
    icon: Globe,
    title: 'More platforms',
    description: 'Indeed, Wellfound, Hirist, Foundit — same playbook, new connectors.',
  },
];

function SectionHeading({
  eyebrow,
  title,
  headingRef,
}: {
  eyebrow: string;
  title: string;
  headingRef?: React.RefObject<HTMLDivElement>;
}) {
  return (
    <motion.div ref={headingRef} variants={fadeUp} className="text-center mb-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-500">{eyebrow}</p>
      <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
    </motion.div>
  );
}

function JourneyFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start end', 'end start'] });

  return (
    <div ref={containerRef} className="relative">
      <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800" aria-hidden="true" />
      <motion.div
        className="absolute left-6 top-0 w-px bg-brand-600 origin-top"
        style={{ scaleY: scrollYProgress, height: '100%' }}
        aria-hidden="true"
      />
      <div className="space-y-10">
        {FLOW.map((node, i) => (
          <motion.div
            key={node.title}
            className="relative flex gap-6"
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.4, delay: (i % 4) * 0.05 }}
          >
            <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
              <node.icon size={20} />
            </div>
            <div className="pt-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{node.title}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{node.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const [energized, setEnergized] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const audiencesHeadingRef = useRef<HTMLDivElement>(null);
  const journeyHeadingRef = useRef<HTMLDivElement>(null);
  const journeyFlowHeadingRef = useRef<HTMLDivElement>(null);
  const featuresHeadingRef = useRef<HTMLDivElement>(null);
  const metricsHeadingRef = useRef<HTMLDivElement>(null);
  const roadmapHeadingRef = useRef<HTMLDivElement>(null);
  const sectionRefs = [
    audiencesHeadingRef,
    journeyHeadingRef,
    journeyFlowHeadingRef,
    featuresHeadingRef,
    metricsHeadingRef,
    roadmapHeadingRef,
  ];

  const { scrollYProgress } = useScroll();
  const character = useCharacterMotion(scrollYProgress, sectionRefs, ctaRef);

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <SiteHeader />

      {!reducedMotion && (
        <AgentCharacter
          energized={energized}
          reducedMotion={reducedMotion}
          onHoverStart={() => setEnergized(true)}
          onHoverEnd={() => setEnergized(false)}
          x={character.x}
          y={character.y}
          scale={character.scale}
          rotate={character.rotate}
        />
      )}

      <main>
      <motion.section
        className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {!reducedMotion && <div className="h-64 sm:h-80 mb-4" aria-hidden="true" />}
        <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          We chase it from every angle.
          <br />
          <span className="text-brand-600 dark:text-brand-500">You just show up.</span>
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Job hunting shouldn&rsquo;t be a second full-time job. SwitchWala applies, tailors, follows up, and
          requests referrals for you across every platform — while you do literally nothing.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-8 flex items-center justify-center gap-4">
          <a
            href={CONTACT_URL}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 transition-colors"
          >
            Get started &mdash; it&rsquo;s free
            <ArrowRight size={18} />
          </a>
          <a
            href={CONTACT_URL}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 font-semibold px-6 py-3 transition-colors"
          >
            Sign in
          </a>
        </motion.div>
      </motion.section>

      <motion.section
        className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-200 dark:border-gray-800"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        <SectionHeading
          eyebrow="Built for every kind of search"
          title="Whoever you are, this is for you"
          headingRef={audiencesHeadingRef}
        />
        <motion.div variants={staggerContainer} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {AUDIENCES.map((a) => (
            <motion.div
              key={a.title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 hover:shadow-lg dark:hover:shadow-black/30 transition-shadow"
            >
              <a.icon size={24} className="text-brand-600 dark:text-brand-500" />
              <h3 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">{a.title}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{a.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-200 dark:border-gray-800"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        <SectionHeading eyebrow="How it works" title="Three steps. That's it." headingRef={journeyHeadingRef} />
        <motion.div variants={staggerContainer} className="space-y-16">
          {JOURNEY.map((j) => (
            <motion.div key={j.step} variants={fadeUp} className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-600 text-white font-bold">
                  {j.step}
                </span>
                <h3 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">{j.title}</h3>
                <p className="mt-3 text-gray-600 dark:text-gray-400">{j.description}</p>
                {j.note && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-400 dark:text-gray-400">
                    <Calendar size={16} className="text-brand-600 dark:text-brand-500" />
                    {j.note}
                  </div>
                )}
              </div>
              <img
                src={j.image}
                alt=""
                loading="lazy"
                className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm w-full aspect-[3/2] object-cover object-top"
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-gray-200 dark:border-gray-800">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={viewportOnce}>
          <SectionHeading
            eyebrow="What we do for you"
            title="Your journey, start to interview call"
            headingRef={journeyFlowHeadingRef}
          />
        </motion.div>
        <JourneyFlow />
      </section>

      <motion.section
        className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-200 dark:border-gray-800"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        <SectionHeading
          eyebrow="What you get"
          title="Everything a job search needs, automated"
          headingRef={featuresHeadingRef}
        />
        <motion.div variants={staggerContainer} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden hover:shadow-lg dark:hover:shadow-black/30 transition-shadow"
            >
              <img src={f.image} alt="" loading="lazy" className="w-full h-40 object-cover object-top" />
              <div className="p-5">
                <f.icon size={20} className="text-brand-600 dark:text-brand-500" />
                <h3 className="mt-3 font-semibold text-gray-900 dark:text-gray-100">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{f.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <section className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={viewportOnce}>
            <SectionHeading
              eyebrow="Your month, projected"
              title="This could be your month"
              headingRef={metricsHeadingRef}
            />
          </motion.div>
          <motion.div
            className="flex flex-wrap justify-center gap-x-6 gap-y-10 lg:flex-nowrap lg:justify-between lg:gap-x-2"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            {METRICS.map((m, i) => (
              <motion.div key={m.label} variants={fadeUp} className="flex items-center gap-2">
                <div className="text-center px-2">
                  <p className="text-2xl sm:text-3xl font-bold text-brand-600 dark:text-brand-500">
                    <AnimatedCounter value={m.value} suffix={m.suffix} />
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-[10rem] mx-auto">{m.label}</p>
                </div>
                {i < METRICS.length - 1 && (
                  <ArrowRight size={18} className="hidden lg:block shrink-0 text-gray-300 dark:text-gray-700" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <motion.section
        className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-200 dark:border-gray-800"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        <SectionHeading eyebrow="Roadmap" title="What we're building next" headingRef={roadmapHeadingRef} />
        <motion.div variants={staggerContainer} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ROADMAP.map((r) => (
            <motion.div
              key={r.title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 hover:shadow-lg dark:hover:shadow-black/30 transition-shadow"
            >
              <r.icon size={24} className="text-brand-600 dark:text-brand-500" />
              <h3 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">{r.title}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{r.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <motion.section
        className="max-w-4xl mx-auto px-6 py-20 text-center"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
          Everyone else is applying to 20 jobs by hand.
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-3 text-lg text-gray-600 dark:text-gray-400">
          You could be applying to 500 — tailored, tracked, and followed up — while doing nothing.
        </motion.p>
        <motion.a
          ref={ctaRef}
          variants={fadeUp}
          href={CONTACT_URL}
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 transition-colors"
        >
          Get started &mdash; it&rsquo;s free
          <ArrowRight size={18} />
        </motion.a>
      </motion.section>
      </main>

      <SiteFooter />
    </div>
    </MotionConfig>
  );
}
