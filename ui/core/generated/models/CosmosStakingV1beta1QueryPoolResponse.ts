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
  InlineResponse20034Pool,
  InlineResponse20034PoolFromJSON,
  InlineResponse20034PoolFromJSONTyped,
  InlineResponse20034PoolToJSON,
} from "./";

/**
 * QueryPoolResponse is response type for the Query/Pool RPC method.
 * @export
 * @interface CosmosStakingV1beta1QueryPoolResponse
 */
export interface CosmosStakingV1beta1QueryPoolResponse {
  /**
   *
   * @type {InlineResponse20034Pool}
   * @memberof CosmosStakingV1beta1QueryPoolResponse
   */
  pool?: InlineResponse20034Pool;
}

export function CosmosStakingV1beta1QueryPoolResponseFromJSON(
  json: any,
): CosmosStakingV1beta1QueryPoolResponse {
  return CosmosStakingV1beta1QueryPoolResponseFromJSONTyped(json, false);
}

export function CosmosStakingV1beta1QueryPoolResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CosmosStakingV1beta1QueryPoolResponse {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    pool: !exists(json, "pool")
      ? undefined
      : InlineResponse20034PoolFromJSON(json["pool"]),
  };
}

export function CosmosStakingV1beta1QueryPoolResponseToJSON(
  value?: CosmosStakingV1beta1QueryPoolResponse | null,
): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return {
    pool: InlineResponse20034PoolToJSON(value.pool),
  };
}
