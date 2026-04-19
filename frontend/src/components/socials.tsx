import { GithubIcon } from "./icons/github-icon";
import { Button } from "./ui/button";

export function Socials(props: { className?: string }) {
  return (
    <div className={props.className}>
      <Button
        as="a"
        href="https://github.com/harababurel/earthborne.build"
        target="_blank"
        rel="noreferrer"
        variant="bare"
        iconOnly
        size="lg"
      >
        <GithubIcon />
      </Button>
    </div>
  );
}
