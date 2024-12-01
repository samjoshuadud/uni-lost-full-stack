export const ProcessStatus = {
  PENDING_APPROVAL: "pending_approval",
  APPROVED: "approved",
  IN_VERIFICATION: "in_verification",
  VERIFIED: "verified",
  AWAITING_SURRENDER: "awaiting_surrender",
  VERIFICATION_FAILED: "verification_failed",
  AWAITING_REVIEW: "awaiting_review",
  PENDING_RETRIEVAL: "pending_retrieval",
  HANDED_OVER: "handed_over",
  NO_SHOW: "no_show"
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
  VERIFICATION_REQUIRED: "Verification required",
  VERIFICATION_SUCCESSFUL: "Verification successful! You can claim your item at the admin office during office hours (Mon-Sat)",
  VERIFICATION_ATTEMPT_FAILED: "Incorrect answers. {attempts} attempt(s) remaining.",
  VERIFICATION_FAILED_FINAL: "Verification failed. Please visit the admin office to claim your item.",
  ADMIN_VERIFICATION_FAILED: "User failed verification after 2 attempts. Manual verification required.",
  HANDED_OVER: "Item has been successfully handed over",
  NO_SHOW: "User did not show up for item retrieval"
};

export const ItemStatus = {
  LOST: "lost",
  FOUND: "found",
  RETRIEVED: "retrieved",
  HANDED_OVER: "handed_over",
  EXPIRED: "expired",
  UNCLAIMED: "unclaimed",
  NO_SHOW: "no_show"
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