type Mapping<V extends string | number> = Record<string, V>;

export type LookupTable<
  T extends string | number,
  V extends string | number = 1,
> = Record<T, Mapping<V>>;

export type LookupTables = {
  actions: LookupTable<string>;
  encounterCode: LookupTable<string>;
  level: LookupTable<number>;
  packsByCycle: LookupTable<string>;
  properties: {
    fast: Mapping<1>;
    succeedBy: Mapping<1>;
  };
  relations: {
    // `Hallowed Mirror` has bound `Soothing Melody`.
    bound: LookupTable<string>;
    // Revised core "First Aid (3)"is a duplicate of Pallid Mask "First Aid (3)".
    duplicates: LookupTable<string>;
    // `Predator or Prey?` is the front for `The Masked Hunter`.
    fronts: LookupTable<string>;
    // Any card can have `n` different level version. (e.g. Ancient Stone)
    level: LookupTable<string>;
    // TCU Laboratory Assisstant is a baseprint of Laboratory Assistant.
    basePrints: LookupTable<string>;
    // Laboratory Assisstant is a chapter two reprint of Laboratory Assistant.
    reprints: LookupTable<string>;
    // `Daisy Walker`'s requires `Daisy's Tote Bag`.
    requiredCards: LookupTable<string>;
    // Agatha Crane exists both as a mystic and a seeker card.
    otherVersions: LookupTable<string>;
  };
  reprintPacksByPack: LookupTable<string>;
  encounterCodesByPack: LookupTable<string>;
  skillBoosts: LookupTable<string>;
  subtypeCode: LookupTable<string>;
  traits: LookupTable<string>;
  typeCode: LookupTable<string>;
  uses: LookupTable<string>;
};
