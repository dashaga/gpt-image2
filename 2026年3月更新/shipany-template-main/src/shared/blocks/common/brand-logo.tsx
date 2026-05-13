import Image from 'next/image';
import { Syne } from 'next/font/google';

import { Link } from '@/core/i18n/navigation';
import { Brand as BrandType } from '@/shared/types/blocks/common';

const syne = Syne({ subsets: ['latin'], weight: ['700'] });

export function BrandLogo({ brand }: { brand: BrandType }) {
  return (
    <Link
      href={brand.url || ''}
      target={brand.target || '_self'}
      className={`flex items-center space-x-3 ${brand.className}`}
    >
      {brand.logo && (
        <Image
          src={brand.logo.src}
          alt={brand.title ? '' : brand.logo.alt || ''}
          width={brand.logo.width || 80}
          height={brand.logo.height || 80}
          className="h-8 w-auto rounded-lg"
          // Skip the Next.js image optimizer for remote URLs and for local
          // SVGs (the optimizer rejects SVG without dangerouslyAllowSVG).
          unoptimized={
            brand.logo.src.startsWith('http') ||
            brand.logo.src.toLowerCase().endsWith('.svg')
          }
        />
      )}
      {brand.title && (
        <span
          className={`text-lg ${syne.className}`}
          style={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #6366F1, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {brand.title}
        </span>
      )}
    </Link>
  );
}
