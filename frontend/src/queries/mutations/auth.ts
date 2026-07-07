import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/queries/keys";
import { useStore } from "@/store";
import { toRemoteSettings } from "@/store/lib/settings-sync";
import { isUnmodifiedStarterDeck } from "@/store/lib/sync";
import { useHttpClient } from "@/store/services/http-client.context";
import {
  deletePendingEmailChange,
  patchUpdateCredentials,
  postCompleteProfile,
  postForgotPassword,
  postResendVerification,
  postResetPassword,
  postSignup,
  postVerifyEmail,
} from "@/store/services/requests/auth";
import { getLocalFolderSyncState } from "@/store/slices/sync";

export function useLoginMutation() {
  const client = useHttpClient();
  const login = useStore((state) => state.login);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "login"],
    mutationFn: (payload: Parameters<typeof login>[1]) =>
      login(client, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: authKeys.session(),
      });
    },
  });
}

export function useLogoutMutation() {
  const client = useHttpClient();
  const logout = useStore((state) => state.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "logout"],
    mutationFn: () => logout(client),
    onSuccess: () => {
      queryClient.setQueryData(authKeys.session(), null);
      void queryClient.invalidateQueries({
        queryKey: authKeys.session(),
      });
    },
  });
}

export function useDeleteAccountMutation() {
  const client = useHttpClient();
  const deleteAccount = useStore((state) => state.deleteAccount);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "delete-account"],
    mutationFn: () => deleteAccount(client),
    onSuccess: () => {
      queryClient.setQueryData(authKeys.session(), null);
      void queryClient.invalidateQueries({
        queryKey: authKeys.session(),
      });
    },
  });
}

export function useSignupMutation() {
  const client = useHttpClient();

  return useMutation({
    mutationKey: ["auth", "signup"],
    mutationFn: (payload: Parameters<typeof postSignup>[1]) =>
      postSignup(client, payload),
  });
}

export function useForgotPasswordMutation() {
  const client = useHttpClient();

  return useMutation({
    mutationKey: ["auth", "forgot-password"],
    mutationFn: (payload: Parameters<typeof postForgotPassword>[1]) =>
      postForgotPassword(client, payload),
  });
}

export function useResetPasswordMutation() {
  const client = useHttpClient();

  return useMutation({
    mutationKey: ["auth", "reset-password"],
    mutationFn: (payload: Parameters<typeof postResetPassword>[1]) =>
      postResetPassword(client, payload),
  });
}

export function useVerifyEmailMutation() {
  const client = useHttpClient();

  return useMutation({
    mutationKey: ["auth", "verify-email"],
    mutationFn: (payload: Parameters<typeof postVerifyEmail>[1]) =>
      postVerifyEmail(client, payload),
  });
}

export function useResendVerificationMutation() {
  const client = useHttpClient();

  return useMutation({
    mutationKey: ["auth", "resend-verification"],
    mutationFn: (payload: Parameters<typeof postResendVerification>[1]) =>
      postResendVerification(client, payload),
  });
}

type CompleteProfileOnboardingPayload = {
  username: string;
  uploadDecks: boolean;
  uploadSettings: boolean;
};

export function useCompleteProfileOnboardingMutation() {
  const client = useHttpClient();
  const queryClient = useQueryClient();
  const applyCompleteProfileResponse = useStore(
    (state) => state.applyCompleteProfileResponse,
  );
  const refreshSession = useStore((state) => state.refreshSession);
  const syncDecks = useStore((state) => state.syncDecks);
  const syncCampaigns = useStore((state) => state.syncCampaigns);

  return useMutation({
    mutationKey: ["auth", "complete-profile-onboarding"],
    mutationFn: async (payload: CompleteProfileOnboardingPayload) => {
      const response = await postCompleteProfile(
        client,
        getCompleteProfilePayload(payload),
      );

      applyCompleteProfileResponse(response);
      await refreshSession(client);
      void syncDecks(client).catch(console.error);
      void syncCampaigns(client).catch(console.error);
    },
    onSuccess: () => {
      queryClient.setQueryData(
        authKeys.session(),
        useStore.getState().auth.session,
      );
    },
  });
}

export function useUpdateCredentialsMutation() {
  const client = useHttpClient();
  const refreshSession = useStore((state) => state.refreshSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "update-credentials"],
    mutationFn: (payload: Parameters<typeof patchUpdateCredentials>[1]) =>
      patchUpdateCredentials(client, payload),
    onSuccess: async () => {
      await refreshSession(client);
      queryClient.setQueryData(
        authKeys.session(),
        useStore.getState().auth.session,
      );
    },
  });
}

export function useCancelPendingEmailChangeMutation() {
  const client = useHttpClient();
  const refreshSession = useStore((state) => state.refreshSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["auth", "cancel-pending-email-change"],
    mutationFn: () => deletePendingEmailChange(client),
    onSuccess: async () => {
      await refreshSession(client);
      queryClient.setQueryData(
        authKeys.session(),
        useStore.getState().auth.session,
      );
    },
  });
}

function getCompleteProfilePayload(payload: CompleteProfileOnboardingPayload) {
  const state = useStore.getState();
  const uploads = {
    decks: payload.uploadDecks ? getLocalDeckUploads() : undefined,
    campaigns: payload.uploadDecks ? getLocalCampaignUploads() : undefined,
    folders: getLocalFolderSyncState(state.data),
    settings: payload.uploadSettings
      ? toRemoteSettings(state.settings)
      : undefined,
    achievements: payload.uploadSettings ? state.achievements : undefined,
  };

  return {
    username: payload.username,
    uploads,
  };
}

function getLocalDeckUploads() {
  const state = useStore.getState();
  return Object.values(state.data.decks)
    .filter(
      (deck) => deck.source !== "account" && !isUnmodifiedStarterDeck(deck),
    )
    .map((deck) => ({
      ...deck,
      source: "account" as const,
    }));
}

function getLocalCampaignUploads() {
  const state = useStore.getState();
  return Object.values(state.data.campaigns);
}
