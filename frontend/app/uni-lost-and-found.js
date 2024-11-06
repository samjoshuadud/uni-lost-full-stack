"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bell, Search, User } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import LoginButton from "./components/login-button"
import { useAuth } from "@/lib/AuthContext"
import AuthRequiredDialog from "./components/dialogs/AuthRequiredDialog"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
// Import sections
import DashboardSection from "./components/sections/DashboardSection"
import ItemSection from "./components/sections/ItemSection"
import ReportSection from "./components/sections/ReportSection"
import AdminSection from "./components/sections/AdminSection"
import ProfileSection from "./components/sections/ProfileSection"
import PendingProcessSection from "./components/sections/PendingProcessSection"
import ItemDetailSection from "./components/sections/ItemDetailSection"

// Import dialogs
import ReportConfirmDialog from "./components/dialogs/ReportConfirmDialog"
import VerificationDialog from "./components/dialogs/VerificationDialog"
import VerificationSuccessDialog from "./components/dialogs/VerificationSuccessDialog"
import VerificationFailDialog from "./components/dialogs/VerificationFailDialog"

import { ItemStatus } from "@/lib/constants";

export default function UniLostAndFound() {
  const { user, loading, isAdmin } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard")
  const [selectedItem, setSelectedItem] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchCategory, setSearchCategory] = useState("all")
  const [items, setItems] = useState([])
  const [adminNotifications, setAdminNotifications] = useState([])
  const [surrenderedItems, setSurrenderedItems] = useState([])
  const [userNotifications, setUserNotifications] = useState([])
  const [pendingProcesses, setPendingProcesses] = useState([])
  const [showReportConfirmDialog, setShowReportConfirmDialog] = useState(false)
  const [pendingReport, setPendingReport] = useState(null)
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [verificationAnswers, setVerificationAnswers] = useState([])
  const [currentNotification, setCurrentNotification] = useState(null)
  const [showVerificationSuccessDialog, setShowVerificationSuccessDialog] = useState(false)
  const [showVerificationFailDialog, setShowVerificationFailDialog] = useState(false)
  const [adminUsers, setAdminUsers] = useState([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const filteredItems = items.filter(item => 
    item.approved &&
    (searchCategory === "all" || item.category === searchCategory) &&
    (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardSection items={filteredItems} onSeeMore={setSelectedItem} />
      case "lost":
        return <ItemSection items={filteredItems.filter(item => item.status === "lost")} onSeeMore={setSelectedItem} title="Lost Items" />
      case "found":
        return <ItemSection items={filteredItems.filter(item => item.status === "found")} onSeeMore={setSelectedItem} title="Found Items" />
      case "history":
        return <ItemSection items={filteredItems.filter(item => item.status === "handed_over")} onSeeMore={setSelectedItem} title="Handed Over Items" />
      case "report":
        return <ReportSection onSubmit={handleReportSubmit} />
      case "admin":
        return <AdminSection 
          items={items.filter(item => !item.approved)}
          surrenderedItems={surrenderedItems}
          notifications={adminNotifications}
          onApprove={handleApproveItem} 
          onHandOver={handleHandOverItem}
          onResolveNotification={handleResolveNotification}
          onDelete={handleDelete}
          onAssignAdmin={handleAssignAdmin}
          onUpdateItemStatus={handleUpdateItemStatus}
        />
      case "profile":
        return <ProfileSection user={user} />
      case "pending_process":
        return <PendingProcessSection 
          pendingProcesses={pendingProcesses} 
          onCancelRequest={handleCancelRequest}
          onVerify={handleVerification}
          onViewPost={handleViewPost}
        />
      default:
        return <DashboardSection items={filteredItems} onSeeMore={setSelectedItem} />
    }
  }

  const handleReportSubmit = async (formData) => {
    if (requireAuth()) return;
    
    try {
      setIsSubmitting(true);
      
      console.log('Report submitted successfully:', formData);
      
      // Create new item using the data passed from ReportSection
      const newItem = {
        id: formData.itemId,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        status: ItemStatus.LOST,
        location: formData.location,
        reporterId: user.uid,
        studentId: formData.studentId,
        universityId: formData.universityId,
        imageUrl: '', 
        dateReported: new Date().toISOString(),
        approved: false
      };

      setItems(prevItems => [...prevItems, newItem]);
      
      // Add to pending processes
      const newProcess = {
        id: formData.processId,
        item: newItem,
        status: "pending_approval",
        message: "Waiting for the admin to approve the post, also checking if we have the item in possession."
      };
      
      setPendingProcesses(prevProcesses => [...prevProcesses, newProcess]);
      setPendingReport(null);
      setShowReportConfirmDialog(false);
      setActiveSection("pending_process");
    } catch (error) {
      console.error('Error handling report submission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReport = () => {
    if (pendingReport.status === "lost") {
      const processItem = {
        id: Date.now(),
        item: { 
          ...pendingReport, 
          id: items.length + 1, 
          date: new Date().toISOString().split('T')[0], 
          approved: false 
        },
        status: "pending_approval"
      };
      setPendingProcesses([...pendingProcesses, processItem]);
      setItems([...items, processItem.item]);
    } else {
      setSurrenderedItems([
        ...surrenderedItems, 
        { ...pendingReport, id: surrenderedItems.length + 1, date: new Date().toISOString().split('T')[0] }
      ]);
    }
    setShowReportConfirmDialog(false);
    setActiveSection("pending_process");
    setPendingReport(null);
  }

  const handleApproveItem = async (id, status, itemData = null) => {
    try {
      const response = await fetch(`http://localhost:5067/api/item/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          approved: true,
          ...itemData
        })
      })

      if (!response.ok) throw new Error('Failed to approve item')

      // Update local state after successful API call
      setItems(items.map(item => 
        item.id === id ? { ...item, approved: true, status } : item
      ))
    } catch (error) {
      setError('Failed to approve item')
      console.error('Error approving item:', error)
    }
  }

  const handleHandOverItem = (id, claimantId) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, status: "handed_over", claimedBy: claimantId } : item
    ))
  }

  const handleClaim = (item, studentId, verificationAnswers) => {
    if (requireAuth()) return;
    setAdminNotifications([...adminNotifications, { 
      id: Date.now(), 
      type: 'claim', 
      item, 
      studentId, 
      verificationAnswers 
    }]);
  }

  const handleFound = (item, studentId) => {
    if (requireAuth()) return;
    setSurrenderedItems([
      ...surrenderedItems, 
      { 
        ...item, 
        id: surrenderedItems.length + 1, 
        foundBy: studentId, 
        date: new Date().toISOString().split('T')[0] 
      }
    ]);
  }

  const handleResolveNotification = (notificationId) => {
    setAdminNotifications(adminNotifications.filter(notification => notification.id !== notificationId))
  }

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`http://localhost:5067/api/item/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete item')

      // Update local state after successful deletion
      setItems(items.filter(item => item.id !== id))
    } catch (error) {
      setError('Failed to delete item')
      console.error('Error deleting item:', error)
    }
  }

  const generateVerificationQuestions = (item) => {
    const questions = [
      `What is the color of the ${item.name}?`,
      `Can you describe any unique features of the ${item.name}?`,
      `Where exactly did you lose/find the ${item.name}?`,
    ]
    return questions
  }

  const handleVerification = (process) => {
    // Set the current notification for verification
    setCurrentNotification({
      id: Date.now(),
      type: 'verification',
      item: process.item,
      verificationQuestions: process.item.verificationQuestions,
      answers: []
    });
    
    // Show the verification dialog
    setShowVerificationDialog(true);
  };

  const handleSubmitVerification = () => {
    if (!currentNotification) return;

    // Find the current process and item
    const currentProcess = pendingProcesses.find(p => p.item.id === currentNotification.item.id);
    const currentItem = items.find(i => i.id === currentNotification.item.id);
    
    if (!currentProcess || !currentItem) return;

    // Send verification answers to admin
    setAdminNotifications([
      ...adminNotifications, 
      { 
        id: Date.now(), 
        type: 'verification', 
        itemId: currentItem.id,
        item: currentItem,
        answers: verificationAnswers,
        verificationQuestions: currentProcess.verificationQuestions
      }
    ]);
    
    // Update pending process status to show waiting for answer approval
    setPendingProcesses(pendingProcesses.map(process =>
      process.item.id === currentItem.id ? {
        ...process,
        status: "pending_verification",
        answers: verificationAnswers
      } : process
    ));
    
    setShowVerificationDialog(false);
    setCurrentNotification(null);
    setVerificationAnswers([]);
  };

  const handleCancelRequest = (processId) => {
    const process = pendingProcesses.find(p => p.id === processId);
    if (process) {
      setPendingProcesses(pendingProcesses.filter(p => p.id !== processId));
      setItems(items.filter(item => item.id !== process.item.id));
    }
  };

  const handleVerificationSuccess = (processId) => {
    setPendingProcesses(pendingProcesses.map(process =>
      process.id === processId ? { ...process, status: "verified" } : process
    ));
    
    // Show success modal
    return (
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verification Successful!</DialogTitle>
            <DialogDescription>
              Please proceed to the student center to retrieve your item.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowSuccessDialog(false)}>Okay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const handleAdminVerificationResponse = (notificationId, isCorrect) => {
    const notification = adminNotifications.find(n => n.id === notificationId);
    if (isCorrect) {
      // Update item status to verified
      setItems(items.map(item => 
        item.id === notification.itemId ? { ...item, status: "verified" } : item
      ));
      
      // Update pending process status
      setPendingProcesses(pendingProcesses.map(process =>
        process.item.id === notification.itemId ? { ...process, status: "verified" } : process
      ));
    }
    
    // Remove the admin notification
    setAdminNotifications(adminNotifications.filter(n => n.id !== notificationId));
  }

  const handleAssignAdmin = (email) => {
    if (!adminUsers.includes(email)) {
      setAdminUsers([...adminUsers, email]);
      alert(`${email} has been assigned as an admin`);
    } else {
      alert('This user is already an admin');
    }
  };

  const handleViewPost = (item) => {
    setSelectedItem(item);
    setActiveSection("dashboard");
  };

  const handleUpdateItemStatus = (itemId, status, verificationQuestions = null) => {
    if (status === "reset_verification") {
      // Reset item to original posted state
      setItems(items.map(item => 
        item.id === itemId ? { 
          ...item, 
          status: "lost",
          approved: true,
          verificationQuestions: undefined // Remove verification questions
        } : item
      ));

      // Remove from pending processes
      setPendingProcesses(prevProcesses => 
        prevProcesses.filter(process => process.item.id !== itemId)
      );

      // Remove any related notifications
      setAdminNotifications(prevNotifications => 
        prevNotifications.filter(n => n.item?.id !== itemId)
      );

      return; // Exit early for reset case
    }

    // Rest of the existing status handling
    setItems(items.map(item => 
      item.id === itemId ? { 
        ...item, 
        status: status,
        verificationQuestions: verificationQuestions === null ? undefined : verificationQuestions
      } : item
    ));

    setPendingProcesses(pendingProcesses.map(process =>
      process.item.id === itemId ? { 
        ...process, 
        status: status === "handed_over" ? "completed" : 
               status === "pending_retrieval" ? "verified" : 
               status === "in_possession" ? "verification_needed" : 
               "pending_approval",
        message: status === "handed_over" ? "Item has been successfully retrieved!" :
                status === "pending_retrieval" ? "Verified! Please proceed to the student center (Room 101) to retrieve your item." :
                status === "in_possession" ? "Please answer the verification questions." :
                "Your report is pending approval from admin.",
        item: {
          ...process.item,
          status: status,
          verificationQuestions: verificationQuestions === null ? undefined : verificationQuestions
        }
      } : process
    ));

    if (status === "handed_over") {
      setTimeout(() => {
        setPendingProcesses(prevProcesses => 
          prevProcesses.filter(process => process.item.id !== itemId)
        );
      }, 5000);
    }
  };

  // Helper function to check if action requires auth
  const requireAuth = (action) => {
    if (!user) {
      setShowAuthDialog(true);
      return true;
    }
    return false;
  };

  // Add useEffect to handle auth state changes
  useEffect(() => {
    if (!user) {
      // Reset UI state when user logs out
      setActiveSection("dashboard");
      setSelectedItem(null);
      setPendingProcesses([]);
      setShowAuthDialog(false);
      setShowVerificationDialog(false);
      setShowReportConfirmDialog(false);
      setCurrentNotification(null);
      setPendingReport(null);
    }
  }, [user]);

  // Add useEffect to fetch pending processes for the current user
  useEffect(() => {
    const fetchUserPendingProcesses = async () => {
      if (!user?.uid) return;

      try {
        const response = await fetch(`http://localhost:5067/api/item/pending/user/${user.uid}`);
        if (!response.ok) {
          throw new Error('Failed to fetch pending processes');
        }
        const data = await response.json();
        setPendingProcesses(Array.isArray(data) ? data : [data].filter(Boolean));
      } catch (error) {
        console.error('Error fetching pending processes:', error);
      }
    };

    if (user) {
      fetchUserPendingProcesses();
    }
  }, [user]);

  // Show loading state while checking auth and admin status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">UniLostAndFound</h1>
          <nav className="flex gap-4">
            {isAdmin ? (
              // Admin Navigation
              <>
                <Button 
                  variant={activeSection === "admin" ? "default" : "ghost"}
                  onClick={() => { setActiveSection("admin"); setSelectedItem(null); }}
                >
                  Admin Dashboard
                </Button>
                <Button 
                  variant={activeSection === "dashboard" ? "default" : "ghost"}
                  onClick={() => { setActiveSection("dashboard"); setSelectedItem(null); }}
                >
                  View Items
                </Button>
              </>
            ) : (
              // Regular User Navigation
              <>
                <Button variant="ghost" onClick={() => { setActiveSection("dashboard"); setSelectedItem(null); }}>
                  Home
                </Button>
                <Button variant="ghost" onClick={() => { 
                  if (requireAuth()) return;
                  setActiveSection("report"); 
                  setSelectedItem(null); 
                }}>
                  Report Item
                </Button>
                {user && (
                  <>
                    <Button variant="ghost" onClick={() => { setActiveSection("pending_process"); setSelectedItem(null); }}>
                      <Bell className="mr-2 h-4 w-4" />
                      Pending Process
                      {pendingProcesses.length > 0 && (
                        <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                          {pendingProcesses.length}
                        </span>
                      )}
                    </Button>
                    <Button variant="ghost" onClick={() => { setActiveSection("profile"); setSelectedItem(null); }}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Button>
                  </>
                )}
              </>
            )}
            <LoginButton />
          </nav>
        </div>
      </header>

      <main className="container mx-auto mt-8">
        {user && (
          <>
            {isAdmin ? (
              // Admin Section Buttons
              <div className="grid grid-cols-2 gap-4 mb-8">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">Pending Actions</h3>
                      <p className="text-muted-foreground">
                        {adminNotifications.length} items need attention
                      </p>
                    </div>
                    <Button 
                      variant={activeSection === "admin" ? "default" : "secondary"}
                      onClick={() => { setActiveSection("admin"); setSelectedItem(null); }}
                    >
                      View Admin Dashboard
                    </Button>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">Item Database</h3>
                      <p className="text-muted-foreground">
                        View and manage all items
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant={activeSection === "lost" ? "default" : "secondary"}
                        onClick={() => { setActiveSection("lost"); setSelectedItem(null); }}
                      >
                        Lost Items
                      </Button>
                      <Button 
                        variant={activeSection === "found" ? "default" : "secondary"}
                        onClick={() => { setActiveSection("found"); setSelectedItem(null); }}
                      >
                        Found Items
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              // Regular User Section Buttons
              <div className="grid grid-cols-4 gap-4 mb-8">
                <Button 
                  variant={activeSection === "dashboard" ? "default" : "outline"}
                  onClick={() => { setActiveSection("dashboard"); setSelectedItem(null); }}
                  className="w-full"
                >
                  Dashboard
                </Button>
                <Button 
                  variant={activeSection === "lost" ? "default" : "outline"}
                  onClick={() => { setActiveSection("lost"); setSelectedItem(null); }}
                  className="w-full"
                >
                  Lost Items
                </Button>
                <Button 
                  variant={activeSection === "found" ? "default" : "outline"}
                  onClick={() => { setActiveSection("found"); setSelectedItem(null); }}
                  className="w-full"
                >
                  Found Items
                </Button>
                <Button 
                  variant={activeSection === "history" ? "default" : "outline"}
                  onClick={() => { setActiveSection("history"); setSelectedItem(null); }}
                  className="w-full"
                >
                  History
                </Button>
              </div>
            )}
          </>
        )}

        {/* Search Bar - Show only when viewing items */}
        {(activeSection === "dashboard" || activeSection === "lost" || activeSection === "found") && (
          <div className="flex gap-4 mb-8">
            <Input 
              placeholder="Search items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-grow"
            />
            <Select value={searchCategory} onValueChange={setSearchCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Books">Books</SelectItem>
                <SelectItem value="Electronics">Electronics</SelectItem>
                <SelectItem value="Personal Items">Personal Items</SelectItem>
                <SelectItem value="Documents">Documents</SelectItem>
                <SelectItem value="Bags">Bags</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </div>
        )}

        {/* Main Content */}
        {selectedItem ? (
          <ItemDetailSection 
            item={selectedItem} 
            onBack={() => setSelectedItem(null)} 
            onClaim={handleClaim} 
            onFound={handleFound}
            onDelete={handleDelete}
          />
        ) : (
          renderSection()
        )}

        <AuthRequiredDialog 
          open={showAuthDialog} 
          onOpenChange={setShowAuthDialog}
        />
      </main>

      <ReportConfirmDialog 
        open={showReportConfirmDialog}
        onOpenChange={setShowReportConfirmDialog}
        onConfirm={handleConfirmReport}
      />

      <VerificationDialog 
        open={showVerificationDialog}
        onOpenChange={setShowVerificationDialog}
        onSubmit={handleSubmitVerification}
        onCancel={() => setShowVerificationDialog(false)}
        questions={currentNotification?.verificationQuestions || []}
        answers={verificationAnswers}
        onAnswerChange={(index, value) => {
          const newAnswers = [...verificationAnswers];
          newAnswers[index] = value;
          setVerificationAnswers(newAnswers);
        }}
      />

      <VerificationSuccessDialog 
        open={showVerificationSuccessDialog}
        onOpenChange={setShowVerificationSuccessDialog}
      />

      <VerificationFailDialog 
        open={showVerificationFailDialog}
        onOpenChange={setShowVerificationFailDialog}
        onTryAgain={() => {
          setShowVerificationFailDialog(false);
          setShowVerificationDialog(true);
        }}
      />
    </div>
  )
}
