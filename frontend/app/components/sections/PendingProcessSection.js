"use client"

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/AuthContext"
import { ExternalLink, Trash, Loader2, Eye } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { itemApi } from "@/lib/api-client"

export default function PendingProcessSection({ onCancelRequest, onVerify, onViewPost, onViewDetails }) {
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

        // Create a map to store all objects by their $id
        const objectsMap = new Map();

        // First pass: collect all objects with $id
        const collectObjects = (obj) => {
          if (!obj || typeof obj !== 'object') return;
          if (obj.$id) {
            objectsMap.set(obj.$id, { ...obj });
          }
          if (Array.isArray(obj)) {
            obj.forEach(collectObjects);
          } else {
            Object.entries(obj).forEach(([key, value]) => {
              if (value && typeof value === 'object') {
                collectObjects(value);
              }
            });
          }
        };

        // Collect all objects from the entire response
        collectObjects(data);

        // Get the processes array
        const processesArray = data.$values || [];

        // Resolve references for each process
        const resolvedProcesses = processesArray.map(process => {
          // If it's a reference, get the full object
          if (process.$ref) {
            process = objectsMap.get(process.$ref);
          }

          // Create a new object with resolved references
          const resolved = { ...process };

          // Resolve item reference
          if (process.item?.$ref) {
            resolved.item = objectsMap.get(process.item.$ref);
          }

          // Resolve user reference
          if (process.user?.$ref) {
            resolved.user = objectsMap.get(process.user.$ref);
          }

          return resolved;
        });

        console.log("Resolved processes:", resolvedProcesses);
        
        // Filter and sort processes
        const validProcesses = resolvedProcesses
          .filter(process => process && process.item)
          .sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
          });

        setPendingProcesses(validProcesses);
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

  const getStatusBadge = (status) => {
    // Helper function to capitalize first letter of each word
    const capitalize = (str) => {
      return str.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };

    switch (status?.toLowerCase()) {
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
      case "approved":
        return <Badge variant="success" className="bg-green-600 hover:bg-green-700 text-white">Approved!</Badge>;
      default:
        return <Badge variant="outline">{status ? capitalize(status) : 'Unknown'}</Badge>;
    }
  };

  const getStatusMessage = (process) => {
    if (!process) return "Status unknown";
    
    switch (process.status?.toLowerCase()) {
      case "pending_approval":
        return process.message || "Your report is pending approval from admin.";
      case "posted":
        return "We don't have the item yet, but we've posted it. Click below to view the post.";
      case "verification_needed":
        return "Please answer the verification questions.";
      case "pending_verification":
        return "Your verification answers are being reviewed.";
      case "verified":
        return "Verified! Please proceed to the student center to retrieve your item.";
      default:
        return process.message || `Status: ${process.status || 'unknown'}`;
    }
  };

  const handleCancelProcess = async (processId) => {
    try {
      setDeletingProcessId(processId);
      
      const response = await fetch(`http://localhost:5067/api/item/pending/${processId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.email}`,
          'FirebaseUID': user.uid,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to cancel process');
      }

      // Remove the process from local state immediately
      setPendingProcesses(prevProcesses => 
        prevProcesses.filter(process => process.id !== processId)
      );

      // Close the dialog
      setShowCancelDialog(false);
      setProcessToCancelId(null);

      // Fetch the updated list
      const updatedResponse = await fetch(`http://localhost:5067/api/item/pending/user/${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${user.email}`,
          'FirebaseUID': user.uid,
        }
      });
      
      if (updatedResponse.ok) {
        const data = await updatedResponse.json();
        
        // Create a map to store all objects by their $id
        const objectsMap = new Map();

        // First pass: collect all objects with $id
        const collectObjects = (obj) => {
          if (!obj || typeof obj !== 'object') return;
          if (obj.$id) {
            objectsMap.set(obj.$id, { ...obj });
          }
          if (Array.isArray(obj)) {
            obj.forEach(collectObjects);
          } else {
            Object.entries(obj).forEach(([key, value]) => {
              if (value && typeof value === 'object') {
                collectObjects(value);
              }
            });
          }
        };

        // Collect all objects from the entire response
        collectObjects(data);

        // Get the processes array
        const processesArray = data.$values || [];

        // Resolve references for each process
        const resolvedProcesses = processesArray.map(process => {
          // If it's a reference, get the full object
          if (process.$ref) {
            process = objectsMap.get(process.$ref);
          }

          // Create a new object with resolved references
          const resolved = { ...process };

          // Resolve item reference
          if (process.item?.$ref) {
            resolved.item = objectsMap.get(process.item.$ref);
          }

          // Resolve user reference
          if (process.user?.$ref) {
            resolved.user = objectsMap.get(process.user.$ref);
          }

          return resolved;
        });

        // Filter and sort processes
        const validProcesses = resolvedProcesses
          .filter(process => process && process.item)
          .sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
          });

        setPendingProcesses(validProcesses);
      }

    } catch (error) {
      console.error('Error canceling process:', error);
      setError('Failed to cancel process');
    } finally {
      setDeletingProcessId(null);
    }
  };

  const handleCancelRequest = async (processId) => {
    try {
      const token = await user.getIdToken(true);
      await itemApi.deletePendingProcess(token, processId);
      onCancelRequest(processId);
    } catch (error) {
      console.error('Error canceling request:', error);
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
          <Card key={process.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">
                    {process.item.name || 'Unnamed Item'}
                  </h3>
                  <Badge variant="outline" className={
                    process.item.status === "lost" ? "bg-red-100 text-red-800" :
                    process.item.status === "found" ? "bg-green-100 text-green-800" :
                    "bg-gray-100 text-gray-800"
                  }>
                    {process.item.status === "lost" ? "Lost" :
                     process.item.status === "found" ? "Found" :
                     "Unknown"}
                  </Badge>
                </div>
                {getStatusBadge(process.status)}
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                <p>Category: {process.item.category || 'N/A'}</p>
                <p>Location: {process.item.location || 'N/A'}</p>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {getStatusMessage(process)}
              </p>
              <div className="flex gap-2">
                {process.item.approved && process.status.toLowerCase() === "approved" ? (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      onViewPost?.(process.item);
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Post
                  </Button>
                ) : (
                  <>
                    {process.status === "posted" && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => onViewPost?.(process.item)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Post
                      </Button>
                    )}
                    {process.status === "verification_needed" && (
                      <Button 
                        variant="default" 
                        className="w-full"
                        onClick={() => onVerify?.(process)}
                      >
                        Verify Now
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => {
                        console.log('View Details clicked, process.item:', process.item);
                        onViewDetails?.(process.item);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </>
                )}
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setProcessToCancelId(process.id);
                    setShowCancelDialog(true);
                  }}
                  disabled={deletingProcessId === process.id}
                >
                  {deletingProcessId === process.id ? (
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