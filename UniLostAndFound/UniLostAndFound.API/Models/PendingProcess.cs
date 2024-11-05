namespace UniLostAndFound.API.Models;

public class PendingProcess : BaseEntity
{
    public string ItemId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    // pending_approval, verification_needed, verified, posted, completed
    public string Message { get; set; } = string.Empty;
    public List<string> VerificationAnswers { get; set; } = new();
    public Item? Item { get; set; } // Navigation property
} 