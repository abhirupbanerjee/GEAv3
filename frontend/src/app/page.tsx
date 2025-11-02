import HeroSection from '@/components/home/HeroSection'
import StrategyCard from '@/components/home/StrategyCard'
import VisionStrategy from '@/components/home/VisionStrategy'
import NewsUpdates from '@/components/home/NewsUpdates'
import { strategicFocusAreas } from '@/config/content'

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <HeroSection />

      {/* Strategic Focus Areas */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
            Strategic Focus Areas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {strategicFocusAreas.map((card) => (
              <StrategyCard key={card.id} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* Vision & Strategy */}
      <VisionStrategy />

      {/* EA News Updates */}
      <NewsUpdates />
    </>
  )
}