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
  PaginationResponse,
  PaginationResponseFromJSON,
  PaginationResponseFromJSONTyped,
  PaginationResponseToJSON,
  QueryBlockHeight,
  QueryBlockHeightFromJSON,
  QueryBlockHeightFromJSONTyped,
  QueryBlockHeightToJSON,
  QueryPacketAcknowledgemetsResponseIsTheRequestTypeForTheQueryQueryPacketAcknowledgementsRPCMethodAcknowledgements,
  QueryPacketAcknowledgemetsResponseIsTheRequestTypeForTheQueryQueryPacketAcknowledgementsRPCMethodAcknowledgementsFromJSON,
  QueryPacketAcknowledgemetsResponseIsTheRequestTypeForTheQueryQueryPacketAcknowledgementsRPCMethodAcknowledgementsFromJSONTyped,
  QueryPacketAcknowledgemetsResponseIsTheRequestTypeForTheQueryQueryPacketAcknowledgementsRPCMethodAcknowledgementsToJSON,
} from "./";

/**
 *
 * @export
 * @interface IbcCoreChannelV1QueryPacketAcknowledgementsResponse
 */
export interface IbcCoreChannelV1QueryPacketAcknowledgementsResponse {
  /**
   *
   * @type {Array<QueryPacketAcknowledgemetsResponseIsTheRequestTypeForTheQueryQueryPacketAcknowledgementsRPCMethodAcknowledgements>}
   * @memberof IbcCoreChannelV1QueryPacketAcknowledgementsResponse
   */
  acknowledgements?: Array<QueryPacketAcknowledgemetsResponseIsTheRequestTypeForTheQueryQueryPacketAcknowledgementsRPCMethodAcknowledgements>;
  /**
   *
   * @type {PaginationResponse}
   * @memberof IbcCoreChannelV1QueryPacketAcknowledgementsResponse
   */
  pagination?: PaginationResponse;
  /**
   *
   * @type {QueryBlockHeight}
   * @memberof IbcCoreChannelV1QueryPacketAcknowledgementsResponse
   */
  height?: QueryBlockHeight;
}

export function IbcCoreChannelV1QueryPacketAcknowledgementsResponseFromJSON(
  json: any,
): IbcCoreChannelV1QueryPacketAcknowledgementsResponse {
  return IbcCoreChannelV1QueryPacketAcknowledgementsResponseFromJSONTyped(
    json,
    false,
  );
}

export function IbcCoreChannelV1QueryPacketAcknowledgementsResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): IbcCoreChannelV1QueryPacketAcknowledgementsResponse {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    acknowledgements: !exists(json, "acknowledgements")
      ? undefined
      : (json["acknowledgements"] as Array<any>).map(
          QueryPacketAcknowledgemetsResponseIsTheRequestTypeForTheQueryQueryPacketAcknowledgementsRPCMethodAcknowledgementsFromJSON,
        ),
    pagination: !exists(json, "pagination")
      ? undefined
      : PaginationResponseFromJSON(json["pagination"]),
    height: !exists(json, "height")
      ? undefined
      : QueryBlockHeightFromJSON(json["height"]),
  };
}

export function IbcCoreChannelV1QueryPacketAcknowledgementsResponseToJSON(
  value?: IbcCoreChannelV1QueryPacketAcknowledgementsResponse | null,
): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return {
    acknowledgements:
      value.acknowledgements === undefined
        ? undefined
        : (value.acknowledgements as Array<any>).map(
            QueryPacketAcknowledgemetsResponseIsTheRequestTypeForTheQueryQueryPacketAcknowledgementsRPCMethodAcknowledgementsToJSON,
          ),
    pagination: PaginationResponseToJSON(value.pagination),
    height: QueryBlockHeightToJSON(value.height),
  };
}
