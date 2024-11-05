"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ItemStatus, ItemStatusLabels, ItemStatusVariants } from '@/lib/constants';

export default function ItemSection({ items, onSeeMore, title }) {
  const getStatusBadge = (status) => {
    return (
      <Badge variant={ItemStatusVariants[status] || 'default'}>
        {ItemStatusLabels[status] || status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-grow">
                  <h3 className="font-bold">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.location}</p>
                  {getStatusBadge(item.status)}
                </div>
                <Button onClick={() => onSeeMore(item)}>See More</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 