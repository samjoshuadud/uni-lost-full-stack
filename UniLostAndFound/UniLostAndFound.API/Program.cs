// Program.cs
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi.Models;
using Microsoft.IdentityModel.Tokens;
using UniLostAndFound.API.Services;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using UniLostAndFound.API.Data;
using UniLostAndFound.API.Repositories;
using UniLostAndFound.API.Services;

var builder = WebApplication.CreateBuilder(args);

try
{
    // Add services to the container.
    builder.Services.AddControllers()
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.Preserve;
            options.JsonSerializerOptions.MaxDepth = 64;
        });
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

    // Add MySQL DbContext
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseMySql(connectionString, 
            new MySqlServerVersion(new Version(10, 4, 32)),
            mySqlOptions => mySqlOptions.EnableRetryOnFailure()));

    // Register Repositories
    builder.Services.AddScoped<IItemRepository, ItemRepository>();
    builder.Services.AddScoped<IPendingProcessRepository, PendingProcessRepository>();
    builder.Services.AddScoped<IUserAccessRepository, UserAccessRepository>();
    builder.Services.AddScoped(typeof(IBaseRepository<>), typeof(BaseRepository<>));

    // Register Services
    builder.Services.AddScoped<ItemService>();
    builder.Services.AddScoped<PendingProcessService>();
    builder.Services.AddScoped<UserService>();
    builder.Services.AddScoped<UserAccessService>();
    builder.Services.AddScoped<AdminService>();

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

    // Configure file upload limits
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
            c.RoutePrefix = string.Empty; // Serve Swagger UI at root
        });
    }

    app.UseCors("AllowNextJS");
    app.UseAuthorization();
    app.MapControllers();
    app.UseStaticFiles();

    app.Run();
}
catch (Exception ex)
{
    Console.WriteLine($"[Debug] Critical error during startup: {ex.Message}");
    Console.WriteLine($"[Debug] Stack trace: {ex.StackTrace}");
    throw;
}

