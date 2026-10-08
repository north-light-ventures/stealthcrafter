// WHO OPERATES THIS SITE.
//
// An EU site needs an imprint naming a real legal person at a real address with
// a real way to reach them, and that is true with nothing for sale. These
// fields are NOT invented here. An imprint with a plausible-looking address
// that nobody checked is worse than an imprint that says the details are being
// finalised: the first is a false statement of identity, the second is a true
// statement of progress.
//
// Fill these in and the imprint publishes itself. Leave them empty and the page
// says so plainly instead of guessing.

export type Operator = {
  legalName: string;
  tradingAs: string;
  addressLines: string[];
  country: string;
  email: string;
  /** Companies-register entry, e.g. "Companies House 12345678". */
  registration: string;
  /** VAT identification number, where one exists. */
  vat: string;
  /** The natural person responsible for the content. */
  responsibleForContent: string;
};

export const OPERATOR: Operator = {
  legalName: "",
  tradingAs: "StealthCrafter",
  addressLines: [],
  country: "",
  email: "",
  registration: "",
  vat: "",
  responsibleForContent: "",
};

/** Which required fields are still blank. An empty array means the imprint is
    complete and may be published as it stands. */
export function operatorGaps(o: Operator = OPERATOR): string[] {
  const gaps: string[] = [];
  if (!o.legalName.trim()) gaps.push("the legal name of the operator");
  if (!o.addressLines.filter(Boolean).length) gaps.push("a postal address");
  if (!o.country.trim()) gaps.push("the country of establishment");
  if (!o.email.trim()) gaps.push("an email address that reaches a person");
  if (!o.responsibleForContent.trim()) gaps.push("the person responsible for the content");
  return gaps;
}

export function operatorIsPublishable(o: Operator = OPERATOR): boolean {
  return operatorGaps(o).length === 0;
}
