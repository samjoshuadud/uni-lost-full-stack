using Google.Cloud.Firestore;

namespace UniLostAndFound.API.Models;

public class ItemStatus
{
    public const string Lost = "lost";
    public const string Found = "found";
    public const string InVerification = "in_verification";
    public const string PendingRetrieval = "pending_retrieval";
    public const string HandedOver = "handed_over";
}

[FirestoreData]
public class AdditionalDescription
{
    [FirestoreProperty]
    public string Title { get; set; } = string.Empty;

    [FirestoreProperty]
    public string Description { get; set; } = string.Empty;
}

[FirestoreData]
public class Item : BaseEntity
{
    [FirestoreProperty]
    public string Name { get; set; } = string.Empty;

    [FirestoreProperty]
    public string Description { get; set; } = string.Empty;

    [FirestoreProperty]
    public string Category { get; set; } = string.Empty;

    [FirestoreProperty]
    public string Status { get; set; } = ItemStatus.Lost;

    [FirestoreProperty]
    public string Location { get; set; } = string.Empty;

    [FirestoreProperty]
    public DateTime DateReported { get; set; }

    [FirestoreProperty]
    public string ImageUrl { get; set; } = string.Empty;

    [FirestoreProperty]
    public string ReporterId { get; set; } = string.Empty;

    [FirestoreProperty]
    public string UniversityId { get; set; } = string.Empty;

    [FirestoreProperty]
    public bool Approved { get; set; }

    [FirestoreProperty]
    public List<string> VerificationQuestions { get; set; } = new();

    [FirestoreProperty]
    public string StudentId { get; set; } = string.Empty;

    [FirestoreProperty]
    public List<AdditionalDescription> AdditionalDescriptions { get; set; } = new();
} 