import type { SessionResponse } from "@earthborne-build/shared";
import { Redirect } from "wouter";
import { useStore } from "@/store";
import { AccountEmail } from "./account-email";
import { AccountPrivacy } from "./account-privacy";
import { AccountProfile } from "./account-profile";
import css from "./settings.module.css";

export function AccountSettings({
  session,
}: {
  session: SessionResponse | null;
}) {
  const sessionInitialized = useStore((state) => state.ui.sessionInitialized);

  if (!session) {
    return sessionInitialized ? (
      <Redirect
        to={`/auth/login?redirect=${encodeURIComponent("/settings?tab=account")}`}
      />
    ) : null;
  }

  return (
    <>
      <div className={css["row"]}>
        <AccountProfile />
        <AccountEmail />
      </div>
      <div className={css["row"]}>
        <AccountPrivacy />
        <SectionSpacer />
      </div>
    </>
  );
}

function SectionSpacer() {
  return <div aria-hidden="true" />;
}
