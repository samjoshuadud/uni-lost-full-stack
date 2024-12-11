namespace UniLostAndFound.API.Constants;

public static class ProcessMessages
{
    public static class Status
    {
        public const string PENDING_APPROVAL = "pending_approval";
        public const string APPROVED = "approved";
        public const string AWAITING_SURRENDER = "awaiting_surrender";
        public const string PENDING_RETRIEVAL = "pending_retrieval";
        public const string HANDED_OVER = "handed_over";
        public const string NO_SHOW = "no_show";
    }

    public static class Messages
    {
        public const string WAITING_APPROVAL = "Waiting for admin approval";
        public const string ITEM_APPROVED = "The item has been approved!";
        public const string SURRENDER_REQUIRED = "Item must be surrendered within 3 days";
        public const string PENDING_RETRIEVAL = "Item is ready for retrieval at the admin office";
        public const string HANDED_OVER = "Item has been successfully handed over";
        public const string NO_SHOW = "User did not show up for item retrieval";
    }
} 