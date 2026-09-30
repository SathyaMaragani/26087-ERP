import { api, tenantApi } from '../api/client';

/** The trainee list omits certificates; attach them from the certificates endpoint. */
export const withCertificates = (trainees: any[], certs: any[]) => trainees.map((t) => (Array.isArray(t.certificates) && t.certificates.length ? t : { ...t, certificates: certs.filter((c) => c.traineeId === t.id) }));
import type { UserPersona } from '../types';
import { useAsync } from './useAsync';

export interface PoolTrainee { id: string; orgId: string; orgName: string; raw: any }

/**
 * The trainees a person may look at. Institution staff see their own institution; the national admin
 * (whose own tenant is headquarters) sees every institution's trainees, each tagged with where they belong.
 */
export function useTraineePool(persona: UserPersona, enabled = true) {
  return useAsync<PoolTrainee[]>(async () => {
    if (!enabled) return [];
    if (persona.role !== 'NCCT_ADMIN') {
      const [list, certs] = await Promise.all([api.trainees.list(), api.certifications.list().catch(() => [] as any[])]);
      return withCertificates(list, certs).map((t) => ({ id: t.id, orgId: persona.organizationId, orgName: persona.instituteName, raw: t }));
    }
    const orgs = (await api.organizations.list()).filter((o: any) => o.institutionType !== 'NCCT_HQ');
    const results = await Promise.allSettled(orgs.map(async (o: any) => { const [ts, certs] = await Promise.all([tenantApi(o.id).trainees(), tenantApi(o.id).certificates().catch(() => [] as any[])]); return withCertificates(ts, certs).map((t: any) => ({ id: t.id, orgId: o.id, orgName: o.name, raw: t })); }));
    return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  }, [persona.role, persona.organizationId, enabled]);
}

/** Fetch one trainee's full profile from the institution that holds it. */
export const loadTraineeProfile = (orgId: string, ownOrgId: string, id: string) => (orgId && orgId !== ownOrgId ? tenantApi(orgId).trainee(id) : api.trainees.get(id));
