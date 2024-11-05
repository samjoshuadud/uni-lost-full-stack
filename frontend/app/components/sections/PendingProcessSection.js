"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/AuthContext"
import { ExternalLink } from "lucide-react"

export default function PendingProcessSection({ 
  pendingProcesses, 
  onCancelRequest, 
  onVerify,
  onViewPost 
}) {
  const { userData } = useAuth();

  const getStatusMessage = (process) => {
    switch (process.status) {
      case "pending_approval":
        return "Your report is pending approval from admin.";
      case "posted":
        return "We don't have the item yet, but we've posted it. Click below to view the post.";
      case "verification_needed":
        return "Please answer the verification questions.";
      case "pending_verification":
        return "Your verification answers are being reviewed.";
      case "verified":
        return "Verified! Please proceed to the student center to retrieve your item.";
      default:
        return "Status unknown";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "posted":
        return <Badge variant="secondary">Posted</Badge>;
      case "verification_needed":
        return <Badge variant="warning">Needs Verification</Badge>;
      case "pending_verification":
        return <Badge variant="warning">Verification in Review</Badge>;
      case "verified":
        return <Badge variant="success">Verified</Badge>;
      default:
        return <Badge>Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Pending Processes</h2>
      {pendingProcesses.map((process) => (
        <Card key={process.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">{process.item.name}</h3>
              {getStatusBadge(process.status)}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {getStatusMessage(process)}
            </p>
            <div className="flex gap-2">
              {process.status === "posted" && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => onViewPost(process.item)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Post
                </Button>
              )}
              {process.status === "verification_needed" && (
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => onVerify(process)}
                >
                  Verify Now
                </Button>
              )}
              {process.status !== "verified" && userData?.role === "student" && (
                <Button 
                  variant="destructive" 
                  onClick={() => onCancelRequest(process.id)}
                >
                  Cancel Request
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      {pendingProcesses.length === 0 && (
        <Card>
          <CardContent className="p-4 text-center text-muted-foreground">
            No pending processes
          </CardContent>
        </Card>
      )}
    </div>
  );
} 