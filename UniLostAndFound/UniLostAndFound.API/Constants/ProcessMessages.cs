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
    }

    public static class Messages
    {
        public const string WAITING_APPROVAL = "Waiting for admin approval";
        public const string ITEM_APPROVED = "The item has been approved!";
        public const string IN_VERIFICATION = "Item is being verified";
        public const string SURRENDER_REQUIRED = "Item must be surrendered within 3 days";
        public const string VERIFICATION_COMPLETE = "Verification completed";
    }
} 