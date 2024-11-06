using Google.Cloud.Firestore;

namespace UniLostAndFound.API.Models;

[FirestoreData]
public class PendingProcess : BaseEntity
{
    [FirestoreProperty]
    public string ItemId { get; set; } = string.Empty;

    [FirestoreProperty]
    public string UserId { get; set; } = string.Empty;

    [FirestoreProperty]
    public string Status { get; set; } = string.Empty;

    [FirestoreProperty]
    public string Message { get; set; } = string.Empty;

    public Item? Item { get; set; }
} 