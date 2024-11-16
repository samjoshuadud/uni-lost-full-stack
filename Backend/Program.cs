// Add at the top of your Program.cs
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalhost", builder =>
    {
        builder
            .WithOrigins("http://localhost:3000") // Your React frontend URL
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

// Add before app.UseAuthorization()
app.UseCors("AllowLocalhost"); 