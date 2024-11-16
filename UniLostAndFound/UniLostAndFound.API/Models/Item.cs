using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniLostAndFound.API.Models;

public static class ItemStatus
{
    public const string Lost = "lost";
    public const string Found = "found";
    public const string InVerification = "in_verification";
    public const string PendingRetrieval = "pending_retrieval";
    public const string HandedOver = "handed_over";
}

public class Item : BaseEntity
{
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Category { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Status { get; set; } = ItemStatus.Lost;

    [MaxLength(255)]
    public string Location { get; set; } = string.Empty;

    public DateTime DateReported { get; set; }

    [MaxLength(2048)]
    public string ImageUrl { get; set; } = string.Empty;

    [ForeignKey("Reporter")]
    public string ReporterId { get; set; } = string.Empty;

    [MaxLength(50)]
    public string StudentId { get; set; } = string.Empty;

    public bool Approved { get; set; }

    // Navigation properties
    public virtual ICollection<AdditionalDescription> AdditionalDescriptions { get; set; } = new List<AdditionalDescription>();
    public virtual User? Reporter { get; set; }
} 