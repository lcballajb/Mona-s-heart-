export type MedicationTerm = {
  rxcui?: string;
  genericName: string;
  brandName?: string;
  activeIngredient: string;
  strength?: string;
  doseForm?: string;
};
export type DiagnosisTerm = {
  displayName: string;
  code: string;
  system: "SNOMED CT" | "ICD-10-CM";
  source: string;
  retrievedAt: string;
};

/** Fictional prototype subset shaped for replacement by a server-side RxNorm proxy. */
export const medications: MedicationTerm[] = [
  {
    rxcui: "1049630",
    genericName: "levothyroxine sodium",
    brandName: "Synthroid",
    activeIngredient: "levothyroxine",
    strength: "100 mcg",
    doseForm: "oral tablet",
  },
  {
    rxcui: "866924",
    genericName: "metoprolol succinate",
    brandName: "Toprol-XL",
    activeIngredient: "metoprolol",
    strength: "25 mg",
    doseForm: "extended-release oral tablet",
  },
  {
    rxcui: "313988",
    genericName: "tamoxifen citrate",
    brandName: "Soltamox",
    activeIngredient: "tamoxifen",
    strength: "10 mg",
    doseForm: "oral tablet",
  },
  {
    rxcui: "860975",
    genericName: "metformin hydrochloride",
    brandName: "Glucophage",
    activeIngredient: "metformin",
    strength: "500 mg",
    doseForm: "oral tablet",
  },
  {
    rxcui: "311041",
    genericName: "insulin glargine",
    brandName: "Lantus",
    activeIngredient: "insulin glargine",
    strength: "100 units/mL",
    doseForm: "injection",
  },
];
export const diagnoses: DiagnosisTerm[] = [
  {
    displayName: "Malignant tumor of thyroid gland",
    code: "363478007",
    system: "SNOMED CT",
    source: "Mock terminology catalog",
    retrievedAt: "2026-08-03",
  },
  {
    displayName: "Type 2 diabetes mellitus",
    code: "44054006",
    system: "SNOMED CT",
    source: "Mock terminology catalog",
    retrievedAt: "2026-08-03",
  },
  {
    displayName: "Malignant tumor of breast",
    code: "254837009",
    system: "SNOMED CT",
    source: "Mock terminology catalog",
    retrievedAt: "2026-08-03",
  },
  {
    displayName: "Heart valve disorder",
    code: "368009",
    system: "SNOMED CT",
    source: "Mock terminology catalog",
    retrievedAt: "2026-08-03",
  },
];
export const searchMedications = (query: string) =>
  query.trim().length < 2
    ? []
    : medications.filter((m) =>
        `${m.genericName} ${m.brandName ?? ""} ${m.activeIngredient}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      );
export const searchDiagnoses = (query: string) =>
  query.trim().length < 2
    ? []
    : diagnoses.filter((d) =>
        d.displayName.toLowerCase().includes(query.toLowerCase()),
      );
