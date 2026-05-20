import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import type { SettingProps } from "./types";

export function MiniRoleArtSetting(props: SettingProps) {
  const { settings, setSettings } = props;
  const { t } = useTranslation();

  const onCheckedChange = useCallback(
    (val: boolean | string) => {
      setSettings((settings) => ({
        ...settings,
        useMiniRoleArt: !!val,
      }));
    },
    [setSettings],
  );

  return (
    <Field bordered helpText={t("settings.display.mini_role_art_help")}>
      <Checkbox
        checked={settings.useMiniRoleArt}
        data-testid="mini-role-art"
        id="mini-role-art"
        label={t("settings.display.mini_role_art")}
        name="mini-role-art"
        onCheckedChange={onCheckedChange}
      />
    </Field>
  );
}
