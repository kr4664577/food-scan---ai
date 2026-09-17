import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/db';
import { getFeedbackLearningStats, reviewFeedback } from '../services/feedbackLearning.service';

export const getScanUsageDashboard = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [total, successful, providerCalls, errors, users, recent] = await Promise.all([
      prisma.scanUsageLog.count(), prisma.scanUsageLog.count({where:{status:'SUCCESS'}}),
      prisma.scanUsageLog.count({where:{status:'PROVIDER_SUCCESS'}}), prisma.scanUsageLog.count({where:{status:{in:['ERROR','PROVIDER_ERROR']}}}),
      prisma.user.count(), prisma.scanUsageLog.findMany({orderBy:{createdAt:'desc'},take:50,select:{id:true,userId:true,scanType:true,status:true,model:true,inputTokens:true,outputTokens:true,estimatedCostUsd:true,imageBytes:true,processingTimeMs:true,cacheHit:true,errorCode:true,createdAt:true}})
    ]);
    const costRows=recent.filter(r=>r.estimatedCostUsd!=null), recentCostUsd=costRows.reduce((s,r)=>s+(r.estimatedCostUsd||0),0);
    return res.json({success:true,data:{totals:{usageLogRows:total,successfulScans:successful,providerCalls,errors,registeredUsers:users},recent50:{estimatedCostUsd:Number(recentCostUsd.toFixed(8)),inputTokens:recent.reduce((s,r)=>s+(r.inputTokens||0),0),outputTokens:recent.reduce((s,r)=>s+(r.outputTokens||0),0),imageBytes:recent.reduce((s,r)=>s+(r.imageBytes||0),0),processingTimeMs:recent.reduce((s,r)=>s+(r.processingTimeMs||0),0),rowsWithProviderCost:costRows.length},recent}});
  } catch(error){next(error);}
};

export const getFeedbackLearningDashboard = async (req: AuthenticatedRequest,res: Response,next: NextFunction) => {
  try { const limit=Number(req.query.limit||100); return res.json({success:true,data:await getFeedbackLearningStats(Number.isFinite(limit)?limit:100)}); }
  catch(error){next(error);}
};

export const reviewFeedbackItem = async (req: AuthenticatedRequest,res: Response,next: NextFunction) => {
  try {
    const { feedbackId }=req.params, { status, reviewNote }=req.body||{};
    if(!feedbackId||!['APPROVED','REJECTED'].includes(status)) return res.status(400).json({success:false,error:{message:'feedbackId and status APPROVED or REJECTED are required',statusCode:400}});
    const feedback=await prisma.scanFeedback.findUnique({where:{id:feedbackId},select:{id:true}});
    if(!feedback)return res.status(404).json({success:false,error:{message:'Feedback not found',statusCode:404}});
    const updated=await reviewFeedback(feedbackId,status,typeof reviewNote==='string'?reviewNote:undefined);
    return res.json({success:true,data:{id:updated.id,reviewStatus:updated.reviewStatus,reviewedAt:updated.reviewedAt,reviewNote:updated.reviewNote}});
  } catch(error){next(error);}
};
