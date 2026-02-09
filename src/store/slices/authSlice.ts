import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'editor' | 'admin';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isHydrated: false,
  loading: false,
  error: null,
};

export const registerUser = createAsyncThunk(
  'auth/register',
  async (
    input: { email: string; password: string; name: string },
    { rejectWithValue },
  ) => {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return rejectWithValue(data.error || 'Registration failed');
    return data;
  },
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (
    input: { email: string; password: string },
    { rejectWithValue },
  ) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) return rejectWithValue(data.error || 'Login failed');
    return data;
  },
);

export const refreshTokens = createAsyncThunk(
  'auth/refresh',
  async (refreshToken: string, { rejectWithValue }) => {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (!res.ok) return rejectWithValue(data.error || 'Token refresh failed');
    return data;
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.error = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth');
        syncAccessTokenCookie(null);
      }
    },
    hydrateAuth(
      state,
      action: PayloadAction<{
        user: AuthUser;
        accessToken: string;
        refreshToken: string;
      }>,
    ) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isHydrated = true;
      syncAccessTokenCookie(action.payload.accessToken);
    },
    markHydrated(state) {
      state.isHydrated = true;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Register
    builder.addCase(registerUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(registerUser.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.accessToken = action.payload.tokens.accessToken;
      state.refreshToken = action.payload.tokens.refreshToken;
      persistAuth(state);
    });
    builder.addCase(registerUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Login
    builder.addCase(loginUser.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginUser.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.accessToken = action.payload.tokens.accessToken;
      state.refreshToken = action.payload.tokens.refreshToken;
      persistAuth(state);
    });
    builder.addCase(loginUser.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Refresh
    builder.addCase(refreshTokens.fulfilled, (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      persistAuth(state);
    });
    builder.addCase(refreshTokens.rejected, (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth');
        syncAccessTokenCookie(null);
      }
    });
  },
});

function syncAccessTokenCookie(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    // Use 24h to match JWT access token expiry
    document.cookie = `accessToken=${token}; path=/; max-age=${24 * 60 * 60}; samesite=lax`;
  } else {
    document.cookie = 'accessToken=; path=/; max-age=0; samesite=lax';
  }
}

function persistAuth(state: AuthState) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(
      'auth',
      JSON.stringify({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    );
    syncAccessTokenCookie(state.accessToken);
  }
}

export const { logout, hydrateAuth, markHydrated, clearError } = authSlice.actions;
export default authSlice.reducer;
