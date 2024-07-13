import { BigNumberish, utils, Wallet } from "ethers";
import { EIP712_SAFE_TX_TYPE } from "../constants";
import { SafeSignature, SafeTransaction } from "../types";

export const buildSafeTx = (template: {
    to: string;
    value?: BigNumberish;
    data?: string;
    operation?: number;
    safeTxGas?: BigNumberish;
    baseGas?: BigNumberish;
    gasPrice?: BigNumberish;
    gasToken?: string;
    refundReceiver?: string;
    nonce: BigNumberish;
  }): SafeTransaction => {
    return {
        to: template.to,
        value: template.value || 0,
        data: template.data || "0x",
        operation: template.operation || 0,
        safeTxGas: template.safeTxGas || 100000,
        baseGas: template.baseGas || 0,
        gasPrice: template.gasPrice || 1,
        gasToken: template.gasToken || '0x0000000000000000000000000000000000000000',
        refundReceiver: template.refundReceiver || '0x0000000000000000000000000000000000000000',
        nonce: template.nonce,
    };
};

export const safeSignTypedData = async (
    signer: Wallet,
    safeAddress: string,
    safeTx: SafeTransaction,
    chainId?: BigNumberish,
  ): Promise<SafeSignature> => {
    if (!chainId && !signer.provider) throw Error("Provider required to retrieve chainId");
    const cid = chainId || (await signer.provider!.getNetwork()).chainId;
    const signerAddress = await signer.getAddress();
    return {
        signer: signerAddress,
        data: await signer._signTypedData({ verifyingContract: safeAddress, chainId: cid }, EIP712_SAFE_TX_TYPE, safeTx),
    };
};

export const buildSignatureBytes = (signatures: SafeSignature[]): string => {
    const SIGNATURE_LENGTH_BYTES = 65;
    signatures.sort((left, right) => left?.signer?.toLowerCase().localeCompare(right?.signer?.toLowerCase()));
  
    let signatureBytes = "0x";
    let dynamicBytes = "";
    for (const sig of signatures) {
        if (sig.dynamic) {
            /* 
                A contract signature has a static part of 65 bytes and the dynamic part that needs to be appended 
                at the end of signature bytes.
                The signature format is
                Signature type == 0
                Constant part: 65 bytes
                {32-bytes signature verifier}{32-bytes dynamic data position}{1-byte signature type}
                Dynamic part (solidity bytes): 32 bytes + signature data length
                {32-bytes signature length}{bytes signature data}
            */
            const dynamicPartPosition = (signatures.length * SIGNATURE_LENGTH_BYTES + dynamicBytes.length / 2)
                .toString(16)
                .padStart(64, "0");
            const dynamicPartLength = (sig?.data?.slice(2).length / 2).toString(16).padStart(64, "0");
            const staticSignature = `${sig?.signer?.slice(2).padStart(64, "0")}${dynamicPartPosition}00`;
            const dynamicPartWithLength = `${dynamicPartLength}${sig?.data?.slice(2)}`;
  
            signatureBytes += staticSignature;
            dynamicBytes += dynamicPartWithLength;
        } else {
            signatureBytes += sig?.data?.slice(2);
        }
    }
  
    return signatureBytes + dynamicBytes;
};
  
export const calculateSafeTransactionHash = (safeAddress: string, safeTx: SafeTransaction, chainId: BigNumberish): string => {
    return  utils._TypedDataEncoder.hash({ verifyingContract: safeAddress, chainId }, EIP712_SAFE_TX_TYPE, safeTx);
};
  