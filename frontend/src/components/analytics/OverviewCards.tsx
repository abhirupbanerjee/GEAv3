'use client'

interface OverviewCardsProps {
  data: {
    total_submissions: string
    avg_satisfaction: string
    avg_ease: string
    avg_clarity: string
    avg_timeliness: string
    avg_trust: string
    grievance_count: string
  }
}

export default function OverviewCards({ data }: OverviewCardsProps) {
  const cards = [
    {
      title: 'Total Submissions',
      value: data.total_submissions,
      icon: '📝',
      color: 'blue',
      description: 'Feedback received'
    },
    {
      title: 'Average Satisfaction',
      value: parseFloat(data.avg_satisfaction || '0').toFixed(1),
      icon: '⭐',
      color: 'yellow',
      description: 'Out of 5.0',
      stars: Math.round(parseFloat(data.avg_satisfaction || '0'))
    },
    {
      title: 'Grievances',
      value: data.grievance_count,
      icon: '🚩',
      color: 'red',
      description: 'Require attention',
      highlight: parseInt(data.grievance_count) > 0
    },
    {
      title: 'Ease of Access',
      value: parseFloat(data.avg_ease || '0').toFixed(1),
      icon: '🚪',
      color: 'green',
      description: 'Average rating'
    },
    {
      title: 'Clarity',
      value: parseFloat(data.avg_clarity || '0').toFixed(1),
      icon: '💡',
      color: 'purple',
      description: 'Information quality'
    },
    {
      title: 'Timeliness',
      value: parseFloat(data.avg_timeliness || '0').toFixed(1),
      icon: '⏱️',
      color: 'indigo',
      description: 'Service speed'
    },
    {
      title: 'Trust',
      value: parseFloat(data.avg_trust || '0').toFixed(1),
      icon: '🤝',
      color: 'teal',
      description: 'Service reliability'
    }
  ]

  const getColorClasses = (color: string, highlight?: boolean) => {
    if (highlight) {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'bg-red-100 text-red-600',
        text: 'text-red-900'
      }
    }

    const colors: Record<string, any> = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'bg-blue-100 text-blue-600',
        text: 'text-blue-900'
      },
      yellow: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        icon: 'bg-yellow-100 text-yellow-600',
        text: 'text-yellow-900'
      },
      red: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'bg-red-100 text-red-600',
        text: 'text-red-900'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'bg-green-100 text-green-600',
        text: 'text-green-900'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        icon: 'bg-purple-100 text-purple-600',
        text: 'text-purple-900'
      },
      indigo: {
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        icon: 'bg-indigo-100 text-indigo-600',
        text: 'text-indigo-900'
      },
      teal: {
        bg: 'bg-teal-50',
        border: 'border-teal-200',
        icon: 'bg-teal-100 text-teal-600',
        text: 'text-teal-900'
      }
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const colors = getColorClasses(card.color, card.highlight)
        
        return (
          <div
            key={index}
            className={`${colors.bg} border-2 ${colors.border} rounded-lg p-6 transition-all hover:shadow-md ${
              card.highlight ? 'ring-2 ring-red-400 animate-pulse' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 ${colors.icon} rounded-lg flex items-center justify-center text-2xl`}>
                {card.icon}
              </div>
              {card.highlight && parseInt(card.value) > 0 && (
                <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                  ALERT
                </span>
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                {card.title}
              </h3>
              <div className="flex items-baseline gap-2 mb-2">
                <p className={`text-3xl font-bold ${colors.text}`}>
                  {card.value}
                </p>
                {card.stars !== undefined && card.stars > 0 && (
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`text-lg ${
                          i < card.stars ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {card.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}