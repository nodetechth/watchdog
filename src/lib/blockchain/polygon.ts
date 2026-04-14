import { ethers } from "ethers";

const POLYGON_AMOY_CHAIN_ID = 80002;
const POLYGONSCAN_AMOY_URL = "https://amoy.polygonscan.com/tx";
const TIMEOUT_MS = 30000;

interface RecordResult {
  txHash: string;
  explorerUrl: string;
}

/**
 * SHA-256ハッシュをPolygon Amoyテストネットに記録する
 * ベストエフォート: 失敗してもnullを返し、メイン処理を止めない
 */
export async function recordHashOnPolygon(
  jobId: string,
  sha256Hash: string
): Promise<RecordResult | null> {
  const privateKey = process.env.POLYGON_PRIVATE_KEY;
  const rpcUrl = process.env.POLYGON_RPC_URL;

  if (!privateKey || !rpcUrl) {
    console.warn(
      "[Polygon] POLYGON_PRIVATE_KEY または POLYGON_RPC_URL が未設定のためスキップ"
    );
    return null;
  }

  try {
    // タイムアウト付きでトランザクションを実行
    const result = await Promise.race([
      executeTransaction(privateKey, rpcUrl, jobId, sha256Hash),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), TIMEOUT_MS)
      ),
    ]);

    return result;
  } catch (error) {
    console.error("[Polygon] ハッシュ記録に失敗:", error);
    return null;
  }
}

async function executeTransaction(
  privateKey: string,
  rpcUrl: string,
  jobId: string,
  sha256Hash: string
): Promise<RecordResult> {
  // ハッシュ値の前後の空白・改行を除去
  const cleanHash = sha256Hash.trim();

  // プロバイダーとウォレットの初期化 (ethers v6)
  const provider = new ethers.JsonRpcProvider(rpcUrl, POLYGON_AMOY_CHAIN_ID);
  const wallet = new ethers.Wallet(privateKey, provider);

  // dataフィールドに埋め込むJSON
  const payload = JSON.stringify({
    service: "WatchDog",
    jobId,
    sha256: cleanHash,
    timestamp: new Date().toISOString(),
  });

  // JSON文字列をhexに変換
  const dataHex = ethers.hexlify(ethers.toUtf8Bytes(payload));

  // 自己送金トランザクション (value: 0)
  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: 0,
    data: dataHex,
  });

  // トランザクション完了を待機
  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error("Transaction receipt is null");
  }

  const txHash = receipt.hash;
  const explorerUrl = `${POLYGONSCAN_AMOY_URL}/${txHash}`;

  console.log(`[Polygon] ハッシュ記録成功: ${explorerUrl}`);

  return { txHash, explorerUrl };
}
