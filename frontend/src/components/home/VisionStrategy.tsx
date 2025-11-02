import { visionStrategy } from '@/config/content'

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

          {/* Image */}
          <div className="relative">
            <img
              src="/images/digital-strategy.jpg"
              alt="Digital Strategy"
              className="rounded-lg shadow-lg w-full"
            />
          </div>
        </div>
      </div>
    </section>
  )
}