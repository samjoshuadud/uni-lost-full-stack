"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ItemStatus } from "@/lib/constants"

export default function QRDataForm({ data, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: data.name || "",
    description: data.description || "",
    location: data.location || "",
    category: data.category || "",
    studentId: data.studentId || "",
    additionalDescriptions: data.additionalDescriptions || [],
    status: ItemStatus.FOUND, // Always FOUND for scanned items
    reporterId: data.reporterId || "",
    timestamp: data.timestamp || new Date().toISOString()
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Item Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Location</label>
        <Input
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Category</label>
        <Input
          value={formData.category}
          disabled  // Category cannot be changed
        />
      </div>

      <div>
        <label className="text-sm font-medium">Student ID</label>
        <Input
          value={formData.studentId}
          onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
          required
        />
      </div>

      {/* Additional Descriptions */}
      {formData.additionalDescriptions.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Additional Descriptions</label>
          {formData.additionalDescriptions.map((desc, index) => (
            <div key={index} className="grid grid-cols-2 gap-2">
              <Input
                value={desc.title}
                onChange={(e) => {
                  const newDescs = [...formData.additionalDescriptions];
                  newDescs[index].title = e.target.value;
                  setFormData({ ...formData, additionalDescriptions: newDescs });
                }}
                placeholder="Title"
              />
              <Input
                value={desc.description}
                onChange={(e) => {
                  const newDescs = [...formData.additionalDescriptions];
                  newDescs[index].description = e.target.value;
                  setFormData({ ...formData, additionalDescriptions: newDescs });
                }}
                placeholder="Description"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Submit
        </Button>
      </div>
    </form>
  );
} 