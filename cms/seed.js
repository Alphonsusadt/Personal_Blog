import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'alphonsus-portfolio';

const projects = [
  {
    id: 'ecg-filtering',
    title: 'ECG Signal Filtering System',
    description: 'Implemented Butterworth bandpass filter for noise reduction in cardiac signals',
    tags: ['Python', 'MATLAB', 'Signal Processing', 'DSP'],
    category: 'signal-processing',
    content: `# ECG Signal Filtering System

To filter noise in ECG signals, we use a Butterworth filter of order-n with cutoff frequency $\\omega_c$:

$$|H(j\\omega)| = \\frac{1}{\\sqrt{1 + (\\frac{\\omega}{\\omega_c})^{2n}}}$$

## Implementation

The system processes raw ECG signals through a pipeline that includes:

- Bandpass filtering (0.5-40 Hz)
- Notch filtering for 60 Hz power line interference
- Wavelet denoising for high-frequency artifacts

## Results

The filtered signals show significant improvement in SNR, with QRS complexes clearly distinguishable from background noise.

\`\`\`mermaid
graph TD
    A[Raw ECG Signal] --> B{Apply Filter?}
    B -- Yes --> C[Bandpass Filter 0.5-40Hz]
    B -- No --> D[Analyze Raw Signal]
    C --> E[QRS Wave Detection]
    E --> F[Heart Rate Calculation]
\`\`\``
  },
  {
    id: 'emg-analysis',
    title: 'EMG Signal Analysis for Prosthetic Control',
    description: 'Real-time EMG signal processing for myoelectric prosthetic hand control',
    tags: ['Arduino', 'C++', 'Signal Processing', 'Machine Learning'],
    category: 'signal-processing',
    content: `# EMG Signal Analysis for Prosthetic Control

EMG signals can be modeled as:

$$x(t) = \\sum_{i=1}^{N} a_i \\cdot s(t - \\tau_i) + n(t)$$

where $a_i$ are amplitude coefficients, $\\tau_i$ are time delays, and $n(t)$ is additive noise.

## Feature Extraction

Key features extracted from EMG signals:
- Root Mean Square (RMS)
- Mean Absolute Value (MAV)
- Zero Crossing Rate
- Slope Sign Changes
- Waveform Length

## Classification

Using Support Vector Machines (SVM) to classify different hand gestures with 95% accuracy.`
  },
  {
    id: 'mri-segmentation',
    title: 'Brain MRI Segmentation',
    description: 'Automated brain tumor segmentation using deep learning',
    tags: ['Python', 'TensorFlow', 'Deep Learning', 'Medical Imaging'],
    category: 'data-analysis',
    content: `# Brain MRI Segmentation

Segmentation of brain tumors from MRI scans using U-Net architecture.

## Methodology

The U-Net architecture follows an encoder-decoder structure:

\`\`\`mermaid
graph TD
    A[Input MRI] --> B[Encoder]
    B --> C[Bottleneck]
    C --> D[Decoder]
    D --> E[Segmentation Mask]
    B --> F[Skip Connection]
    F --> D
\`\`\`

## Results

Achieved Dice coefficient of 0.89 on test dataset.`
  },
  {
    id: 'pulse-oximeter',
    title: 'Low-Cost Pulse Oximeter',
    description: 'Design and development of an affordable pulse oximeter for remote areas',
    tags: ['Arduino', 'Hardware Design', 'Embedded Systems', 'Biomedical'],
    category: 'control',
    content: `# Low-Cost Pulse Oximeter

Design of a portable pulse oximeter using red and infrared LEDs for SpO2 measurement.

## Principle

SpO2 is calculated using Beer-Lambert law:

$$SpO2 = \\frac{HbO_2}{HbO_2 + Hb} \\times 100\\%$$

## Hardware Design

- Dual wavelength LED driver
- Photodetector amplifier
- Microcontroller for signal processing
- OLED display for readings

## Cost Reduction

Total BOM cost under $15, making it suitable for developing regions.`
  },
  {
    id: 'eeg-bci',
    title: 'EEG-based BCI for Motor Imagery',
    description: 'Brain-computer interface for controlling robotic arm using motor imagery',
    tags: ['Python', 'OpenBCI', 'Machine Learning', 'Signal Processing'],
    category: 'signal-processing',
    content: `# EEG-based BCI for Motor Imagery

Classification of motor imagery tasks from EEG signals using Common Spatial Patterns (CSP).

## Signal Processing Pipeline

1. **Preprocessing**: Bandpass filter (8-30 Hz)
2. **Feature Extraction**: CSP algorithm
3. **Classification**: Linear Discriminant Analysis (LDA)

## Mathematical Foundation

CSP maximizes the variance difference between two classes:

$$w = \\arg\\max_{w} \\frac{w^T \\Sigma_1 w}{w^T \\Sigma_2 w}$$

where $\\Sigma_1$ and $\\Sigma_2$ are covariance matrices for each class.`
  },
  {
    id: 'glucose-monitor',
    title: 'Non-invasive Glucose Monitor',
    description: 'Research on non-invasive glucose monitoring using infrared spectroscopy',
    tags: ['MATLAB', 'Signal Processing', 'Spectroscopy', 'Machine Learning'],
    category: 'control',
    content: `# Non-invasive Glucose Monitor

Development of a non-invasive glucose monitoring system using near-infrared spectroscopy.

## Spectroscopy Principle

Absorbance follows Beer-Lambert law:

$$A = \\log_{10}\\left(\\frac{I_0}{I}\\right) = \\epsilon \\cdot c \\cdot l$$

where $\\epsilon$ is molar absorptivity, $c$ is concentration, and $l$ is path length.

## Calibration Model

Partial Least Squares Regression (PLSR) used for multivariate calibration:

$$X = T P^T + E$$
$$Y = U Q^T + F$$

where X is spectral data and Y is glucose concentration.`
  }
];

const writings = [
  {
    id: 'faith-engineering',
    title: 'When Engineering Meets Faith',
    excerpt: 'Exploring how the precision of engineering and the mystery of faith coexist in my journey as a biomedical engineer.',
    date: '2024-03-10',
    readTime: '5 min',
    category: 'reflections',
    tags: ['faith', 'engineering', 'vocation'],
    content: `# When Engineering Meets Faith\n\n*March 10, 2024 | 5 min read*\n\nIn the quiet hours of the night lab, surrounded by the hum of oscilloscopes and the soft glow of monitors displaying cardiac rhythms, I often find myself contemplating the intersection of my two greatest passions: the precise, measurable world of biomedical engineering and the mysterious, profound realm of faith.\n\n## The Language of Creation\n\nAs I work with signals—ECG traces that map the electrical language of the heart, EMG patterns that decode the whispers of muscles—I am constantly reminded that these are not just random electrical fluctuations. They are designed systems, intricate beyond imagination, following laws both discoverable and beautiful.\n\nThe mathematical precision of a Butterworth filter, carefully crafted to preserve the essential frequencies of life while eliminating noise, mirrors the way faith filters the noise of daily existence to reveal what truly matters.\n\n## Humility in Discovery\n\nEngineering teaches me humility. Each equation I write, each algorithm I implement, reveals just how much I don't know. The more I understand about signal processing, the more I realize the complexity inherent in even the simplest biological system.\n\nThis humility serves my faith well. Just as I cannot fully comprehend the Fourier transform of a complex biological signal, there are aspects of the divine that transcend complete human understanding. And that's okay.\n\n## The Vocation of Healing\n\nBiomedical engineering is more than a career—it's a vocation. Every device I help design, every signal I help clarify, has the potential to heal, to comfort, to extend life. This work becomes a form of service, a way to participate in the ongoing work of creation and restoration.\n\nIn the quiet moments between heartbeats, both on the screen and in my own chest, I find a rhythm that connects the work of my hands with the longing of my heart.`
  },
  {
    id: 'laboratory-silence',
    title: 'Laboratory Silence',
    excerpt: 'Finding God in the spaces between data points and the quiet hum of scientific instruments.',
    date: '2024-02-28',
    readTime: '4 min',
    category: 'reflections',
    tags: ['silence', 'prayer', 'lab'],
    content: `# Laboratory Silence\n\n*February 28, 2024 | 4 min read*\n\nThe laboratory at 2 AM is a sacred space. The usual chaos of students and professors has given way to a profound silence, broken only by the soft whir of centrifuges and the occasional beep of a completed analysis.\n\nIn this silence, I find a different kind of prayer.\n\n## The Contemplation of Data\n\nEach dataset tells a story. The ECG trace from patient 47—let's call her Maria—shows an irregularity that shouldn't exist according to the textbook. But there it is, undeniable, a deviation from the expected pattern.\n\nThese anomalies remind me that life refuses to be fully captured by equations. There is always something more, something that transcends our models and our understanding.\n\n## Listening to Creation\n\nThe great physicist Richard Feynman once said:\n\n> "I... a universe of atoms, an atom in the universe."\n\nSitting here, watching the dance of electrical potentials across a cardiac cell membrane, I understand what he meant. I am both the observer and the observed, part of the creation I study.\n\nThe signals I measure are not just data—they are the whispers of life itself, the electrical song of cells doing what they were created to do.`
  },
  {
    id: 'first-patient',
    title: 'My First Patient',
    excerpt: 'The day I met my first real patient and understood why I chose this path.',
    date: '2024-02-15',
    readTime: '6 min',
    category: 'stories',
    tags: ['patient', 'experience', 'growth'],
    content: `# My First Patient\n\n*February 15, 2024 | 6 min read*\n\nI remember the first time I saw an ECG trace that belonged to a real person, not a textbook example or a lab simulation. I was volunteering at the university hospital, and Dr. Martinez asked if I wanted to observe a telemetry monitoring session.\n\n## The Human Behind the Signal\n\n"This is Mrs. Chen," she said, pointing to monitor 3. "She's recovering from a mild heart attack."\n\nOn the screen, I saw the familiar pattern: P wave, QRS complex, T wave. But this time, it wasn't just a pattern—it was someone's heart. Mrs. Chen, who probably had a family, maybe grandchildren, hopes and fears and a lifetime of stories.\n\nI watched that green line trace its path across the screen, each peak and valley representing an actual heartbeat, an actual moment in an actual life.\n\n## A New Perspective\n\nThat night, back in my dorm room, I opened my notebook and looked at the equations I had been working with:\n\n$$V(t) = A \\sin(2\\pi ft + \\phi)$$\n\nThe same equation I had written a hundred times before, but now it meant something different. The amplitude A wasn't just a variable—it was the strength of someone's heartbeat. The frequency f wasn't just a number—it was the rhythm of a life.\n\nFrom that moment on, I stopped seeing patients as problems to be solved or signals to be processed. I started seeing them as people, each with their own unique story written in the electrical language of the heart.`
  },
  {
    id: 'sunday-morning',
    title: 'Sunday Morning in the Lab',
    excerpt: 'A quiet Sunday morning revelation about work, rest, and the nature of calling.',
    date: '2024-01-30',
    readTime: '5 min',
    category: 'stories',
    tags: ['sunday', 'lab', 'reflection'],
    content: `# Sunday Morning in the Lab\n\n*January 30, 2024 | 5 min read*\n\nSunday morning. The university campus is empty, the halls silent. Everyone else is sleeping in, having brunch, or sitting in pews. But here I am, in the lab, debugging code for my ECG analysis project.\n\nI should feel guilty. My mother would certainly think I should be in church. But as I sit here, watching the morning light stream through the lab windows, I realize something: this is my chapel.\n\n## The Sacrament of Work\n\nThe ancient monks believed that work was a form of prayer. The Benedictines built communities where labor and worship intertwined, where sweeping floors and copying manuscripts were as sacred as singing psalms.\n\nI think I understand that now.\n\nAs I carefully adjust the parameters of my filtering algorithm, trying to find that perfect balance between removing noise and preserving the essential features of the cardiac signal, I am engaged in something sacred. I am working to understand the language of life itself.\n\n## The Rhythm of Rest\n\nThat doesn't mean I don't need rest. The same signals I study have taught me that. The heart doesn't beat continuously—it has built-in rest periods. The refractory period that follows each action potential is essential for proper function.\n\nMaybe that's what I'm experiencing now—a refractory period from the noise of daily life, a time to reset and prepare for the next beat.\n\nI save my code, close my laptop, and sit in the quiet lab. The sun is higher now, and I can hear birds outside. It's time to go home, to rest, to prepare for Monday's challenges.\n\nBut for now, in this moment, I am exactly where I need to be.`
  },
  {
    id: 'signal-dreams',
    title: 'The Signal in My Dreams',
    excerpt: 'A fictional story about a biomedical engineer who discovers a hidden pattern in cardiac signals that reveals deeper truths about human connection.',
    date: '2024-01-15',
    readTime: '8 min',
    category: 'fiction',
    tags: ['fiction', 'mystery', 'signals'],
    content: `# The Signal in My Dreams\n\n*January 15, 2024 | 8 min read*\n\n**[Note: This is a work of fiction]**\n\nDr. Elena Vasquez had been studying cardiac signals for fifteen years when she first noticed the anomaly. It appeared in patient 447's ECG trace at 3:47 AM—just a slight deviation in the T wave, barely measurable, but undeniably there.\n\n## The Pattern\n\nAt first, she dismissed it as artifact. The telemetry unit was old, and the electrodes were due for replacement. But the pattern persisted, night after night, always at the same time.\n\n## The Discovery\n\nAs Elena dug deeper, she found that patient 447 wasn't alone. Twelve other patients showed the exact same deviation, always at 3:47 AM their local time. Mathematically, this was impossible. These patients were in different time zones, different hospitals, with no connection between them.\n\n## The Truth\n\nElena's breakthrough came when she realized the patterns weren't random—they were communication. The slight variations in the T waves formed letters in Morse code.\n\nThe message was the same for all twelve patients: *"We are here. You are not alone."*\n\nThe implications were staggering. Either this was the most elaborate medical hoax in history, or Elena had discovered something that would change everything we thought we knew about consciousness, connection, and the nature of life itself.\n\nShe sat in her office, looking at the data, at the impossible made real. The signals she had spent her life studying had been speaking all along. She just hadn't known how to listen.\n\nOutside her window, the city lights twinkled like distant stars, each one representing a heartbeat, a life, a signal in the vast network of human existence.\n\nAnd somewhere, at exactly 3:47 AM, another heart would beat with the secret pattern, sending its message to anyone who knew how to listen.`
  }
];

const books = [
  { id: 'at-last', title: 'At the Existentialist Café', author: 'Sarah Bakewell', cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop', rating: 5, category: 'philosophy', takeaways: ['Freedom and responsibility are two sides of the same coin', 'Authenticity requires confronting our own mortality', 'Philosophy is not just thinking, but living according to our values'], review: 'A fascinating exploration of existentialism that makes complex philosophical ideas accessible and relevant to daily life.' },
  { id: 'man-search', title: "Man's Search for Meaning", author: 'Viktor Frankl', cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&h=400&fit=crop', rating: 5, category: 'spiritual', takeaways: ['Meaning can be found in suffering through our response to it', 'We have the freedom to choose our attitude in any circumstance', 'Purpose is discovered through love, work, and courage in difficult times'], review: "Frankl's account of finding meaning in the midst of Holocaust suffering is profound and life-changing." },
  { id: 'emperor', title: 'The Emperor of All Maladies', author: 'Siddhartha Mukherjee', cover: 'https://images.unsplash.com/photo-1553729784-e91953dec042?w=300&h=400&fit=crop', rating: 4, category: 'biography', takeaways: ['Cancer is not one disease but many', 'Medical progress often comes from unexpected directions', 'The human story behind scientific discovery is as important as the science itself'], review: 'A masterful biography of cancer that reads like a thriller.' },
  { id: 'signals-systems', title: 'Signals and Systems', author: 'Alan Oppenheim', cover: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300&h=400&fit=crop', rating: 5, category: 'technical', takeaways: ['Fourier analysis reveals the frequency structure underlying all signals', 'Linearity and time-invariance are powerful concepts', 'The convolution operation is fundamental to understanding system behavior'], review: 'The definitive textbook on signal processing.' },
  { id: 'spirituality', title: 'The Soul of a New Machine', author: 'Tracy Kidder', cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=400&fit=crop', rating: 4, category: 'biography', takeaways: ['Innovation requires both technical brilliance and human dedication', 'The drive to create something new can border on obsession', 'Great achievements come from teams, not just individuals'], review: 'A Pulitzer Prize-winning account of the race to build a new computer.' },
  { id: 'brothers-k', title: 'The Brothers Karamazov', author: 'Fyodor Dostoevsky', cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop', rating: 5, category: 'philosophy', takeaways: ['Faith and doubt are not opposites but necessary companions', 'The problem of suffering is central to human existence', 'Love is an active choice, not just a feeling'], review: "Dostoevsky's masterpiece explores faith, doubt, morality, and redemption." },
  { id: 'biomedical', title: 'Biomedical Signal Analysis', author: 'Rangaraj Rangayyan', cover: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=300&h=400&fit=crop', rating: 4, category: 'technical', takeaways: ['Biomedical signals require specialized analysis techniques', 'Wavelet transforms are superior to Fourier for time-frequency analysis', 'Artifact removal is as important as signal enhancement'], review: 'A comprehensive guide to analyzing biomedical signals.' },
  { id: 'seven-storey', title: 'The Seven Storey Mountain', author: 'Thomas Merton', cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop', rating: 5, category: 'spiritual', takeaways: ['The search for meaning often leads to unexpected places', 'Silence and contemplation are essential for spiritual growth', 'True freedom comes from surrender to something greater than oneself'], review: "Merton's autobiography of his journey from worldly intellectual to Trappist monk is a spiritual classic." },
  { id: 'atlas', title: "The Emperor's New Mind", author: 'Roger Penrose', cover: 'https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?w=300&h=400&fit=crop', rating: 4, category: 'philosophy', takeaways: ['Consciousness may not be computable by traditional algorithms', 'Quantum mechanics might play a role in brain function', 'Mathematical truth exists independently of human minds'], review: 'Penrose challenges the notion that consciousness can be fully explained by computation.' },
  { id: 'digital-design', title: 'The Art of Digital Design', author: 'Frank Vahid', cover: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300&h=400&fit=crop', rating: 4, category: 'technical', takeaways: ['Digital design requires both creativity and rigorous thinking', 'Understanding trade-offs is essential for good engineering', 'Simplicity should be the ultimate goal in design'], review: 'An excellent introduction to digital design.' },
  { id: 'consolation', title: 'The Consolation of Philosophy', author: 'Boethius', cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop', rating: 5, category: 'philosophy', takeaways: ['True happiness comes from within', 'Fortune is fickle and cannot be relied upon', "God's perspective transcends our limited temporal understanding"], review: "Written while awaiting execution, Boethius's dialogue with Lady Philosophy offers timeless wisdom." },
  { id: 'neuroscience', title: 'Principles of Neural Science', author: 'Eric Kandel', cover: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=300&h=400&fit=crop', rating: 5, category: 'technical', takeaways: ['The brain is not a computer but a dynamic, self-organizing system', 'Learning and memory involve physical changes in neural connections', 'Understanding the brain requires integrating multiple levels of analysis'], review: 'The definitive textbook on neuroscience.' }
];

const about = {
  key: 'about',
  title: 'About Alphonsus',
  subtitle: 'Bridging the worlds of biomedical engineering and faith',
  bio: "I'm a passionate biomedical engineering student with a deep interest in signal processing, medical devices, and the profound questions that arise when technology meets human life. My journey is guided by both scientific curiosity and spiritual reflection.",
  gpa: '3.9',
  projectsCount: '6+',
  story: {
    whyBME: "My journey into biomedical engineering began with a simple question: How can we use technology to better understand and heal the human body? Growing up, I was fascinated by both the precision of mathematics and the mystery of life. Biomedical engineering became the perfect intersection of these passions.\n\nWhat draws me most to this field is the opportunity to work on problems that directly impact human health and wellbeing.",
    faithAndEngineering: "Many people see science and faith as opposing forces, but I've found them to be complementary ways of understanding reality. My work in signal processing has actually deepened my sense of wonder at the complexity and beauty of creation.\n\nWhen I see the elegant mathematics underlying a cardiac signal or the intricate patterns in neural activity, I'm reminded that we're studying systems of profound complexity and purpose.",
    currentFocus: "Currently, I'm focused on signal processing techniques for biomedical applications, particularly in cardiac and neural signal analysis. I'm also exploring how machine learning can be applied to medical diagnosis while maintaining the human element that's so crucial to healthcare."
  },
  skills: {
    programming: ['Python', 'MATLAB', 'C++', 'JavaScript', 'R'],
    specializations: ['Signal Processing', 'Medical Imaging', 'Machine Learning', 'Embedded Systems'],
    academicInterests: ['Biomedical Ethics', 'Philosophy of Science', 'Theology & Technology'],
    personalInterests: ['Reading', 'Contemplative Prayer', 'Hiking', 'Classical Music']
  },
  education: [
    { title: 'Bachelor of Science in Biomedical Engineering', institution: 'University of Technology', year: 'Expected 2025', description: 'Focus on signal processing and medical device design. Dean\'s List for 4 consecutive semesters.' },
    { title: 'Research Assistant - Signal Processing Lab', institution: 'University of Technology', year: '2023 - Present', description: 'Developing algorithms for ECG signal analysis and noise reduction. Published one conference paper on digital filter design for medical applications.' }
  ],
  quote: '"The more I study science, the more I believe in God. The more I understand signal processing, the more I marvel at the elegant design of biological systems. Engineering and faith are not in conflict—they are two different languages describing the same reality."',
  socialLinks: {
    linkedin: 'https://linkedin.com/in/alphonsusadt',
    github: 'https://github.com/alphonsusadt',
    email: 'alphonsus@example.com'
  }
};

const home = {
  key: 'home',
  heroName: 'Alphonsus',
  heroLastName: 'Aditya',
  heroSubtitle: 'Biomedical Engineering Student',
  heroTagline: 'Exploring the intersection of Medical Signals, Faith, and Human Life',
  ctaButtons: [
    { label: 'View Projects', link: '/engineering' },
    { label: 'Read Reflections', link: '/writings' }
  ],
  socialLinks: {
    linkedin: 'https://linkedin.com/in/alphonsusadt',
    github: 'https://github.com/alphonsusadt',
    email: 'alphonsus@example.com'
  },
  sections: {
    recentProjects: { title: 'Recent Engineering Projects', subtitle: 'Exploring the intersection of signal processing, medical devices, and data analysis' },
    recentWritings: { title: 'Recent Writings', subtitle: 'Reflections on faith, engineering, and the human experience' },
    featuredBooks: { title: 'From My Library', subtitle: 'Books that shape my thinking on technology, faith, and philosophy' }
  }
};

const settings = {
  key: 'settings',
  siteTitle: 'Alphonsus - Biomedical Engineering & Faith',
  footerName: 'Alphonsus Aditya',
  footerBio: 'Biomedical Engineering student exploring the intersection of medical signals, faith, and human life. Bridging the precision of engineering with the mystery of spirituality.',
  footerTagline: 'Built with heart and biomedical curiosity',
  navItems: [
    { path: '/', label: 'Home' },
    { path: '/engineering', label: 'Engineering' },
    { path: '/writings', label: 'Writings' },
    { path: '/library', label: 'Library' },
    { path: '/about', label: 'About' }
  ]
};

async function seed() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB');
  const db = client.db(DB_NAME);

  // Clear existing data
  await Promise.all([
    db.collection('projects').deleteMany({}),
    db.collection('writings').deleteMany({}),
    db.collection('books').deleteMany({}),
    db.collection('about').deleteMany({}),
    db.collection('home').deleteMany({}),
    db.collection('settings').deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // Insert data (ensure all items have status: 'published')
  const publishedProjects = projects.map(p => ({ ...p, status: 'published' }));
  await db.collection('projects').insertMany(publishedProjects);
  console.log(`Inserted ${projects.length} projects`);

  const publishedWritings = writings.map(w => ({ ...w, status: 'published' }));
  await db.collection('writings').insertMany(publishedWritings);
  console.log(`Inserted ${writings.length} writings`);

  const publishedBooks = books.map(b => ({ ...b, status: 'published' }));
  await db.collection('books').insertMany(publishedBooks);
  console.log(`Inserted ${books.length} books`);

  await db.collection('about').insertOne(about);
  console.log('Inserted about data');

  await db.collection('home').insertOne(home);
  console.log('Inserted home data');

  await db.collection('settings').insertOne(settings);
  console.log('Inserted settings data');

  // Ensure admin user
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminUsername || !adminPassword) {
    console.error('FATAL: ADMIN_USERNAME and ADMIN_PASSWORD must be set in cms/.env');
    process.exit(1);
  }
  const users = db.collection('users');
  const existing = await users.findOne({ username: adminUsername });
  if (!existing) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    await users.insertOne({ username: adminUsername, password: hashed, createdAt: new Date() });
    console.log(`Created admin user (username: ${adminUsername})`);
  } else {
    console.log('Admin user already exists');
  }

  await client.close();
  console.log('Seed completed!');
}

seed().catch(console.error);
