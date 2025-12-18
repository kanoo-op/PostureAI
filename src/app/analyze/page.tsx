import Link from 'next/link'

const analysisOptions = [
  {
    title: '동적 운동 분석',
    description: '스쿼트, 푸시업, 런지, 데드리프트 등 동적 운동의 자세를 실시간으로 분석합니다.',
    href: '/exercise/squat',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    exercises: [
      { name: '스쿼트', href: '/exercise/squat' },
      { name: '푸시업', href: '/exercise/pushup' },
      { name: '런지', href: '/exercise/lunge' },
      { name: '데드리프트', href: '/exercise/deadlift' },
    ],
  },
  {
    title: '정적 유지 운동 분석',
    description: '플랭크 등 일정 시간 자세를 유지하는 운동을 분석합니다.',
    href: '/exercise/plank',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    exercises: [
      { name: '플랭크', href: '/exercise/plank' },
    ],
  },
  {
    title: '정적 자세 분석',
    description: '서있는 자세, 앉은 자세 등 정적인 자세를 분석하여 체형 불균형을 확인합니다.',
    href: '/static-posture',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    exercises: null,
  },
  {
    title: '영상 기반 분석',
    description: '녹화된 운동 영상을 업로드하여 프레임별 상세 분석, 반복 횟수 측정, PDF 리포트를 받아보세요.',
    href: '/video-upload',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    exercises: null,
    features: ['반복 횟수 측정', '반복별 점수', 'PDF 내보내기'],
  },
]

export default function AnalyzePage() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            분석 모드 선택
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            원하는 분석 유형을 선택하세요
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analysisOptions.map((option, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="p-6">
                <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center text-primary-600 mb-4">
                  {option.icon}
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {option.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {option.description}
                </p>

                {option.exercises ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      운동 선택:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {option.exercises.map((exercise) => (
                        <Link
                          key={exercise.href}
                          href={exercise.href}
                          className="px-4 py-2 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg text-sm font-medium hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                        >
                          {exercise.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {option.features && (
                      <div className="flex flex-wrap gap-2">
                        {option.features.map((feature, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded text-sm"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                    <Link
                      href={option.href}
                      className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                    >
                      {option.features ? '영상 업로드' : '분석 시작'}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
