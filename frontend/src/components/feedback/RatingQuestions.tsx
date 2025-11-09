'use client'

import { useState } from 'react'

interface Ratings {
  q1_ease: number
  q2_clarity: number
  q3_timeliness: number
  q4_trust: number
  q5_overall_satisfaction: number
}

interface RatingQuestionsProps {
  ratings: Ratings
  onRatingChange: (question: keyof Ratings, value: number) => void
}

interface Question {
  id: keyof Ratings
  question: string
  description: string
}

const questions: Question[] = [
  {
    id: 'q1_ease',
    question: 'How easy was it to access this service?',
    description: 'Consider factors like finding information, location, hours, and requirements'
  },
  {
    id: 'q2_clarity',
    question: 'How clear was the information and communication?',
    description: 'Consider clarity of instructions, forms, and explanations provided'
  },
  {
    id: 'q3_timeliness',
    question: 'How timely was the service delivery?',
    description: 'Consider waiting times, processing speed, and meeting expected timeframes'
  },
  {
    id: 'q4_trust',
    question: 'How much do you trust this service?',
    description: 'Consider reliability, consistency, and confidence in the service'
  },
  {
    id: 'q5_overall_satisfaction',
    question: 'Overall, how satisfied are you with this service?',
    description: 'Your overall experience considering all aspects'
  }
]

const ratingLabels = [
  'Very Poor',
  'Poor',
  'Fair',
  'Good',
  'Excellent'
]

export default function RatingQuestions({ ratings, onRatingChange }: RatingQuestionsProps) {
  const [hoveredQuestion, setHoveredQuestion] = useState<keyof Ratings | null>(null)
  const [hoveredRating, setHoveredRating] = useState<number>(0)

  const StarRating = ({ questionId, value }: { questionId: keyof Ratings; value: number }) => {
    const currentRating = ratings[questionId]
    const displayRating = hoveredQuestion === questionId && hoveredRating > 0 
      ? hoveredRating 
      : currentRating

    return (
      <div className="flex items-center gap-2">
        {/* Stars */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onRatingChange(questionId, star)}
              onMouseEnter={() => {
                setHoveredQuestion(questionId)
                setHoveredRating(star)
              }}
              onMouseLeave={() => {
                setHoveredQuestion(null)
                setHoveredRating(0)
              }}
              className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-transform hover:scale-110"
              aria-label={`Rate ${star} out of 5 stars`}
            >
              <svg
                className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                  star <= displayRating
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          ))}
        </div>

        {/* Rating Label */}
        {displayRating > 0 && (
          <span className={`text-sm font-semibold min-w-[80px] ${
            displayRating === 5 ? 'text-green-600' :
            displayRating === 4 ? 'text-blue-600' :
            displayRating === 3 ? 'text-yellow-600' :
            displayRating === 2 ? 'text-orange-600' :
            'text-red-600'
          }`}>
            {ratingLabels[displayRating - 1]}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {questions.map((q, index) => (
        <div 
          key={q.id}
          className={`pb-8 ${index < questions.length - 1 ? 'border-b border-gray-200' : ''}`}
        >
          {/* Question Number and Text */}
          <div className="mb-4">
            <div className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold mr-3 mt-1">
                {index + 1}
              </span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {q.question}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {q.description}
                </p>
              </div>
            </div>
          </div>

          {/* Star Rating */}
          <div className="ml-11">
            <StarRating questionId={q.id} value={ratings[q.id]} />
            
            {/* Required indicator */}
            {ratings[q.id] === 0 && (
              <p className="text-xs text-gray-500 mt-2 flex items-center">
                <svg className="w-3 h-3 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Required
              </p>
            )}
          </div>

          {/* Special styling for overall satisfaction */}
          {q.id === 'q5_overall_satisfaction' && (
            <div className="ml-11 mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This is your most important rating. It reflects your overall experience with this service.
              </p>
            </div>
          )}
        </div>
      ))}

      {/* Rating Scale Legend */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-3">Rating Scale:</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
          {ratingLabels.map((label, index) => (
            <div key={label} className="flex items-center">
              <svg
                className="w-5 h-5 text-yellow-400 fill-current mr-1 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span className="text-gray-700">
                {index + 1} = {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}