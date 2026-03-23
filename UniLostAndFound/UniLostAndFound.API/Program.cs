// Program.cs
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi.Models;
using Microsoft.IdentityModel.Tokens;
using UniLostAndFound.API.Services;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using UniLostAndFound.API.Data;
using UniLostAndFound.API.Repositories;
using UniLostAndFound.API.Services.BackgroundServices;
using UniLostAndFound.API.Models;

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
        options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

    // Register Repositories
    builder.Services.AddScoped<IItemRepository, ItemRepository>();
    builder.Services.AddScoped<IPendingProcessRepository, PendingProcessRepository>();
    builder.Services.AddScoped<IUserAccessRepository, UserAccessRepository>();
    builder.Services.AddScoped(typeof(IBaseRepository<>), typeof(BaseRepository<>));

    // Register Services in this order
    builder.Services.AddScoped<PendingProcessService>();  // Register this first
    builder.Services.AddScoped<ItemService>();  // Then this
    builder.Services.AddScoped<UserService>();
    builder.Services.AddScoped<UserAccessService>();
    builder.Services.AddScoped<AdminService>();

    // Configure forwarded headers so ASP.NET Core correctly reads X-Forwarded-Proto
    // and X-Forwarded-For sent by Azure App Service's reverse proxy.  Without this
    // the app sees all requests as plain HTTP even when the client used HTTPS.
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders =
            ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        // Azure App Service's internal proxy IP is dynamic and not predictable,
        // so we clear the known-networks/proxies allowlists to trust any forwarded
        // address.  This is the documented approach for Azure App Service
        // (https://learn.microsoft.com/aspnet/core/host-and-deploy/proxy-load-balancer).
        // The application is protected from external header spoofing by Azure's
        // network boundary; however, if you expose the app outside Azure's managed
        // infrastructure you should restrict this to the specific proxy address.
        options.KnownNetworks.Clear();
        options.KnownProxies.Clear();
    });

    // Add CORS
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowNextJS",
            corsBuilder =>
            {
                var allowedOrigins = (builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>())
                    .Where(origin => !string.IsNullOrWhiteSpace(origin))
                    .ToList();

                // Supports Azure App Settings using a single CSV value.
                var allowedOriginsCsv = builder.Configuration["Cors:AllowedOriginsCsv"];
                if (!string.IsNullOrWhiteSpace(allowedOriginsCsv))
                {
                    allowedOrigins.AddRange(
                        allowedOriginsCsv
                            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
                    );
                }

                var distinctOrigins = allowedOrigins
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();

                if (distinctOrigins.Length == 0)
                {
                    throw new InvalidOperationException(
                        "No CORS origins configured. Set Cors:AllowedOrigins or Cors:AllowedOriginsCsv.");
                }

                corsBuilder.WithOrigins(distinctOrigins)
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

    // Add these lines where you register other services
    builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
    builder.Services.AddScoped<IEmailService, EmailService>();

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

    // Trust X-Forwarded-Proto / X-Forwarded-For from Azure's reverse proxy.
    // Must be called before any middleware that depends on the request scheme.
    app.UseForwardedHeaders();

    // Redirect plain HTTP to HTTPS in production.  Azure App Service terminates
    // TLS and forwards HTTP internally, but if a request somehow arrives over
    // plain HTTP this ensures it is upgraded.
    if (!app.Environment.IsDevelopment())
    {
        app.UseHttpsRedirection();
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
