using System.ComponentModel.DataAnnotations;

namespace UniLostAndFound.API.DTOs;

public class ClaimQuestionAnswerDto
{
    [Required]
    public string Question { get; set; }
    
    [Required]
    public string Answer { get; set; }
}

public class ClaimItemDto
{
    [Required]
    public string ItemId { get; set; }
    
    [Required]
    public List<ClaimQuestionAnswerDto> Questions { get; set; }
    
    public string? AdditionalInfo { get; set; }

    [Required]
    public string RequestorUserId { get; set; }
} 