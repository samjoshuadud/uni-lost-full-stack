"use client"

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/AuthContext"
import { ExternalLink, Trash, Loader2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export default function PendingProcessSection({ onCancelRequest, onVerify, onViewPost }) {
  const { user, userData } = useAuth();
  const [pendingProcesses, setPendingProcesses] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [processToCancelId, setProcessToCancelId] = useState(null);
  const [deletingProcessId, setDeletingProcessId] = useState(null);

  useEffect(() => {
    const fetchPendingProcesses = async () => {
      try {
        setIsLoading(true);
        if (!user?.uid) {
          console.log("No user ID available");
          return;
        }

        const response = await fetch(`http://localhost:5067/api/item/pending/user/${user.uid}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch pending processes: ${await response.text()}`);
        }
        
        const data = await response.json();
        console.log("Fetched pending processes:", data);

        // Ensure we're working with an array and sort by Item.DateReported
        const processesArray = Array.isArray(data) ? data : [data].filter(Boolean);
        const sortedProcesses = processesArray.sort((a, b) => {
          const dateA = new Date(a.Item?.DateReported || 0);
          const dateB = new Date(b.Item?.DateReported || 0);
          return dateB - dateA; // Sort in descending order (newest first)
        });
        
        setPendingProcesses(sortedProcesses);
      } catch (error) {
        console.error("Error fetching pending processes:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchPendingProcesses();
    }
  }, [user]);

  const getStatusMessage = (process) => {
    if (!process) return "Status unknown";
    
    switch (process.Status) { // Note the capital S in Status
      case "pending_approval":
        return process.Message || "Your report is pending approval from admin."; // Note the capital M in Message
      case "posted":
        return "We don't have the item yet, but we've posted it. Click below to view the post.";
      case "verification_needed":
        return "Please answer the verification questions.";
      case "pending_verification":
        return "Your verification answers are being reviewed.";
      case "verified":
        return "Verified! Please proceed to the student center to retrieve your item.";
      default:
        return process.Message || "Status unknown";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending_approval":
        return <Badge>Pending Approval</Badge>;
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

  const handleCancelProcess = async (processId) => {
    try {
      setDeletingProcessId(processId);
      
      const response = await fetch(`http://localhost:5067/api/item/pending/${processId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to cancel process');
      }

      // Remove the process from local state
      setPendingProcesses(prevProcesses => 
        prevProcesses.filter(process => process.Id !== processId)
      );

      setShowCancelDialog(false);
      setProcessToCancelId(null);
    } catch (error) {
      console.error('Error canceling process:', error);
      setError('Failed to cancel process');
    } finally {
      setDeletingProcessId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading pending processes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-destructive">
          Error: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Pending Processes</h2>
      <div className="space-y-4">
        {pendingProcesses.map((process) => (
          <Card key={process.Id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">
                    {process.Item?.Name || 'Unnamed Item'}
                  </h3>
                  <Badge variant="outline" className={
                    process.Item?.Status === "lost" ? "bg-red-100 text-red-800" :
                    process.Item?.Status === "found" ? "bg-green-100 text-green-800" :
                    "bg-gray-100 text-gray-800"
                  }>
                    {process.Item?.Status === "lost" ? "Lost" :
                     process.Item?.Status === "found" ? "Found" :
                     "Unknown"}
                  </Badge>
                </div>
                {getStatusBadge(process.Status)}
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                <p>Category: {process.Item?.Category || 'N/A'}</p>
                <p>Location: {process.Item?.Location || 'N/A'}</p>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {getStatusMessage(process)}
              </p>
              <div className="flex gap-2">
                {process.Status === "posted" && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => onViewPost?.(process.Item)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Post
                  </Button>
                )}
                {process.Status === "verification_needed" && (
                  <Button 
                    variant="default" 
                    className="w-full"
                    onClick={() => onVerify?.(process)}
                  >
                    Verify Now
                  </Button>
                )}
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setProcessToCancelId(process.Id);
                    setShowCancelDialog(true);
                  }}
                  disabled={deletingProcessId === process.Id}
                >
                  {deletingProcessId === process.Id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Canceling...
                    </>
                  ) : (
                    <>
                      <Trash className="h-4 w-4 mr-2" />
                      Cancel Request
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowCancelDialog(false);
                setProcessToCancelId(null);
              }}
              disabled={deletingProcessId !== null}
            >
              No, keep it
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleCancelProcess(processToCancelId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingProcessId !== null}
            >
              {deletingProcessId === processToCancelId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Canceling...
                </>
              ) : (
                "Yes, cancel it"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {(!pendingProcesses || pendingProcesses.length === 0) && (
        <Card>
          <CardContent className="p-4 text-center text-muted-foreground">
            No pending processes for {userData?.displayName || 'user'}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 