// API Configuration
export const API_CONFIG = {
  // 프록시 서버 URL (Railway 배포된 실제 URL)
  PROXY_SERVER_URL: 'https://memoya-proxy-production.up.railway.app',
  
  // 백업용 직접 API (프록시 서버 장애 시에만 사용)
  GEMINI_API_KEY: undefined,
  GEMINI_MODEL: 'gemini-1.5-flash-8b',
  
  // 프록시 서버 사용 활성화 (보안 강화)
  USE_PROXY: true
};