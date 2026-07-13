import type { RangersDbDeck } from "@earthborne-build/shared";
import {
  CalendarIcon,
  CheckIcon,
  CircleAlertIcon,
  CloudDownloadIcon,
  HeartIcon,
  LoaderCircleIcon,
  MessageCircleIcon,
  TriangleAlertIcon,
  UserRoundIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useDialogContextChecked } from "@/components/ui/dialog.hooks";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  DefaultModalContent,
  Modal,
  ModalActions,
  ModalBackdrop,
  ModalInner,
} from "@/components/ui/modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/store";
import {
  parseRangersDbDeckId,
  parseRangersDbDeckText,
  type RangersDbImportIssue,
  type RangersDbImportResult,
  rangersDbDeckToImport,
} from "@/store/lib/rangersdb-import";
import { queryRangersDbDeck } from "@/store/services/queries";
import { ApiError } from "@/store/services/requests/shared";
import { formatDate } from "@/utils/formatting";
import css from "./rangersdb-import.module.css";

export function RangersDbImport() {
  const { t } = useTranslation();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button data-testid="collection-rangersdb-import" size="sm">
          <CloudDownloadIcon />
          {t("deck_collection.rangersdb.button")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <RangersDbImportModal />
      </DialogContent>
    </Dialog>
  );
}

function RangersDbImportModal() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("url");

  return (
    <Modal data-testid="rangersdb-import-modal">
      <ModalBackdrop />
      <ModalInner size="46rem">
        <ModalActions />
        <DefaultModalContent title={t("deck_collection.rangersdb.title")}>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className={css["tabs-list"]}>
              <TabsTrigger
                data-testid="rangersdb-import-tab-url"
                onTabChange={setTab}
                value="url"
              >
                {t("deck_collection.rangersdb.tab_url")}
              </TabsTrigger>
              <TabsTrigger
                data-testid="rangersdb-import-tab-text"
                onTabChange={setTab}
                value="text"
              >
                {t("deck_collection.rangersdb.tab_text")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="url">
              <UrlTab />
            </TabsContent>
            <TabsContent value="text">
              <TextTab />
            </TabsContent>
          </Tabs>
        </DefaultModalContent>
      </ModalInner>
    </Modal>
  );
}

type UrlLookup =
  | { status: "idle" | "loading" | "invalid" | "not_found" }
  | { status: "error"; message: string }
  | { status: "success"; result: RangersDbImportResult; deck: RangersDbDeck };

function UrlTab() {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [lookup, setLookup] = useState<UrlLookup>({ status: "idle" });
  const cards = useStore((state) => state.metadata.cards);

  useEffect(() => {
    if (!input.trim()) {
      setLookup({ status: "idle" });
      return;
    }

    const id = parseRangersDbDeckId(input);
    if (!id) {
      setLookup({ status: "invalid" });
      return;
    }

    setLookup({ status: "loading" });

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      try {
        const deck = await queryRangersDbDeck(id, {
          signal: controller.signal,
        });
        setLookup({
          status: "success",
          result: rangersDbDeckToImport(cards, deck),
          deck,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 404) {
          setLookup({ status: "not_found" });
        } else {
          setLookup({
            status: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }, 350);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [input, cards]);

  return (
    <div className={css["tab"]}>
      <Field
        full
        helpText={
          <Trans
            i18nKey="deck_collection.rangersdb.url_help"
            t={t}
            components={{ strong: <strong /> }}
          />
        }
      >
        <FieldLabel htmlFor="rangersdb-url">
          {t("deck_collection.rangersdb.url_label")}
        </FieldLabel>
        <input
          autoComplete="off"
          data-1p-ignore=""
          data-testid="rangersdb-import-url"
          id="rangersdb-url"
          onChange={(evt) => setInput(evt.target.value)}
          placeholder="https://rangersdb.com/decks/view/12345"
          type="text"
          value={input}
        />
      </Field>
      {lookup.status === "loading" && (
        <div className={css["status"]}>
          <LoaderCircleIcon className="spin" />
          {t("deck_collection.rangersdb.checking")}
        </div>
      )}
      {lookup.status === "invalid" && (
        <ImportError message={t("deck_collection.rangersdb.invalid_input")} />
      )}
      {lookup.status === "not_found" && (
        <ImportError message={t("deck_collection.rangersdb.not_found")} />
      )}
      {lookup.status === "error" && (
        <ImportError
          message={t("deck_collection.rangersdb.fetch_error", {
            error: lookup.message,
          })}
        />
      )}
      {lookup.status === "success" && (
        <ImportPreview deck={lookup.deck} result={lookup.result} />
      )}
    </div>
  );
}

function TextTab() {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const cards = useStore((state) => state.metadata.cards);

  const result = useMemo(
    () => (text.trim() ? parseRangersDbDeckText(cards, text) : undefined),
    [cards, text],
  );

  return (
    <div className={css["tab"]}>
      <Field full helpText={t("deck_collection.rangersdb.text_help")}>
        <FieldLabel htmlFor="rangersdb-text">
          {t("deck_collection.rangersdb.text_label")}
        </FieldLabel>
        <textarea
          className={css["textarea"]}
          data-testid="rangersdb-import-text"
          id="rangersdb-text"
          onChange={(evt) => setText(evt.target.value)}
          rows={12}
          value={text}
        />
      </Field>
      {result && <ImportPreview result={result} />}
    </div>
  );
}

function ImportPreview({
  deck,
  result,
}: {
  deck?: RangersDbDeck;
  result: RangersDbImportResult;
}) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const dialogCtx = useDialogContextChecked();
  const cards = useStore((state) => state.metadata.cards);
  const setDeckCreateImport = useStore((state) => state.setDeckCreateImport);

  const { issues, payload, valid } = result;

  const role = payload.roleCode ? cards[payload.roleCode] : undefined;
  const cardCount = [
    payload.personalitySlots,
    payload.backgroundSlots,
    payload.specialtySlots,
    payload.outsideInterestSlots,
  ].reduce(
    (total, slots) =>
      total +
      Object.values(slots).reduce((slotTotal, count) => slotTotal + count, 0),
    0,
  );

  const onImport = () => {
    setDeckCreateImport(payload);
    dialogCtx.setOpen(false);
    navigate("/deck/create?import=rangersdb");
  };

  return (
    <>
      <section
        className={css["summary"]}
        data-testid="rangersdb-import-summary"
      >
        <header className={css["summary-header"]}>
          <CheckIcon />
          <strong>{payload.name}</strong>
        </header>
        <p className={css["summary-details"]}>
          {[
            payload.background && t(`common.set.${payload.background}`),
            payload.specialty && t(`common.set.${payload.specialty}`),
            role?.name,
            t("deck_collection.rangersdb.card_count", { count: cardCount }),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {deck && <DeckMeta deck={deck} />}
      </section>
      {issues.length > 0 && (
        <section
          className={css["issues"]}
          data-testid="rangersdb-import-issues"
        >
          <header className={css["issues-header"]}>
            <TriangleAlertIcon />
            {t("deck_collection.rangersdb.issues")}
          </header>
          <ul>
            {issues.map((issue, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static list.
              <li key={index}>{formatIssue(t, issue)}</li>
            ))}
          </ul>
        </section>
      )}
      <footer className={css["footer"]}>
        <Button
          data-testid="rangersdb-import-submit"
          disabled={!valid}
          onClick={onImport}
          tooltip={valid ? undefined : t("deck_collection.rangersdb.blocked")}
          variant="primary"
        >
          <CloudDownloadIcon />
          {t("deck_collection.rangersdb.import")}
        </Button>
        <span className={css["footer-help"]}>
          {t("deck_collection.rangersdb.import_help")}
        </span>
      </footer>
    </>
  );
}

function DeckMeta({ deck }: { deck: RangersDbDeck }) {
  const { t } = useTranslation();

  return (
    <p className={css["summary-meta"]} data-testid="rangersdb-import-meta">
      {deck.user?.handle && (
        <span className={css["summary-meta-item"]}>
          <UserRoundIcon />
          {t("deck_collection.rangersdb.by_author", {
            name: deck.user.handle,
          })}
        </span>
      )}
      {deck.created_at && (
        <span className={css["summary-meta-item"]}>
          <CalendarIcon />
          {formatDate(deck.created_at)}
        </span>
      )}
      {deck.like_count != null && (
        <span
          className={css["summary-meta-item"]}
          title={t("deck_collection.rangersdb.likes", {
            count: deck.like_count,
          })}
        >
          <HeartIcon />
          {deck.like_count}
        </span>
      )}
      {deck.comment_count != null && (
        <span
          className={css["summary-meta-item"]}
          title={t("deck_collection.rangersdb.comments", {
            count: deck.comment_count,
          })}
        >
          <MessageCircleIcon />
          {deck.comment_count}
        </span>
      )}
    </p>
  );
}

function ImportError({ message }: { message: string }) {
  return (
    <div
      className={css["error"]}
      data-testid="rangersdb-import-error"
      role="alert"
    >
      <CircleAlertIcon />
      {message}
    </div>
  );
}

function formatIssue(
  t: ReturnType<typeof useTranslation>["t"],
  issue: RangersDbImportIssue,
) {
  return t(`deck_collection.rangersdb.issue.${issue.type}`, { ...issue });
}
