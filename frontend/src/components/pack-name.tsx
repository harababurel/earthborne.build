import type { Cycle } from "@/store/schemas/cycle.schema";
import type { Pack } from "@/store/schemas/pack.schema";
import { displayPackName, shortenPackName } from "@/utils/formatting";

type Props = {
  pack: Pack | Cycle;
  shortenNewFormat?: boolean;
};

export function PackName(props: Props) {
  const { pack, shortenNewFormat } = props;

  return (
    <>
      {shortenNewFormat ? shortenPackName(pack as Pack) : displayPackName(pack)}
    </>
  );
}
