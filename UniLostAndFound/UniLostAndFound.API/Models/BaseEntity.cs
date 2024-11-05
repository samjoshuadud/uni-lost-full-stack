using Google.Cloud.Firestore;

namespace UniLostAndFound.API.Models;

[FirestoreData]
public abstract class BaseEntity
{
    [FirestoreProperty]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [FirestoreProperty]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
} 