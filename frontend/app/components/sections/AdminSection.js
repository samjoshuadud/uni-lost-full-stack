"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Trash, UserPlus, CheckCircle, XCircle, ClipboardList, Package, Bell, Users, ExternalLink } from "lucide-react"
import { useAuth } from "@/lib/AuthContext"

export default function AdminSection({ 
  items = [], 
  surrenderedItems = [], 
  notifications = [], 
  onApprove, 
  onHandOver, 
  onResolveNotification, 
  onDelete,
  onUpdateItemStatus,
  isLoading
}) {
  const { user, isAdmin, makeAuthenticatedRequest } = useAuth();
  const [verificationQuestions, setVerificationQuestions] = useState("")
  const [selectedItem, setSelectedItem] = useState(null)
  const [newAdminEmail, setNewAdminEmail] = useState("")
  const [activeTab, setActiveTab] = useState("lost")
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [showFailDialog, setShowFailDialog] = useState(false)
  const [showNoShowDialog, setShowNoShowDialog] = useState(false)
  const [noShowItemId, setNoShowItemId] = useState(null)
  const [showApproveFoundDialog, setShowApproveFoundDialog] = useState(false)
  const [selectedFoundItem, setSelectedFoundItem] = useState(null)
  const [showAdminDialog, setShowAdminDialog] = useState(false)
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState({ title: "", message: "" })
  const [pendingProcesses, setPendingProcesses] = useState([])

  useEffect(() => {
    const fetchAllPendingProcesses = async () => {
      try {
        const response = await fetch(`http://localhost:5067/api/item/pending/all`);
        if (!response.ok) throw new Error("Failed to fetch all pending processes");
        const data = await response.json();
        setPendingProcesses(data);
      } catch (error) {
        console.error("Error fetching all pending processes:", error);
      }
    };

    fetchAllPendingProcesses();
  }, []);

  // Only allow access if user is admin
  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access this section.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const handleAssignAdmin = async () => {
    if (!newAdminEmail) {
      setFeedbackMessage({
        title: "Error",
        message: "Please enter an email address"
      });
      setShowFeedbackDialog(true);
      return;
    }

    try {
      const response = await makeAuthenticatedRequest(
        'http://localhost:5067/api/auth/assign-admin',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: newAdminEmail.trim() })
        }
      );

      if (response) {
        setFeedbackMessage({
          title: "Success",
          message: `${newAdminEmail} has been assigned as admin`
        });
      } else {
        setFeedbackMessage({
          title: "Error",
          message: "Failed to assign admin. Please try again."
        });
      }
    } catch (error) {
      console.error('Error assigning admin:', error);
      setFeedbackMessage({
        title: "Error",
        message: "Failed to assign admin. Please try again."
      });
    }

    setShowAdminDialog(false);
    setNewAdminEmail("");
    setShowFeedbackDialog(true);
  };

  const getPendingApprovalCount = () => {
    return items.filter(item => 
      item.status === "lost" && 
      !notifications.some(n => n.type === 'verification' && n.item?.id === item.id)
    ).length;
  };

  const getInVerificationCount = () => {
    return notifications.filter(n => n.type === 'verification' && n.item).length;
  };

  const getPendingRetrievalCount = () => {
    return items.filter(item => item.status === "pending_retrieval").length;
  };

  const handleVerificationResult = (notificationId, isCorrect, itemId) => {
    setSelectedItem(itemId);
    if (isCorrect) {
      setShowSuccessDialog(true);
      onApprove(notificationId, true);
      onUpdateItemStatus(itemId, "pending_retrieval");
      onResolveNotification(notificationId);
    } else {
      setShowFailDialog(true);
      onApprove(notificationId, false);
      onUpdateItemStatus(itemId, "posted");
      onResolveNotification(notificationId);
    }
  };

  const handleRetrievalStatus = (itemId, status) => {
    if (status === "retrieved") {
      onUpdateItemStatus(itemId, "handed_over");
      setShowSuccessDialog(true);
    } else if (status === "no_show") {
      setNoShowItemId(itemId);
      setShowNoShowDialog(true);
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Reports</p>
                <h3 className="text-2xl font-bold">{items.filter(item => item.status === "lost").length}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Surrendered Items</p>
                <h3 className="text-2xl font-bold">{surrenderedItems.length}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Verifications</p>
                <h3 className="text-2xl font-bold">
                  {notifications.filter(n => n.type === 'verification').length}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admin Management</p>
                <Button variant="link" className="px-0" onClick={() => setShowAdminDialog(true)}>
                  Assign Admin →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="reports">Lost Item Reports</TabsTrigger>
              <TabsTrigger value="found">Found Items</TabsTrigger>
              <TabsTrigger value="verifications">Verifications</TabsTrigger>
              <TabsTrigger value="pending">Pending Processes</TabsTrigger>
            </TabsList>

            <TabsContent value="reports" className="space-y-4 mt-4">
              <h3 className="text-lg font-semibold">Lost Item Reports</h3>
              
              {/* New Status Summary Section */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Pending Approval</span>
                      <span className="text-2xl font-bold">
                        {getPendingApprovalCount()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">In Verification</span>
                      <span className="text-2xl font-bold">
                        {getInVerificationCount()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Pending Retrieval</span>
                      <span className="text-2xl font-bold">
                        {getPendingRetrievalCount()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Pending Reports Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">New Reports</h4>
                  {notifications.filter(n => n.type === 'verification' && n.item).length > 0 && (
                    <Badge variant="secondary" className="animate-pulse">
                      {notifications.filter(n => n.type === 'verification' && n.item).length} items need verification
                    </Badge>
                  )}
                </div>
                
                {items.filter(item => item.status === "lost").map((item) => {
                  // Check if item is already in verification process
                  const isInVerification = notifications.some(
                    n => n.type === 'verification' && n.item?.id === item.id
                  );
                  
                  // Check if verification questions have been set
                  const hasVerificationQuestions = item.verificationQuestions && item.verificationQuestions.length > 0;

                  return (
                    <Card key={item.id}>
                      <CardContent className="flex items-center justify-between gap-4 p-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold">{item.name}</h4>
                            <Badge 
                              variant={isInVerification ? "secondary" : hasVerificationQuestions ? "warning" : "outline"} 
                              className="text-xs"
                            >
                              {isInVerification ? "In Verification" : hasVerificationQuestions ? "Questions Set" : "New Report"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Location: {item.location}</p>
                          <p className="text-sm">Description: {item.description}</p>
                          <p className="text-sm">Student ID: {item.studentId}</p>
                          {hasVerificationQuestions && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              Verification questions have been set for this item
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {isInVerification ? (
                            // Show verification status buttons
                            <>
                              <Button 
                                variant="secondary" 
                                className="w-full"
                                onClick={() => {
                                  setActiveTab("verification");
                                  setTimeout(() => {
                                    const itemElement = document.getElementById(`verification-${item.id}`);
                                    if (itemElement) {
                                      itemElement.scrollIntoView({ behavior: 'smooth' });
                                      itemElement.classList.add('highlight-animation');
                                    }
                                  }, 100);
                                }}
                              >
                                <span className="text-blue-600 font-medium">→</span>
                                &nbsp;View Verification Status
                              </Button>
                              <Button 
                                variant="destructive" 
                                className="w-full"
                                onClick={() => {
                                  const notification = notifications.find(
                                    n => n.type === 'verification' && n.item?.id === item.id
                                  );
                                  if (notification) {
                                    onResolveNotification(notification.id);
                                    onUpdateItemStatus(item.id, "lost");
                                  }
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Verification
                              </Button>
                            </>
                          ) : hasVerificationQuestions ? (
                            // Show when questions are set but verification hasn't started
                            <div className="flex flex-col gap-2">
                              <Button 
                                variant="destructive" 
                                onClick={() => {
                                  // Reset verification questions and status
                                  onUpdateItemStatus(item.id, "lost");
                                }}
                                className="w-full"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Questions
                              </Button>
                              <Button 
                                variant="destructive" 
                                onClick={() => onDelete(item.id)}
                                size="icon"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            // Show default buttons for new reports
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2">
                                <Button 
                                  variant="default"
                                  className="flex-1"
                                  onClick={() => {
                                    onApprove(item.id, "posted");
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve Post
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  onClick={() => onDelete(item.id)}
                                  size="icon"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="secondary" className="w-full">
                                    <span className="text-green-600 font-medium">✓</span>
                                    &nbsp;Item Found - Verify Owner
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Set Verification Questions</DialogTitle>
                                    <DialogDescription>
                                      Please set verification questions for the item owner
                                    </DialogDescription>
                                  </DialogHeader>
                                  <Textarea
                                    placeholder="Enter verification questions (one per line)"
                                    value={verificationQuestions}
                                    onChange={(e) => setVerificationQuestions(e.target.value)}
                                    rows={4}
                                  />
                                  <DialogFooter>
                                    <Button onClick={() => {
                                      onApprove(item.id, "in_possession", verificationQuestions.split('\n'));
                                      setVerificationQuestions("");
                                    }}>
                                      Send for Verification
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="found" className="space-y-4 mt-4">
              <h3 className="text-lg font-semibold">Surrendered Found Items</h3>
              {surrenderedItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <h4 className="font-bold">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">Location: {item.location}</p>
                      <p className="text-sm">Found by Student ID: {item.studentId}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => {
                          setSelectedFoundItem(item);
                          setShowApproveFoundDialog(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve and Post
                      </Button>
                      <Button variant="destructive" onClick={() => onDelete(item.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="verifications" className="space-y-4 mt-4">
              <h3 className="text-lg font-semibold">Verification Requests</h3>
              {notifications.filter(n => n.type === 'verification' && n.item).map((notification) => (
                <Card 
                  key={notification.id}
                  id={`verification-${notification.item.id}`}
                >
                  <CardContent className="p-4">
                    <h4 className="font-bold mb-2">
                      Verification for {notification.item?.name || 'Unknown Item'}
                    </h4>
                    <div className="space-y-4 mb-4">
                      {notification.verificationQuestions?.map((question, index) => (
                        <div key={index} className="bg-muted p-3 rounded-lg">
                          <p className="font-medium">Q: {question}</p>
                          <p className="text-muted-foreground">A: {notification.answers?.[index] || 'No answer'}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="default"
                        onClick={() => handleVerificationResult(notification.id, true, notification.item.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Correct
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => handleVerificationResult(notification.id, false, notification.item.id)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Incorrect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4 mt-4">
              <h3 className="text-lg font-semibold">All Pending Processes</h3>
              {pendingProcesses.map((process) => (
                <Card key={process.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold">{process.item.name}</h4>
                      <Badge variant="secondary">{process.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {process.message}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => console.log('View details for admin')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
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
            </TabsContent>

            <TabsContent value="retrieval" className="space-y-4 mt-4">
              <h3 className="text-lg font-semibold">Ongoing Retrievals</h3>
              {items.filter(item => item.status === "pending_retrieval").map((item) => (
                <Card key={item.id}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <h4 className="font-bold">{item.name}</h4>
                      <p className="text-sm">Student ID: {item.studentId}</p>
                      <Badge variant="secondary">Pending Retrieval at Student Center</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="default"
                        onClick={() => handleRetrievalStatus(item.id, "retrieved")}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Retrieved
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => handleRetrievalStatus(item.id, "no_show")}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        No Show
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verification Successful!</AlertDialogTitle>
            <AlertDialogDescription>
              The owner has correctly verified their ownership. They can now proceed to retrieve their item at the Student Center.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setShowSuccessDialog(false);
              setActiveTab("retrieval");
            }}>
              View in Retrievals
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fail Dialog */}
      <AlertDialog open={showFailDialog} onOpenChange={setShowFailDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verification Failed</AlertDialogTitle>
            <AlertDialogDescription>
              The verification answers were incorrect. The item will remain posted and the user can try again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setShowFailDialog(false);
              setActiveTab("lost");
            }}>
              Return to Lost Items
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* No Show Dialog */}
      <AlertDialog open={showNoShowDialog} onOpenChange={setShowNoShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm No Show</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this as no show? This will reset the verification process and the item will remain posted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowNoShowDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onUpdateItemStatus(noShowItemId, "reset_verification");
                setActiveTab("lost");
                setShowNoShowDialog(false);
                setNoShowItemId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm No Show
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve Found Item Dialog */}
      <AlertDialog open={showApproveFoundDialog} onOpenChange={setShowApproveFoundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Found Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve and post this found item? This will make it visible to all users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowApproveFoundDialog(false);
              setSelectedFoundItem(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedFoundItem) {
                  // Add the found item to the main items list
                  onApprove(selectedFoundItem.id, "found", selectedFoundItem);
                  // Remove from surrendered items
                  onDelete(selectedFoundItem.id);
                }
                setShowApproveFoundDialog(false);
                setSelectedFoundItem(null);
              }}
            >
              Approve and Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Admin Management Dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign New Admin</DialogTitle>
            <DialogDescription>
              Enter the UMAK email address of the user you want to assign as admin.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Enter UMAK email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              className="flex-grow"
            />
            <Button onClick={handleAssignAdmin}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <AlertDialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{feedbackMessage.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {feedbackMessage.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowFeedbackDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 