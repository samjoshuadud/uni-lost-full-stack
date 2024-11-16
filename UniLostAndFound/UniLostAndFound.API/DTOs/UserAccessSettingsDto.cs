namespace UniLostAndFound.API.DTOs;

public class UserAccessSettingsDto
{
    public List<string> AdminEmails { get; set; } = new();
    public List<string> DevelopmentEmails { get; set; } = new();
    public List<string> AllowedDomains { get; set; } = new();
} 