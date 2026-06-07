import { visionStrategy } from '@/config/content'

// Lightbulb with Network icon - Ideas + Connectivity
const LightbulbNetworkIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="bulb-grad-main" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#4F46E5', stopOpacity: 1 }} />
        <stop offset="50%" style={{ stopColor: '#3B82F6', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#06B6D4', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    {/* Main lightbulb */}
    <circle cx="50" cy="35" r="20" fill="url(#bulb-grad-main)"/>
    <path d="M 40 52 L 40 62 Q 40 68 50 68 Q 60 68 60 62 L 60 52" fill="url(#bulb-grad-main)" opacity="0.9"/>
    <rect x="45" y="68" width="10" height="4" fill="url(#bulb-grad-main)"/>
    <rect x="43" y="72" width="14" height="5" rx="2.5" fill="url(#bulb-grad-main)"/>
    
    {/* Light rays */}
    <line x1="50" y1="13" x2="50" y2="5" stroke="url(#bulb-grad-main)" strokeWidth="3.5" strokeLinecap="round"/>
    <line x1="72" y1="23" x2="80" y2="15" stroke="url(#bulb-grad-main)" strokeWidth="3.5" strokeLinecap="round"/>
    <line x1="28" y1="23" x2="20" y2="15" stroke="url(#bulb-grad-main)" strokeWidth="3.5" strokeLinecap="round"/>
    <line x1="75" y1="40" x2="83" y2="40" stroke="url(#bulb-grad-main)" strokeWidth="3.5" strokeLinecap="round"/>
    <line x1="25" y1="40" x2="17" y2="40" stroke="url(#bulb-grad-main)" strokeWidth="3.5" strokeLinecap="round"/>
    
    {/* Network nodes */}
    <circle cx="12" cy="50" r="5" fill="url(#bulb-grad-main)" opacity="0.8"/>
    <circle cx="88" cy="50" r="5" fill="url(#bulb-grad-main)" opacity="0.8"/>
    <circle cx="25" cy="85" r="5" fill="url(#bulb-grad-main)" opacity="0.8"/>
    <circle cx="75" cy="85" r="5" fill="url(#bulb-grad-main)" opacity="0.8"/>
    
    {/* Connection lines from bulb to nodes */}
    <line x1="32" y1="52" x2="17" y2="50" stroke="url(#bulb-grad-main)" strokeWidth="2" opacity="0.6"/>
    <line x1="68" y1="52" x2="83" y2="50" stroke="url(#bulb-grad-main)" strokeWidth="2" opacity="0.6"/>
    <line x1="42" y1="75" x2="30" y2="82" stroke="url(#bulb-grad-main)" strokeWidth="2" opacity="0.6"/>
    <line x1="58" y1="75" x2="70" y2="82" stroke="url(#bulb-grad-main)" strokeWidth="2" opacity="0.6"/>
    
    {/* Node connections (mesh network) */}
    <line x1="12" y1="50" x2="25" y2="85" stroke="url(#bulb-grad-main)" strokeWidth="1.5" opacity="0.4"/>
    <line x1="88" y1="50" x2="75" y2="85" stroke="url(#bulb-grad-main)" strokeWidth="1.5" opacity="0.4"/>
    <line x1="25" y1="85" x2="75" y2="85" stroke="url(#bulb-grad-main)" strokeWidth="1.5" opacity="0.4"/>
  </svg>
);

// Decorative network icon for background
const NetworkDecorativeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none">
    <defs>
      <linearGradient id="network-dec-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#818CF8', stopOpacity: 0.3 }} />
        <stop offset="100%" style={{ stopColor: '#C084FC', stopOpacity: 0.3 }} />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="45" stroke="url(#network-dec-grad)" strokeWidth="2" fill="none"/>
    <circle cx="50" cy="50" r="5" fill="url(#network-dec-grad)"/>
    <circle cx="20" cy="20" r="4" fill="url(#network-dec-grad)"/>
    <circle cx="80" cy="20" r="4" fill="url(#network-dec-grad)"/>
    <circle cx="20" cy="80" r="4" fill="url(#network-dec-grad)"/>
    <circle cx="80" cy="80" r="4" fill="url(#network-dec-grad)"/>
    <line x1="50" y1="50" x2="20" y2="20" stroke="url(#network-dec-grad)" strokeWidth="1.5"/>
    <line x1="50" y1="50" x2="80" y2="20" stroke="url(#network-dec-grad)" strokeWidth="1.5"/>
    <line x1="50" y1="50" x2="20" y2="80" stroke="url(#network-dec-grad)" strokeWidth="1.5"/>
    <line x1="50" y1="50" x2="80" y2="80" stroke="url(#network-dec-grad)" strokeWidth="1.5"/>
  </svg>
);

export default function VisionStrategy() {
  return (
    <section className="py-16 bg-white">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              {visionStrategy.title}
            </h2>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              {visionStrategy.description.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Colorful Icon Section */}
          <div className="relative">
            <div className="bg-gradient-to-br from-indigo-100 via-blue-100 to-cyan-100 rounded-lg shadow-lg p-16 flex items-center justify-center relative overflow-hidden">
              
              {/* Animated background decorative elements */}
              <div className="absolute -top-10 -left-10 w-48 h-48 opacity-40 animate-pulse">
                <NetworkDecorativeIcon className="w-full h-full" />
              </div>
              <div className="absolute -bottom-10 -right-10 w-48 h-48 opacity-40 animate-pulse" style={{ animationDelay: '1.5s' }}>
                <NetworkDecorativeIcon className="w-full h-full" />
              </div>
              
              {/* Floating sparkle effects */}
              <div className="absolute top-8 right-8 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
              <div className="absolute bottom-12 left-12 w-2 h-2 bg-cyan-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute top-16 left-16 w-2 h-2 bg-indigo-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
              
              {/* Main colorful lightbulb icon */}
              <div className="relative w-64 h-64 transform hover:scale-110 transition-transform duration-300">
                <LightbulbNetworkIcon className="w-full h-full drop-shadow-2xl" />
              </div>
            </div>
            
            {/* Colorful feature badges with gradients */}
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3">
              <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 text-white rounded-full px-6 py-2.5 shadow-lg text-sm font-semibold flex items-center gap-2">
                <span>💡</span> Digital First
              </div>
              <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white rounded-full px-6 py-2.5 shadow-lg text-sm font-semibold flex items-center gap-2">
                <span>👥</span> Citizen-Centric
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}