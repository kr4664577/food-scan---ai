import { prisma } from '../config/db';

const DAILY_SCAN_LIMIT = Number(process.env.FREE_DAILY_SCAN_LIMIT || 10);

export interface UsageContext {
  userId?: string;
  scanType: string;
  startedAt: number;
  imageBytes?: number;
  cacheHit?: boolean;
}

export async function assertDailyScanQuota(userId?: string): Promise<void> {
  if (!userId || DAILY_SCAN_LIMIT <= 0) return;

  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const used = await prisma.scanUsageLog.count({
    where: {
      userId,
      createdAt: { gte: since },
      status: 'SUCCESS'
    }
  });

  if (used >= DAILY_SCAN_LIMIT) {
    const error = new Error('Daily scan limit reached. Please try again tomorrow.');
    (error as any).statusCode = 429;
    throw error;
  }
}

export async function logScanUsage(
  context: UsageContext,
  result: { status: 'SUCCESS' | 'ERROR'; model?: string; inputTokens?: number; outputTokens?: number; errorCode?: string }
): Promise<void> {
  try {
    // Token counts are recorded when the provider exposes them. Cost is deliberately
    // left null rather than pretending an estimate is an exact provider bill.
    await prisma.scanUsageLog.create({
      data: {
        userId: context.userId,
        scanType: context.scanType,
        status: result.status,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        imageBytes: context.imageBytes,
        processingTimeMs: Date.now() - context.startedAt,
        cacheHit: Boolean(context.cacheHit),
        errorCode: result.errorCode
      }
    });
  } catch (logError: any) {
    // Observability must never make a successful food scan fail.
    console.warn('[Usage Log] Failed to persist usage log:', logError?.message || String(logError));
  }
}
