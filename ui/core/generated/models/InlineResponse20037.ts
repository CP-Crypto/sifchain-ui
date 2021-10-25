/* tslint:disable */
/* eslint-disable */
/**
 * Sifchain - gRPC Gateway docs
 * A REST interface for state queries, legacy transactions
 *
 * The version of the OpenAPI document: 1.0.0
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from "../runtime";
import {
  InlineResponse20029UnbondingResponses,
  InlineResponse20029UnbondingResponsesFromJSON,
  InlineResponse20029UnbondingResponsesFromJSONTyped,
  InlineResponse20029UnbondingResponsesToJSON,
  InlineResponse2002Pagination,
  InlineResponse2002PaginationFromJSON,
  InlineResponse2002PaginationFromJSONTyped,
  InlineResponse2002PaginationToJSON,
} from "./";

/**
 * QueryValidatorUnbondingDelegationsResponse is response type for the
 * Query/ValidatorUnbondingDelegations RPC method.
 * @export
 * @interface InlineResponse20037
 */
export interface InlineResponse20037 {
  /**
   *
   * @type {Array<InlineResponse20029UnbondingResponses>}
   * @memberof InlineResponse20037
   */
  unbondingResponses?: Array<InlineResponse20029UnbondingResponses>;
  /**
   *
   * @type {InlineResponse2002Pagination}
   * @memberof InlineResponse20037
   */
  pagination?: InlineResponse2002Pagination;
}

export function InlineResponse20037FromJSON(json: any): InlineResponse20037 {
  return InlineResponse20037FromJSONTyped(json, false);
}

export function InlineResponse20037FromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): InlineResponse20037 {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    unbondingResponses: !exists(json, "unbonding_responses")
      ? undefined
      : (json["unbonding_responses"] as Array<any>).map(
          InlineResponse20029UnbondingResponsesFromJSON,
        ),
    pagination: !exists(json, "pagination")
      ? undefined
      : InlineResponse2002PaginationFromJSON(json["pagination"]),
  };
}

export function InlineResponse20037ToJSON(
  value?: InlineResponse20037 | null,
): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return {
    unbonding_responses:
      value.unbondingResponses === undefined
        ? undefined
        : (value.unbondingResponses as Array<any>).map(
            InlineResponse20029UnbondingResponsesToJSON,
          ),
    pagination: InlineResponse2002PaginationToJSON(value.pagination),
  };
}