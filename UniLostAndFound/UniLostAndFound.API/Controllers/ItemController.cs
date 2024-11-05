using Microsoft.AspNetCore.Mvc;
using UniLostAndFound.API.Models;
using UniLostAndFound.API.DTOs;

namespace UniLostAndFound.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ItemController : ControllerBase
{
    private static List<Item> _items = new(); // Temporary in-memory storage

    [HttpGet]
    public ActionResult<IEnumerable<ItemDto>> GetItems()
    {
        var itemDtos = _items.Select(item => new ItemDto
        {
            Id = item.Id,
            Name = item.Name,
            Description = item.Description,
            Location = item.Location,
            Category = item.Category,
            Status = item.Status,
            ReportedBy = item.ReportedBy,
            Approved = item.Approved,
            VerificationQuestions = item.VerificationQuestions,
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt
        });

        return Ok(itemDtos);
    }

    [HttpPost]
    public ActionResult<ItemDto> CreateItem(CreateItemDto createItemDto)
    {
        var item = new Item
        {
            Id = Guid.NewGuid().ToString(),
            Name = createItemDto.Name,
            Description = createItemDto.Description,
            Location = createItemDto.Location,
            Category = createItemDto.Category,
            Status = createItemDto.Status,
            CreatedAt = DateTime.UtcNow
        };

        _items.Add(item);

        return CreatedAtAction(nameof(GetItems), new { id = item.Id }, item);
    }
} 