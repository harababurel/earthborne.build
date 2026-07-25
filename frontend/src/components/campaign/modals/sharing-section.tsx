import type { Campaign } from "@earthborne-build/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, ClipboardCopyIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useStore } from "@/store";
import { selectSession } from "@/store/selectors/auth";
import { useHttpClient } from "@/store/services/http-client.context";
import {
  fetchCampaignVisibility,
  putCampaignVisibility,
} from "@/store/services/requests/campaigns";
import { publicCampaignUrl } from "@/utils/public-campaign-url";
import { useCopyToClipboard } from "@/utils/use-copy-to-clipboard";
import { Button } from "../../ui/button";
import { Checkbox } from "../../ui/checkbox";
import css from "./modals.module.css";

export function SharingSection({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation();
  const client = useHttpClient();
  const queryClient = useQueryClient();

  const session = useStore(selectSession);
  const syncItem = useStore(
    (state) => state.sync.campaigns.items[String(campaign.id)],
  );

  // Sharing reads the campaign from the server, so it only applies once the
  // campaign has actually been pushed to an account.
  const isSynced = !!session && syncItem?.version != null;
  const queryKey = ["campaign-visibility", String(campaign.id)];

  const visibility = useQuery({
    queryKey,
    queryFn: () => fetchCampaignVisibility(client, String(campaign.id)),
    enabled: isSynced,
  });

  const mutation = useMutation({
    mutationFn: (isPublic: boolean) =>
      putCampaignVisibility(client, String(campaign.id), isPublic),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  const isPublic = visibility.data?.public ?? false;

  const onCheckedChange = useCallback(
    (checked: boolean) => {
      if (checked && !confirm(t("campaign.settings.share_confirm"))) return;
      mutation.mutate(checked);
    },
    [mutation, t],
  );

  if (!isSynced) return null;

  return (
    <div className={css["field"]}>
      <span className={css["sub"]}>{t("campaign.settings.share")}</span>
      <Checkbox
        checked={isPublic}
        disabled={visibility.isPending || mutation.isPending}
        label={t("campaign.settings.share_label")}
        onCheckedChange={onCheckedChange}
      />
      <p className={css["note"]}>{t("campaign.settings.share_help")}</p>
      {!!visibility.error && (
        <p className={css["note"]}>{t("campaign.settings.share_error")}</p>
      )}
      {isPublic && <ShareUrl campaignId={String(campaign.id)} />}
    </div>
  );
}

function ShareUrl({ campaignId }: { campaignId: string }) {
  const { t } = useTranslation();
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  const url = publicCampaignUrl(campaignId);

  const onCopy = useCallback(() => {
    copyToClipboard(url);
  }, [copyToClipboard, url]);

  return (
    <div className={css["share-url"]}>
      <code className={css["share-url-value"]}>{url}</code>
      <Button onClick={onCopy} size="sm" variant="bare">
        {isCopied ? <CheckIcon /> : <ClipboardCopyIcon />}
        {isCopied ? t("ui.copy_to_clipboard_success") : t("deck_share.copy")}
      </Button>
    </div>
  );
}
