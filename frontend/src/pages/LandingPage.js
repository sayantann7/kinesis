import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Database, ArrowRight, Lightbulb, Zap, Workflow } from 'lucide-react';
import { Button } from '../components/ui/button';

const SourceCard = ({ icon, label }) => (
  <div className="group relative bg-white border border-[#E4E4E7] rounded-2xl p-3 shadow-sm hover:shadow-xl hover:border-[#002FA7]/40 hover:-translate-y-1 transition-all duration-300 cursor-default flex items-center gap-3">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FAFAFA] to-[#F0F0F0] flex items-center justify-center overflow-hidden group-hover:from-[#002FA7]/5 group-hover:to-[#002FA7]/10 transition-all flex-shrink-0">
      <img src={icon} alt={label} className="w-8 h-8 object-contain" />
    </div>
    <span className="text-sm font-medium text-[#171717] pr-2">{label}</span>
  </div>
);

const OutputCard = ({ icon, label }) => (
  <div className="group relative bg-white border border-[#E4E4E7] rounded-2xl p-3 shadow-sm hover:shadow-xl hover:border-[#002FA7]/40 hover:-translate-y-1 transition-all duration-300 cursor-default flex items-center gap-3">
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FAFAFA] to-[#F0F0F0] flex items-center justify-center overflow-hidden group-hover:from-[#002FA7]/5 group-hover:to-[#002FA7]/10 transition-all flex-shrink-0">
      <img src={icon} alt={label} className="w-8 h-8 object-contain" />
    </div>
    <span className="text-sm font-medium text-[#171717] pr-2">{label}</span>
  </div>
);

const LandingPage = () => {
  const { currentSession, isInitialized } = useAuth();
  const navigate = useNavigate();

  const sources = [
    { icon: '/zoom.png', label: 'Zoom Calls' },
    { icon: '/slack.png', label: 'Slack' },
    { icon: '/audio.jpg', label: 'Audio Files' },
    { icon: '/transcript.jpg', label: 'Transcripts' },
  ];

  const outputs = [
    { icon: '/cursor.png', label: 'Cursor' },
    { icon: '/claude.jpg', label: 'Claude' },
    { icon: '/windsurf.svg', label: 'Windsurf' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans">
      {/* Navbar */}
      <header className="px-6 lg:px-12 py-6 flex items-center justify-between border-b border-[#E4E4E7] bg-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="font-heading font-semibold text-3xl tracking-tight text-[#171717]">
            Kinesis
          </span>
        </div>
        <div>
          {(!isInitialized || !currentSession) ? (
            <Button 
              onClick={() => navigate('/login')}
              variant="outline"
              className="font-mono text-sm uppercase tracking-wider"
            >
              Sign In
            </Button>
          ) : (
            <Button 
              onClick={() => navigate('/dashboard')}
              className="bg-[#171717] hover:bg-black text-white font-mono text-sm uppercase tracking-wider flex items-center gap-2"
            >
              Dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section - Three Column Layout */}
      <main className="flex-1 relative overflow-hidden">
        {/* Desktop: Layout with Side Cards */}
        <div className="hidden lg:block min-h-[calc(100vh-88px)] relative">
          
          {/* Left Column: Data Sources - Absolute Left Edge */}
          <div className="absolute left-6 xl:left-12 2xl:left-20 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20">
            {sources.map((source) => (
              <SourceCard 
                key={source.label} 
                icon={source.icon} 
                label={source.label}
              />
            ))}
            <span className="text-[10px] font-mono text-[#A1A1AA] uppercase tracking-[0.2em] mt-2 text-center">Data Sources</span>
          </div>

          {/* Right Column: AI Platforms - Absolute Right Edge */}
          <div className="absolute right-6 xl:right-12 2xl:right-20 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20">
            {outputs.map((output) => (
              <OutputCard 
                key={output.label} 
                icon={output.icon} 
                label={output.label}
              />
            ))}
            <span className="text-[10px] font-mono text-[#A1A1AA] uppercase tracking-[0.2em] mt-2 text-center">AI Platforms</span>
          </div>

          {/* Center: Hero Content */}
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-88px)] px-8 mx-auto max-w-3xl relative">
            <div className="relative z-10 space-y-8 text-center">
              <h1 className="font-heading text-5xl xl:text-7xl font-bold tracking-tight text-[#171717] leading-tight flex flex-col">
                <span>Put your Ideas</span>
                <span className="text-[#002FA7]">in Motion.</span>
              </h1>
              
              <p className="text-lg xl:text-xl text-[#71717A] max-w-xl mx-auto font-light leading-relaxed">
                A purposeful space to structure your product specs, gather deep insights, 
                and seamlessly bridge the gap between initial ideation and final implementation.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                {(!isInitialized || !currentSession) ? (
                  <Button 
                    onClick={() => navigate('/login')}
                    className="bg-[#002FA7] hover:bg-[#002FA7]/90 text-white px-8 py-6 text-lg font-mono uppercase tracking-wider h-auto"
                  >
                    Start Motion <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                ) : (
                  <Button 
                    onClick={() => navigate('/dashboard')}
                    className="bg-[#002FA7] hover:bg-[#002FA7]/90 text-white px-8 py-6 text-lg font-mono uppercase tracking-wider h-auto"
                  >
                    Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  onClick={() => document.getElementById('how-it-helps').scrollIntoView({ behavior: 'smooth' })}
                  className="px-8 py-6 text-lg font-mono text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#171717] h-auto uppercase tracking-wider"
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>

          {/* SVG Flow Lines - Left converge, Right diverge */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none z-0" 
            viewBox="0 0 1400 700" 
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              {/* Gradient for left lines (tube) */}
              <linearGradient id="leftGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#002FA7" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#002FA7" stopOpacity="0.4" />
              </linearGradient>
              {/* Gradient for right lines (tube) */}
              <linearGradient id="rightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#002FA7" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#002FA7" stopOpacity="0.15" />
              </linearGradient>
              {/* Laser glow filter */}
              <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* LEFT SIDE: 4 tube lines from cards converging */}
            <path d="M 220 200 Q 380 200 520 260" stroke="url(#leftGradient)" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 220 280 Q 380 280 520 260" stroke="url(#leftGradient)" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 220 360 Q 380 360 520 260" stroke="url(#leftGradient)" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 220 440 Q 380 440 520 260" stroke="url(#leftGradient)" strokeWidth="2" fill="none" strokeLinecap="round" />
            
            {/* RIGHT SIDE: 3 tube lines diverging to cards */}
            <path d="M 880 260 Q 1050 200 1240 260" stroke="url(#rightGradient)" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 880 260 Q 1050 300 1240 330" stroke="url(#rightGradient)" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 880 260 Q 1050 380 1240 400" stroke="url(#rightGradient)" strokeWidth="2" fill="none" strokeLinecap="round" />

            {/* Laser lines flowing through left tubes */}
            <path d="M 220 200 Q 380 200 520 260" stroke="#002FA7" strokeWidth="1" fill="none" strokeLinecap="round" filter="url(#laserGlow)" strokeDasharray="40 400" style={{ animation: 'laserFlow1 2.5s linear infinite' }} />
            <path d="M 220 280 Q 380 280 520 260" stroke="#002FA7" strokeWidth="1" fill="none" strokeLinecap="round" filter="url(#laserGlow)" strokeDasharray="40 400" style={{ animation: 'laserFlow2 2.5s linear infinite' }} />
            <path d="M 220 360 Q 380 360 520 260" stroke="#002FA7" strokeWidth="1" fill="none" strokeLinecap="round" filter="url(#laserGlow)" strokeDasharray="40 400" style={{ animation: 'laserFlow3 2.5s linear infinite' }} />
            <path d="M 220 440 Q 380 440 520 260" stroke="#002FA7" strokeWidth="1" fill="none" strokeLinecap="round" filter="url(#laserGlow)" strokeDasharray="40 400" style={{ animation: 'laserFlow4 2.5s linear infinite' }} />
            
            {/* Laser lines flowing through right tubes */}
            <path d="M 880 260 Q 1050 200 1240 260" stroke="#002FA7" strokeWidth="1" fill="none" strokeLinecap="round" filter="url(#laserGlow)" strokeDasharray="40 400" style={{ animation: 'laserFlowR1 2.5s linear infinite' }} />
            <path d="M 880 260 Q 1050 300 1240 330" stroke="#002FA7" strokeWidth="1" fill="none" strokeLinecap="round" filter="url(#laserGlow)" strokeDasharray="40 400" style={{ animation: 'laserFlowR2 2.5s linear infinite' }} />
            <path d="M 880 260 Q 1050 380 1240 400" stroke="#002FA7" strokeWidth="1" fill="none" strokeLinecap="round" filter="url(#laserGlow)" strokeDasharray="40 400" style={{ animation: 'laserFlowR3 2.5s linear infinite' }} />

            <style>{`
              @keyframes laserFlow1 {
                0% { stroke-dashoffset: 440; }
                100% { stroke-dashoffset: 0; }
              }
              @keyframes laserFlow2 {
                0% { stroke-dashoffset: 440; }
                100% { stroke-dashoffset: 0; }
              }
              @keyframes laserFlow3 {
                0% { stroke-dashoffset: 440; }
                100% { stroke-dashoffset: 0; }
              }
              @keyframes laserFlow4 {
                0% { stroke-dashoffset: 440; }
                100% { stroke-dashoffset: 0; }
              }
              @keyframes laserFlowR1 {
                0% { stroke-dashoffset: 440; }
                100% { stroke-dashoffset: 0; }
              }
              @keyframes laserFlowR2 {
                0% { stroke-dashoffset: 440; }
                100% { stroke-dashoffset: 0; }
              }
              @keyframes laserFlowR3 {
                0% { stroke-dashoffset: 440; }
                100% { stroke-dashoffset: 0; }
              }
            `}</style>
          </svg>
        </div>

        {/* Mobile: Stacked Layout (no flow visualization) */}
        <div className="lg:hidden flex flex-col items-center justify-center text-center px-6 py-16 min-h-[calc(100vh-88px)]">
          <div className="max-w-4xl space-y-8">
            <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-[#171717] leading-tight flex flex-col">
              <span>Put your Ideas</span>
              <span className="text-[#002FA7]">in Motion.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-[#71717A] max-w-xl mx-auto font-light leading-relaxed">
              A purposeful space to structure your product specs, gather deep insights, 
              and seamlessly bridge the gap between initial ideation and final implementation.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              {(!isInitialized || !currentSession) ? (
                <Button 
                  onClick={() => navigate('/login')}
                  className="bg-[#002FA7] hover:bg-[#002FA7]/90 text-white px-8 py-6 text-lg font-mono uppercase tracking-wider h-auto w-full sm:w-auto"
                >
                  Start Motion <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="bg-[#002FA7] hover:bg-[#002FA7]/90 text-white px-8 py-6 text-lg font-mono uppercase tracking-wider h-auto w-full sm:w-auto"
                >
                  Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              )}
              
              <Button 
                variant="ghost" 
                onClick={() => document.getElementById('how-it-helps').scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-6 text-lg font-mono text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#171717] h-auto w-full sm:w-auto uppercase tracking-wider"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Benefits Section */}
      <section id="how-it-helps" className="bg-white py-24 px-6 lg:px-12 border-t border-[#E4E4E7]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl font-bold text-[#171717]">Built for Clarity</h2>
            <p className="mt-4 text-[#71717A] font-mono tracking-wide uppercase text-sm">Empowering teams to build better products</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="bg-[#F4F4F5] w-12 h-12 rounded-lg flex items-center justify-center">
                <Lightbulb className="h-6 w-6 text-[#171717]" />
              </div>
              <h3 className="font-heading text-xl font-bold text-[#171717]">Centralized Knowledge</h3>
              <p className="text-[#71717A] leading-relaxed">
                Keep all your product definitions, market research, and architectural outlines in one organized, easily searchable place.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-[#F4F4F5] w-12 h-12 rounded-lg flex items-center justify-center">
                <Workflow className="h-6 w-6 text-[#171717]" />
              </div>
              <h3 className="font-heading text-xl font-bold text-[#171717]">AI-Native Insights</h3>
              <p className="text-[#71717A] leading-relaxed">
                Harness context-aware assistance to refine user stories, spot missing requirements, and generate implementation ideas on the fly.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-[#F4F4F5] w-12 h-12 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-[#171717]" />
              </div>
              <h3 className="font-heading text-xl font-bold text-[#171717]">Seamless Export</h3>
              <p className="text-[#71717A] leading-relaxed">
                Take your finalised specifications into your existing tools. Seamlessly format and push your ideas right to where the code happens.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-[#A1A1AA] font-mono text-sm border-t border-[#E4E4E7] bg-[#FAFAFA]">
        <p>&copy; {new Date().getFullYear()} Kinesis. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
