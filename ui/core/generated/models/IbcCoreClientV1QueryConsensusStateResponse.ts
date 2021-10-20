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
  ConsensusStateAssociatedWithTheClientIdentifierAtTheGivenHeight,
  ConsensusStateAssociatedWithTheClientIdentifierAtTheGivenHeightFromJSON,
  ConsensusStateAssociatedWithTheClientIdentifierAtTheGivenHeightFromJSONTyped,
  ConsensusStateAssociatedWithTheClientIdentifierAtTheGivenHeightToJSON,
  HeightAtWhichTheProofWasRetrieved,
  HeightAtWhichTheProofWasRetrievedFromJSON,
  HeightAtWhichTheProofWasRetrievedFromJSONTyped,
  HeightAtWhichTheProofWasRetrievedToJSON,
} from "./";

/**
 *
 * @export
 * @interface IbcCoreClientV1QueryConsensusStateResponse
 */
export interface IbcCoreClientV1QueryConsensusStateResponse {
  /**
   *
   * @type {ConsensusStateAssociatedWithTheClientIdentifierAtTheGivenHeight}
   * @memberof IbcCoreClientV1QueryConsensusStateResponse
   */
  consensusState?: ConsensusStateAssociatedWithTheClientIdentifierAtTheGivenHeight;
  /**
   *
   * @type {string}
   * @memberof IbcCoreClientV1QueryConsensusStateResponse
   */
  proof?: string;
  /**
   *
   * @type {HeightAtWhichTheProofWasRetrieved}
   * @memberof IbcCoreClientV1QueryConsensusStateResponse
   */
  proofHeight?: HeightAtWhichTheProofWasRetrieved;
}

export function IbcCoreClientV1QueryConsensusStateResponseFromJSON(
  json: any,
): IbcCoreClientV1QueryConsensusStateResponse {
  return IbcCoreClientV1QueryConsensusStateResponseFromJSONTyped(json, false);
}

export function IbcCoreClientV1QueryConsensusStateResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): IbcCoreClientV1QueryConsensusStateResponse {
  if (json === undefined || json === null) {
    return json;
  }
  return {
    consensusState: !exists(json, "consensus_state")
      ? undefined
      : ConsensusStateAssociatedWithTheClientIdentifierAtTheGivenHeightFromJSON(
          json["consensus_state"],
        ),
    proof: !exists(json, "proof") ? undefined : json["proof"],
    proofHeight: !exists(json, "proof_height")
      ? undefined
      : HeightAtWhichTheProofWasRetrievedFromJSON(json["proof_height"]),
  };
}

export function IbcCoreClientV1QueryConsensusStateResponseToJSON(
  value?: IbcCoreClientV1QueryConsensusStateResponse | null,
): any {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return {
    consensus_state:
      ConsensusStateAssociatedWithTheClientIdentifierAtTheGivenHeightToJSON(
        value.consensusState,
      ),
    proof: value.proof,
    proof_height: HeightAtWhichTheProofWasRetrievedToJSON(value.proofHeight),
  };
}
