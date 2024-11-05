"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/AuthContext"
import { ItemStatus, ItemStatusLabels, ItemStatusVariants } from '@/lib/constants';

export default function DashboardSection({ items, onItemClick }) {
  const { userData, isAdmin } = useAuth();

  if (!items) return (
    <div className="col-span-full text-center p-8 text-muted-foreground">
      Loading...
    </div>
  )

  const getStatusBadge = (status) => {
    return (
      <Badge variant={ItemStatusVariants[status] || 'default'}>
        {ItemStatusLabels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.filter(item => item.approved || isAdmin).map((item) => (
        <Card key={item.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold">{item.name}</h3>
                <p className="text-sm text-muted-foreground">{item.location}</p>
              </div>
              {getStatusBadge(item.status)}
            </div>
            <p className="text-sm mb-4 line-clamp-2">{item.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{item.date}</span>
              <Button variant="outline" onClick={() => onItemClick(item)}>
                See More
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {items.length === 0 && (
        <div className="col-span-full text-center p-8 text-muted-foreground">
          No items found
        </div>
      )}
    </div>
  )
} 