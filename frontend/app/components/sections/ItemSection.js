"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function ItemSection({ items, onSeeMore, title }) {
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
                  <Badge variant={item.status === "lost" ? "destructive" : item.status === "found" ? "secondary" : "default"}>
                    {item.status === "lost" ? "Lost" : item.status === "found" ? "Found" : "Handed Over"}
                  </Badge>
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