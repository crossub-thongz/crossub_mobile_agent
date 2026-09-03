'use client';

import Link from 'next/link';
import { BookOpen, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { propertyNew, ROUTES } from '@/constants/routes';

export function PropertiesPageHeaderActions({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Button variant="outline" className="rounded-xl" asChild>
        <Link href={`${ROUTES.SUPPORT_TUTORIAL}?page=properties`}>
          <BookOpen className="size-4" />
          How to use
        </Link>
      </Button>
      <Button className="rounded-xl transition-opacity hover:opacity-90" asChild>
        <Link href={propertyNew()}>
          <Plus className="size-4" />
          Add property
        </Link>
      </Button>
    </div>
  );
}
