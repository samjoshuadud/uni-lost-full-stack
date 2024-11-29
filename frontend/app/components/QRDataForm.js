"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ItemStatus } from "@/lib/constants"
import { useAuth } from "@/hooks/useAuth"
import { Label } from "@/components/ui/label"

export default function QRDataForm({ scannedData, onSubmit }) {
  const { user, userData, makeAuthenticatedRequest } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [studentId, setStudentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [originalItem, setOriginalItem] = useState(null);

  useEffect(() => {
    const fetchOriginalItem = async () => {
      if (scannedData?.id) {
        setIsLoading(true);
        try {
          // Fetch the original item details using the scanned ID
          const response = await makeAuthenticatedRequest(`/api/Item/${scannedData.id}`);
          if (response) {
            setOriginalItem(response);
            // Set the studentId from the original reporter
            setStudentId(response.studentId || "");
          }
        } catch (error) {
          console.error("Error fetching original item:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        // If not from QR scan, use current user's studentId
        setStudentId(userData?.studentId || "");
      }
    };

    fetchOriginalItem();
  }, [scannedData, userData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      location,
      category,
      studentId,
      additionalDescriptions: [],
      status: ItemStatus.FOUND, // Always FOUND for scanned items
      reporterId: user.id,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Item Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Location</label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Category</label>
        <Input
          value={category}
          disabled  // Category cannot be changed
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="studentId">Student ID</Label>
        <Input
          id="studentId"
          name="studentId"
          value={studentId}
          readOnly
          disabled
          className="bg-gray-100 text-gray-600 cursor-not-allowed"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">
          Submit
        </Button>
      </div>
    </form>
  );
} 