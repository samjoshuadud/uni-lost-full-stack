"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChevronLeft, Trash } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"
import AuthRequiredDialog from "../dialogs/AuthRequiredDialog"

export default function ItemDetailSection({ item, onBack, onClaim, onFound, onDelete }) {
  const { user, userData, isAdmin } = useAuth();
  const [studentId, setStudentId] = useState(userData?.studentId || "")
  const [verificationAnswers, setVerificationAnswers] = useState(Array(item.verificationQuestions?.length || 0).fill(""))
  const [showVerification, setShowVerification] = useState(false)
  const [showAuthDialog, setShowAuthDialog] = useState(false)

  const handleAction = (action) => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    action();
  };

  const handleVerificationAnswer = (index, answer) => {
    const newAnswers = [...verificationAnswers]
    newAnswers[index] = answer
    setVerificationAnswers(newAnswers)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <CardTitle>{item.name}</CardTitle>
          </div>
          {isAdmin && (
            <Button variant="destructive" size="icon" onClick={() => onDelete?.(item.id)}>
              <Trash className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold">Status</h3>
          <Badge variant={item.status === "lost" ? "destructive" : item.status === "found" ? "secondary" : "default"}>
            {item.status === "lost" ? "Lost" : item.status === "found" ? "Found" : "Handed Over"}
          </Badge>
        </div>
        <div>
          <h3 className="font-semibold">Location</h3>
          <p>{item.location}</p>
        </div>
        <div>
          <h3 className="font-semibold">Category</h3>
          <p>{item.category}</p>
        </div>
        <div>
          <h3 className="font-semibold">Description</h3>
          <p>{item.description}</p>
        </div>
        <div>
          <h3 className="font-semibold">Date Reported</h3>
          <p>{item.date}</p>
        </div>

        {/* Only show action buttons for non-admin users */}
        {!isAdmin && item.status !== "handed_over" && (
          <div className="space-y-2">
            {user && (
              <Input
                placeholder="Enter your student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            )}
            <div className="flex gap-4">
              {item.status === "found" && (
                <Button 
                  className="w-full"
                  onClick={() => handleAction(() => setShowVerification(true))}
                >
                  This is mine
                </Button>
              )}
              {item.status === "lost" && userData?.role === "student" && (
                <Button 
                  className="w-full"
                  onClick={() => handleAction(() => onFound(item, studentId))}
                >
                  I found this
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <AuthRequiredDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog}
      />

      {user && !isAdmin && showVerification && (
        <Dialog open={showVerification} onOpenChange={setShowVerification}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verification Questions</DialogTitle>
              <DialogDescription>
                Please answer the following questions to verify your claim.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {item.verificationQuestions.map((question, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-foreground mb-1">{question}</label>
                  <Input
                    value={verificationAnswers[index]}
                    onChange={(e) => handleVerificationAnswer(index, e.target.value)}
                    placeholder="Your answer"
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => {
                onClaim(item, studentId, verificationAnswers)
                setShowVerification(false)
              }}>Submit Claim</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
} 