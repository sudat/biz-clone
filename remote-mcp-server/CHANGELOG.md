# Change Log

## [1.0.1] - 2025-07-01

### 🐛 Bug Fixes

- **Prisma Client Initialization**: Fixed "Received an instance of Object" error in Cloudflare Workers environment
  - Root cause: PrismaPg adapter was receiving Pool object instead of connection configuration object
  - Solution: Updated to pass connection configuration object directly to PrismaPg adapter
  - Files changed: `lib/database/prisma.ts`

### 🔧 Technical Improvements

- **Type Safety**: Added robust type checking and conversion for DATABASE_URL environment variable
- **Debug Logging**: Enhanced debugging output for troubleshooting connection issues
- **Error Handling**: Improved error messages for Prisma initialization failures

### 📚 Documentation

- **README.md**: Added comprehensive troubleshooting section for Prisma-related issues
- **README.md**: Added technical details section explaining correct Prisma setup for Cloudflare Workers
- **README.md**: Enhanced debugging and monitoring instructions

### 🔍 Investigation Findings

- Cloudflare Workers environment requires specific PrismaPg adapter configuration
- DATABASE_URL type conversion is critical for proper Prisma initialization
- Abnormal secret naming conventions can cause configuration issues
- Direct connection configuration is more reliable than Pool object instantiation

---

## [1.0.0] - 2024-12-XX

### ✨ Initial Release

- GitHub OAuth authentication
- Cloudflare Workers deployment
- Basic accounting tools (accounts, journals, trial balance)
- D1 database integration
