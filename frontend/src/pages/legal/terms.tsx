import { LegalPage } from "./legal-page";

const SECTIONS = [
  "service",
  "eligibility",
  "accounts",
  "user_content",
  "acceptable_use",
  "moderation",
  "account_deletion",
  "availability",
  "liability",
  "governing_law",
  "changes",
] as const;

function Terms() {
  return <LegalPage rootKey="legal.terms" sections={SECTIONS} />;
}

export default Terms;
