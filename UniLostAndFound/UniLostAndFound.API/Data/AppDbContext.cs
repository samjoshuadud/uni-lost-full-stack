using Microsoft.EntityFrameworkCore;
using UniLostAndFound.API.Models;

namespace UniLostAndFound.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Item> Items { get; set; }
    public DbSet<PendingProcess> PendingProcesses { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<AdditionalDescription> AdditionalDescriptions { get; set; }
    public DbSet<UserAccess> UserAccess { get; set; }
    public DbSet<VerificationQuestion> VerificationQuestions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<UserAccess>(entity =>
        {
            entity.Property(e => e.Type)
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired();
            entity.Property(e => e.Value)
                .HasMaxLength(255)
                .IsRequired();
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<Item>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(255);
            entity.Property(e => e.Category).HasMaxLength(50);
            entity.Property(e => e.Status).HasMaxLength(50);
            entity.Property(e => e.Location).HasMaxLength(255);
            entity.Property(e => e.ImageUrl).HasMaxLength(2048);
            entity.Property(e => e.StudentId).HasMaxLength(50);

            entity.HasOne(e => e.Reporter)
                .WithMany(u => u.ReportedItems)
                .HasForeignKey(e => e.ReporterId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).HasMaxLength(255);
            entity.Property(e => e.DisplayName).HasMaxLength(255);
            entity.Property(e => e.StudentId).HasMaxLength(50);
        });

        modelBuilder.Entity<AdditionalDescription>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255);

            entity.HasOne(e => e.Item)
                .WithMany(i => i.AdditionalDescriptions)
                .HasForeignKey(e => e.ItemId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PendingProcess>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.status).HasMaxLength(50);

            entity.HasOne(e => e.Item)
                .WithMany()
                .HasForeignKey(e => e.ItemId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                .WithMany(u => u.PendingProcesses)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.RequestorUser)
                .WithMany()
                .HasForeignKey(e => e.RequestorUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<VerificationQuestion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Question).IsRequired();
            entity.Property(e => e.ProcessId).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Process)
                .WithMany()
                .HasForeignKey(e => e.ProcessId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
