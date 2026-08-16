const TOKEN_URL = "https://portail-api.meteofrance.fr/token";
const API_ORIGIN = "https://public-api.meteofrance.fr";

let tokenCache = {
  accessToken: null,
  expiresAt: 0
};

function getApplicationId() {
  const value = process.env.METEO_FRANCE_APPLICATION_ID;
  if (!value) {
    const error = new Error("METEO_FRANCE_APPLICATION_ID is not configured");
    error.code = "METEO_FRANCE_NOT_CONFIGURED";
    throw error;
  }
  return value;
}

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt - 60_000 > now) {
    return tokenCache.accessToken;
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${getApplicationId()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Meteo-France token request failed (${response.status})`);
    error.code = "METEO_FRANCE_AUTH_FAILED";
    error.status = response.status;
    error.details = body.slice(0, 500);
    throw error;
  }

  const data = await response.json();
  if (!data.access_token) {
    const error = new Error("Meteo-France token response did not contain access_token");
    error.code = "METEO_FRANCE_AUTH_INVALID";
    throw error;
  }

  const expiresInSeconds = Number(data.expires_in) || 3600;
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + expiresInSeconds * 1000
  };

  return tokenCache.accessToken;
}

async function meteoFranceFetch(path, options = {}) {
  if (!String(path).startsWith("/public/")) {
    throw new Error("Refusing non-public Meteo-France API path");
  }

  const token = await getAccessToken();
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...options,
    headers: {
      "Accept": "application/json",
      ...(options.headers || {}),
      "Authorization": `Bearer ${token}`
    }
  });

  if (response.status === 401) {
    tokenCache = { accessToken: null, expiresAt: 0 };
  }

  return response;
}

function publicError(error) {
  if (error && error.code === "METEO_FRANCE_NOT_CONFIGURED") {
    return { status: 503, code: error.code, message: "Meteo-France credentials are not configured on the backend." };
  }
  if (error && String(error.code || "").startsWith("METEO_FRANCE_AUTH")) {
    return { status: 502, code: error.code, message: "Meteo-France authentication failed." };
  }
  return { status: 500, code: "INTERNAL_ERROR", message: "Unexpected backend error." };
}

module.exports = {
  getAccessToken,
  meteoFranceFetch,
  publicError
};
