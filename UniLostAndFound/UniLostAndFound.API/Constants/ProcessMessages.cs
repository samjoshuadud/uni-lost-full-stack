namespace UniLostAndFound.API.Constants;

public static class ProcessMessages
{
    public static class Status
    {
        public const string PENDING_APPROVAL = "pending_approval";
        public const string APPROVED = "approved";
        public const string IN_VERIFICATION = "in_verification";
        public const string VERIFIED = "verified";
        public const string AWAITING_SURRENDER = "awaiting_surrender";
        public const string VERIFICATION_FAILED = "verification_failed";
        public const string AWAITING_REVIEW = "awaiting_review";
        public const string PENDING_RETRIEVAL = "pending_retrieval";
        public const string HANDED_OVER = "handed_over";
        public const string NO_SHOW = "no_show";
        public const string CLAIM_REQUEST = "claim_request";
    }

    public static class Messages
    {
        public const string WAITING_APPROVAL = "Waiting for admin approval";
        public const string ITEM_APPROVED = "The item has been approved!";
        public const string IN_VERIFICATION = "Item is being verified";
        public const string SURRENDER_REQUIRED = "Item must be surrendered within 3 days";
        public const string VERIFICATION_COMPLETE = "Verification completed";
        public const string VERIFICATION_SUCCESSFUL = "Verification successful! You can claim your item at the admin office during office hours (Mon-Sat)";
        public const string VERIFICATION_ATTEMPT_REMAINING = "Incorrect answers. You have 1 attempt remaining.";
        public const string VERIFICATION_FAILED = "Verification failed. Please visit the admin office to claim your item.";
        public const string ADMIN_VERIFICATION_FAILED = "User failed verification after 2 attempts. Manual verification required.";
        public const string AWAITING_ANSWER_REVIEW = "Admin is reviewing your answers. Please wait for confirmation.";
        public const string PENDING_RETRIEVAL = "Item is ready for retrieval at the admin office";
        public const string HANDED_OVER = "Item has been successfully handed over";
        public const string NO_SHOW = "User did not show up for item retrieval";
        public const string CLAIM_REQUEST = "Claim request submitted with verification answers";
    }
} 