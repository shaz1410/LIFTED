using Lifted.Api.Data;
using Lifted.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Lifted.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly LiftedDbContext _db;

    public TransactionsController(LiftedDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BusinessTransaction>>> GetAll()
    {
        var transactions = await _db.Transactions
            .OrderByDescending(t => t.TransactionDate)
            .ToListAsync();

        return Ok(transactions);
    }

    [HttpPost]
    public async Task<ActionResult<BusinessTransaction>> Create(
        BusinessTransaction transaction)
    {
        var type = transaction.Type.Trim();

        if (type is not ("Sale" or "Expense"))
        {
            return BadRequest(new
            {
                message = "Type must be Sale or Expense."
            });
        }

        transaction.Type = type;
        transaction.Description = transaction.Description.Trim();
        transaction.Category = transaction.Category.Trim();

        if (string.IsNullOrWhiteSpace(transaction.Description) ||
            string.IsNullOrWhiteSpace(transaction.Category))
        {
            return BadRequest(new
            {
                message = "Description and category are required."
            });
        }

        transaction.Id = 0;
        transaction.CreatedAt = DateTime.UtcNow;

        _db.Transactions.Add(transaction);
        await _db.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetAll),
            new { id = transaction.Id },
            transaction);
    }
}
