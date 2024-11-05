namespace UniLostAndFound.API.Models;

public class UserAccess
{
    public List<string> AdminEmails { get; set; } = new();
    public List<string> DevelopmentEmails { get; set; } = new() 
    { 
        "calebjoshuaarmojallas@gmail.com" 
    };
    public List<string> AllowedDomains { get; set; } = new() 
    { 
        "umak.edu.ph" 
    };
} 