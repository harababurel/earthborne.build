import { PATTERN_VALID_USERNAME } from "@earthborne-build/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast.hooks";
import { ErrorBox } from "@/pages/auth/error-box";
import { usePatchProfileMutation } from "@/queries/mutations/profile";
import { useStore } from "@/store";
import { Section } from "./section";
import css from "./settings.module.css";

export function AccountProfile() {
  const { t } = useTranslation();
  const toast = useToast();
  const patchProfileMutation = usePatchProfileMutation();
  const session = useStore((state) => state.auth.session);
  const [username, setUsername] = useState(session?.account.name ?? "");

  const onSave = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    const toastId = toast.show({
      children: t("settings.account.profile.saving"),
      variant: "loading",
    });

    try {
      await patchProfileMutation.mutateAsync({ username: username.trim() });
      toast.dismiss(toastId);
    } catch {
      toast.dismiss(toastId);
    }
  };

  return (
    <Section title={t("settings.account.profile.title")}>
      <form className={css["account-container"]} onSubmit={onSave}>
        {patchProfileMutation.error && (
          <ErrorBox>{patchProfileMutation.error.message}</ErrorBox>
        )}
        <Field full helpText={t("settings.account.profile.username_help")}>
          <FieldLabel htmlFor="profile-username">
            {t("settings.account.profile.username")}
          </FieldLabel>
          <input
            autoComplete="username"
            disabled={patchProfileMutation.isPending}
            id="profile-username"
            maxLength={64}
            minLength={3}
            onChange={(e) => setUsername(e.target.value)}
            pattern={PATTERN_VALID_USERNAME}
            required
            type="text"
            value={username}
          />
        </Field>
        <Button
          disabled={patchProfileMutation.isPending}
          type="submit"
          variant="secondary"
        >
          {t("settings.account.profile.save")}
        </Button>
      </form>
    </Section>
  );
}
