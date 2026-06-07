import { StrategyCard as StrategyCardType } from '@/config/content'

// Custom Colorful Icon Components based on user selection
const IconComponents: { [key: string]: React.FC<{ className?: string }> } = {
  // 1. Graduation Cap - Education/Training Theme
  'graduation': ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="grad-cap" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#06B6D4', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#8B5CF6', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      {/* Cap top (mortarboard) */}
      <path d="M 50 25 L 80 35 L 50 45 L 20 35 Z" fill="url(#grad-cap)"/>
      {/* Cap base */}
      <path d="M 30 35 L 30 55 Q 30 65 50 70 Q 70 65 70 55 L 70 35" fill="url(#grad-cap)" opacity="0.8"/>
      {/* Tassel */}
      <circle cx="80" cy="35" r="3" fill="url(#grad-cap)"/>
      <line x1="80" y1="38" x2="80" y2="48" stroke="url(#grad-cap)" strokeWidth="2"/>
      <circle cx="80" cy="50" r="4" fill="url(#grad-cap)"/>
      {/* Book accent */}
      <rect x="42" y="72" width="16" height="12" rx="1" fill="url(#grad-cap)" opacity="0.6"/>
      <line x1="42" y1="78" x2="58" y2="78" stroke="white" strokeWidth="1"/>
    </svg>
  ),
  
  // 2. Heart with Check - Care + Completion
  'heart-check': ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="grad-heart" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#10B981', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#34D399', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#FBBF24', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      {/* Heart shape */}
      <path d="M 50 85 Q 15 60 15 40 Q 15 25 25 20 Q 35 15 42 25 Q 45 30 50 35 Q 55 30 58 25 Q 65 15 75 20 Q 85 25 85 40 Q 85 60 50 85 Z" 
            fill="url(#grad-heart)"/>
      {/* Checkmark */}
      <path d="M 35 48 L 45 58 L 65 38" 
            stroke="white" 
            strokeWidth="6" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill="none"/>
    </svg>
  ),
  
  // 3. Recycling Symbol in Shield - Sustainability Focus
  'recycle-shield': ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="grad-shield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#8B5CF6', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#A78BFA', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#10B981', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      {/* Shield shape */}
      <path d="M 50 10 L 80 25 L 80 50 Q 80 75 50 90 Q 20 75 20 50 L 20 25 Z" 
            fill="url(#grad-shield)"/>
      {/* Recycling symbol - three arrows in triangle */}
      <g transform="translate(50, 50) scale(0.35)">
        {/* Top arrow */}
        <path d="M 0 -35 L -10 -20 L 10 -20 Z" fill="white"/>
        <path d="M -7 -22 L -20 -5 L -10 -5 Z" fill="white"/>
        {/* Bottom right arrow */}
        <path d="M 30 18 L 20 33 L 35 28 Z" fill="white"/>
        <path d="M 22 31 L 7 28 L 12 18 Z" fill="white"/>
        {/* Bottom left arrow */}
        <path d="M -30 18 L -35 28 L -20 33 Z" fill="white"/>
        <path d="M -22 31 L -12 18 L -7 28 Z" fill="white"/>
      </g>
      {/* Leaf accent */}
      <path d="M 62 68 Q 68 72 70 68 Q 68 64 62 68" fill="white" opacity="0.8"/>
    </svg>
  ),
  
  // 4. Lightbulb with Network - Ideas + Connectivity
  'bulb-network': ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="grad-bulb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#4F46E5', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#3B82F6', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#06B6D4', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      {/* Lightbulb */}
      <circle cx="50" cy="35" r="18" fill="url(#grad-bulb)"/>
      <path d="M 42 50 L 42 60 Q 42 65 50 65 Q 58 65 58 60 L 58 50" fill="url(#grad-bulb)" opacity="0.8"/>
      <rect x="46" y="65" width="8" height="3" fill="url(#grad-bulb)"/>
      <rect x="44" y="68" width="12" height="4" rx="2" fill="url(#grad-bulb)"/>
      {/* Light rays */}
      <line x1="50" y1="15" x2="50" y2="8" stroke="url(#grad-bulb)" strokeWidth="3" strokeLinecap="round"/>
      <line x1="70" y1="25" x2="76" y2="19" stroke="url(#grad-bulb)" strokeWidth="3" strokeLinecap="round"/>
      <line x1="30" y1="25" x2="24" y2="19" stroke="url(#grad-bulb)" strokeWidth="3" strokeLinecap="round"/>
      {/* Network nodes */}
      <circle cx="15" cy="45" r="4" fill="url(#grad-bulb)" opacity="0.7"/>
      <circle cx="85" cy="45" r="4" fill="url(#grad-bulb)" opacity="0.7"/>
      <circle cx="50" cy="80" r="4" fill="url(#grad-bulb)" opacity="0.7"/>
      {/* Connection lines */}
      <line x1="32" y1="50" x2="19" y2="45" stroke="url(#grad-bulb)" strokeWidth="1.5" opacity="0.5"/>
      <line x1="68" y1="50" x2="81" y2="45" stroke="url(#grad-bulb)" strokeWidth="1.5" opacity="0.5"/>
      <line x1="50" y1="72" x2="50" y2="76" stroke="url(#grad-bulb)" strokeWidth="1.5" opacity="0.5"/>
    </svg>
  )
};

// Map icon names to components
const iconMap: { [key: string]: string } = {
  'users': 'graduation',
  'check-circle': 'heart-check',
  'shield-check': 'recycle-shield',
  'mobile': 'bulb-network'
};

export default function StrategyCard({ card }: { card: StrategyCardType }) {
  const iconKey = iconMap[card.icon] || 'graduation';
  const IconComponent = IconComponents[iconKey];
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105">
      {/* Icon Section with vibrant gradient background */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-12 flex items-center justify-center relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/30 via-purple-100/30 to-pink-100/30"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-200/20 to-blue-200/20 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full blur-2xl"></div>
        
        {/* Icon */}
        <div className="w-32 h-32 transform hover:scale-110 hover:rotate-3 transition-all duration-300 relative z-10">
          <IconComponent className="w-full h-full drop-shadow-2xl" />
        </div>
      </div>
      
      {/* Content Section */}
      <div className="p-6 bg-white">
        <h3 className="text-xl font-bold text-gray-900 mb-3">{card.title}</h3>
        <p className="text-gray-600 leading-relaxed">{card.description}</p>
      </div>
    </div>
  )
}