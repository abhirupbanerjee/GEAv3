'use client'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface ChartsSectionProps {
  data: {
    top_services: Array<{
      service_name: string
      submission_count: string
      avg_satisfaction: string
    }> | null
    trend: Array<{
      date: string
      submissions: string
      avg_satisfaction: string
    }> | null
    by_channel: Array<{
      channel: string
      count: string
      avg_satisfaction: string
    }>
    rating_distribution: Array<{
      rating: number
      count: string
      percentage: string
    }>
    by_recipient: Array<{
      recipient_group: string
      count: string
      avg_satisfaction: string
    }>
  }
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function ChartsSection({ data }: ChartsSectionProps) {
  // Prepare top services data
  const topServicesData = data.top_services?.slice(0, 10).map(s => ({
    name: s.service_name.length > 20 ? s.service_name.substring(0, 20) + '...' : s.service_name,
    submissions: parseInt(s.submission_count),
    satisfaction: parseFloat(s.avg_satisfaction)
  })) || []

  // Prepare trend data
  const trendData = data.trend?.map(t => ({
    date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    submissions: parseInt(t.submissions),
    satisfaction: parseFloat(t.avg_satisfaction)
  })) || []

  // Prepare channel data for pie chart
  const channelData = data.by_channel.map(c => ({
    name: c.channel === 'ea_portal' ? 'EA Portal' : 'QR Code',
    value: parseInt(c.count)
  }))

  // Prepare rating distribution
  const ratingData = data.rating_distribution.map(r => ({
    rating: `${r.rating} ★`,
    count: parseInt(r.count),
    percentage: parseFloat(r.percentage)
  })).reverse() // Show 5 stars first

  // Prepare recipient data
  const recipientData = data.by_recipient.map(r => ({
    name: r.recipient_group.charAt(0).toUpperCase() + r.recipient_group.slice(1),
    count: parseInt(r.count),
    satisfaction: parseFloat(r.avg_satisfaction)
  }))

  return (
    <div className="space-y-6">
      
      {/* Top Services Bar Chart */}
      {topServicesData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            📊 Top Services by Submission Volume
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topServicesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                fontSize={12}
              />
              <YAxis />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                formatter={(value: any, name: string) => {
                  if (name === 'submissions') return [value, 'Submissions']
                  if (name === 'satisfaction') return [value.toFixed(1), 'Avg Rating']
                  return [value, name]
                }}
              />
              <Legend />
              <Bar dataKey="submissions" fill="#3b82f6" name="Submissions" />
              <Bar dataKey="satisfaction" fill="#10b981" name="Avg Satisfaction" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Trend Line Chart */}
        {trendData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              📈 30-Day Trend
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  fontSize={12}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 5]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="submissions" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Submissions"
                  dot={{ r: 4 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="satisfaction" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Avg Satisfaction"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Channel Distribution Pie Chart */}
        {channelData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              🥧 Feedback by Channel
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Rating Distribution */}
        {ratingData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              ⭐ Rating Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ratingData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="rating" type="category" width={60} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  formatter={(value: any, name: string) => {
                    if (name === 'count') return [value, 'Submissions']
                    if (name === 'percentage') return [value.toFixed(1) + '%', 'Percentage']
                    return [value, name]
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="#fbbf24" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recipient Groups */}
        {recipientData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              👥 Feedback by User Type
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={recipientData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                  formatter={(value: any, name: string) => {
                    if (name === 'count') return [value, 'Submissions']
                    if (name === 'satisfaction') return [value.toFixed(1), 'Avg Rating']
                    return [value, name]
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="#8b5cf6" name="Submissions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}