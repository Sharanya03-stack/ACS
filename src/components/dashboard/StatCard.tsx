import React from 'react';
import { Card, CardContent } from '../ui/Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
}

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center p-6">
        {icon && (
          <div className="p-3 rounded-full bg-primary/10 text-primary mr-4">
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
