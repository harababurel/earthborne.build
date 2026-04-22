export type AspectCardValues = {
  aspect_awareness: number;
  aspect_fitness: number;
  aspect_focus: number;
  aspect_spirit: number;
};

export const ASPECT_CARD_VALUES_BY_CODE: Record<string, AspectCardValues> = {
  "01241": values(1, 3, 2, 2),
  "01242": values(2, 3, 1, 2),
  "01243": values(1, 4, 2, 1),
  "01244": values(1, 4, 1, 2),
  "01245": values(2, 4, 1, 1),
  "01246": values(2, 3, 2, 1),
  "01247": values(2, 2, 1, 3),
  "01248": values(2, 1, 2, 3),
  "01249": values(1, 2, 2, 3),
  "01250": values(1, 2, 3, 2),
  "01251": values(2, 2, 3, 1),
  "01252": values(2, 1, 3, 2),
  "01253": values(3, 2, 1, 2),
  "01254": values(3, 2, 2, 1),
  "01255": values(3, 1, 2, 2),
  "03206": values(1, 2, 1, 4),
  "03207": values(1, 1, 2, 4),
  "03208": values(2, 1, 4, 1),
  "03209": values(1, 2, 4, 1),
  "03210": values(1, 1, 4, 2),
  "03211": values(4, 1, 1, 2),
  "03212": values(4, 2, 1, 1),
  "03213": values(4, 1, 2, 1),
};

function values(
  aspect_awareness: number,
  aspect_fitness: number,
  aspect_focus: number,
  aspect_spirit: number,
): AspectCardValues {
  return {
    aspect_awareness,
    aspect_fitness,
    aspect_focus,
    aspect_spirit,
  };
}
