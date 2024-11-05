// Program.cs
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi.Models;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Microsoft.IdentityModel.Tokens;
using UniLostAndFound.API.Services;
using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);

try
{
    // Initialize Firebase with credentials
    var credentialPath = Path.Combine(Directory.GetCurrentDirectory(), "firebase-config.json");
    Console.WriteLine($"[Debug] Looking for credentials at: {credentialPath}");
    Console.WriteLine($"[Debug] File exists: {File.Exists(credentialPath)}");

    Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", credentialPath);

    // Initialize Firebase Admin
    if (FirebaseApp.DefaultInstance == null)
    {
        FirebaseApp.Create(new AppOptions
        {
            Credential = GoogleCredential.FromFile(credentialPath),
            ProjectId = "unilostandfound"
        });
        Console.WriteLine("[Debug] Firebase Admin initialized successfully");
    }

    // Add services to the container.
    builder.Services.AddControllers(options =>
    {
        options.EnableEndpointRouting = false;
    }).AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
    });

    // Configure Swagger/OpenAPI
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo 
        { 
            Title = "UniLostAndFound API", 
            Version = "v1",
            Description = "API for University Lost and Found System"
        });
    });

    // Add Firestore Service with error handling
    builder.Services.AddSingleton<FirestoreService>(provider => 
    {
        try
        {
            var service = new FirestoreService(
                "unilostandfound",
                provider.GetRequiredService<ILogger<FirestoreService>>()
            );
            Console.WriteLine("[Debug] FirestoreService initialized successfully");
            return service;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Debug] Error initializing FirestoreService: {ex.Message}");
            throw;
        }
    });

    // Add CORS
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowNextJS",
            builder =>
            {
                builder.WithOrigins("http://localhost:3000")
                       .AllowAnyMethod()
                       .AllowAnyHeader()
                       .AllowCredentials();
            });
    });

    // Add these configurations
    builder.Services.Configure<FormOptions>(options =>
    {
        options.MultipartBodyLengthLimit = 10 * 1024 * 1024; // 10MB
    });

    var app = builder.Build();

    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "UniLostAndFound API V1");
            c.RoutePrefix = ""; // Serve Swagger UI at root
        });
    }

    app.UseCors("AllowNextJS");
    app.UseAuthorization();
    app.MapControllers();

    // Add this after other middleware configurations
    app.UseStaticFiles();

    Console.WriteLine("[Debug] Application configured successfully");
    app.Run();
}
catch (Exception ex)
{
    Console.WriteLine($"[Debug] Critical error during startup: {ex.Message}");
    Console.WriteLine($"[Debug] Stack trace: {ex.StackTrace}");
    throw;
}