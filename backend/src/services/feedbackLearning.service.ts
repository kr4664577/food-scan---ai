import { prisma } from '../config/db';

export interface FeedbackLearningStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  verifiedCandidates: VerifiedCorrection[];
  corrections: Array<{
    feedbackId: string; scanId: string; originalName: string; correctedName: string | null;
    originalBrand: string | null; correctedBrand: string | null; feedbackType: string;
    reviewStatus: string; createdAt: Date;
  }>;
}

export interface VerifiedCorrection {
  correctedName: string; correctedBrand: string | null; feedbackCount: number;
  uniqueUsers: number; confidence: number; status: 'PENDING_REVIEW' | 'REVIEWED';
}

export async function getFeedbackLearningStats(limit = 100): Promise<FeedbackLearningStats> {
  const safeLimit = Math.min(Math.max(Math.floor(limit) || 100, 1), 500);
  const [total, rows] = await Promise.all([
    prisma.scanFeedback.count(),
    prisma.scanFeedback.findMany({ orderBy: { createdAt: 'desc' }, take: safeLimit,
      include: { scan: { select: { productName: true, brandName: true } } } })
  ]);
  const byType: Record<string, number> = {}, byStatus: Record<string, number> = {};
  for (const row of rows) { byType[row.feedbackType]=(byType[row.feedbackType]||0)+1; byStatus[row.reviewStatus]=(byStatus[row.reviewStatus]||0)+1; }
  const verifiedCandidates = await getVerifiedCorrections();
  return { total, byType, byStatus, verifiedCandidates,
    corrections: rows.map(row => ({ feedbackId:row.id, scanId:row.scanId, originalName:row.scan.productName,
      correctedName:row.correctedName, originalBrand:row.scan.brandName, correctedBrand:row.correctedBrand,
      feedbackType:row.feedbackType, reviewStatus:row.reviewStatus, createdAt:row.createdAt })) };
}

export async function getVerifiedCorrections(minVotes = 3): Promise<VerifiedCorrection[]> {
  const rows = await prisma.scanFeedback.findMany({ where:{ correctedName:{ not:null } },
    select:{ userId:true, correctedName:true, correctedBrand:true, reviewStatus:true } });
  const groups=new Map<string,{name:string;brand:string|null;users:Set<string>;count:number;reviewed:boolean}>();
  for(const row of rows){ const name=row.correctedName?.trim(); if(!name)continue; const brand=row.correctedBrand?.trim()||null;
    const key=`${name.toLowerCase()}|${(brand||'').toLowerCase()}`; const g=groups.get(key)||{name,brand,users:new Set<string>(),count:0,reviewed:false};
    g.count++;g.users.add(row.userId);if(row.reviewStatus!=='PENDING')g.reviewed=true;groups.set(key,g); }
  return [...groups.values()].filter(g=>g.count>=minVotes&&g.users.size>=2).map(g=>({ correctedName:g.name,correctedBrand:g.brand,
    feedbackCount:g.count,uniqueUsers:g.users.size,confidence:Math.min(.99,.5+g.users.size*.1+Math.min(g.count,10)*.03),
    status:g.reviewed?'REVIEWED':'PENDING_REVIEW' })).sort((a,b)=>b.feedbackCount-a.feedbackCount);
}

export async function reviewFeedback(feedbackId:string,status:'APPROVED'|'REJECTED',reviewNote?:string){
  return prisma.scanFeedback.update({ where:{id:feedbackId}, data:{ reviewStatus:status, reviewedAt:new Date(), reviewNote:reviewNote?.trim().slice(0,500)||null } });
}
