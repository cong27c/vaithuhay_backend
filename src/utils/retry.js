// utils/retry.js
async function retryOperation(operation, maxRetries = 3, delay = 5000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Thử lại lần ${attempt}/${maxRetries}...`);
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        console.log(`⏳ Chờ ${delay / 1000}s trước khi thử lại...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        // Tăng delay cho lần sau (exponential backoff)
        delay *= 2;
      }
    }
  }

  console.error(`❌ Thất bại sau ${maxRetries} lần thử:`, lastError.message);
  throw lastError;
}

module.exports = { retryOperation };
