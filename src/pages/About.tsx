import { Github, Linkedin, Mail, Heart, Award, BookOpen, Code, Users } from 'lucide-react';

export function About() {
  return (
    <div className="min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
            About Alphonsus
          </h1>
          <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
            Bridging the worlds of biomedical engineering and faith
          </p>
        </div>

        {/* Hero Section with Image */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-2xl p-8 lg:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-lg">
                  <div className="bg-[#E5E7EB] dark:bg-[#334155] border-2 border-dashed border-[#9CA3AF] dark:border-[#6B7280] rounded-lg w-full h-64 flex items-center justify-center">
                    <div className="text-center">
                      <div className="bg-[#1E40AF] dark:bg-[#60A5FA] rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Users className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-[#6B7280] text-sm">Professional Photo</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
                  Biomedical Engineering Student
                </h2>
                <p className="text-[#6B7280] mb-6 leading-relaxed">
                  I'm a passionate biomedical engineering student with a deep interest in signal processing, 
                  medical devices, and the profound questions that arise when technology meets human life. 
                  My journey is guided by both scientific curiosity and spiritual reflection.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#1E293B] rounded-lg p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-[#1E40AF] dark:text-[#60A5FA]">3.9</div>
                    <div className="text-sm text-[#6B7280]">GPA</div>
                  </div>
                  <div className="bg-white dark:bg-[#1E293B] rounded-lg p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-[#1E40AF] dark:text-[#60A5FA]">6+</div>
                    <div className="text-sm text-[#6B7280]">Projects</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Story */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-8">
            My Story
          </h2>
          
          <div className="space-y-8">
            <section>
              <h3 className="text-xl font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
                Why Biomedical Engineering?
              </h3>
              <p className="text-[#6B7280] leading-relaxed mb-4 serif-font">
                My journey into biomedical engineering began with a simple question: How can we use technology 
                to better understand and heal the human body? Growing up, I was fascinated by both the precision 
                of mathematics and the mystery of life. Biomedical engineering became the perfect intersection 
                of these passions.
              </p>
              <p className="text-[#6B7280] leading-relaxed serif-font">
                What draws me most to this field is the opportunity to work on problems that directly impact 
                human health and wellbeing. Whether it's developing better ways to process ECG signals or 
                designing affordable medical devices, every project has the potential to make a real difference 
                in someone's life.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
                The Intersection of Faith and Engineering
              </h3>
              <p className="text-[#6B7280] leading-relaxed mb-4 serif-font">
                Many people see science and faith as opposing forces, but I've found them to be complementary 
                ways of understanding reality. My work in signal processing has actually deepened my sense of 
                wonder at the complexity and beauty of creation.
              </p>
              <p className="text-[#6B7280] leading-relaxed serif-font">
                When I see the elegant mathematics underlying a cardiac signal or the intricate patterns in 
                neural activity, I'm reminded that we're studying systems of profound complexity and purpose. 
                This perspective transforms engineering from mere technical problem-solving into a form of 
                contemplation and service.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] mb-4">
                Current Focus
              </h3>
              <p className="text-[#6B7280] leading-relaxed serif-font">
                Currently, I'm focused on signal processing techniques for biomedical applications, particularly 
                in cardiac and neural signal analysis. I'm also exploring how machine learning can be applied 
                to medical diagnosis while maintaining the human element that's so crucial to healthcare.
              </p>
            </section>
          </div>
        </div>

        {/* Skills and Interests */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-8">
            Skills & Interests
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm border border-[#E5E7EB] dark:border-[#334155]">
              <div className="flex items-center mb-4">
                <div className="bg-[#1E40AF] dark:bg-[#60A5FA] p-2 rounded-lg mr-3">
                  <Code className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#F8FAFC]">
                  Technical Skills
                </h3>
              </div>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC] mb-2">Programming Languages</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Python', 'MATLAB', 'C++', 'JavaScript', 'R'].map(skill => (
                      <span key={skill} className="tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC] mb-2">Specializations</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Signal Processing', 'Medical Imaging', 'Machine Learning', 'Embedded Systems'].map(skill => (
                      <span key={skill} className="tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm border border-[#E5E7EB] dark:border-[#334155]">
              <div className="flex items-center mb-4">
                <div className="bg-[#1E40AF] dark:bg-[#60A5FA] p-2 rounded-lg mr-3">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#F8FAFC]">
                  Interests
                </h3>
              </div>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC] mb-2">Academic</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Biomedical Ethics', 'Philosophy of Science', 'Theology & Technology'].map(skill => (
                      <span key={skill} className="tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC] mb-2">Personal</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Reading', 'Contemplative Prayer', 'Hiking', 'Classical Music'].map(skill => (
                      <span key={skill} className="tag">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Education and Achievements */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-8">
            Education & Achievements
          </h2>
          
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm border border-[#E5E7EB] dark:border-[#334155]">
              <div className="flex items-start space-x-4">
                <div className="bg-[#1E40AF] dark:bg-[#60A5FA] p-3 rounded-lg">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] mb-1">
                    Bachelor of Science in Biomedical Engineering
                  </h3>
                  <p className="text-[#6B7280] mb-2">University of Technology • Expected 2025</p>
                  <p className="text-[#6B7280] text-sm serif-font">
                    Focus on signal processing and medical device design. Dean's List for 4 consecutive semesters.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1E293B] rounded-xl p-6 shadow-sm border border-[#E5E7EB] dark:border-[#334155]">
              <div className="flex items-start space-x-4">
                <div className="bg-[#1E40AF] dark:bg-[#60A5FA] p-3 rounded-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#1A1A1A] dark:text-[#F8FAFC] mb-1">
                    Research Assistant - Signal Processing Lab
                  </h3>
                  <p className="text-[#6B7280] mb-2">University of Technology • 2023 - Present</p>
                  <p className="text-[#6B7280] text-sm serif-font">
                    Developing algorithms for ECG signal analysis and noise reduction. Published 
                    one conference paper on digital filter design for medical applications.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-[#1A1A1A] dark:text-[#F8FAFC] mb-8">
            Let's Connect
          </h2>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-2xl p-8">
            <p className="text-lg text-[#6B7280] mb-6 leading-relaxed serif-font text-center max-w-2xl mx-auto">
              I am always open to discussing biomedical signals, faith, or potential collaborations. 
              Whether you're working on a research project, have questions about signal processing, 
              or just want to explore the intersection of technology and spirituality, I'd love to hear from you.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <a
                href="https://linkedin.com/in/alphonsusadt"
                className="flex items-center space-x-3 bg-white dark:bg-[#1E293B] px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <Linkedin className="w-5 h-5 text-[#1E40AF] dark:text-[#60A5FA]" />
                <span className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC]">LinkedIn</span>
              </a>
              
              <a
                href="https://github.com/alphonsusadt"
                className="flex items-center space-x-3 bg-white dark:bg-[#1E293B] px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <Github className="w-5 h-5 text-[#1A1A1A] dark:text-[#F8FAFC]" />
                <span className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC]">GitHub</span>
              </a>
              
              <a
                href="mailto:alphonsus@example.com"
                className="flex items-center space-x-3 bg-white dark:bg-[#1E293B] px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <Mail className="w-5 h-5 text-[#1E40AF] dark:text-[#60A5FA]" />
                <span className="font-medium text-[#1A1A1A] dark:text-[#F8FAFC]">Email</span>
              </a>
            </div>
          </div>
        </div>

        {/* Philosophy Statement */}
        <div className="mb-16">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-8 shadow-sm border border-[#E5E7EB] dark:border-[#334155]">
            <blockquote className="text-center">
              <p className="text-xl text-[#6B7280] mb-6 leading-relaxed serif-font">
                "The more I study science, the more I believe in God. The more I understand signal processing, 
                the more I marvel at the elegant design of biological systems. Engineering and faith are not 
                in conflict—they are two different languages describing the same reality."
              </p>
              <footer className="text-[#1E40AF] dark:text-[#60A5FA] font-medium">
                — Alphonsus Aditya
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}