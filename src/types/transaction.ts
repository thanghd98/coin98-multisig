import { BigNumberish } from "ethers";

export interface MetaTransaction {
    to: string;
    value: BigNumberish | string;
    data: string;
    operation?: number;
}
  
export interface SafeTransaction extends MetaTransaction {
    safeTxGas: BigNumberish;
    baseGas: BigNumberish;
    gasPrice: BigNumberish;
    gasToken: string;
    refundReceiver: string;
    nonce: BigNumberish;
}

export type DataHexString = string;

/**
 *  An object that can be used to represent binary data.
 */
export type BytesLike = DataHexString | Uint8Array;


export interface SafeSignature {
  signer: string;
  data: string;
  // a flag to indicate if the signature is a contract signature and the data has to be appended to the dynamic part of signature bytes
  dynamic?: true;
}
