import { useState } from 'react';
import {
  Search, ChevronDown, ChevronUp, AlertCircle, Heart, Brain,
  Moon, Activity, Zap, Apple, MessageCircle, Users, Globe, Lightbulb,
} from 'lucide-react';

type Category = 'all' | 'mood' | 'anxiety' | 'ocd' | 'behavioral' | 'eating' | 'sleep' | 'neurodevelopmental';

interface DisorderInfo {
  id: string;
  title: string;
  category: Exclude<Category, 'all'>;
  tagline: string;
  overview: string;
  prevalence: string;
  symptoms: string[];
  riskFactors: string[];
  selfCare: string[];
  seekHelp: string;
  myths: { myth: string; reality: string }[];
  urgentSigns?: string[];
}

const DISORDERS: DisorderInfo[] = [
  {
    id: 'depression',
    title: 'Major Depressive Disorder',
    category: 'mood',
    tagline: 'Persistent sadness that interferes with daily life',
    overview:
      'Major depression is more than just feeling sad — it is a medical condition that affects how you think, feel, and function. Episodes can last weeks to months and significantly impact quality of life.',
    prevalence: 'Affects ~280 million people worldwide (WHO, 2023)',
    symptoms: [
      'Persistent sad, anxious, or "empty" mood',
      'Loss of interest in activities once enjoyed',
      'Significant weight or appetite changes',
      'Difficulty sleeping or sleeping too much',
      'Fatigue and loss of energy',
      'Feelings of worthlessness or excessive guilt',
      'Difficulty concentrating or making decisions',
      'Thoughts of death or suicide',
    ],
    riskFactors: [
      'Personal or family history of depression',
      'Major life changes, trauma, or chronic stress',
      'Certain medical conditions (thyroid disorders, chronic pain)',
      'Substance misuse',
    ],
    selfCare: [
      'Maintain a regular sleep and wake schedule',
      'Exercise regularly — even a 20-minute walk helps',
      'Stay connected with friends and family',
      'Limit alcohol and avoid recreational drugs',
      'Practice mindfulness or meditation',
      'Set small, achievable daily goals',
      'Get morning sunlight exposure when possible',
    ],
    myths: [
      {
        myth: '"Depression is just sadness or weakness."',
        reality: 'Depression is a medical condition involving brain chemistry. It has nothing to do with personal strength.',
      },
      {
        myth: '"You can snap out of it if you try hard enough."',
        reality: 'Depression cannot be willed away. It requires support, therapy, or treatment — just like any physical illness.',
      },
    ],
    seekHelp:
      'Seek professional help if symptoms persist for more than two weeks, significantly impact your ability to work or maintain relationships, or if you have thoughts of self-harm.',
    urgentSigns: ['Thoughts of suicide or self-harm', 'Inability to care for yourself or dependents'],
  },
  {
    id: 'bipolar',
    title: 'Bipolar Disorder',
    category: 'mood',
    tagline: 'Extreme mood swings between highs (mania) and lows (depression)',
    overview:
      'Bipolar disorder causes dramatic shifts in mood, energy, and activity levels. There are different types: Bipolar I (full manic episodes), Bipolar II (hypomania + depression), and Cyclothymia (milder cycles). It is a lifelong condition but manageable with treatment.',
    prevalence: 'Affects ~40 million people globally',
    symptoms: [
      'Manic phase: elevated or irritable mood, decreased need for sleep, racing thoughts',
      'Manic phase: impulsive or reckless behavior (overspending, risky decisions)',
      'Depressive phase: sadness, hopelessness, low energy, difficulty concentrating',
      'Mixed episodes with both manic and depressive symptoms simultaneously',
      'Rapid speech or flight of ideas during mania',
    ],
    riskFactors: [
      'Strong genetic component (runs in families)',
      'High-stress life events can trigger episodes',
      'Substance use worsens cycling',
      'Disrupted sleep patterns',
    ],
    selfCare: [
      'Maintain consistent sleep and wake times — this is critical',
      'Track your mood daily to spot early warning signs',
      'Avoid alcohol and stimulants',
      'Build a stable daily routine',
      'Have a crisis plan with trusted contacts',
    ],
    myths: [
      {
        myth: '"Bipolar means just being moody."',
        reality: 'Bipolar episodes are severe, can last weeks, and significantly impair functioning — far beyond ordinary moodiness.',
      },
      {
        myth: '"People with bipolar disorder can\'t lead normal lives."',
        reality: 'With proper treatment, many people with bipolar disorder have successful careers and fulfilling relationships.',
      },
    ],
    seekHelp:
      'Always work with a psychiatrist — medication is usually essential. Seek immediate help if experiencing psychosis or suicidal thoughts.',
    urgentSigns: ['Psychosis (hallucinations, paranoia)', 'Suicidal ideation', 'Severe mania putting self or others at risk'],
  },
  {
    id: 'gad',
    title: 'Generalized Anxiety Disorder (GAD)',
    category: 'anxiety',
    tagline: 'Excessive, hard-to-control worry about everyday things',
    overview:
      'GAD involves chronic, exaggerated worry about everyday events — work, health, family, finances — even when there is little reason to worry. The anxiety is disproportionate and interferes with functioning.',
    prevalence: 'Affects ~6.8 million adults in the US alone',
    symptoms: [
      'Excessive worry about multiple topics most days',
      'Difficulty controlling the worry',
      'Restlessness or feeling on edge',
      'Fatigue and muscle tension',
      'Difficulty concentrating',
      'Irritability',
      'Sleep disturbances',
    ],
    riskFactors: [
      'Family history of anxiety',
      'Perfectionism or sensitivity to uncertainty',
      'Chronic stress or trauma',
      'Other mental health conditions',
    ],
    selfCare: [
      'Practice deep breathing and progressive muscle relaxation',
      'Limit caffeine and alcohol',
      'Schedule a daily "worry time" — contain worries to one period',
      'Regular aerobic exercise significantly reduces anxiety',
      'Challenge catastrophic thinking with evidence',
      'Mindfulness meditation',
    ],
    myths: [
      {
        myth: '"Anxiety is just being nervous — everyone has it."',
        reality: 'Anxiety disorder involves persistent, uncontrollable worry that interferes with daily life, unlike ordinary stress.',
      },
      {
        myth: '"Avoiding anxiety-inducing situations makes it better."',
        reality: 'Avoidance reinforces anxiety. Gradual, supported exposure is one of the most effective treatments.',
      },
    ],
    seekHelp:
      'Seek help if worry is difficult to control, causes distress, or interferes with daily activities. CBT is the gold-standard treatment.',
  },
  {
    id: 'panic',
    title: 'Panic Disorder',
    category: 'anxiety',
    tagline: 'Recurrent unexpected panic attacks and fear of future attacks',
    overview:
      'Panic disorder involves recurring unexpected panic attacks — sudden surges of intense fear that peak within minutes. People often develop fear of future attacks, leading to avoidance behavior and sometimes agoraphobia.',
    prevalence: 'Affects ~2–3% of adults globally',
    symptoms: [
      'Racing or pounding heart',
      'Sweating, trembling, or shaking',
      'Shortness of breath or choking sensation',
      'Chest pain',
      'Nausea or stomach distress',
      'Dizziness or lightheadedness',
      'Numbness or tingling',
      'Fear of losing control or dying',
      'Feelings of unreality (derealization)',
    ],
    riskFactors: [
      'Family history of panic disorder',
      'Major life stress or trauma',
      'History of childhood abuse',
      'Smoking and high caffeine use',
    ],
    selfCare: [
      'Diaphragmatic (belly) breathing to interrupt the panic cycle',
      'Grounding techniques: 5-4-3-2-1 sensory method',
      'Gradual exposure to feared situations',
      'Reduce caffeine and stimulants',
      'Regular exercise reduces overall anxiety levels',
      'Remind yourself: panic attacks are uncomfortable, not dangerous',
    ],
    myths: [
      {
        myth: '"A panic attack means something is physically wrong with my heart."',
        reality: 'Panic attacks are caused by the nervous system — they feel terrifying but are not medically dangerous. Always rule out cardiac causes with a doctor.',
      },
    ],
    seekHelp:
      'Seek help if panic attacks are frequent, unpredictable, or causing significant life interference. Rule out cardiac causes first.',
  },
  {
    id: 'social-anxiety',
    title: 'Social Anxiety Disorder',
    category: 'anxiety',
    tagline: 'Intense fear of social situations and being judged by others',
    overview:
      'Social anxiety disorder goes far beyond shyness. It involves intense fear of being watched, judged, or embarrassed in social situations, often leading to significant avoidance that limits work, school, and relationships.',
    prevalence: 'One of the most common anxiety disorders — affects ~7% of people',
    symptoms: [
      'Intense fear of social or performance situations',
      'Worry about acting in ways that will be humiliating',
      'Avoidance of social situations',
      'Physical symptoms when socializing: blushing, sweating, trembling',
      'Post-event rumination — replaying what went wrong',
      'Difficulty making eye contact',
    ],
    riskFactors: ['Family history', 'Bullying or teasing history', 'Temperamentally inhibited children'],
    selfCare: [
      'Gradual exposure — face feared situations in small, manageable steps',
      'Challenge negative self-predictions with evidence',
      'Focus outward on others rather than on yourself',
      'Practice social skills in low-stakes settings',
      'Mindfulness to reduce self-focused attention',
    ],
    myths: [
      {
        myth: '"Social anxiety is just being introverted."',
        reality: 'Introversion is a personality trait. Social anxiety is distress and impairment — introverts can have it, but so can extroverts.',
      },
    ],
    seekHelp:
      'CBT with exposure therapy is highly effective. Seek help when avoidance is limiting important life activities.',
  },
  {
    id: 'ptsd',
    title: 'Post-Traumatic Stress Disorder (PTSD)',
    category: 'anxiety',
    tagline: 'Lasting distress following exposure to a traumatic event',
    overview:
      'PTSD can develop after experiencing or witnessing a traumatic event. The brain stays stuck in a state of threat, re-experiencing the trauma through flashbacks and nightmares while feeling emotionally numb or constantly on alert.',
    prevalence: 'Affects ~20% of people who experience a traumatic event',
    symptoms: [
      'Intrusive memories or flashbacks of the traumatic event',
      'Nightmares related to the trauma',
      'Severe emotional or physical reactions to reminders',
      'Avoidance of trauma-related thoughts, feelings, or reminders',
      'Negative beliefs about oneself or the world',
      'Feeling detached or estranged from others',
      'Hypervigilance — always being on guard',
      'Exaggerated startle response',
      'Sleep problems and irritability',
    ],
    riskFactors: [
      'Severity and duration of trauma exposure',
      'Lack of social support after trauma',
      'Pre-existing mental health conditions',
      'Childhood adversity',
    ],
    selfCare: [
      'Connect with safe, supportive people',
      'Grounding techniques when feeling overwhelmed',
      'Regular gentle exercise',
      'Avoid alcohol and substances (they worsen PTSD symptoms)',
      'Practice self-compassion — reactions to trauma are normal',
    ],
    myths: [
      {
        myth: '"PTSD only affects soldiers."',
        reality: 'PTSD can follow any traumatic experience — accidents, abuse, natural disasters, loss. Anyone can develop it.',
      },
      {
        myth: '"Time heals all trauma."',
        reality: 'Time alone is rarely sufficient. Trauma-focused therapy significantly accelerates recovery.',
      },
    ],
    seekHelp:
      'Trauma-focused therapies (EMDR, CPT, Prolonged Exposure) are highly effective. Recovery is possible — please reach out to a professional.',
    urgentSigns: ['Suicidal thoughts', 'Dissociative episodes affecting personal safety'],
  },
  {
    id: 'ocd',
    title: 'Obsessive-Compulsive Disorder (OCD)',
    category: 'ocd',
    tagline: 'Unwanted obsessive thoughts and repetitive compulsive behaviors',
    overview:
      'OCD involves a cycle of intrusive, unwanted thoughts (obsessions) that cause anxiety, and repetitive behaviors or mental acts (compulsions) performed to reduce that anxiety. Compulsions provide short-term relief but reinforce the cycle long-term.',
    prevalence: 'Affects ~2–3% of the global population',
    symptoms: [
      'Obsessions: contamination fears, harm fears, symmetry/order needs, forbidden thoughts',
      'Compulsions: washing, checking, counting, arranging, mental rituals',
      'Significant time (>1 hour/day) spent on obsessions/compulsions',
      'Awareness that thoughts are excessive but inability to stop',
      'Avoidance of triggering situations or objects',
    ],
    riskFactors: ['Genetic factors', 'History of trauma or abuse', 'Childhood streptococcal infections (PANDAS)'],
    selfCare: [
      'Learn about ERP (Exposure and Response Prevention)',
      'Resist performing compulsions — sit with discomfort and let it pass',
      'Delay compulsions by a set amount of time',
      'Stress management (stress significantly worsens OCD)',
      'Avoid reassurance-seeking (it strengthens OCD)',
    ],
    myths: [
      {
        myth: '"OCD just means being neat and organized."',
        reality: 'OCD is a serious disorder causing significant distress and time loss. Most people with OCD do not feel "good" about their rituals.',
      },
      {
        myth: '"OCD is untreatable."',
        reality: 'ERP therapy has ~60–80% effectiveness. Many people achieve substantial symptom relief.',
      },
    ],
    seekHelp:
      'ERP therapy is the most effective treatment. Medication (SSRIs) is often combined. Seek therapists with specific OCD training.',
  },
  {
    id: 'adhd',
    title: 'ADHD (Attention Deficit Hyperactivity Disorder)',
    category: 'behavioral',
    tagline: 'Differences in attention regulation, impulse control, and activity level',
    overview:
      'ADHD is a neurodevelopmental condition affecting attention, impulse control, and in some cases activity levels. It exists on a spectrum and presents differently across people. Many adults are diagnosed later in life after years of misunderstanding.',
    prevalence: 'Affects ~5% of children and ~2.5% of adults globally',
    symptoms: [
      'Inattentive type: easily distracted, forgetful, loses things, difficulty sustaining focus',
      'Hyperactive type: fidgeting, difficulty sitting still, excessive talking',
      'Impulsive type: interrupting, difficulty waiting, making hasty decisions',
      '"Time blindness" — losing track of time',
      'Emotional dysregulation and rejection sensitivity',
      'Hyperfocus on highly interesting activities',
    ],
    riskFactors: ['Strong genetic component', 'Premature birth or low birth weight', 'Prenatal exposure to tobacco or toxins'],
    selfCare: [
      'Use external structures: timers, calendars, checklists',
      'Break tasks into small, concrete steps',
      'Minimize distractions in your work environment',
      'Body doubling — work alongside others',
      'Regular exercise improves focus and mood',
      'Consistent sleep schedule (poor sleep dramatically worsens ADHD)',
      'Practice self-compassion — ADHD is not laziness',
    ],
    myths: [
      {
        myth: '"ADHD isn\'t real — kids are just lazy or undisciplined."',
        reality: 'ADHD is a well-documented neurodevelopmental condition with decades of research and clear neurological differences.',
      },
      {
        myth: '"You can\'t have ADHD if you can focus on some things."',
        reality: 'Hyperfocus (intense concentration on interesting tasks) is actually a hallmark of ADHD, not evidence against it.',
      },
    ],
    seekHelp:
      'Seek evaluation if symptoms significantly impair functioning at work, school, or in relationships. Combination of medication and behavioral strategies is most effective.',
  },
  {
    id: 'anorexia',
    title: 'Anorexia Nervosa',
    category: 'eating',
    tagline: 'Extreme food restriction driven by fear of weight gain',
    overview:
      'Anorexia nervosa is an eating disorder characterized by extreme food restriction, intense fear of weight gain, and distorted body image. It has the highest mortality rate of any psychiatric disorder — early intervention is critical.',
    prevalence: 'Affects ~1% of women and 0.3% of men; peaks in adolescence',
    symptoms: [
      'Severely restricted eating and extreme calorie limitation',
      'Intense fear of gaining weight even when underweight',
      'Distorted perception of own body size',
      'Excessive exercise',
      'Denial of the seriousness of low body weight',
      'Physical signs: hair thinning, lanugo (fine body hair), fatigue, dizziness',
    ],
    riskFactors: ['Perfectionism and high achievement orientation', 'Family history of eating disorders', 'History of dieting', 'Cultural pressure around weight'],
    selfCare: [
      'Surround yourself with body-positive, supportive people',
      'Challenge and limit diet culture messaging',
      'Practice intuitive eating principles (with professional guidance)',
    ],
    myths: [
      {
        myth: '"Anorexia is a choice or a diet gone too far."',
        reality: 'Anorexia is a serious mental illness with biological underpinnings. It is not a lifestyle choice.',
      },
    ],
    seekHelp:
      'Anorexia requires professional treatment — medical, nutritional, and psychological. Please seek help immediately if weight is dangerously low.',
    urgentSigns: ['Fainting or heart irregularities', 'Electrolyte imbalances', 'BMI critically low'],
  },
  {
    id: 'insomnia',
    title: 'Insomnia',
    category: 'sleep',
    tagline: 'Persistent difficulty falling or staying asleep',
    overview:
      'Insomnia is the most common sleep disorder. Chronic insomnia (3+ nights/week for 3+ months) can significantly impact mental health, physical health, and quality of life. It is often driven by psychological hyperarousal, not just poor sleep habits.',
    prevalence: 'Affects ~10–30% of adults; up to 50% report occasional insomnia',
    symptoms: [
      'Difficulty falling asleep (>30 min to fall asleep)',
      'Frequent waking during the night',
      'Waking too early and unable to return to sleep',
      'Feeling unrefreshed after sleep',
      'Daytime fatigue, irritability, or difficulty concentrating',
      'Anxiety about sleep itself (performance anxiety)',
    ],
    riskFactors: ['Stress and anxiety', 'Irregular sleep schedules', 'Shift work', 'Screen use before bed', 'Caffeine, alcohol, or nicotine', 'Chronic pain or illness'],
    selfCare: [
      'Maintain consistent bed and wake times — even on weekends',
      'Avoid screens 1 hour before bed',
      'Keep your bedroom cool, dark, and quiet',
      'No caffeine after 2pm',
      'Get up if awake more than 20 minutes — return to bed only when sleepy',
      'Wind-down routine: reading, gentle stretching, calm music',
      'Avoid lying awake watching the clock',
    ],
    myths: [
      {
        myth: '"Sleeping pills are the best long-term solution for insomnia."',
        reality: 'CBT-I (Cognitive Behavioral Therapy for Insomnia) is more effective than medication long-term, with no dependency risk.',
      },
      {
        myth: '"You need 8 hours — anything less means insomnia."',
        reality: 'Sleep needs vary. Insomnia is defined by difficulty sleeping and daytime impairment, not hours alone.',
      },
    ],
    seekHelp:
      'CBT-I is the gold-standard treatment — more effective than sleeping pills over the long term. Seek help for chronic insomnia lasting 3+ months.',
  },
  {
    id: 'autism',
    title: 'Autism Spectrum Disorder (ASD)',
    category: 'neurodevelopmental',
    tagline: 'Neurological differences in social communication and sensory processing',
    overview:
      'Autism is a neurodevelopmental condition (not a disease) characterized by differences in social communication, restricted or repetitive behaviors, and often sensory sensitivities. It is a spectrum — presentations vary enormously. Many autistic people live fulfilling, independent lives.',
    prevalence: 'Estimated 1 in 100 people worldwide are autistic (WHO)',
    symptoms: [
      'Differences in social communication and interaction',
      'Restricted, repetitive behaviors or deep special interests',
      'Sensory sensitivities (over- or under-responsive to input)',
      'Preference for routines and difficulty with unexpected change',
      'Differences in nonverbal communication',
    ],
    riskFactors: ['Highly heritable — strong genetic component', 'Advanced parental age', 'Certain genetic conditions (Fragile X, Tuberous Sclerosis)'],
    selfCare: [
      'Understand and honor your sensory needs',
      'Build predictable, comfortable routines',
      'Connect with the autistic community and positive role models',
      'Advocate for accommodations at work or school',
      'Address co-occurring anxiety or depression (very common)',
    ],
    myths: [
      {
        myth: '"Autism is caused by vaccines."',
        reality: 'This has been definitively disproven by dozens of large-scale studies. The original paper making this claim was retracted and its author lost his medical license.',
      },
      {
        myth: '"Autistic people lack empathy."',
        reality: 'Many autistic people feel empathy deeply — they may express it differently or struggle to read social cues, which is not the same as not caring.',
      },
    ],
    seekHelp:
      'Seek evaluation if you or your child show significant differences in social communication or strong sensory sensitivities. Early support is beneficial.',
  },
];

const STATS = [
  { icon: <Globe size={18} />, value: '1 in 4', label: 'people will experience a mental health condition in their lifetime' },
  { icon: <Users size={18} />, value: '~1B', label: 'people globally live with a mental health disorder' },
  { icon: <AlertCircle size={18} />, value: '75%', label: 'of mental health conditions begin before age 24' },
  { icon: <Heart size={18} />, value: '< 1%', label: 'of global health funding goes to mental health' },
];

const CATEGORY_CONFIG: Record<Exclude<Category, 'all'>, { label: string; colorClass: string; icon: React.ReactNode }> = {
  mood: { label: 'Mood', colorClass: 'awareness-cat-mood', icon: <Heart size={13} /> },
  anxiety: { label: 'Anxiety', colorClass: 'awareness-cat-anxiety', icon: <Zap size={13} /> },
  ocd: { label: 'OCD & Related', colorClass: 'awareness-cat-ocd', icon: <Brain size={13} /> },
  behavioral: { label: 'Behavioral', colorClass: 'awareness-cat-behavioral', icon: <Activity size={13} /> },
  eating: { label: 'Eating', colorClass: 'awareness-cat-eating', icon: <Apple size={13} /> },
  sleep: { label: 'Sleep', colorClass: 'awareness-cat-sleep', icon: <Moon size={13} /> },
  neurodevelopmental: { label: 'Neurodevelopmental', colorClass: 'awareness-cat-neuro', icon: <Brain size={13} /> },
};

type Section = 'symptoms' | 'risk' | 'selfcare' | 'myths';

function DisorderCard({ disorder, onStartSession }: { disorder: DisorderInfo; onStartSession: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const cat = CATEGORY_CONFIG[disorder.category];

  function toggleSection(s: Section) {
    setActiveSection(prev => (prev === s ? null : s));
  }

  return (
    <div className={`awareness-card ${expanded ? 'awareness-card-expanded' : ''}`}>
      <button className="awareness-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="awareness-card-meta">
          <span className={`awareness-badge ${cat.colorClass}`}>
            {cat.icon}
            {cat.label}
          </span>
          <span className="awareness-prevalence">{disorder.prevalence}</span>
        </div>
        <div className="awareness-card-title-row">
          <div>
            <h3 className="awareness-card-title">{disorder.title}</h3>
            <p className="awareness-card-tagline">{disorder.tagline}</p>
          </div>
          <span className="awareness-card-chevron">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="awareness-card-body">
          <p className="awareness-overview">{disorder.overview}</p>

          {disorder.urgentSigns && (
            <div className="awareness-urgent">
              <AlertCircle size={15} />
              <div>
                <strong>Urgent — seek immediate help if:</strong>
                <ul>
                  {disorder.urgentSigns.map(sign => (
                    <li key={sign}>{sign}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="awareness-sections">
            {(
              [
                { key: 'symptoms' as Section, label: 'Common Symptoms', items: disorder.symptoms },
                { key: 'risk' as Section, label: 'Risk Factors', items: disorder.riskFactors },
                { key: 'selfcare' as Section, label: 'Self-Care & Coping', items: disorder.selfCare },
              ] as { key: Section; label: string; items: string[] }[]
            ).map(({ key, label, items }) => (
              <div key={key} className={`awareness-section ${activeSection === key ? 'open' : ''}`}>
                <button className="awareness-section-toggle" onClick={() => toggleSection(key)}>
                  <span>{label}</span>
                  {activeSection === key ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {activeSection === key && (
                  <ul className="awareness-section-list">
                    {items.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {disorder.myths.length > 0 && (
              <div className={`awareness-section ${activeSection === 'myths' ? 'open' : ''}`}>
                <button className="awareness-section-toggle" onClick={() => toggleSection('myths')}>
                  <span>
                    <Lightbulb size={13} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: 'middle' }} />
                    Myth vs. Reality
                  </span>
                  {activeSection === 'myths' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {activeSection === 'myths' && (
                  <div className="awareness-myths">
                    {disorder.myths.map((m, i) => (
                      <div key={i} className="awareness-myth-item">
                        <div className="awareness-myth-label">Myth</div>
                        <p className="awareness-myth-text">{m.myth}</p>
                        <div className="awareness-reality-label">Reality</div>
                        <p className="awareness-reality-text">{m.reality}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="awareness-seek-help">
            <strong>When to seek professional help</strong>
            <p>{disorder.seekHelp}</p>
          </div>

          <button className="awareness-cta" onClick={onStartSession}>
            <MessageCircle size={15} />
            Talk to Sukoon about this
          </button>
        </div>
      )}
    </div>
  );
}

interface PatientAwarenessProps {
  onStartSession?: () => void;
}

export function PatientAwareness({ onStartSession }: PatientAwarenessProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  const filtered = DISORDERS.filter(d => {
    const matchesCategory = activeCategory === 'all' || d.category === activeCategory;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.tagline.toLowerCase().includes(q) ||
      d.overview.toLowerCase().includes(q) ||
      d.symptoms.some(s => s.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const categories: { id: Category; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'mood', label: 'Mood' },
    { id: 'anxiety', label: 'Anxiety' },
    { id: 'ocd', label: 'OCD & Related' },
    { id: 'behavioral', label: 'Behavioral' },
    { id: 'eating', label: 'Eating' },
    { id: 'sleep', label: 'Sleep' },
    { id: 'neurodevelopmental', label: 'Neurodevelopmental' },
  ];

  return (
    <div className="patient-tab-content awareness-root">
      {/* Header */}
      <div className="awareness-header">
        <div className="awareness-header-text">
          <h2>Mental Health Awareness</h2>
          <p>
            Understand common mental health conditions — their symptoms, causes, self-care strategies, and myths.
            Knowledge reduces stigma and helps you or someone you care about get the right support.
          </p>
        </div>
        <div className="awareness-disclaimer">
          <AlertCircle size={13} />
          <span>For general awareness only — not a substitute for professional diagnosis or treatment.</span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="awareness-stats">
        {STATS.map((s, i) => (
          <div key={i} className="awareness-stat">
            <span className="awareness-stat-icon">{s.icon}</span>
            <span className="awareness-stat-value">{s.value}</span>
            <span className="awareness-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="awareness-search-wrap">
        <Search size={15} className="awareness-search-icon" />
        <input
          type="text"
          className="awareness-search"
          placeholder="Search conditions, symptoms, or keywords..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Category filter */}
      <div className="awareness-categories">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`awareness-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <p className="awareness-count">
        {filtered.length} condition{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Cards */}
      <div className="awareness-cards">
        {filtered.length === 0 ? (
          <div className="awareness-empty">
            <Brain size={32} />
            <p>No conditions match your search.</p>
          </div>
        ) : (
          filtered.map(d => (
            <DisorderCard
              key={d.id}
              disorder={d}
              onStartSession={onStartSession ?? (() => {})}
            />
          ))
        )}
      </div>

      {/* Crisis footer */}
      <div className="awareness-footer">
        <Heart size={13} />
        <span>
          If you or someone you know is in crisis, contact a professional or emergency services immediately.
          {' '}India helplines:{' '}
          <strong>iCall 9152987821</strong> · <strong>Vandrevala Foundation 1860-2662-345</strong> (24/7)
        </span>
      </div>
    </div>
  );
}
