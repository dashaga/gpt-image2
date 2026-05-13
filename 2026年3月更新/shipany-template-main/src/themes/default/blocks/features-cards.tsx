'use client';

import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

export function FeaturesCards({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  return (
    <section
      id={section.id}
      className={cn('py-[30px]', section.className, className)}
    >
      <div className="container">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          {section.label && (
            <span className="bg-primary/10 text-primary mb-4 inline-block rounded-full px-3 py-1 text-xs font-medium">
              {section.label}
            </span>
          )}
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            {section.title}
          </h2>
          <p className="text-muted-foreground text-lg">{section.description}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {section.items?.map((item, idx) => (
            <Card
              key={idx}
              className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <CardHeader>
                {item.icon && (
                  <div className="bg-primary/10 mb-3 flex h-10 w-10 items-center justify-center rounded-lg">
                    <SmartIcon
                      name={item.icon as string}
                      size={20}
                      className="text-primary"
                    />
                  </div>
                )}
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
