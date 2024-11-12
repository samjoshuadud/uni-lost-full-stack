"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ItemStatus, ItemStatusLabels, ItemStatusVariants } from '@/lib/constants'
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ItemSection({ items: initialItems, onSeeMore, title, isAdmin }) {
  const [items, setItems] = useState(initialItems);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  },[]);

  const handleUnapprove = async (itemId) => {
    try {
      const itemResponse = await fetch(`http://localhost:5067/api/Item/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approved: false })
      });

      if (!itemResponse.ok) throw new Error('Failed to unapprove item');

      const processResponse = await fetch(`http://localhost:5067/api/Item/process/${itemId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: "pending_approval"
        })
      });

      if (!processResponse.ok) throw new Error('Failed to update process status');

      setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error unapproving item:', error);
    }
  };

  const handleDelete = async (itemId) => {
    try {
      const processResponse = await fetch('http://localhost:5067/api/Item/pending/all');
      if (!processResponse.ok) throw new Error('Failed to fetch processes');
      const processes = await processResponse.json();
      
      const process = processes.find(p => p.Item?.Id === itemId);
      if (!process) throw new Error('No process found for this item');

      const deleteProcessResponse = await fetch(`http://localhost:5067/api/Item/pending/${process.Id}`, {
        method: 'DELETE'
      });

      if (!deleteProcessResponse.ok) throw new Error('Failed to delete process');

      const deleteItemResponse = await fetch(`http://localhost:5067/api/item/${itemId}`, {
        method: 'DELETE'
      });

      if (!deleteItemResponse.ok) throw new Error('Failed to delete item');

      setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading items...</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status) => (
    <Badge variant={ItemStatusVariants[status] || 'default'}>
      {ItemStatusLabels[status] || status}
    </Badge>
  );

  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          {items?.length > 0 ? (
            items.map((item) => (
              <Card key={item.id} className="overflow-hidden cursor-pointer" onClick={() => onSeeMore(item)}>
                <CardContent className="p-6">
                  <div className="flex gap-6">
                    {/* Image Section */}
                    <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl}
                          alt={item.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-bold text-lg truncate">{item.name}</h3>
                        {getStatusBadge(item.status)}
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm"><strong>Location:</strong> {item.location}</p>
                        <p className="text-sm"><strong>Description:</strong> {item.description}</p>
                        {item.additionalDescriptions?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">
                              {item.additionalDescriptions.length} additional details
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="flex flex-col gap-2 justify-start min-w-[140px]">
                        {item.approved && (
                          <Button 
                            variant="secondary" 
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnapprove(item.id);
                            }}
                          >
                            Unapprove
                          </Button>
                        )}
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center text-muted-foreground">
              <p>No items found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 