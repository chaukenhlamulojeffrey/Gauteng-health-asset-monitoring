'use client';

import {
  Package,
  Building2,
  MapPin,
  Users,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { FacilityDirectoryEntry } from '@/lib/types';

type StatsCardsProps = {
  facilities: FacilityDirectoryEntry[];
  summary: {
    totalAssets: number;
    custodians: number;
    activeAssets: number;
    needsAttention: number;
  };
};

export function StatsCards({ facilities, summary }: StatsCardsProps) {
  const facilityCount = facilities.length;
  const districts = new Set(facilities.map((facility) => facility.district)).size;

  const cards = [
    {
      label: 'Total Assets',
      value: summary.totalAssets,
      icon: Package,
      color: 'text-primary',
      bg: 'bg-accent',
    },
    {
      label: 'Facilities',
      value: facilityCount,
      icon: Building2,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Districts Covered',
      value: districts,
      icon: MapPin,
      color: 'text-info',
      bg: 'bg-info/10',
    },
    {
      label: 'Custodians',
      value: summary.custodians,
      icon: Users,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      label: 'Active Assets',
      value: summary.activeAssets,
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Needs Attention',
      value: summary.needsAttention,
      icon: AlertTriangle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            className="animate-fade-in relative overflow-hidden p-4 transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {card.value}
                </p>
              </div>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.bg}`}
              >
                <Icon className={`h-4.5 w-4.5 ${card.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
