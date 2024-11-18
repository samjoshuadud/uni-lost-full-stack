"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/AuthContext"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ItemStatus } from "@/lib/constants"
import { Plus, X, Upload, Bell } from "lucide-react"

export default function ReportSection({ onSubmit }) {
  const { user, makeAuthenticatedRequest } = useAuth();
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [category, setCategory] = useState("")
  const [studentId, setStudentId] = useState("")
  const [additionalDescriptions, setAdditionalDescriptions] = useState([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [itemStatus, setItemStatus] = useState("")

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const addDescription = () => {
    setAdditionalDescriptions([...additionalDescriptions, { title: '', description: '' }])
  }

  const removeDescription = (index) => {
    const newDescriptions = [...additionalDescriptions]
    newDescriptions.splice(index, 1)
    setAdditionalDescriptions(newDescriptions)
  }

  const updateDescription = (index, field, value) => {
    const newDescriptions = [...additionalDescriptions]
    newDescriptions[index][field] = value
    setAdditionalDescriptions(newDescriptions)
  }

  const handlePreSubmit = (e) => {
    e.preventDefault();
    // Show confirmation dialog with summary
    setShowConfirmDialog(true);
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    setShowConfirmDialog(false);

    try {
      // Create FormData object
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('location', location);
      formData.append('category', category || 'Books');
      formData.append('status', itemStatus);
      formData.append('reporterId', user.uid);
      formData.append('studentId', studentId);
      formData.append('message', 'Waiting for admin approval');

      // Format additional descriptions
      if (additionalDescriptions.length > 0) {
        const validDescriptions = additionalDescriptions.filter(
          desc => desc.title && desc.description
        );
        if (validDescriptions.length > 0) {
          console.log('Sending additional descriptions:', validDescriptions);
          formData.append('additionalDescriptions', JSON.stringify(validDescriptions));
        }
      }

      // Add image if selected
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      console.log('Submitting form data:', Object.fromEntries(formData));

      // Make the request
      const response = await fetch('http://localhost:5067/api/Item', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.email}`,
          'FirebaseUID': user.uid,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response:', errorData);
        throw new Error('Failed to submit report');
      }

      const data = await response.json();
      console.log('Report submitted successfully:', data);
      
      // Clear form
      setName('');
      setDescription('');
      setLocation('');
      setCategory('');
      setStudentId('');
      setItemStatus('');
      setAdditionalDescriptions([]);
      setSelectedImage(null);
      setImagePreview(null);

      // Call onSubmit with the response data
      if (onSubmit) {
        onSubmit(data);
      }

    } catch (error) {
      console.error('Error submitting report:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Report Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePreSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Report Type</label>
              <Select value={itemStatus} onValueChange={setItemStatus} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ItemStatus.LOST}>Lost Item</SelectItem>
                  <SelectItem value={ItemStatus.FOUND}>Found Item</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Student ID</label>
              <Input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter your student ID"
                required
              />
            </div>
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

            {/* Additional Descriptions */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Additional Descriptions</label>
                <Button type="button" variant="outline" onClick={addDescription}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Description
                </Button>
              </div>
              {additionalDescriptions.map((desc, index) => (
                <div key={index} className="space-y-2 p-4 border rounded-lg relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => removeDescription(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Input
                    value={desc.title}
                    onChange={(e) => updateDescription(index, 'title', e.target.value)}
                    placeholder="Title"
                  />
                  <Textarea
                    value={desc.description}
                    onChange={(e) => updateDescription(index, 'description', e.target.value)}
                    placeholder="Description"
                  />
                </div>
              ))}
            </div>

            {/* Image Upload */}
            <div>
              <label className="text-sm font-medium">Upload Image</label>
              <div className="mt-2 space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="mt-2 text-sm text-muted-foreground">Click to upload image</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || !itemStatus}>
              Preview Report
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Summary Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Summary</DialogTitle>
            <div className="text-sm text-muted-foreground">
              <p>Please review your report details before submitting.</p>
              <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-primary/20 rounded-full">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <div className="font-semibold text-primary mb-1">Admin Review Process</div>
                    <p className="text-sm text-muted-foreground">
                      Our admin will check if the item is in possession. If not, then this will be posted.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            {/* Image preview */}
            {imagePreview && (
              <div className="w-full">
                <div className="font-medium mb-2"><strong>Image:</strong></div>
                <div className="w-full h-48 rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={imagePreview} 
                    alt="Item preview" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
            
            {/* Report details */}
            <div className="space-y-2">
              <div><strong>Report Type:</strong> {itemStatus === ItemStatus.LOST ? "Lost Item" : "Found Item"}</div>
              <div><strong>Student ID:</strong> {studentId}</div>
              <div><strong>Item:</strong> {name}</div>
              <div><strong>Location:</strong> {location}</div>
              <div><strong>Category:</strong> {category}</div>
              {additionalDescriptions.length > 0 && (
                <div>
                  <div className="font-medium mt-2">Additional Descriptions:</div>
                  {additionalDescriptions.map((desc, index) => (
                    <div key={index}><strong>{desc.title}:</strong> {desc.description}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
            >
              Edit Report
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 