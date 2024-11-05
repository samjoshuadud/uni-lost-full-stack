"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/AuthContext"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function ReportSection({ onSubmit }) {
  const { user, userData } = useAuth();
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [category, setCategory] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const report = {
      name,
      description,
      location,
      category,
      status: "lost",
      reportedBy: user.uid,
      studentId: userData?.studentId || "",
      date: new Date().toISOString().split('T')[0]
    }

    setShowConfirmDialog(true)
    // Reset form
    setName("")
    setDescription("")
    setLocation("")
    setCategory("")
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Report Lost Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Item Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter item name"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the item"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Seen Location</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Books">Books</SelectItem>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Personal Items">Personal Items</SelectItem>
                  <SelectItem value="Documents">Documents</SelectItem>
                  <SelectItem value="Bags">Bags</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Submit Report</Button>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Report</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit this report? Please make sure all information is accurate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p><strong>Item:</strong> {name}</p>
            <p><strong>Location:</strong> {location}</p>
            <p><strong>Category:</strong> {category}</p>
            <p><strong>Reporter:</strong> {userData?.studentId || user?.email}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              onSubmit({
                name,
                description,
                location,
                category,
                status: "lost",
                reportedBy: user.uid,
                studentId: userData?.studentId || "",
                date: new Date().toISOString().split('T')[0]
              });
              setShowConfirmDialog(false);
            }}>
              Confirm Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 