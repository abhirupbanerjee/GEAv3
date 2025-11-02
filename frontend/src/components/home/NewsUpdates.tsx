import { newsUpdates } from '@/config/content'

export default function NewsUpdates() {
  // Icon mapping
  const icons: { [key: string]: string } = {
    'governance': '🏛️',
    'policy': '📋',
    'survey': '📊'
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="container-custom">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
          EA News and Updates
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {newsUpdates.map((news) => (
            <div key={news.id} className="card p-6 text-center">
              <div className="text-5xl mb-4">{icons[news.id] || '📰'}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{news.title}</h3>
              <p className="text-gray-600 leading-relaxed">{news.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}