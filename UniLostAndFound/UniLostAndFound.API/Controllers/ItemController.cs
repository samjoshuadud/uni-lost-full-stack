using Microsoft.AspNetCore.Mvc;
using UniLostAndFound.API.Models;
using UniLostAndFound.API.DTOs;
using UniLostAndFound.API.Services;
using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace UniLostAndFound.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ItemController : ControllerBase
{
    private readonly FirestoreService _firestoreService;
    private readonly ILogger<ItemController> _logger;

    public ItemController(FirestoreService firestoreService, ILogger<ItemController> logger)
    {
        _firestoreService = firestoreService;
        _logger = logger;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult> CreateItem([FromForm] CreateItemDto createDto)
    {
        try
        {
            _logger.LogInformation($"Received form data: {System.Text.Json.JsonSerializer.Serialize(new
            {
                createDto.Name,
                createDto.Description,
                createDto.Location,
                createDto.Category,
                createDto.Status,
                createDto.ReporterId,
                createDto.StudentId,
                createDto.UniversityId,
                HasImage = createDto.Image != null
            })}");
            
            string imageUrl = string.Empty;
            
            if (createDto.Image != null)
            {
                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(createDto.Image.FileName)}";
                var uploadsPath = Path.GetFullPath(Path.Combine(
                    Directory.GetCurrentDirectory(),
                    "..",
                    "..",
                    "frontend",
                    "public",
                    "uploads"
                ));

                Directory.CreateDirectory(uploadsPath);
                var filePath = Path.Combine(uploadsPath, fileName);
                
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await createDto.Image.CopyToAsync(stream);
                }
                
                imageUrl = $"/uploads/{fileName}";
            }

            List<UniLostAndFound.API.Models.AdditionalDescription> additionalDescriptions;
            if (!string.IsNullOrEmpty(createDto.AdditionalDescriptions))
            {
                _logger.LogInformation($"Received additional descriptions: {createDto.AdditionalDescriptions}");
                var dtoDescriptions = JsonSerializer.Deserialize<List<UniLostAndFound.API.DTOs.AdditionalDescription>>(
                    createDto.AdditionalDescriptions,
                    new JsonSerializerOptions 
                    { 
                        PropertyNameCaseInsensitive = true 
                    }
                ) ?? new List<UniLostAndFound.API.DTOs.AdditionalDescription>();

                // Convert DTO to Model
                additionalDescriptions = dtoDescriptions.Select(dto => new UniLostAndFound.API.Models.AdditionalDescription
                {
                    Title = dto.Title,
                    Description = dto.Description
                }).ToList();
            }
            else
            {
                additionalDescriptions = new List<UniLostAndFound.API.Models.AdditionalDescription>();
            }

            _logger.LogInformation($"Deserialized {additionalDescriptions.Count} additional descriptions");

            var now = DateTime.UtcNow;

            var item = new Item
            {
                Name = createDto.Name,
                Description = createDto.Description,
                Category = createDto.Category,
                Status = createDto.Status,
                Location = createDto.Location,
                DateReported = now,
                ReporterId = createDto.ReporterId,
                StudentId = createDto.StudentId,
                UniversityId = createDto.UniversityId,
                Approved = false,
                VerificationQuestions = new List<string>(),
                ImageUrl = imageUrl,
                AdditionalDescriptions = additionalDescriptions,
                CreatedAt = now,
                UpdatedAt = now
            };

            _logger.LogInformation($"Creating item: {System.Text.Json.JsonSerializer.Serialize(item)}");

            var id = await _firestoreService.CreateItemAsync(item);
            return Ok(new { id });
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error creating item: {ex.Message}");
            if (ex is JsonException)
            {
                _logger.LogError("JSON deserialization error details: " + ex.ToString());
            }
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Item>> GetItem(string id)
    {
        var item = await _firestoreService.GetItemAsync(id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    [HttpGet("university/{universityId}")]
    public async Task<ActionResult<List<Item>>> GetUniversityItems(string universityId)
    {
        var items = await _firestoreService.GetItemsByUniversityAsync(universityId);
        return Ok(items);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateItem(string id, [FromBody] UpdateItemDto updateDto)
    {
        var existingItem = await _firestoreService.GetItemAsync(id);
        if (existingItem == null) return NotFound();

        if (updateDto.Status != null && !IsValidStatus(updateDto.Status))
        {
            return BadRequest("Invalid status value");
        }

        if (updateDto.Name != null) existingItem.Name = updateDto.Name;
        if (updateDto.Description != null) existingItem.Description = updateDto.Description;
        if (updateDto.Category != null) existingItem.Category = updateDto.Category;
        if (updateDto.Status != null) existingItem.Status = updateDto.Status;
        if (updateDto.Location != null) existingItem.Location = updateDto.Location;
        if (updateDto.Approved.HasValue) existingItem.Approved = updateDto.Approved.Value;
        if (updateDto.VerificationQuestions != null) existingItem.VerificationQuestions = updateDto.VerificationQuestions;

        await _firestoreService.UpdateItemAsync(id, existingItem);
        return NoContent();
    }

    private bool IsValidStatus(string status)
    {
        return status == ItemStatus.Lost ||
               status == ItemStatus.Found ||
               status == ItemStatus.InVerification ||
               status == ItemStatus.PendingRetrieval ||
               status == ItemStatus.HandedOver;
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteItem(string id)
    {
        await _firestoreService.DeleteItemAsync(id);
        return NoContent();
    }
} 