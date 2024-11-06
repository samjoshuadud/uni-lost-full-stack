"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle } from "lucide-react"

export default function VerificationsTab({ 
  notifications = [], 
  onVerificationResult 
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-primary" />
        Verification Requests
      </h3>

      <div className="space-y-4">
        {notifications.filter(n => n.type === 'verification' && n.item).map((notification) => (
          <Card 
            key={notification.id || `verification-${notification.item?.id}`}
            id={`verification-${notification.item?.id}`}
          >
            <CardContent className="p-6">
              <div className="flex gap-6">
                {/* Image Section */}
                <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                  {notification.item?.ImageUrl ? (
                    <img 
                      src={notification.item.ImageUrl} 
                      alt={notification.item.Name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No Image
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="flex-1">
                  <h4 className="font-bold text-lg mb-4">
                    Verification for {notification.item?.Name || 'Unknown Item'}
                  </h4>
                  <div className="space-y-4">
                    {(notification.verificationQuestions || []).map((question, index) => (
                      <div key={`${notification.id}-question-${index}`} className="bg-muted p-4 rounded-lg">
                        <p className="font-medium mb-2">Q: {question}</p>
                        <p className="text-muted-foreground">
                          A: {notification.answers?.[index] || 'No answer'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions Section */}
                <div className="flex flex-col gap-2 justify-start min-w-[140px]">
                  <Button 
                    variant="default"
                    className="w-full"
                    onClick={() => onVerificationResult(notification.id, true, notification.item?.id)}
                    disabled={!notification.item?.id}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Correct
                  </Button>
                  <Button 
                    variant="destructive"
                    className="w-full"
                    onClick={() => onVerificationResult(notification.id, false, notification.item?.id)}
                    disabled={!notification.item?.id}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Incorrect
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {notifications.filter(n => n.type === 'verification' && n.item).length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="font-medium">No verification requests</p>
              <p className="text-sm">New verification requests will appear here</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
