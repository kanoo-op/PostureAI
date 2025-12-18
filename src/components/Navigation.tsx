'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const exerciseLinks = [
  { name: '스쿼트', href: '/exercise/squat', icon: '🏋️' },
  { name: '푸시업', href: '/exercise/pushup', icon: '💪' },
  { name: '런지', href: '/exercise/lunge', icon: '🦵' },
]

export default function Navigation() {
  const pathname = usePathname()
  const isExercisePage = pathname.startsWith('/exercise')

  if (!isExercisePage) return null

  return (
    <nav className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-4 py-3 overflow-x-auto">
          {exerciseLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                pathname === link.href
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-slate-700'
              }`}
            >
              <span>{link.icon}</span>
              <span>{link.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
