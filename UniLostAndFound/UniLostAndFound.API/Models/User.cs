using Google.Cloud.Firestore;

namespace UniLostAndFound.API.Models;

[FirestoreData]
public class User
{
    [FirestoreProperty]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty]
    public string Email { get; set; } = string.Empty;

    [FirestoreProperty]
    public string DisplayName { get; set; } = string.Empty;

    [FirestoreProperty]
    public string Role { get; set; } = "select"; // "admin", "student", "teacher", or "select"

    [FirestoreProperty]
    public string? StudentId { get; set; }

    [FirestoreProperty]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [FirestoreProperty]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
} 