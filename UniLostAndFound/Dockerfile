FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy the csproj and restore dependencies
COPY ["UniLostAndFound.API/UniLostAndFound.API.csproj", "UniLostAndFound.API/"]
RUN dotnet restore "UniLostAndFound.API/UniLostAndFound.API.csproj"

# Copy the rest of the code
COPY . .
WORKDIR "/src/UniLostAndFound.API"

# Build and Publish
RUN dotnet publish "UniLostAndFound.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
EXPOSE 8080

# Install libgdiplus just in case System.Drawing.Common needs it for your QRCoder
RUN apt-get update \
    && apt-get install -y libgdiplus libc6-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "UniLostAndFound.API.dll"]
