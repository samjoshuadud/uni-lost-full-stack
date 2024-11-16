using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace UniLostAndFound.API.Models;

public class UserAccess
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;  // admin, development, allowed_domain

    [Required]
    [MaxLength(255)]
    public string Value { get; set; } = string.Empty;  // email or domain

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Static helper properties for default values
    public static List<string> DefaultDevelopmentEmails => new() 
    { 
        "calebjoshuaarmojallas@gmail.com" 
    };

    public static List<string> DefaultAllowedDomains => new() 
    { 
        "umak.edu.ph" 
    };
} 