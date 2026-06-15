import {
  ChevronLeftIcon,
  FootprintsIcon,
  MoonIcon,
  SettingsIcon,
  Undo2Icon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "wouter";
import { CampaignTimeline } from "@/components/campaign/campaign-timeline";
import { CurrentPositionCard } from "@/components/campaign/current-position-card";
import { DayModal } from "@/components/campaign/modals/day-modal";
import { EndDayModal } from "@/components/campaign/modals/end-day-modal";
import { SettingsModal } from "@/components/campaign/modals/settings-modal";
import { TravelModal } from "@/components/campaign/modals/travel-modal";
import { NotesPanel } from "@/components/campaign/notes-panel";
import { RangersPanel } from "@/components/campaign/rangers-panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { PageTitle } from "@/components/ui/page-title";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabUrlState } from "@/components/ui/tabs.hooks";
import { AppLayout } from "@/layouts/app-layout";
import { useStore } from "@/store";
import { selectCampaign } from "@/store/selectors/campaigns";
import { ErrorStatus } from "../errors/404";
import css from "./campaign-detail.module.css";
import { EventsTab } from "./tabs/events-tab";
import { MissionsTab } from "./tabs/missions-tab";
import { RemovedTab } from "./tabs/removed-tab";
import { RewardsTab } from "./tabs/rewards-tab";

const TABS = ["missions", "rewards", "events", "removed"] as const;

function CampaignDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const campaign = useStore((state) => selectCampaign(state, id));
  const undoTravel = useStore((state) => state.undoTravel);
  const [tab, setTab] = useTabUrlState("missions", "tab");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  if (!campaign) return <ErrorStatus statusCode={404} />;

  return (
    <AppLayout title={campaign.name}>
      <PageTitle>{campaign.name}</PageTitle>
      <div className={css["container"]}>
        <header className={css["header"]}>
          <div className={css["heading"]}>
            <Link to="/campaigns" asChild>
              <Button as="a" size="sm" variant="bare">
                <ChevronLeftIcon /> {t("campaign.back")}
              </Button>
            </Link>
            <h1>{campaign.name}</h1>
            <span className={css["cycle-pill"]}>
              {t(`campaign.data.cycles.${campaign.cycle_id}`)}
            </span>
          </div>

          <div className={css["actions"]}>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <FootprintsIcon /> {t("campaign.journey.travel")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <TravelModal campaign={campaign} />
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <MoonIcon /> {t("campaign.end_day.title")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <EndDayModal campaign={campaign} />
              </DialogContent>
            </Dialog>

            <Button
              disabled={!campaign.history.length}
              onClick={() => undoTravel(campaign.id)}
              size="sm"
              variant="bare"
            >
              <Undo2Icon /> {t("campaign.journey.undo")}
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  iconOnly
                  size="sm"
                  tooltip={t("campaign.settings.expansions")}
                  variant="bare"
                >
                  <SettingsIcon />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <SettingsModal campaign={campaign} />
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <CampaignTimeline campaign={campaign} onSelectDay={setSelectedDay} />

        <Dialog
          open={selectedDay != null}
          onOpenChange={(open) => !open && setSelectedDay(null)}
        >
          <DialogContent>
            {selectedDay != null && (
              <DayModal campaign={campaign} day={selectedDay} />
            )}
          </DialogContent>
        </Dialog>

        <div className={css["body"]}>
          <aside className={css["rail"]}>
            <CurrentPositionCard campaign={campaign} />
            <RangersPanel campaign={campaign} />
            <NotesPanel campaign={campaign} />
          </aside>

          <section className={css["main"]}>
            <Tabs onValueChange={setTab} value={tab}>
              <TabsList>
                {TABS.map((key) => (
                  <TabsTrigger key={key} onTabChange={setTab} value={key}>
                    {t(`campaign.tabs.${key}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="missions">
                <MissionsTab campaign={campaign} />
              </TabsContent>
              <TabsContent value="rewards">
                <RewardsTab campaign={campaign} />
              </TabsContent>
              <TabsContent value="events">
                <EventsTab campaign={campaign} />
              </TabsContent>
              <TabsContent value="removed">
                <RemovedTab campaign={campaign} />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}

export default CampaignDetail;
