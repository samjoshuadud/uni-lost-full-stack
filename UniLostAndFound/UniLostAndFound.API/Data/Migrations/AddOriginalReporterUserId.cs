using Microsoft.EntityFrameworkCore.Migrations;

public partial class AddOriginalReporterUserId : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "OriginalReporterUserId",
            table: "PendingProcesses",
            type: "text",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "OriginalReporterUserId",
            table: "PendingProcesses");
    }
} 