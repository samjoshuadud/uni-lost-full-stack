using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniLostAndFound.API.Models;

public class PendingProcess : BaseEntity
{
    [Required]
    public string ItemId { get; set; } = string.Empty;

    [Required]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string status { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public int VerificationAttempts { get; set; } = 0;

    [ForeignKey("RequestorUser")]
    public string? RequestorUserId { get; set; }

    // Navigation properties
    public virtual Item? Item { get; set; }
    public virtual User? User { get; set; }
    public virtual User? RequestorUser { get; set; }

    // Helper property
    public bool HasExceededVerificationAttempts => VerificationAttempts >= 2;
} 