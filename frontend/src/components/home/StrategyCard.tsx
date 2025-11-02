import { StrategyCard as StrategyCardType } from '@/config/content'

export default function StrategyCard({ card }: { card: StrategyCardType }) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <img src={card.image} alt={card.title} className="w-full h-48 object-cover" />
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-3">{card.title}</h3>
        <p className="text-gray-600">{card.description}</p>
      </div>
    </div>
  )
}
