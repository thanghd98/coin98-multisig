import { BigNumber, Contract, ethers, providers, Wallet } from "ethers";
import { MULTISIGN_ABI, MULTISIGN_CONTRACT_ADDRESS } from "./constants";
import { MetaTransaction, SafeSignature, SafeTransaction, WalletData } from "./types";
import { buildSafeTx, buildSignatureBytes, safeSignTypedData } from "./utils/transaction";

export class MultiSignature{
  provider: ethers.providers.JsonRpcProvider
  contract: Contract

  constructor(multiSigContract: string){
    this.provider = new providers.JsonRpcProvider("https://rpc.viction.xyz", 88);
    this.contract = new Contract(multiSigContract || MULTISIGN_CONTRACT_ADDRESS, MULTISIGN_ABI, this.provider)
  }

  async getOwner(): Promise<string[]>{
      const owners = await this.contract.functions.getOwners()
      return owners
  }

  async getThresHold(): Promise<BigNumber[]>{
    const threshold = await this.contract.functions.getThreshold()
    return threshold
  }

  async buildSafeTransaction(params: MetaTransaction): Promise<SafeTransaction> {
    const { to, value, data } = params
    const nonce = await this.contract.functions.nonce();

    const safeTransaction = buildSafeTx({
      to,
      data,
      value,
      nonce: nonce[0].toString()
    })

    return safeTransaction
  }

  async signData(wallet: WalletData, safeTx: SafeTransaction): Promise<SafeSignature>{
    const signer = new Wallet(wallet?.privateKey, this.provider)
    const signature = await safeSignTypedData(signer, MULTISIGN_CONTRACT_ADDRESS, safeTx)

    return signature
  }

  async execTransaction(wallet: WalletData, signatures: SafeSignature[], safeTransaction: SafeTransaction):Promise<string>{
    const signatureBytes = buildSignatureBytes(signatures);
    const signer = new Wallet(wallet?.privateKey, this.provider)

    const contract = new Contract(MULTISIGN_CONTRACT_ADDRESS, MULTISIGN_ABI, signer)

    const transaction = await contract.execTransaction(
      safeTransaction.to,
      safeTransaction.value,
      safeTransaction.data,
      safeTransaction.operation,
      safeTransaction.safeTxGas,
      safeTransaction.baseGas,
      safeTransaction.gasPrice,
      safeTransaction.gasToken,
      safeTransaction.refundReceiver,
      signatureBytes,
      {
        gasLimit: 250000
      }
    );
  
      return transaction.hash
  }
}