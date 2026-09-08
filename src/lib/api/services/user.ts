import { apiClient } from '@/lib/api/client';
import { appConfig } from '@/lib/config';
import { mockPlans, mockSubscribe, mockUser } from '@/lib/api/mock';
import type { ApiEnvelope, Plan, SubscribeInfo, UserInfo } from '@/lib/api/types';

type RawUsage = {
  plan?: string | { name?: string | null } | null
  u?: number | string | null
  d?: number | string | null
  transfer_enable?: number | string | null
  expired_at?: number | string | null
}
type RawSubscribeInfo = Omit<SubscribeInfo, keyof RawUsage> & RawUsage
type RawUserInfo = Omit<UserInfo, keyof RawUsage> & RawUsage

function optionalNumber(value: unknown) {
  if (value == null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

function normalizeUsage(info: RawUsage) {
  return {
    plan: typeof info.plan === 'string' ? info.plan : info.plan?.name ?? null,
    u: optionalNumber(info.u),
    d: optionalNumber(info.d),
    transfer_enable: optionalNumber(info.transfer_enable),
    expired_at: info.expired_at === null ? null : optionalNumber(info.expired_at),
  }
}

function normalizeUserInfo(user: RawUserInfo): UserInfo {
  return { ...user, ...normalizeUsage(user) }
}

function normalizeSubscribeInfo(subscribe: RawSubscribeInfo): SubscribeInfo {
  return { ...subscribe, ...normalizeUsage(subscribe) }
}

export async function getUserInfo() {
  if (appConfig.enableMock) return mockUser;
  const response = await apiClient.get<ApiEnvelope<RawUserInfo>>('/api/v1/user/info');
  return normalizeUserInfo(response.data.data);
}

export async function getSubscribeInfo() {
  if (appConfig.enableMock) return mockSubscribe;
  const response = await apiClient.get<ApiEnvelope<RawSubscribeInfo>>('/api/v1/user/getSubscribe');
  return normalizeSubscribeInfo(response.data.data);
}

export async function getPlans() {
  if (appConfig.enableMock) return mockPlans;
  const response = await apiClient.get<ApiEnvelope<Plan[]>>('/api/v1/user/plan/fetch');
  return response.data.data;
}
