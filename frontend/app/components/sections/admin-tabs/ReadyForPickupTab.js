"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function ReadyForPickupTab({ processes = [], onHandOver, isLoading }) {
  return (
    <ScrollArea className="h-[calc(100vh-220px)] w-full rounded-md">
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {processes.map((process) => (
          <Card key={process.id} className="bg-white shadow-md">
            <CardContent className="p-4">
              {/* ... other content ... */}
              
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => onHandOver(process.id)}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Handed Over
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  )
} 