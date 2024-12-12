using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UniLostAndFound.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCreatedAtDefaultValue : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "UserAccess",
                type: "datetime(6)",
                nullable: false,
                defaultValueSql: "CONVERT_TZ(CURRENT_TIMESTAMP(6), '+00:00', '+08:00')",
                oldClrType: typeof(DateTime),
                oldType: "datetime(6)",
                oldDefaultValueSql: "CURRENT_TIMESTAMP(6)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "UserAccess",
                type: "datetime(6)",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP(6)",
                oldClrType: typeof(DateTime),
                oldType: "datetime(6)",
                oldDefaultValueSql: "CONVERT_TZ(CURRENT_TIMESTAMP(6), '+00:00', '+08:00')");
        }
    }
}
