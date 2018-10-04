/* @flow */
import type { AircallContactFieldDefinition } from "../types";

const CONTACT_FIELDDEFS: Array<AircallContactFieldDefinition> = [
  {
    id: "first_name",
    label: "First name",
    in: true,
    out: true
  },
  {
    id: "last_name",
    label: "Last name",
    in: true,
    out: true
  },
  {
    id: "company_name",
    label: "Company name",
    in: true,
    out: true
  },
  {
    id: "information",
    label: "Information",
    in: true,
    out: true
  },
  {
    id: "phone_numbers.mobile",
    label: "Phones > Mobile",
    in: false,
    out: true
  },
  {
    id: "phone_numbers.work",
    label: "Phones > Work",
    in: false,
    out: true
  },
  {
    id: "phone_numbers.direct",
    label: "Phones > Direct",
    in: false,
    out: true
  },
  {
    id: "phone_numbers.home",
    label: "Phones > Home",
    in: false,
    out: true
  },
  {
    id: "phone_numbers.fax",
    label: "Phones > Fax",
    in: false,
    out: true
  },
  {
    id: "phone_numbers.other",
    label: "Phones > Other",
    in: false,
    out: true
  },
  {
    id: "emails.office",
    label: "Emails > Office",
    in: false,
    out: true
  },
  {
    id: "emails.home",
    label: "Emails > Home",
    in: false,
    out: true
  },
  {
    id: "emails.other",
    label: "Emails > Other",
    in: false,
    out: true
  },
  {
    id: "urls.linkedin",
    label: "Urls > Linkedin",
    in: false,
    out: true
  },
  {
    id: "urls.website",
    label: "Urls > Webiste",
    in: false,
    out: true
  },
  {
    id: "phone_numbers",
    label: "Phones",
    in: true,
    out: false
  },
  {
    id: "emails",
    label: "Emails",
    in: true,
    out: false
  },
  {
    id: "urls",
    label: "Urls",
    in: true,
    out: false
  }
];

module.exports = CONTACT_FIELDDEFS;
