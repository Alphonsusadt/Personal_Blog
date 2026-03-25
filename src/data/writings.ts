export interface Writing {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: 'reflections' | 'stories' | 'fiction';
  tags?: string[];
  content: string;
}

export const writings: Writing[] = [
  {
    id: 'faith-engineering',
    title: 'When Engineering Meets Faith',
    excerpt: 'Exploring how the precision of engineering and the mystery of faith coexist in my journey as a biomedical engineer.',
    date: '2024-03-10',
    readTime: '5 min',
    category: 'reflections',
    tags: ['faith', 'engineering', 'vocation'],
    content: `
# When Engineering Meets Faith

*March 10, 2024 | 5 min read*

In the quiet hours of the night lab, surrounded by the hum of oscilloscopes and the soft glow of monitors displaying cardiac rhythms, I often find myself contemplating the intersection of my two greatest passions: the precise, measurable world of biomedical engineering and the mysterious, profound realm of faith.

## The Language of Creation

As I work with signals—ECG traces that map the electrical language of the heart, EMG patterns that decode the whispers of muscles—I am constantly reminded that these are not just random electrical fluctuations. They are designed systems, intricate beyond imagination, following laws both discoverable and beautiful.

The mathematical precision of a Butterworth filter, carefully crafted to preserve the essential frequencies of life while eliminating noise, mirrors the way faith filters the noise of daily existence to reveal what truly matters.

## Humility in Discovery

Engineering teaches me humility. Each equation I write, each algorithm I implement, reveals just how much I don't know. The more I understand about signal processing, the more I realize the complexity inherent in even the simplest biological system.

This humility serves my faith well. Just as I cannot fully comprehend the Fourier transform of a complex biological signal, there are aspects of the divine that transcend complete human understanding. And that's okay.

## The Vocation of Healing

Biomedical engineering is more than a career—it's a vocation. Every device I help design, every signal I help clarify, has the potential to heal, to comfort, to extend life. This work becomes a form of service, a way to participate in the ongoing work of creation and restoration.

In the quiet moments between heartbeats, both on the screen and in my own chest, I find a rhythm that connects the work of my hands with the longing of my heart.`
  },
  {
    id: 'laboratory-silence',
    title: 'Laboratory Silence',
    excerpt: 'Finding God in the spaces between data points and the quiet hum of scientific instruments.',
    date: '2024-02-28',
    readTime: '4 min',
    category: 'reflections',
    tags: ['silence', 'prayer', 'lab'],
    content: `
# Laboratory Silence

*February 28, 2024 | 4 min read*

The laboratory at 2 AM is a sacred space. The usual chaos of students and professors has given way to a profound silence, broken only by the soft whir of centrifuges and the occasional beep of a completed analysis.

In this silence, I find a different kind of prayer.

## The Contemplation of Data

Each dataset tells a story. The ECG trace from patient 47—let's call her Maria—shows an irregularity that shouldn't exist according to the textbook. But there it is, undeniable, a deviation from the expected pattern.

These anomalies remind me that life refuses to be fully captured by equations. There is always something more, something that transcends our models and our understanding.

## Listening to Creation

The great physicist Richard Feynman once said: 

> "I... a universe of atoms, an atom in the universe."

Sitting here, watching the dance of electrical potentials across a cardiac cell membrane, I understand what he meant. I am both the observer and the observed, part of the creation I study.

The signals I measure are not just data—they are the whispers of life itself, the electrical song of cells doing what they were created to do.`
  },
  {
    id: 'first-patient',
    title: 'My First Patient',
    excerpt: 'The day I met my first real patient and understood why I chose this path.',
    date: '2024-02-15',
    readTime: '6 min',
    category: 'stories',
    tags: ['patient', 'experience', 'growth'],
    content: `
# My First Patient

*February 15, 2024 | 6 min read*

I remember the first time I saw an ECG trace that belonged to a real person, not a textbook example or a lab simulation. I was volunteering at the university hospital, and Dr. Martinez asked if I wanted to observe a telemetry monitoring session.

## The Human Behind the Signal

"This is Mrs. Chen," she said, pointing to monitor 3. "She's recovering from a mild heart attack."

On the screen, I saw the familiar pattern: P wave, QRS complex, T wave. But this time, it wasn't just a pattern—it was someone's heart. Mrs. Chen, who probably had a family, maybe grandchildren, hopes and fears and a lifetime of stories.

I watched that green line trace its path across the screen, each peak and valley representing an actual heartbeat, an actual moment in an actual life.

## A New Perspective

That night, back in my dorm room, I opened my notebook and looked at the equations I had been working with:

$$V(t) = A \\sin(2\\pi ft + \\phi)$$

The same equation I had written a hundred times before, but now it meant something different. The amplitude A wasn't just a variable—it was the strength of someone's heartbeat. The frequency f wasn't just a number—it was the rhythm of a life.

From that moment on, I stopped seeing patients as problems to be solved or signals to be processed. I started seeing them as people, each with their own unique story written in the electrical language of the heart.`
  },
  {
    id: 'sunday-morning',
    title: 'Sunday Morning in the Lab',
    excerpt: 'A quiet Sunday morning revelation about work, rest, and the nature of calling.',
    date: '2024-01-30',
    readTime: '5 min',
    category: 'stories',
    tags: ['sunday', 'lab', 'reflection'],
    content: `
# Sunday Morning in the Lab

*January 30, 2024 | 5 min read*

Sunday morning. The university campus is empty, the halls silent. Everyone else is sleeping in, having brunch, or sitting in pews. But here I am, in the lab, debugging code for my ECG analysis project.

I should feel guilty. My mother would certainly think I should be in church. But as I sit here, watching the morning light stream through the lab windows, I realize something: this is my chapel.

## The Sacrament of Work

The ancient monks believed that work was a form of prayer. The Benedictines built communities where labor and worship intertwined, where sweeping floors and copying manuscripts were as sacred as singing psalms.

I think I understand that now.

As I carefully adjust the parameters of my filtering algorithm, trying to find that perfect balance between removing noise and preserving the essential features of the cardiac signal, I am engaged in something sacred. I am working to understand the language of life itself.

## The Rhythm of Rest

That doesn't mean I don't need rest. The same signals I study have taught me that. The heart doesn't beat continuously—it has built-in rest periods. The refractory period that follows each action potential is essential for proper function.

Maybe that's what I'm experiencing now—a refractory period from the noise of daily life, a time to reset and prepare for the next beat.

I save my code, close my laptop, and sit in the quiet lab. The sun is higher now, and I can hear birds outside. It's time to go home, to rest, to prepare for Monday's challenges.

But for now, in this moment, I am exactly where I need to be.`
  },
  {
    id: 'signal-dreams',
    title: 'The Signal in My Dreams',
    excerpt: 'A fictional story about a biomedical engineer who discovers a hidden pattern in cardiac signals that reveals deeper truths about human connection.',
    date: '2024-01-15',
    readTime: '8 min',
    category: 'fiction',
    tags: ['fiction', 'mystery', 'signals'],
    content: `
# The Signal in My Dreams

*January 15, 2024 | 8 min read*

**[Note: This is a work of fiction]**

Dr. Elena Vasquez had been studying cardiac signals for fifteen years when she first noticed the anomaly. It appeared in patient 447's ECG trace at 3:47 AM—just a slight deviation in the T wave, barely measurable, but undeniably there.

## The Pattern

At first, she dismissed it as artifact. The telemetry unit was old, and the electrodes were due for replacement. But the pattern persisted, night after night, always at the same time.

\`\`\`mermaid
graph TD
    A[ECG Signal] --> B{Pattern Detected?}
    B -- Yes --> C[3:47 AM Anomaly]
    B -- No --> D[Normal Rhythm]
    C --> E[Store Pattern]
    E --> F[Compare Database]
    F --> G{Match Found?}
    G -- Yes --> H[Alert Researcher]
    G -- No --> I[Continue Monitoring]
\`\`\`

## The Discovery

As Elena dug deeper, she found that patient 447 wasn't alone. Twelve other patients showed the exact same deviation, always at 3:47 AM their local time. Mathematically, this was impossible. These patients were in different time zones, different hospitals, with no connection between them.

The pattern in the ECG traces formed a code:

$$\\text{Pattern} = \\sum_{i=1}^{N} \\delta(t - 3:47) \\cdot \\Delta V_i$$

Where $\\Delta V_i$ represented not just voltage changes, but something else—something that shouldn't exist in the cold, rational world of biomedical signals.

## The Truth

Elena's breakthrough came when she realized the patterns weren't random—they were communication. The slight variations in the T waves formed letters in Morse code.

The message was the same for all twelve patients: *"We are here. You are not alone."*

The implications were staggering. Either this was the most elaborate medical hoax in history, or Elena had discovered something that would change everything we thought we knew about consciousness, connection, and the nature of life itself.

She sat in her office, looking at the data, at the impossible made real. The signals she had spent her life studying had been speaking all along. She just hadn't known how to listen.

Outside her window, the city lights twinkled like distant stars, each one representing a heartbeat, a life, a signal in the vast network of human existence.

And somewhere, at exactly 3:47 AM, another heart would beat with the secret pattern, sending its message to anyone who knew how to listen.`
  }
];

export const getWritingById = (id: string): Writing | undefined => {
  return writings.find(w => w.id === id);
};

export const getWritingsByCategory = (category: Writing['category']) => {
  return writings.filter(w => w.category === category);
};