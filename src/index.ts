import { CHAIN_DATA } from "@wallet/constants";
import { Contract, ethers, providers, Wallet } from "ethers";
import { MULTISIGN_ABI, MULTISIGN_CONTRACT_ADDRESS } from "./constants";
import { ChainType, MetaTransaction, SafeSignature, SafeTransaction, WalletData } from "./types";
import { buildSafeTx, buildSignatureBytes, safeSignTypedData } from "./utils/transaction";

export class MultiSignature{
  private providerCache: Map<ChainType, ethers.providers.JsonRpcProvider> = new Map()

  constructor(){}

  async buildSafeTransaction(params: MetaTransaction): Promise<SafeTransaction> {
    const { to, value, data } = params

    const contract = new Contract(MULTISIGN_CONTRACT_ADDRESS, MULTISIGN_ABI)
    const nonce = await contract.nonce()

    const safeTransaction = buildSafeTx({
      to,
      data,
      value,
      nonce
    })

    return safeTransaction
  }

  async signData(wallet: WalletData, safeTx: SafeTransaction): Promise<SafeSignature>{
    const provider = this.getClient()
    const signer = new Wallet(wallet?.privateKey, provider)

    const signature = await safeSignTypedData(signer, MULTISIGN_CONTRACT_ADDRESS, safeTx)

    return signature
  }

  async execTransaction(wallet: Wallet, signatures: SafeSignature[], safeTransaction: SafeTransaction):Promise<string>{
    const signatureBytes = buildSignatureBytes(signatures);

    const provider = this.getClient()
    const signer = new Wallet(wallet?.privateKey, provider)

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
    );
  
      return transaction.hash
  }

  getClient(chain: ChainType = 'tomo'): ethers.providers.JsonRpcProvider{
    const chainData = CHAIN_DATA[chain]

    if(this.providerCache.has(chain)){
      const client = this.providerCache.get(chain)
      return client as ethers.providers.JsonRpcProvider
    }

    const provider = new providers.JsonRpcProvider(chainData.rpcURL, chainData.numChainId);
    this.providerCache.set(chain, provider)

    return provider as ethers.providers.JsonRpcProvider
  } 
}