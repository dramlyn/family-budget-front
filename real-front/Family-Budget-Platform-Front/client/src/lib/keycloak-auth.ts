// Keycloak конфигурация и утилиты для аутентификации

export interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
}

export interface KeycloakToken {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  id_token?: string;
  'not-before-policy': number;
  session_state: string;
  scope: string;
}

export interface KeycloakUserInfo {
  sub: string;
  email_verified: boolean;
  name: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  email: string;
}

class KeycloakAuthService {
  private config: KeycloakConfig | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  init(config: KeycloakConfig) {
    this.config = config;
  }

  // Авторизация через Keycloak (перенаправление на страницу логина)
  login() {
    if (!this.config) {
      throw new Error("Keycloak не инициализирован");
    }

    const { url, realm, clientId } = this.config;
    const redirectUri = encodeURIComponent(window.location.origin);
    // Добавляем prompt=login для принудительного показа формы входа
    const authUrl = `${url}/realms/${realm}/protocol/openid-connect/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid&prompt=login`;
    
    window.location.href = authUrl;
  }

  // Обмен authorization code на токены
  async exchangeCodeForTokens(code: string, clientSecret: string): Promise<KeycloakToken> {
    if (!this.config) {
      throw new Error("Keycloak не инициализирован");
    }

    const { url, realm, clientId } = this.config;
    const tokenUrl = `${url}/realms/${realm}/protocol/openid-connect/token`;
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: window.location.origin,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ошибка получения токена: ${errorText}`);
    }

    const tokens: KeycloakToken = await response.json();
    this.saveTokens(tokens);
    this.startTokenRefresh(tokens.expires_in);
    
    return tokens;
  }

  // Обновление токена
  async refreshToken(): Promise<KeycloakToken | null> {
    if (!this.config) {
      throw new Error("Keycloak не инициализирован");
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return null;
    }

    const { url, realm, clientId } = this.config;
    const tokenUrl = `${url}/realms/${realm}/protocol/openid-connect/token`;
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error('Ошибка обновления токена');
      }

      const tokens: KeycloakToken = await response.json();
      this.saveTokens(tokens);
      this.startTokenRefresh(tokens.expires_in);
      
      return tokens;
    } catch (error) {
      this.clearTokens();
      return null;
    }
  }

  // Получение информации о пользователе
  async getUserInfo(): Promise<KeycloakUserInfo | null> {
    if (!this.config) {
      throw new Error("Keycloak не инициализирован");
    }

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      return null;
    }

    const { url, realm } = this.config;
    const userInfoUrl = `${url}/realms/${realm}/protocol/openid-connect/userinfo`;

    try {
      const response = await fetch(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Ошибка получения информации о пользователе');
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  // Выход из системы
  async logout() {
    if (!this.config) {
      throw new Error("Keycloak не инициализирован");
    }

    const { url, realm, clientId } = this.config;
    const refreshToken = localStorage.getItem('refreshToken');
    
    // Отзываем токены на сервере
    if (refreshToken) {
      const logoutUrl = `${url}/realms/${realm}/protocol/openid-connect/logout`;
      const params = new URLSearchParams({
        client_id: clientId,
        refresh_token: refreshToken,
      });

      try {
        await fetch(logoutUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        });
      } catch (error) {
        console.error('Ошибка при выходе:', error);
      }
    }

    this.clearTokens();
  }

  // Проверка авторизации пользователя
  isAuthenticated(): boolean {
    const accessToken = localStorage.getItem('accessToken');
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    
    if (!accessToken || !expiresAt) {
      return false;
    }

    return Date.now() < parseInt(expiresAt);
  }

  // Получение текущего токена доступа
  getAccessToken(): string | null {
    if (!this.isAuthenticated()) {
      return null;
    }
    return localStorage.getItem('accessToken');
  }

  // Сохранение токенов
  private saveTokens(tokens: KeycloakToken) {
    localStorage.setItem('accessToken', tokens.access_token);
    localStorage.setItem('refreshToken', tokens.refresh_token);
    localStorage.setItem('tokenExpiresAt', (Date.now() + tokens.expires_in * 1000).toString());
  }

  // Очистка токенов
  private clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiresAt');
    localStorage.removeItem('currentUser');
    
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  // Автоматическое обновление токена
  private startTokenRefresh(expiresIn: number) {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    // Обновляем токен за 30 секунд до истечения
    const refreshTime = (expiresIn - 30) * 1000;
    
    this.tokenRefreshTimer = setTimeout(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Ошибка автоматического обновления токена:', error);
        this.clearTokens();
      }
    }, refreshTime);
  }
}

export const keycloakAuth = new KeycloakAuthService();