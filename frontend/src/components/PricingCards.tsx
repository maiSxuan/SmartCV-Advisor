import {
  FREE_FEATURES,
  FREE_LIMITATIONS,
  getPremiumComingSoon,
  PREMIUM_FEATURES,
  PREMIUM_PLANS,
  type PremiumCycle,
} from '../data/plans';
import type { ServicePlan } from '../services/api';

function CheckIcon({ premium = false }: { premium?: boolean }) {
  return (
    <svg className={`mt-0.5 h-4 w-4 shrink-0 ${premium ? 'text-white' : 'text-emerald-500'}`} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m5 10 3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-blue-300" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v4l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FreePricingCard({ current = false, actionLabel, onAction, plan }: {
  current?: boolean;
  actionLabel: string;
  onAction?: () => void;
  plan?: ServicePlan;
}) {
  const features = plan?.features?.length ? plan.features : FREE_FEATURES;
  const limitations = plan?.limited_features?.length ? plan.limited_features : FREE_LIMITATIONS;
  const durationLabel = plan?.duration_days ? `${plan.duration_days} ngày` : 'Mãi mãi miễn phí';
  return (
    <div className="relative flex min-h-[610px] flex-col rounded-2xl border-2 border-slate-200 bg-white p-7 shadow-sm shadow-slate-200/40">
      {current && <div className="absolute right-5 top-5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">Gói hiện tại</div>}
      <h3 className="text-lg font-bold text-slate-900">{plan?.name || 'Free'}</h3>
      <div className="mt-3"><span className="text-4xl font-extrabold tracking-tight text-slate-900">đ{Number(plan?.price ?? 0).toLocaleString('vi-VN')}</span></div>
      <p className="mt-1 text-sm font-medium text-slate-400">{durationLabel}</p>
      <div className="mb-7 mt-7 flex-1 space-y-5 text-sm font-medium">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Quyền lợi hiện có</p>
          <ul className="mt-4 space-y-3.5 text-slate-600">
            {features.map((feature) => <li key={feature} className="flex items-start gap-3"><CheckIcon /><span>{feature}</span></li>)}
          </ul>
        </div>
        <div className="border-t border-slate-100 pt-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tính năng bị giới hạn</p>
          <ul className="mt-4 space-y-3.5 text-slate-400">
            {limitations.map((feature) => <li key={feature} className="flex items-start gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300" /><span>{feature}</span></li>)}
          </ul>
        </div>
      </div>
      <button
        type="button"
        disabled={current}
        onClick={onAction}
        className={current
          ? 'w-full cursor-not-allowed rounded-xl bg-slate-100 py-3.5 font-bold text-slate-400 opacity-80'
          : 'w-full rounded-xl border border-blue-200 bg-blue-50 py-3.5 font-bold text-blue-600 transition hover:bg-blue-100'}
      >
        {actionLabel}
      </button>
    </div>
  );
}

export function PremiumPricingCard({ cycle, recommended = false, actionLabel, onAction, plan: servicePlan }: {
  cycle: PremiumCycle;
  recommended?: boolean;
  actionLabel: string;
  onAction: () => void;
  plan?: ServicePlan;
}) {
  const plan = PREMIUM_PLANS[cycle];
  const features = servicePlan?.features?.length ? servicePlan.features : PREMIUM_FEATURES;
  const comingSoon = servicePlan ? servicePlan.coming_soon : getPremiumComingSoon(cycle);
  const price = Number(servicePlan?.price ?? plan.price);
  const durationLabel = servicePlan?.duration_days ? `${servicePlan.duration_days} ngày` : plan.durationLabel;
  return (
    <div className="relative flex min-h-[610px] flex-col rounded-2xl border-2 border-blue-400 bg-gradient-to-br from-blue-600 to-blue-700 p-7 shadow-xl shadow-blue-600/20">
      {recommended && <div className="absolute right-5 top-5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">Thời hạn dài hơn</div>}
      <h3 className="pr-24 text-lg font-bold text-white">{servicePlan?.name || 'Premium — Job Search Pass'}</h3>
      <div className="mt-3"><span className="text-4xl font-extrabold tracking-tight text-white">đ{price.toLocaleString('vi-VN')}</span></div>
      <p className="mt-1 text-sm font-medium text-blue-200">{durationLabel}</p>
      <div className="mt-7 flex-1 space-y-5 text-sm font-medium">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-100">Quyền lợi hiện có</p>
          <ul className="mt-4 space-y-3.5 text-white">
            {features.map((feature) => <li key={feature} className="flex items-start gap-3"><CheckIcon premium /><span>{feature}</span></li>)}
          </ul>
        </div>
        {comingSoon.length > 0 && (
          <div className="border-t border-blue-500/50 pt-5">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-100">Sắp ra mắt</p>
            <ul className="mt-4 space-y-3.5">
              {comingSoon.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-blue-100">
                  <ClockIcon /><span className="flex-1">{feature}</span>
                  <span className="rounded-full border border-blue-400/30 bg-blue-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-blue-100">Sắp ra mắt</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <button type="button" onClick={onAction} className="mt-7 w-full rounded-xl bg-white py-3.5 font-bold text-blue-600 shadow-lg transition hover:bg-slate-50 hover:shadow-xl active:scale-95">
        {actionLabel}
      </button>
    </div>
  );
}
