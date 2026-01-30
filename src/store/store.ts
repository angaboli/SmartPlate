import { configureStore } from '@reduxjs/toolkit';
import languageReducer from './slices/languageSlice';
import cookLaterReducer from './slices/cookLaterSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    language: languageReducer,
    cookLater: cookLaterReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
