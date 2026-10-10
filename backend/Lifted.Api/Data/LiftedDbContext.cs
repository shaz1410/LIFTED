using Lifted.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Lifted.Api.Data;

public class LiftedDbContext : DbContext
{
    public LiftedDbContext(DbContextOptions<LiftedDbContext> options)
        : base(options)
    {
    }

    public DbSet<BusinessTransaction> Transactions =>
        Set<BusinessTransaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<BusinessTransaction>(entity =>
        {
            entity.ToTable("transactions");
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Amount).HasPrecision(18, 2);
            entity.Property(t => t.Type).IsRequired().HasMaxLength(20);
            entity.Property(t => t.Description).IsRequired().HasMaxLength(100);
            entity.Property(t => t.Category).IsRequired().HasMaxLength(60);
        });
    }
}
