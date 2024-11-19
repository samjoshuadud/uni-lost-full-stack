export const ProcessStatus = {
  PENDING_APPROVAL: "pending_approval",
  APPROVED: "approved",
  IN_VERIFICATION: "in_verification",
  VERIFIED: "verified",
  REJECTED: "rejected",
  CANCELLED: "cancelled"
};

export const ProcessMessages = {
  WAITING_APPROVAL: "Waiting for admin approval",
  ITEM_APPROVED: "The item has been approved!",
  IN_VERIFICATION: "Item is being verified",
  VERIFICATION_COMPLETE: "Verification completed",
  REJECTED: "Item has been rejected",
  CANCELLED: "Process has been cancelled",
  PENDING_RETRIEVAL: "Waiting for item retrieval",
  SURRENDER_REQUIRED: "Item must be surrendered within 3 days",
  VERIFICATION_REQUIRED: "Verification required"
};

export const ItemStatus = {
  LOST: "lost",
  FOUND: "found",
  RETRIEVED: "retrieved",
  HANDED_OVER: "handed_over",
  EXPIRED: "expired",
  UNCLAIMED: "unclaimed"
};

export const ItemCategories = {
  ELECTRONICS: "Electronics",
  DOCUMENTS: "Documents",
  ACCESSORIES: "Accessories",
  CLOTHING: "Clothing",
  BOOKS: "Books",
  OTHERS: "Others"
};

export const ValidationMessages = {
  REQUIRED_FIELD: "This field is required",
  INVALID_EMAIL: "Must be a valid university email",
  INVALID_STUDENT_ID: "Invalid student ID format",
  IMAGE_REQUIRED: "Please upload an image of the item",
  DESCRIPTION_MIN_LENGTH: "Description must be at least 20 characters"
};

export const RefreshIntervals = {
  DASHBOARD: 10000, // 10 seconds
  PENDING_PROCESSES: 5000 // 5 seconds
}; 