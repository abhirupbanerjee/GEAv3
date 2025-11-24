import Link from 'next/link'
import { footerLinks } from '@/config/content'
import { config } from '@/config/env'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white relative z-10">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Government Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="text-2xl">🇬🇩</div>
              <div>
                <div className="font-bold">Government of Grenada</div>
                <div className="text-sm text-gray-400">EA Portal</div>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>🇬🇩</span>
              <span>Government of Grenada</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {footerLinks.quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* General Information */}
          <div>
            <h3 className="font-semibold text-lg mb-4">General Information</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                  About Grenada
                </Link>
              </li>
              <li>
                <a
                  href={config.GOG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Facts
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Emergency Info/
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
          © {config.COPYRIGHT_YEAR} Department of Grenada. All rights reserved.
        </div>
      </div>
    </footer>
  )
}