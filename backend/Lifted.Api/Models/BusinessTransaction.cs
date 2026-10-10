using System.ComponentModel.DataAnnotations;

namespace Lifted.Api.Models;

public class BusinessTransaction
{
    public int Id { get; set; }

    [Required]
    [MaxLength(20)]
    public string Type { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(60)]
    public string Category { get; set; } = string.Empty;

    [Range(typeof(decimal), "0.01", "999999999")]
    public decimal Amount { get; set; }

    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
