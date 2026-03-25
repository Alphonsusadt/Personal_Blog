export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  rating: number;
  category: 'technical' | 'biography' | 'spiritual' | 'philosophy';
  takeaways: string[];
  review: string;
}

export const books: Book[] = [
  {
    id: 'at-last',
    title: 'At the Existentialist Café',
    author: 'Sarah Bakewell',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop',
    rating: 5,
    category: 'philosophy',
    takeaways: [
      'Freedom and responsibility are two sides of the same coin',
      'Authenticity requires confronting our own mortality',
      'Philosophy is not just thinking, but living according to our values'
    ],
    review: 'A fascinating exploration of existentialism that makes complex philosophical ideas accessible and relevant to daily life. Bakewell weaves together biography and philosophy in a way that shows how ideas emerge from lived experience.'
  },
  {
    id: 'man-search',
    title: 'Man\'s Search for Meaning',
    author: 'Viktor Frankl',
    cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=300&h=400&fit=crop',
    rating: 5,
    category: 'spiritual',
    takeaways: [
      'Meaning can be found in suffering through our response to it',
      'We have the freedom to choose our attitude in any circumstance',
      'Purpose is discovered through love, work, and courage in difficult times'
    ],
    review: 'Frankl\'s account of finding meaning in the midst of Holocaust suffering is profound and life-changing. His development of logotherapy provides a framework for finding purpose even in the darkest circumstances.'
  },
  {
    id: 'emperor',
    title: 'The Emperor of All Maladies',
    author: 'Siddhartha Mukherjee',
    cover: 'https://images.unsplash.com/photo-1553729784-e91953dec042?w=300&h=400&fit=crop',
    rating: 4,
    category: 'biography',
    takeaways: [
      'Cancer is not one disease but many, requiring personalized approaches',
      'Medical progress often comes from unexpected directions',
      'The human story behind scientific discovery is as important as the science itself'
    ],
    review: 'A masterful biography of cancer that reads like a thriller. Mukherjee combines scientific rigor with human storytelling, showing how our understanding of cancer has evolved and the personalities behind major breakthroughs.'
  },
  {
    id: 'signals-systems',
    title: 'Signals and Systems',
    author: 'Alan Oppenheim',
    cover: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300&h=400&fit=crop',
    rating: 5,
    category: 'technical',
    takeaways: [
      'Fourier analysis reveals the frequency structure underlying all signals',
      'Linearity and time-invariance are powerful concepts that simplify complex systems',
      'The convolution operation is fundamental to understanding system behavior'
    ],
    review: 'The definitive textbook on signal processing. Oppenheim\'s clear explanations and numerous examples make complex concepts accessible. Essential for anyone serious about signal processing and systems theory.'
  },
  {
    id: 'spirituality',
    title: 'The Soul of a New Machine',
    author: 'Tracy Kidder',
    cover: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=400&fit=crop',
    rating: 4,
    category: 'biography',
    takeaways: [
      'Innovation requires both technical brilliance and human dedication',
      'The drive to create something new can border on obsession',
      'Great achievements come from teams, not just individuals'
    ],
    review: 'A Pulitzer Prize-winning account of the race to build a new computer. Kidder captures the intensity, creativity, and human drama of technological innovation, showing how passion drives progress.'
  },
  {
    id: 'brothers-k',
    title: 'The Brothers Karamazov',
    author: 'Fyodor Dostoevsky',
    cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop',
    rating: 5,
    category: 'philosophy',
    takeaways: [
      'Faith and doubt are not opposites but necessary companions',
      'The problem of suffering is central to human existence',
      'Love is an active choice, not just a feeling'
    ],
    review: 'Dostoevsky\'s masterpiece explores faith, doubt, morality, and redemption through the complex relationships of three brothers. The Grand Inquisitor chapter alone is worth the entire read—a profound meditation on freedom and authority.'
  },
  {
    id: 'biomedical',
    title: 'Biomedical Signal Analysis',
    author: 'Rangaraj Rangayyan',
    cover: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=300&h=400&fit=crop',
    rating: 4,
    category: 'technical',
    takeaways: [
      'Biomedical signals require specialized analysis techniques due to their non-stationary nature',
      'Wavelet transforms are superior to Fourier transforms for time-frequency analysis of biological signals',
      'Artifact removal is as important as signal enhancement'
    ],
    review: 'A comprehensive guide to analyzing biomedical signals. Rangayyan provides both theoretical foundations and practical applications, with excellent examples from real clinical data.'
  },
  {
    id: 'seven-storey',
    title: 'The Seven Storey Mountain',
    author: 'Thomas Merton',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop',
    rating: 5,
    category: 'spiritual',
    takeaways: [
      'The search for meaning often leads to unexpected places',
      'Silence and contemplation are essential for spiritual growth',
      'True freedom comes from surrender to something greater than oneself'
    ],
    review: 'Merton\'s autobiography of his journey from worldly intellectual to Trappist monk is a spiritual classic. His honest exploration of faith, doubt, and the search for authentic living resonates deeply with anyone seeking meaning beyond material success.'
  },
  {
    id: 'atlas',
    title: 'The Emperor\'s New Mind',
    author: 'Roger Penrose',
    cover: 'https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?w=300&h=400&fit=crop',
    rating: 4,
    category: 'philosophy',
    takeaways: [
      'Consciousness may not be computable by traditional algorithms',
      'Quantum mechanics might play a role in brain function',
      'Mathematical truth exists independently of human minds'
    ],
    review: 'Penrose challenges the notion that consciousness can be fully explained by computation. His arguments about the non-computational nature of human thought are provocative and profound, bridging physics, mathematics, and philosophy.'
  },
  {
    id: 'digital-design',
    title: 'The Art of Digital Design',
    author: 'Frank Vahid',
    cover: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300&h=400&fit=crop',
    rating: 4,
    category: 'technical',
    takeaways: [
      'Digital design requires both creativity and rigorous thinking',
      'Understanding trade-offs is essential for good engineering',
      'Simplicity should be the ultimate goal in design'
    ],
    review: 'An excellent introduction to digital design that balances theory with practical applications. Vahid\'s approach emphasizes understanding concepts over memorizing details, making it valuable for both students and practitioners.'
  },
  {
    id: 'consolation',
    title: 'The Consolation of Philosophy',
    author: 'Boethius',
    cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop',
    rating: 5,
    category: 'philosophy',
    takeaways: [
      'True happiness comes from within, not from external circumstances',
      'Fortune is fickle and cannot be relied upon for lasting joy',
      'God\'s perspective transcends our limited temporal understanding'
    ],
    review: 'Written while awaiting execution, Boethius\'s dialogue with Lady Philosophy offers timeless wisdom about finding meaning in suffering. His synthesis of classical philosophy and Christian thought provides a framework for understanding divine providence and human free will.'
  },
  {
    id: 'neuroscience',
    title: 'Principles of Neural Science',
    author: 'Eric Kandel',
    cover: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=300&h=400&fit=crop',
    rating: 5,
    category: 'technical',
    takeaways: [
      'The brain is not a computer but a dynamic, self-organizing system',
      'Learning and memory involve physical changes in neural connections',
      'Understanding the brain requires integrating multiple levels of analysis'
    ],
    review: 'The definitive textbook on neuroscience. Kandel and colleagues provide comprehensive coverage of neural function from molecular mechanisms to cognitive processes. Essential reading for anyone serious about understanding the brain.'
  }
];

export const getBooksByCategory = (category: Book['category']) => {
  return books.filter(b => b.category === category);
};

export const getBookById = (id: string): Book | undefined => {
  return books.find(b => b.id === id);
};