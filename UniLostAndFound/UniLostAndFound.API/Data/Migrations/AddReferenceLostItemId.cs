using Microsoft.EntityFrameworkCore.Migrations;

public partial class AddReferenceLostItemId : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "ReferenceLostItemId",
            table: "PendingProcesses",
            type: "text",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "ReferenceLostItemId",
            table: "PendingProcesses");
    }
} 