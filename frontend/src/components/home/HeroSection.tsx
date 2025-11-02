import { heroContent } from '@/config/content'

export default function HeroSection() {
  return (
    <>
      {/* Hero Image with Title Only */}
      <section className="relative h-[400px] bg-cover bg-center" style={{backgroundImage: "url('/images/grenada-coastal.jpg')"}}>
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="relative container mx-auto px-4 h-full flex items-center justify-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white text-center">
            Grenada EA Portal
          </h1>
        </div>
      </section>

      {/* Description Below Hero */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <p className="text-lg text-gray-700 leading-relaxed">
            {heroContent.description}
          </p>
        </div>
      </section>
    </>
  )
}
