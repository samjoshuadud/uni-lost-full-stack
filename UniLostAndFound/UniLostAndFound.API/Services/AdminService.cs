namespace UniLostAndFound.API.Services;

public static class AdminService
{
    // TODO: Move to database later
    private static readonly HashSet<string> AdminEmails = new()
    {
        "carmojallas.a12345677@umak.edu.ph"
    };

    // TODO: Move to database later
    private static readonly HashSet<string> DevelopmentEmails = new()
    {
        "calebjoshuaarmojallas@gmail.com"
    };

    public static bool IsAdmin(string email)
    {
        return AdminEmails.Contains(email);
    }

    public static bool IsAllowedEmail(string email)
    {
        return email.EndsWith("@umak.edu.ph") || DevelopmentEmails.Contains(email);
    }
} 