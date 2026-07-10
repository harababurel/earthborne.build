import { LegalPage } from "./legal-page";

const SECTIONS = [
  "controller",
  "data",
  "purposes",
  "cookies",
  "analytics",
  "third_party",
  "processors",
  "transfers",
  "retention",
  "rights",
  "security",
  "changes",
] as const;

function Privacy() {
  return <LegalPage rootKey="legal.privacy" sections={SECTIONS} />;
}

export default Privacy;
