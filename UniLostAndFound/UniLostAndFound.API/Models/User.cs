using System.ComponentModel.DataAnnotations;

namespace UniLostAndFound.API.Models;

public class User : BaseEntity
{
    [Required]
    [MaxLength(255)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string DisplayName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? StudentId { get; set; }

    // Navigation properties
    public virtual ICollection<Item> ReportedItems { get; set; } = new List<Item>();
    public virtual ICollection<PendingProcess> PendingProcesses { get; set; } = new List<PendingProcess>();
} 