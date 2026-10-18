import { type Clock, DemoClock, type Scheduler } from '../domain/clock';
import { CLIENT_ROLES, type Role } from '../domain/enums';
import { AppError, forbidden } from '../domain/errors';
import { deriveLandingPageStatus } from '../domain/rules/gates';
import { renderUtm } from '../domain/rules/utm';
import type { Actor, Settings } from '../domain/types';
import type { SettingsReader } from '../integrations/agents/agent.adapter';
import { type MemoryStore } from '../store/memory.store';
import { defined, type PatchSettingsInput } from './inputs';

export class SettingsService implements SettingsReader {
  constructor(
    private readonly store: MemoryStore,
    private readonly clock: Clock,
    private readonly scheduler: Scheduler,
  ) {}

  get(): Settings {
    return this.store.data.settings;
  }

  patch(dto: PatchSettingsInput, actor: Actor): Settings {
    const client = (CLIENT_ROLES as readonly Role[]).includes(actor.role);
    const needsClient = dto.preApprovedScope !== undefined || dto.people?.approvers !== undefined;
    const needsPm =
      dto.utmTemplate !== undefined ||
      dto.prohibitedWords !== undefined ||
      dto.landingPage !== undefined ||
      dto.factorySupportsIdempotency !== undefined ||
      (dto.people !== undefined && Object.keys(dto.people).some((k) => k !== 'approvers'));
    if (needsClient && !client)
      throw forbidden('change the pre-approved scope or approvers', CLIENT_ROLES);
    if (needsPm && actor.role !== 'pm') throw forbidden('change these settings', ['pm']);
    if (dto.utmTemplate !== undefined && !dto.utmTemplate.includes('{base}')) {
      throw new AppError(
        'VALIDATION',
        'The UTM template must start from {base}.',
        'Example: {base}?utm_source={source}&…',
        400,
      );
    }
    if (dto.preApprovedScope?.budgetCapCentsByChannel) {
      const bad = Object.entries(dto.preApprovedScope.budgetCapCentsByChannel).filter(
        ([, v]) => !Number.isInteger(v) || v < 0,
      );
      if (bad.length)
        throw new AppError(
          'VALIDATION',
          `Budget caps must be whole cents ≥ 0: ${bad.map(([k]) => k).join(', ')}`,
          undefined,
          400,
        );
    }

    const s = this.get();
    const changed: string[] = [];
    const next: Settings = structuredClone(s);
    if (dto.preApprovedScope) {
      Object.assign(next.preApprovedScope, defined(dto.preApprovedScope), {
        signedBy: actor.name,
        signedAt: this.clock.now().toISOString(),
      });
      changed.push('pre-approved scope');
    }
    if (dto.people) {
      const { alertOwnerOutsideHours, ...rest } = dto.people;
      Object.assign(next.people, defined(rest));
      if (alertOwnerOutsideHours)
        next.people.alertOwnerOutsideHours = { ...alertOwnerOutsideHours };
      changed.push('people');
    }
    if (dto.utmTemplate !== undefined) {
      next.utmTemplate = dto.utmTemplate;
      changed.push('UTM template');
    }
    if (dto.prohibitedWords !== undefined) {
      next.prohibitedWords = dto.prohibitedWords.map((w) => w.trim()).filter(Boolean);
      changed.push('prohibited words');
    }
    if (dto.landingPage) {
      if (dto.landingPage.url) next.landingPage.url = dto.landingPage.url;
      if (dto.landingPage.checks)
        Object.assign(next.landingPage.checks, defined(dto.landingPage.checks));
      next.landingPage.status = deriveLandingPageStatus(next.landingPage.checks);
      changed.push(`landing page (${next.landingPage.status})`);
    }
    if (dto.factorySupportsIdempotency !== undefined) {
      next.factorySupportsIdempotency = dto.factorySupportsIdempotency;
      changed.push('factory idempotency');
    }
    next.events = [
      ...s.events,
      { at: this.clock.now().toISOString(), actor, action: 'updated', detail: changed.join(', ') },
    ];
    this.store.data.settings = next;
    return next;
  }

  /** Reload the seed, cancel pending timers, restart the demo clock. */
  resetDemo(): { ok: true; seedVersion: string } {
    this.scheduler.cancelAll();
    this.store.reset();
    if (this.clock instanceof DemoClock) this.clock.reset();
    return { ok: true, seedVersion: this.store.data.seedVersion };
  }

  utmPreview(q: { source?: string; medium?: string; content?: string }): { link: string } {
    const s = this.get();
    return {
      link: renderUtm(s.utmTemplate, {
        base: s.landingPage.url,
        source: q.source || 'facebook',
        medium: q.medium || 'organic_social',
        content: q.content || 'preview',
      }),
    };
  }
}
