/* @flow */
import type { THullUserIdent, THullUserAttributes } from "hull";

import type {
  AircallContactRead,
  AircallContactWrite,
  AircallAttributesMapping,
  AircallOutboundMapping,
  AircallMappingUtilSettings,
  AircallContactUpdateEnvelope
} from "../types";

const _ = require("lodash");

class MappingUtil {
  attributeMappings: AircallAttributesMapping;

  constructor(settings: AircallMappingUtilSettings) {
    this.attributeMappings = settings.attributeMappings;
  }

  mapHullUserToContact(
    envelope: AircallContactUpdateEnvelope
  ): AircallContactWrite {
    const hullUser = envelope.hullUser;
    const contactWrite: AircallContactWrite = {};

    if (_.has(hullUser, "traits_aircall/id")) {
      contactWrite.id = hullUser["traits_aircall/id"];
    }

    const mappings = this.attributeMappings.contact_attributes_outbound || [];

    _.forEach(mappings, (m: AircallOutboundMapping) => {
      const hullAttrValue = _.get(hullUser, m.hull_field_name);

      if (!_.isNil(hullAttrValue)) {
        const aircallAttrName = m.aircall_field_name;

        if (
          _.startsWith(aircallAttrName, "emails") ||
          _.startsWith(aircallAttrName, "phone_numbers") ||
          _.startsWith(aircallAttrName, "urls")
        ) {
          const arrayAttrName = _.split(aircallAttrName, ".")[0];
          const labelValue = _.split(aircallAttrName, ".")[1];

          if (!_.has(contactWrite, arrayAttrName)) {
            contactWrite[arrayAttrName] = [];
          }

          const arrayVal = _.concat(contactWrite[arrayAttrName], {
            label: labelValue,
            value: hullAttrValue
          });

          contactWrite[arrayAttrName] = arrayVal;
        } else {
          contactWrite[aircallAttrName] = hullAttrValue;
        }
      }
    });

    return contactWrite;
  }

  mapContactToHullUserIdent(contact: AircallContactRead): THullUserIdent {
    const ident = {};

    if (!_.isEmpty(contact.phone_numbers)) {
      ident.phone = _.get(contact, "phone_numbers[0].value");
    }

    ident.anonymous_id = `aircall:${contact.id}`;

    return ident;
  }

  mapContactToHullUserAttributes(
    contact: AircallContactRead
  ): THullUserAttributes {
    const mapping = this.attributeMappings.contact_attributes_inbound || [];
    const hullUserAttr: THullUserAttributes = this.applyMapping(
      mapping,
      contact
    );

    if (_.has(contact, "id")) {
      hullUserAttr["aircall/id"] = { value: _.get(contact, "id"), operation: "set" };
    }

    if (
      hullUserAttr["aircall/first_name"] &&
      hullUserAttr["aircall/first_name"].value &&
      typeof hullUserAttr["aircall/first_name"].value === "string"
    ) {
      hullUserAttr.first_name = {
        value: hullUserAttr["aircall/first_name"].value,
        operation: "setIfNull"
      };
    }

    if (
      hullUserAttr["aircall/last_name"] &&
      hullUserAttr["aircall/last_name"].value &&
      typeof hullUserAttr["aircall/last_name"].value === "string"
    ) {
      hullUserAttr.last_name = {
        value: hullUserAttr["aircall/last_name"].value,
        operation: "setIfNull"
      };
    }

    return hullUserAttr;
  }

  applyMapping(
    mapping: Array<string>,
    contact: AircallContactRead
  ): THullUserAttributes {
    return mapping.reduce(
      (hullAttrs: THullUserAttributes, m: string) => {
        switch (m) {
          case "phone_numbers":
          case "emails":
          case "urls": {
            const arrayVal = _.get(contact, m, []);
            _.forEach(arrayVal, v => {
              hullAttrs[
                `aircall/${m.slice(0, -1)}_${_.get(v, "label")
                  .toLowerCase()
                  .replace(" ", "_")}`
              ] = {
                value: _.get(v, "value"),
                operation: "set"
              };
            });
            break;
          }
          default: {
            if (!_.isNil(_.get(contact, m))) {
              hullAttrs[`aircall/${m}`] = {
                value: _.get(contact, m),
                operation: "set"
              };
            }
          }
        }

        return hullAttrs;
      },
      {}
    );
  }
}

module.exports = MappingUtil;
