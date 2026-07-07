import { PATTERN_VALID_USERNAME } from "@earthborne-build/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { useCompleteProfileOnboardingMutation } from "@/queries/mutations/auth";
import { useStore } from "@/store";
import { AuthForm } from "./auth-form";
import { AuthLayout } from "./auth-layout";
import css from "./complete-signup.module.css";
import { ErrorBox } from "./error-box";
import { errorMapper } from "./helpers";

function CompleteSignup() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const session = useStore((state) => state.auth.session);
  const authStatus = useStore((state) => state.auth.status);
  const isLoading = authStatus === "loading";

  const hasLocalData = useStore(selectHasLocalData);

  const completeProfileOnboardingMutation =
    useCompleteProfileOnboardingMutation();

  const [username, setUsername] = useState("");
  const [uploadData, setUploadData] = useState(hasLocalData);
  const [uploadSettings, setUploadSettings] = useState(true);

  const onSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault();
    await completeProfileOnboardingMutation.mutateAsync({
      username,
      uploadDecks: hasLocalData && uploadData,
      uploadSettings,
    });
    navigate("/");
  };

  if (isLoading) {
    return <AuthLayout title={t("auth.signup.complete_profile.title")} />;
  }

  if (!session) {
    navigate("~/auth/login");
    return null;
  }

  if (session.account.profileComplete) {
    navigate("~/");
    return null;
  }

  return (
    <AuthLayout
      title={t("auth.signup.complete_profile.title")}
      description={t("auth.signup.complete_profile.description")}
    >
      <AuthForm onSubmit={onSubmit}>
        {completeProfileOnboardingMutation.error && (
          <ErrorBox>
            {errorMapper(
              completeProfileOnboardingMutation.error,
              t,
              "auth.errors.signup_failed",
            )}
          </ErrorBox>
        )}

        <Field full helpText={t("auth.username_validation")}>
          <FieldLabel htmlFor="username">{t("auth.username")}</FieldLabel>
          <input
            autoComplete="username"
            disabled={completeProfileOnboardingMutation.isPending}
            id="username"
            maxLength={64}
            minLength={3}
            pattern={PATTERN_VALID_USERNAME}
            required
            onChange={(e) => setUsername(e.target.value)}
            type="text"
            value={username}
          />
        </Field>

        <section className={css["wrapper"]}>
          <h3>{t("auth.signup.complete_profile.upload.title")}</h3>
          {hasLocalData && (
            <Field
              bordered
              helpText={t("auth.signup.complete_profile.upload.decks.help")}
            >
              <Checkbox
                checked={uploadData}
                data-testid="upload-decks"
                disabled={completeProfileOnboardingMutation.isPending}
                id="upload-decks"
                label={t("auth.signup.complete_profile.upload.decks.label")}
                onCheckedChange={setUploadData}
              />
            </Field>
          )}

          <Field
            bordered
            helpText={t("auth.signup.complete_profile.upload.settings.help")}
          >
            <Checkbox
              checked={uploadSettings}
              disabled={completeProfileOnboardingMutation.isPending}
              id="upload-settings"
              label={t("auth.signup.complete_profile.upload.settings.label")}
              onCheckedChange={setUploadSettings}
            />
          </Field>
        </section>

        <Button
          disabled={completeProfileOnboardingMutation.isPending}
          type="submit"
          variant="primary"
          size="full"
        >
          {t("auth.signup.complete_profile.title")}
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}

function selectHasLocalData(state: ReturnType<typeof useStore.getState>) {
  const hasDecks = Object.values(state.data.decks).some(
    (deck) => deck.source !== "account",
  );
  const hasCampaigns = Object.keys(state.data.campaigns).length > 0;
  return hasDecks || hasCampaigns;
}

export default CompleteSignup;
