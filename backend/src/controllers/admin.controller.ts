import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/db';
import { getFeedbackLearningStats } from '../services/feedbackLearning.service';

export const getScanUsageDashboard = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [total, successful, providerCalls, errors, users, recent] = await Promise.all([
      prisma.scanUsageLog.count(), prisma.scanUsageLog.count({ where: { status: 'SUCCESS' } }),
      prisma.scanUsageLog.count({ where: { status: 'PROVIDER_SUCCESS' } }), prisma.scanUsageLog.count({ where: { status: { in: ['ERROR', 'PROVIDER_ERROR'] } } }),
      prisma.user.count(), prisma.scanUsageLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50, select: { id:true,userId:true,scanType:true,status:true,model:true,inputTokens:true,outputTokens:true,estimatedCostUsd:true,imageBytes:true,processingTimeMs:true,cacheHit:true,errorCode:true,createdAt:true } })
    ]);
    const costRows=recent.filter(r=>r.estimatedCostUsd!=null), recentCostUsd=costRows.reduce((s,r)=>s+(r.estimatedCostUsd||0),0);
    return res.json({ success:true, data:{ totals:{usageLogRows:total,successfulScans:successful,providerCalls,errors,registeredUsers:users}, recent50:{estimatedCostUsd:Number(recentCostUsd.toFixed(8)),inputTokens:recent.reduce((s,r)=>s+(r.inputTokens||0),0),outputTokens:recent.reduce((s,r)=>s+(r.outputTokens||0),0),imageBytes:recent.reduce((s,r)=>s+(r.imageBytes||0),0),processingTimeMs:recent.reduce((s,r)=>s+(r.processingTimeMs||0),0),rowsWithProviderCost:costRows.length}, recent } });
  } catch(error){ next(error); }
};

export const getFeedbackLearningDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const limit=Number(req.query.limit||100);
    const data=await getFeedbackLearningStats(Number.isFinite(limit)?limit:100);
    return res.json({ success:true, data });
  } catch(error){ next(error); }
};
