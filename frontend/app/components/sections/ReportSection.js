"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/AuthContext"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ItemStatus } from "@/lib/constants"
import { Plus, X, Upload } from "lucide-react"

export default function ReportSection({ onSubmit }) {
  const { user, userData } = useAuth();
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [category, setCategory] = useState("")
  const [studentId, setStudentId] = useState(userData?.studentId || "")
  const [additionalDescriptions, setAdditionalDescriptions] = useState([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

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

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const report = {
      name,
      description,
      location,
      category,
      status: ItemStatus.LOST,
      reporterId: user.uid,
      studentId,
      universityId: userData?.universityId || user.email.split('@')[1],
      additionalDescriptions
    }

    setShowConfirmDialog(true)
  }

  const handleConfirmSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('location', location.trim());
      formData.append('category', category);
      formData.append('status', ItemStatus.LOST);
      formData.append('reporterId', user.uid);
      formData.append('studentId', studentId.trim());
      formData.append('universityId', user.email.split('@')[1]);
      
      if (additionalDescriptions.length > 0) {
        formData.append('additionalDescriptions', JSON.stringify(additionalDescriptions));
      }
      
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      console.log('Form data entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value instanceof File ? 'File: ' + value.name : value}`);
      }

      console.log('Selected image type:', selectedImage?.type);

      const response = await fetch('http://localhost:5067/api/item', {
        method: 'POST',
        body: formData
      });

      const rawResponse = await response.text();
      console.log('Raw server response:', rawResponse);

      if (!response.ok) {
        throw new Error(`Failed to submit report: ${rawResponse}`);
      }
      
      const data = JSON.parse(rawResponse);
      console.log('Parsed response:', data);

      // Reset form
      setName("");
      setDescription("");
      setLocation("");
      setCategory("");
      setStudentId(userData?.studentId || "");
      setAdditionalDescriptions([]);
      setSelectedImage(null);
      setImagePreview(null);
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Error submitting report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Report Lost Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
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
            <p><strong>Student ID:</strong> {studentId}</p>
            <p><strong>Item:</strong> {name}</p>
            <p><strong>Location:</strong> {location}</p>
            <p><strong>Category:</strong> {category}</p>
            {additionalDescriptions.length > 0 && (
              <div>
                <p><strong>Additional Descriptions:</strong></p>
                <ul className="list-disc pl-4">
                  {additionalDescriptions.map((desc, index) => (
                    <li key={index}>{desc.title}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Confirm Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 