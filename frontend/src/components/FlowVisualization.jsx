import React from 'react';
import { Database } from 'lucide-react';

// Custom icons for data sources
const ZoomIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M4.585 9.748c-1.064 0-1.917.853-1.917 1.917v4.666c0 1.064.853 1.917 1.917 1.917h6.5c1.064 0 1.917-.853 1.917-1.917v-1.75l3.25 2.167c.432.288 1-.029 1-.558V9.81c0-.529-.568-.846-1-.558l-3.25 2.167v-1.671c0-1.064-.853-1.917-1.917-1.917h-6.5z"/>
  </svg>
);

const SlackIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
  </svg>
);

const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" x2="12" y1="19" y2="22"/>
  </svg>
);

const FileTextIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
);

// Custom icons for output platforms
const CursorIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35z"/>
  </svg>
);

const ClaudeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
);

const WindsurfIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M2 20h20"/>
    <path d="M4 16c4-6 8-10 14-12"/>
    <path d="M6 12c3-4 6-7 10-8"/>
  </svg>
);

const SourceCard = ({ icon: Icon, label }) => (
  <div className="group flex items-center gap-3 bg-white border border-[#E4E4E7] rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:border-[#002FA7]/30 transition-all duration-300 cursor-default">
    <div className="w-10 h-10 rounded-lg bg-[#F4F4F5] flex items-center justify-center text-[#71717A] group-hover:bg-[#002FA7]/10 group-hover:text-[#002FA7] transition-colors">
      <Icon />
    </div>
    <span className="font-medium text-[#171717] text-sm whitespace-nowrap">{label}</span>
  </div>
);

const OutputCard = ({ icon: Icon, label }) => (
  <div className="group flex items-center gap-3 bg-white border border-[#E4E4E7] rounded-xl px-4 py-3 shadow-sm hover:shadow-md hover:border-[#002FA7]/30 transition-all duration-300 cursor-default">
    <div className="w-10 h-10 rounded-lg bg-[#F4F4F5] flex items-center justify-center text-[#71717A] group-hover:bg-[#002FA7]/10 group-hover:text-[#002FA7] transition-colors">
      <Icon />
    </div>
    <span className="font-medium text-[#171717] text-sm whitespace-nowrap">{label}</span>
  </div>
);

const FlowVisualization = () => {
  const sources = [
    { icon: ZoomIcon, label: 'Zoom Calls' },
    { icon: SlackIcon, label: 'Slack' },
    { icon: MicIcon, label: 'Audio Files' },
    { icon: FileTextIcon, label: 'Transcripts' },
  ];

  const outputs = [
    { icon: CursorIcon, label: 'Cursor' },
    { icon: ClaudeIcon, label: 'Claude' },
    { icon: WindsurfIcon, label: 'Windsurf' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-8 hidden lg:block">
      <div className="relative flex items-center justify-between gap-4 lg:gap-8">
        {/* Left: Data Sources */}
        <div className="flex-1 flex flex-col gap-3 items-end max-w-[200px]">
          {sources.map((source) => (
            <SourceCard 
              key={source.label} 
              icon={source.icon} 
              label={source.label}
            />
          ))}
        </div>

        {/* Center: Flow Lines + Kinesis Hub */}
        <div className="flex-shrink-0 flex items-center gap-0 relative">
          {/* Left Flow Lines */}
          <svg className="w-20 lg:w-28 h-52" viewBox="0 0 100 220" fill="none" preserveAspectRatio="none">
            <path d="M0 30 Q50 30 90 110" stroke="url(#gradient-left)" strokeWidth="2" fill="none" />
            <path d="M0 80 Q50 80 90 110" stroke="url(#gradient-left)" strokeWidth="2" fill="none" />
            <path d="M0 140 Q50 140 90 110" stroke="url(#gradient-left)" strokeWidth="2" fill="none" />
            <path d="M0 190 Q50 190 90 110" stroke="url(#gradient-left)" strokeWidth="2" fill="none" />
            <defs>
              <linearGradient id="gradient-left" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#E4E4E7" />
                <stop offset="100%" stopColor="#002FA7" />
              </linearGradient>
            </defs>
            {/* Animated dots */}
            <circle r="5" fill="#002FA7" opacity="0.8">
              <animateMotion dur="2.5s" repeatCount="indefinite" path="M0 30 Q50 30 90 110" />
            </circle>
            <circle r="5" fill="#002FA7" opacity="0.8">
              <animateMotion dur="2.5s" repeatCount="indefinite" path="M0 80 Q50 80 90 110" begin="0.6s" />
            </circle>
            <circle r="5" fill="#002FA7" opacity="0.8">
              <animateMotion dur="2.5s" repeatCount="indefinite" path="M0 140 Q50 140 90 110" begin="1.2s" />
            </circle>
            <circle r="5" fill="#002FA7" opacity="0.8">
              <animateMotion dur="2.5s" repeatCount="indefinite" path="M0 190 Q50 190 90 110" begin="1.8s" />
            </circle>
          </svg>

          {/* Central Hub - Kinesis Logo */}
          <div className="relative z-10">
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br from-[#002FA7] to-[#001d6a] shadow-xl shadow-[#002FA7]/25 flex items-center justify-center transform hover:scale-105 transition-transform">
              <Database className="h-10 w-10 lg:h-12 lg:w-12 text-white" />
            </div>
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-2xl bg-[#002FA7] opacity-20 blur-xl -z-10" />
          </div>

          {/* Right Flow Lines */}
          <svg className="w-20 lg:w-28 h-52" viewBox="0 0 100 220" fill="none" preserveAspectRatio="none">
            <path d="M10 110 Q50 55 100 55" stroke="url(#gradient-right)" strokeWidth="2" fill="none" />
            <path d="M10 110 Q50 110 100 110" stroke="url(#gradient-right)" strokeWidth="2" fill="none" />
            <path d="M10 110 Q50 165 100 165" stroke="url(#gradient-right)" strokeWidth="2" fill="none" />
            <defs>
              <linearGradient id="gradient-right" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#002FA7" />
                <stop offset="100%" stopColor="#E4E4E7" />
              </linearGradient>
            </defs>
            {/* Animated dots */}
            <circle r="5" fill="#002FA7" opacity="0.8">
              <animateMotion dur="2.5s" repeatCount="indefinite" path="M10 110 Q50 55 100 55" />
            </circle>
            <circle r="5" fill="#002FA7" opacity="0.8">
              <animateMotion dur="2.5s" repeatCount="indefinite" path="M10 110 Q50 110 100 110" begin="0.8s" />
            </circle>
            <circle r="5" fill="#002FA7" opacity="0.8">
              <animateMotion dur="2.5s" repeatCount="indefinite" path="M10 110 Q50 165 100 165" begin="1.6s" />
            </circle>
          </svg>
        </div>

        {/* Right: Output Platforms */}
        <div className="flex-1 flex flex-col gap-3 items-start max-w-[200px]">
          {outputs.map((output) => (
            <OutputCard 
              key={output.label} 
              icon={output.icon} 
              label={output.label}
            />
          ))}
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-4 px-8">
        <span className="text-xs font-mono text-[#A1A1AA] uppercase tracking-wider">Data Sources</span>
        <span className="text-xs font-mono text-[#A1A1AA] uppercase tracking-wider">AI Platforms</span>
      </div>
    </div>
  );
};

export default FlowVisualization;
